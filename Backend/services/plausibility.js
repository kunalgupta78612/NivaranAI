/**
 * ============================================================================
 *  Nivaran AI — Plausibility Gate
 * ============================================================================
 *  Stands between "the citizen typed something" and "a ticket lands on a real
 *  officer's desk". Two layers, cheapest first:
 *
 *   1. HEURISTIC (always on, free, instant — runs on every keystroke in the
 *      live preview AND before every filing). Catches keyboard-mash gibberish
 *      ("hbkjhnkjnkjh"), placeholder/test text, and near-empty non-reports
 *      without needing any network call.
 *
 *   2. SEMANTIC (only when an LLM key is configured). Catches text that is
 *      grammatically fine but is not a civic complaint at all — "I like
 *      pizza", a joke, an insult, someone testing the form — which no
 *      character-level heuristic can distinguish from a real report.
 *
 *  Either layer can veto filing. Neither layer can be skipped by the LLM
 *  agent forgetting to call it — it lives INSIDE file_grievance itself
 *  (services/agentTools.js), not as a tool the model has to remember to use.
 * ============================================================================
 */

const llm = require("./llm");

const VOWELS_LATIN = new Set("aeiouAEIOU");
// Devanagari dependent vowel signs (matras) + independent vowels — their
// presence is what makes Devanagari text "readable" versus random syllables.
const DEVANAGARI_VOWEL_MARKS = /[ऄ-औा-ौॢॣ]/;

const JUNK_PHRASES = [
  "test", "testing", "test123", "asdf", "asdfgh", "qwerty", "hello world",
  "lorem ipsum", "sample text", "abc", "abcd", "xyz", "123456", "hi hi hi",
  "checking", "just checking", "ignore this", "dummy", "sdfgh", "aaaaaa",
];

function normLatin(s) {
  return String(s || "").toLowerCase();
}

/**
 * Longest run of consecutive Latin consonants — real words rarely exceed ~4-5.
 * Computed PER WORD (not across the whole string with spaces stripped), so a
 * short vowel-bearing word elsewhere in the sentence can't "rescue" the score
 * of a separate keyboard-mashed word sitting right next to it — each token in
 * "hbkjhnkjnkjh gyguygyug asdkjhaskdjh" is judged on its own merits.
 */
function longestConsonantRun(text) {
  const words = normLatin(text).split(/[^a-z]+/).filter(Boolean);
  let longest = 0;
  for (const word of words) {
    let run = 0;
    for (const ch of word) {
      if (VOWELS_LATIN.has(ch)) { run = 0; continue; }
      run++;
      longest = Math.max(longest, run);
    }
  }
  return longest;
}

/** Fraction of characters that are vowels, among Latin letters only. */
function vowelRatio(text) {
  const letters = normLatin(text).replace(/[^a-z]/g, "");
  if (!letters.length) return null; // no Latin letters — skip this check (e.g. pure Devanagari)
  const vowels = letters.split("").filter((c) => VOWELS_LATIN.has(c)).length;
  return vowels / letters.length;
}

/** Fraction of unique characters — "aaaaaaaaaa" or "kjkjkjkjkj" score very low. */
function uniqueCharRatio(text) {
  const letters = normLatin(text).replace(/[^a-z]/g, "");
  if (letters.length < 6) return 1; // too short to judge, don't penalise
  return new Set(letters).size / letters.length;
}

function hasDevanagariLetters(text) {
  return /[ऀ-ॿ]/.test(text);
}

function hasDevanagariVowels(text) {
  return DEVANAGARI_VOWEL_MARKS.test(text);
}

/**
 * Heuristic pass — synchronous, zero cost, always available.
 * Returns a 0-1 plausibility score and the specific reasons it was docked.
 */
function heuristicCheck(rawText) {
  const text = String(rawText || "").trim();
  const reasons = [];
  let score = 1;

  if (text.length < 8) {
    return { score: 0, verdict: "too_short", reasons: ["too short to describe a problem"] };
  }

  const lower = normLatin(text);
  for (const phrase of JUNK_PHRASES) {
    if (lower === phrase || lower.replace(/[^a-z0-9]/g, "") === phrase.replace(/[^a-z0-9]/g, "")) {
      return { score: 0, verdict: "placeholder_text", reasons: [`matches known placeholder text ("${phrase}")`] };
    }
  }

  const hasDevanagari = hasDevanagariLetters(text);
  const latinLetters = lower.replace(/[^a-z]/g, "");

  if (!hasDevanagari && latinLetters.length >= 6) {
    // Only judge Latin-script coherence when there's enough Latin text to judge.
    const run = longestConsonantRun(text);
    if (run >= 6) { score -= 0.55; reasons.push(`unusually long consonant run (${run}) — reads like keyboard-mashing`); }

    const vr = vowelRatio(text);
    if (vr !== null && vr < 0.12) { score -= 0.45; reasons.push(`almost no vowels (${Math.round(vr * 100)}%) — not readable as words`); }

    const ur = uniqueCharRatio(text);
    if (ur < 0.35) { score -= 0.4; reasons.push("very repetitive characters"); }

    // A single odd token (an abbreviation, a proper noun) is normal in a real
    // sentence. Multiple SEPARATE tokens that are each internally gibberish
    // ("hbkjhnkjnkjh gyguygyug asdkjhaskdjh") is not — real writing doesn't
    // produce more than one keyboard-mashed word in the same message.
    const wordsForRunCheck = normLatin(text).split(/[^a-z]+/).filter((w) => w.length >= 5);
    const gibberishWordCount = wordsForRunCheck.filter((w) => {
      let longest = 0, wrun = 0;
      for (const ch of w) {
        if (VOWELS_LATIN.has(ch)) { wrun = 0; continue; }
        wrun++;
        longest = Math.max(longest, wrun);
      }
      return longest >= 5;
    }).length;
    if (gibberishWordCount >= 2) {
      score -= 0.35;
      reasons.push(`multiple keyboard-mashed words (${gibberishWordCount}) — not real sentence structure`);
    }
  }

  if (hasDevanagari) {
    // A wall of Devanagari consonant glyphs with no vowel signs at all is the
    // Devanagari equivalent of "hbkjhnkjnkjh" — visually script-like, semantically empty.
    const devanagariRun = (text.match(/[ऀ-ॿ]{18,}/g) || []);
    if (devanagariRun.length && !hasDevanagariVowels(text)) {
      score -= 0.45;
      reasons.push("long stretch of Devanagari with no vowel signs — likely random key mashing");
    }
  }

  // A real complaint almost always has more than one distinct word.
  const words = text.split(/\s+/).filter(Boolean);
  const distinctWords = new Set(words.map((w) => w.toLowerCase()));
  if (words.length >= 2 && distinctWords.size === 1) {
    score -= 0.3;
    reasons.push("same word repeated with nothing else said");
  }

  score = Math.max(0, Math.min(1, score));
  const verdict = score >= 0.55 ? "plausible" : score >= 0.42 ? "borderline" : "gibberish";
  return { score: Number(score.toFixed(2)), verdict, reasons };
}

/**
 * Semantic pass — only runs when an LLM is configured. Asks a focused
 * yes/no-style question rather than open-ended chat, and fails OPEN (treats
 * the report as plausible) on any provider error or timeout, so a flaky API
 * key can never block a genuine citizen from filing.
 */
async function semanticCheck(text) {
  const prompt = [
    "You are a plausibility filter for a municipal civic-grievance system in Indore, India.",
    "A citizen submitted the following report text. Decide ONLY whether this describes a",
    "genuine civic problem (infrastructure, safety, sanitation, public services, etc.) as",
    "opposed to spam, a joke, an insult, random text, or something unrelated to civic issues.",
    "",
    "Respond in EXACTLY this format, nothing else:",
    "VERDICT: REAL_ISSUE or NOT_A_COMPLAINT",
    "REASON: <one short sentence, in the same language as the report>",
    "",
    `Report text: "${String(text).slice(0, 500)}"`,
  ].join("\n");

  const res = await llm.chat({
    system: "You are a strict but fair classifier. Follow the exact output format requested. Never invent civic details.",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    maxTokens: 120,
    timeoutMs: 9000,
  });

  if (!res.ok || !res.text) {
    return { ran: false };
  }

  const verdictMatch = res.text.match(/VERDICT:\s*(REAL_ISSUE|NOT_A_COMPLAINT)/i);
  const reasonMatch = res.text.match(/REASON:\s*(.+)/i);

  if (!verdictMatch) return { ran: false };

  const isReal = verdictMatch[1].toUpperCase() === "REAL_ISSUE";
  return {
    ran: true,
    plausible: isReal,
    reason: reasonMatch ? reasonMatch[1].trim().slice(0, 200) : "",
    provider: res.provider,
  };
}

/**
 * Combined gate. Cheap heuristic first; only calls the LLM when the
 * heuristic result is borderline or clean-but-worth-a-second-opinion AND a
 * provider is actually configured — never spends an LLM call on obvious
 * gibberish the heuristic already caught, and never on obvious real reports
 * either (keeps latency and cost down on the common case).
 */
async function assessPlausibility(text, { useLlm = true } = {}) {
  const h = heuristicCheck(text);

  if (h.verdict === "gibberish" || h.verdict === "too_short" || h.verdict === "placeholder_text") {
    return {
      plausible: false,
      confidence: 1 - h.score,
      verdict: h.verdict,
      reason: h.reasons[0] || "does not read as a real report",
      checkedBy: "heuristic",
    };
  }

  const providerReady = llm.getProviderInfo().ready;
  if (!useLlm || !providerReady) {
    return {
      plausible: true,
      confidence: h.score,
      verdict: h.verdict,
      reason: h.reasons[0] || "",
      checkedBy: "heuristic",
    };
  }

  try {
    const s = await semanticCheck(text);
    if (!s.ran) {
      return { plausible: true, confidence: h.score, verdict: h.verdict, reason: "", checkedBy: "heuristic (llm unavailable)" };
    }
    return {
      plausible: s.plausible,
      confidence: s.plausible ? 0.85 : 0.8,
      verdict: s.plausible ? "plausible" : "not_a_complaint",
      reason: s.reason,
      checkedBy: `heuristic+llm:${s.provider}`,
    };
  } catch (err) {
    // Fail OPEN — never let a broken API key block a genuine citizen.
    console.warn("[plausibility] semantic check errored, failing open:", err.message);
    return { plausible: true, confidence: h.score, verdict: h.verdict, reason: "", checkedBy: "heuristic (llm errored)" };
  }
}

module.exports = { assessPlausibility, heuristicCheck, semanticCheck };
