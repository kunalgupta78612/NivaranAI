/**
 * ============================================================================
 *  Nivaran AI — Agent Runtime
 * ============================================================================
 *  Two interchangeable conversation engines behind one interface:
 *
 *   A) LLM PATH (a key is configured)
 *      A proper tool-calling loop. The model chooses tools, we execute them
 *      server-side, feed results back, and let it compose the reply. The model
 *      never invents severity, SLA or department — those come from the civic
 *      engine and are injected as grounding facts.
 *
 *   B) DETERMINISTIC PATH (no key, or the provider fails / times out)
 *      A real slot-filling policy engine. It classifies intent, fills missing
 *      fields across turns, calls the same tools, and answers in the citizen's
 *      language. This is not a stub — it runs the entire demo on its own.
 *
 *  The caller does not know or care which one ran. If the provider dies
 *  mid-demo, path B picks up the same conversation with no visible break.
 * ============================================================================
 */

const brain = require("./civicBrain");
const tools = require("./agentTools");
const { heuristicCheck } = require("./plausibility");
const llm = require("./llm");

const MAX_TOOL_ROUNDS = 4;

/* --------------------------------------------------------------------------
 * System prompt for the LLM path
 * ------------------------------------------------------------------------ */

function buildSystemPrompt(ctx, grounding) {
  return `You are Nivaran AI, the civic resolution agent for the Indore Municipal Corporation.

WHO YOU ARE
You are not a FAQ bot. You ACT on the citizen's behalf using your tools: you file grievances,
look up their status, reject fake resolutions, escalate breached deadlines and draft formal
letters. Prefer doing over explaining.

LANGUAGE
Reply in the language the citizen used. Hindi -> Hindi. Hinglish (Roman Hindi) -> Hinglish.
English -> English. Never mix scripts inside one sentence. Keep replies short — 2 to 4 sentences.
This is a chat window, not a letter.

HARD RULES
1. EMERGENCIES FIRST. Gas leak, fire, live wire, collapse, drowning, injury: call
   emergency_protocol immediately, give the emergency numbers first, and tell them to move to
   safety. Never tell a person in danger to wait for a ticket.
2. NEVER INVENT NUMBERS. Harm scores, SLA days, department names and deadlines come only from
   tool results. If you do not have a tool result, say you will check — do not guess.
3. CHECK FOR DUPLICATES BEFORE FILING. Call find_similar_grievances first. If neighbours already
   reported it, offer to join their ticket — joining raises the priority of the existing ticket,
   which helps the citizen more than a duplicate would.
4. DO NOT FILE A HALF-EMPTY TICKET. You need what the problem is and roughly where. If the
   location is missing, ask one short question for it. Ask for one thing at a time.
5. NEVER STATE A LEGAL RIGHT YOU DID NOT GET FROM explain_entitlement.
6. If the citizen says the problem is still not fixed, that is reopen_and_escalate — do it, then
   tell them what it did to the officer's integrity score.
6b. file_grievance ITSELF verifies the report is a genuine, coherent civic problem before filing —
    you do not need to and cannot skip this. If it comes back with needsClarification, do NOT
    retry with the same or similar text. Ask the citizen, in plain words, what the actual problem
    is. This is a real officer's queue — nothing gets filed on their behalf that isn't real.
7. NEVER DESCRIBE AN ACTION IN THE PAST TENSE UNLESS YOU JUST CALLED THE MATCHING TOOL IN THIS
   SAME TURN. Do not say "filed", "reopened", "escalated", "verified", "joined" or "drafted" as
   something that already happened unless a tool call for it is present in this turn's output.
   If you are not ready to call a tool yet (missing info), say what you still need instead of
   claiming the action is done. A promise ("I will file this") is fine; a false past-tense claim
   is not — the citizen will check the ticket and catch it.

CURRENT CONTEXT
Citizen: ${ctx.citizenName || "citizen"}
${ctx.forceLanguage === "hi" ? "LANGUAGE: The citizen has explicitly set Hindi as their language in the app. Reply ONLY in Hindi (Devanagari script), no matter what script or language they type in." : ctx.forceLanguage === "en" ? "LANGUAGE: The citizen has explicitly set English as their language in the app. Reply ONLY in English, no matter what language they type in." : ""}
${grounding}

Be warm, plain-spoken and brief. Many of these citizens are not comfortable with government
paperwork — you are the person who handles it for them.`;
}

/** Facts the civic engine already computed for this message. */
function buildGrounding(analysis, session) {
  const lines = [];
  lines.push(`Civic engine read of the latest message:`);
  lines.push(`- language: ${analysis.language}`);
  lines.push(`- likely intent: ${analysis.intent}`);
  if (analysis.category) {
    lines.push(
      `- likely category: ${analysis.category.label} (confidence ${analysis.category.confidence}) -> ${analysis.category.dept}`
    );
  }
  if (analysis.ward) lines.push(`- detected location: ${analysis.ward.wardName}`);
  else lines.push(`- detected location: NONE (ask for it before filing)`);
  if (analysis.emergency.isEmergency) {
    lines.push(`- *** EMERGENCY DETECTED: ${analysis.emergency.kind} — call emergency_protocol NOW ***`);
  }
  if (session.lastTicketId) lines.push(`- ticket most recently discussed: ${session.lastTicketId}`);
  if (session.draft && session.draft.awaiting) {
    lines.push(`- you previously asked the citizen for: ${session.draft.awaiting}`);
  }
  return lines.join("\n");
}

/* --------------------------------------------------------------------------
 * Grounding guard — catches an LLM that TALKS about doing something instead
 * of calling the tool that actually does it. This is what makes "the agent
 * never just suggests" an enforced property instead of a prompt request.
 * ------------------------------------------------------------------------ */

const ACTION_CLAIM_PATTERNS = [
  /\bfiled\b/i, /\breopened\b/i, /\bescalated\b/i, /\bverified\b/i, /\bjoined\b/i,
  /\bdrafted\b/i, /\bhas been (filed|reopened|escalated|verified|closed)\b/i,
  /\bदर्ज कर दिया\b/, /\bदर्ज हो गया\b/, /\bखोल दिया\b/, /\bएस्केलेट कर दिया\b/,
  /\bसत्यापित\b/, /\bजोड़ दिया\b/, /\bतैयार है\b/, /\bbana diya\b/i,
  /\bdarj (kar diya|ho gaya)\b/i, /\breopen kar diya\b/i, /\bescalate kar diya\b/i,
  /\bjod diya\b/i, /\btaiyaar hai\b/i,
];

const ACTION_INTENTS = new Set(["file_complaint", "reopen", "verify_resolved", "escalate"]);

/**
 * True when the assistant's own words claim a completed action but the tool
 * layer never actually ran anything this turn. That combination means the
 * model is roleplaying competence instead of exercising it — the one failure
 * mode that would make this "just a chatbot" again.
 */
function claimsActionWithoutToolCall(text, actionsThisTurn) {
  if (!text) return false;
  if (actionsThisTurn && actionsThisTurn.length > 0) return false;
  return ACTION_CLAIM_PATTERNS.some((re) => re.test(text));
}

/* --------------------------------------------------------------------------
 * Bilingual reply templates for the deterministic path
 * ------------------------------------------------------------------------ */

const SAY = {
  greeting: {
    en: "Namaste! I'm Nivaran AI. I can file a complaint for you, check where an existing one stands, reject a fake resolution, or escalate a missed deadline. What's the problem?",
    hi: "नमस्ते! मैं निवारण AI हूँ। मैं आपकी शिकायत दर्ज कर सकता हूँ, स्थिति बता सकता हूँ, झूठे समाधान को रद्द कर सकता हूँ, या समय-सीमा टूटने पर आगे बढ़ा सकता हूँ। समस्या क्या है?",
    hinglish: "Namaste! Main Nivaran AI hoon. Main aapki shikayat darj kar sakta hoon, status bata sakta hoon, jhooth resolution reject kar sakta hoon, ya deadline miss hone par escalate kar sakta hoon. Samasya kya hai?",
  },
  askLocation: {
    en: "Got it. Which area or ward is this in? Even a landmark works.",
    hi: "समझ गया। यह किस इलाके या वार्ड में है? कोई लैंडमार्क भी चलेगा।",
    hinglish: "Samajh gaya. Ye kis area ya ward mein hai? Koi landmark bhi chalega.",
  },
  askProblem: {
    en: "Tell me what's wrong and roughly where, and I'll file it right now.",
    hi: "बताइए क्या खराबी है और कहाँ, मैं अभी दर्ज कर देता हूँ।",
    hinglish: "Bataiye kya kharabi hai aur kahan, main abhi darj kar deta hoon.",
  },
  noTickets: {
    en: "You haven't filed anything yet. Describe the problem and I'll register it.",
    hi: "आपने अभी तक कोई शिकायत दर्ज नहीं की है। समस्या बताइए, मैं दर्ज कर देता हूँ।",
    hinglish: "Aapne abhi tak koi shikayat darj nahi ki hai. Samasya bataiye, main darj kar deta hoon.",
  },
  help: {
    en: "I can: file a complaint, track one, reject a resolution that didn't happen, tell you what the department owes you, and draft an escalation or RTI letter. Just say it in your own words.",
    hi: "मैं कर सकता हूँ: शिकायत दर्ज, स्थिति जाँच, झूठे समाधान को रद्द, विभाग की जिम्मेदारी बताना, और एस्केलेशन या RTI पत्र तैयार करना। अपने शब्दों में बताइए।",
    hinglish: "Main kar sakta hoon: shikayat darj, status check, jhooth resolution reject, department ki zimmedari batana, aur escalation ya RTI letter draft karna. Apne shabdon mein bataiye.",
  },
};

function say(key, lang) {
  const block = SAY[key] || {};
  return block[lang] || block.en || "";
}

const AFFIRMATIVE = ["haan", "हाँ", "हां", "ha", "yes", "yeah", "yep", "ok", "okay", "theek", "ठीक", "sure", "kar do", "कर दो", "karo", "करो", "join", "1", "sahi", "बिलकुल", "bilkul"];
const NEGATIVE = ["nahi", "नहीं", "no", "nope", "mat", "मत", "naya", "नया", "new", "alag", "अलग", "2", "separate"];

function isAffirmative(text) {
  const t = brain.norm(text);
  return AFFIRMATIVE.some((k) => t === k || t.startsWith(k + " ") || t.includes(" " + k + " ") || t.endsWith(" " + k));
}
function isNegative(text) {
  const t = brain.norm(text);
  return NEGATIVE.some((k) => t === k || t.startsWith(k + " ") || t.includes(" " + k + " ") || t.endsWith(" " + k));
}

/* --------------------------------------------------------------------------
 * Narrating tool results in the citizen's language (deterministic path)
 * ------------------------------------------------------------------------ */

function narrate(result, lang) {
  if (result && result.needsClarification) {
    // The plausibility gate turned this away — ask for the real problem
    // instead of a flat apology. Deliberately not preachy about it.
    return lang === "hi"
      ? "यह एक स्पष्ट शिकायत जैसा नहीं लग रहा। कृपया बताइए वास्तव में समस्या क्या है — जैसे \"सड़क पर बड़ा गड्ढा है\" या \"पानी की सप्लाई 3 दिन से बंद है\"।"
      : lang === "hinglish"
      ? "Ye ek clear shikayat jaisa nahi lag raha. Kripya bataiye asal problem kya hai — jaise \"sadak par bada gaddha hai\" ya \"paani ki supply 3 din se band hai\"."
      : "That doesn't read as a clear complaint yet. Could you tell me what the actual problem is — for example \"there's a large pothole on the main road\" or \"water supply has been cut for 3 days\"?";
  }

  if (!result || !result.ok) {
    const err = (result && result.error) || "Something went wrong.";
    return lang === "hi" ? `माफ़ कीजिए — ${err}` : lang === "hinglish" ? `Maaf kijiye — ${err}` : err;
  }

  const t = result.ticket || {};

  switch (result.action) {
    case "emergency": {
      const nums = (result.emergencyNumbers || []).join(" / ");
      if (lang === "hi") {
        return `⚠️ यह आपातकाल है। पहले तुरंत कॉल कीजिए: ${nums}. सुरक्षित दूरी पर हट जाइए।\n\nमैंने साथ-साथ ${t.ticketId} दर्ज कर के सीधे आयुक्त तक भेज दिया है — लेकिन पहले कॉल कीजिए, टिकट बाद की बात है।`;
      }
      if (lang === "hinglish") {
        return `⚠️ Ye emergency hai. Pehle turant call kijiye: ${nums}. Safe distance par hat jaiye.\n\nMaine saath hi ${t.ticketId} file karke seedha Commissioner tak bhej diya hai — lekin pehle call kijiye, ticket baad ki baat hai.`;
      }
      return `⚠️ This is an emergency. Call these right now: ${nums}. Move away from the hazard.\n\nI've filed ${t.ticketId} in parallel and escalated it straight to the Commissioner — but make the call first.`;
    }

    case "filed": {
      const a = result.assessment || {};
      if (lang === "hi") {
        return `दर्ज हो गया — ${t.ticketId}.\n${a.category} के रूप में वर्गीकृत, ${a.dept} को भेजा गया। गंभीरता ${a.harmScore}/100 (${a.priority}), समय-सीमा ${a.slaDays} दिन।\nअगर समय पर काम न हो, मुझे बताइएगा — मैं खुद आगे बढ़ा दूँगा।`;
      }
      if (lang === "hinglish") {
        return `Darj ho gaya — ${t.ticketId}.\n${a.category} classify hua, ${a.dept} ko bheja gaya. Severity ${a.harmScore}/100 (${a.priority}), SLA ${a.slaDays} din.\nAgar time par kaam na ho toh bataiyega — main khud escalate kar dunga.`;
      }
      return `Filed — ${t.ticketId}.\nClassified as ${a.category}, routed to ${a.dept}. Severity ${a.harmScore}/100 (${a.priority}), SLA ${a.slaDays} days.\nIf they miss the deadline, tell me and I'll escalate it myself.`;
    }

    case "joined": {
      const arrow = `${result.before.harmScore} → ${result.after.harmScore}`;
      if (lang === "hi") {
        return `जोड़ दिया — अब आप ${t.ticketId} के सह-शिकायतकर्ता हैं (कुल ${t.supportCount})।\nइससे इस शिकायत की गंभीरता ${arrow} हो गई${result.escalatedPriority ? ` और प्राथमिकता बढ़कर ${result.after.priority} हो गई` : ""}। डुप्लीकेट से बेहतर यही था।`;
      }
      if (lang === "hinglish") {
        return `Jod diya — ab aap ${t.ticketId} ke co-reporter hain (total ${t.supportCount}).\nIsse is shikayat ki severity ${arrow} ho gayi${result.escalatedPriority ? ` aur priority badhkar ${result.after.priority} ho gayi` : ""}. Duplicate se behtar yahi tha.`;
      }
      return `Done — you're now a co-reporter on ${t.ticketId} (${t.supportCount} total).\nThat pushed its severity ${arrow}${result.escalatedPriority ? ` and raised the priority to ${result.after.priority}` : ""}. Better than a duplicate.`;
    }

    case "reopened":
    case "escalated": {
      const esc = result.escalatedTo ? ` और ${result.escalatedTo} तक एस्केलेट कर दिया` : "";
      if (lang === "hi") {
        return `${t.ticketId} फिर से खोल दिया${esc}.\n${result.officerImpact}.${result.slaBreached ? ` समय-सीमा ${result.overdueDays} दिन पहले ही टूट चुकी थी।` : ""}\nचाहें तो मैं एस्केलेशन पत्र या RTI आवेदन भी बना दूँ?`;
      }
      if (lang === "hinglish") {
        return `${t.ticketId} reopen kar diya${result.escalatedTo ? ` aur ${result.escalatedTo} tak escalate kar diya` : ""}.\n${result.officerImpact}.${result.slaBreached ? ` SLA ${result.overdueDays} din pehle hi breach ho chuka tha.` : ""}\nChahein toh main escalation letter ya RTI application bhi bana doon?`;
      }
      return `Reopened ${t.ticketId}${result.escalatedTo ? ` and escalated to ${result.escalatedTo}` : ""}.\n${result.officerImpact}.${result.slaBreached ? ` The SLA was already breached by ${result.overdueDays} days.` : ""}\nWant me to draft an escalation letter or an RTI application?`;
    }

    case "verified": {
      if (lang === "hi") return `${t.ticketId} सत्यापित रूप से हल — धन्यवाद। ${t.officerName} को श्रेय मिल गया, और यह लेजर में दर्ज है।`;
      if (lang === "hinglish") return `${t.ticketId} verified resolved — dhanyavaad. ${t.officerName} ko credit mil gaya, aur ye ledger mein darj hai.`;
      return `${t.ticketId} marked verified — thank you. ${t.officerName} has been credited, and it's recorded on the ledger.`;
    }

    case "letter_drafted": {
      if (lang === "hi") return `${result.mode === "rti" ? "RTI आवेदन" : "एस्केलेशन पत्र"} तैयार है — ${result.addressedTo} के नाम, ${result.overdueDays} दिन की देरी और ऑडिट हैश के साथ। नीचे से डाउनलोड कर लीजिए।`;
      if (lang === "hinglish") return `${result.mode === "rti" ? "RTI application" : "Escalation letter"} taiyaar hai — ${result.addressedTo} ke naam, ${result.overdueDays} din ki deri aur audit hash ke saath. Neeche se download kar lijiye.`;
      return `Your ${result.mode === "rti" ? "RTI application" : "escalation letter"} is ready — addressed to ${result.addressedTo}, citing the ${result.overdueDays}-day delay and the audit hash. Download it below.`;
    }

    default:
      break;
  }

  // track_grievance
  if (result.ticket && !result.action) {
    const x = result.ticket;
    const slaLine = x.slaBreached
      ? lang === "hi"
        ? `समय-सीमा ${x.overdueDays} दिन पहले टूट चुकी है।`
        : lang === "hinglish"
        ? `SLA ${x.overdueDays} din pehle breach ho chuka hai.`
        : `The SLA is breached by ${x.overdueDays} days.`
      : lang === "hi"
      ? `${x.daysLeft} दिन बाकी हैं।`
      : lang === "hinglish"
      ? `${x.daysLeft} din baaki hain.`
      : `${x.daysLeft} days remaining.`;

    const tail = x.slaBreached
      ? lang === "hi"
        ? " कहिए तो अभी एस्केलेट कर दूँ?"
        : lang === "hinglish"
        ? " Kahiye toh abhi escalate kar doon?"
        : " Want me to escalate it right now?"
      : "";

    if (lang === "hi") return `${x.ticketId} — ${x.status}, ${x.dept} के पास, अधिकारी ${x.officerName}. ${slaLine}${tail}`;
    if (lang === "hinglish") return `${x.ticketId} — ${x.status}, ${x.dept} ke paas, officer ${x.officerName}. ${slaLine}${tail}`;
    return `${x.ticketId} — ${x.status}, with ${x.dept}, officer ${x.officerName}. ${slaLine}${tail}`;
  }

  if (result.tickets) {
    if (!result.tickets.length) return say("noTickets", lang);
    const lines = result.tickets
      .map((x) => `• ${x.ticketId} — ${x.category}, ${x.status}${x.slaBreached ? ` (overdue ${x.overdueDays}d)` : ""}`)
      .join("\n");
    if (lang === "hi") return `आपकी हाल की शिकायतें:\n${lines}\n\nकिसी एक के बारे में पूछिए या कहिए "एस्केलेट करो"।`;
    if (lang === "hinglish") return `Aapki recent shikayatein:\n${lines}\n\nKisi ek ke baare mein poochiye ya kahiye "escalate karo".`;
    return `Your recent grievances:\n${lines}\n\nAsk about any one, or say "escalate it".`;
  }

  // explain_entitlement
  if (result.remedies) {
    const head =
      lang === "hi"
        ? `${result.dept} की जिम्मेदारी है, तय समय-सीमा ${result.slaDays} दिन।`
        : lang === "hinglish"
        ? `${result.dept} ki zimmedari hai, SLA ${result.slaDays} din.`
        : `${result.dept} is responsible, with an SLA of ${result.slaDays} days.`;
    const status = result.breached
      ? lang === "hi"
        ? ` आपका मामला ${result.overdueDays} दिन देरी से चल रहा है।`
        : lang === "hinglish"
        ? ` Aapka case ${result.overdueDays} din late chal raha hai.`
        : ` Yours is ${result.overdueDays} days overdue.`
      : "";
    return `${head}${status}\n\n${result.remedies.map((r) => `• ${r}`).join("\n")}`;
  }

  // find_similar
  if (typeof result.count === "number" && result.matches) {
    if (!result.count) return "";
    const m = result.matches[0];
    if (lang === "hi") {
      return `रुकिए — ${result.ward} में ${result.count} लोग पहले ही यही रिपोर्ट कर चुके हैं।\n${m.ticketId}: "${m.text}" (${m.daysOpen} दिन पुरानी, ${m.supportCount} समर्थक)\n\nनई शिकायत के बजाय इसी में जुड़ जाइए — इससे उसकी प्राथमिकता बढ़ेगी। जोड़ दूँ?`;
    }
    if (lang === "hinglish") {
      return `Rukiye — ${result.ward} mein ${result.count} log pehle hi yahi report kar chuke hain.\n${m.ticketId}: "${m.text}" (${m.daysOpen} din purani, ${m.supportCount} supporters)\n\nNayi shikayat ke bajaye isi mein jud jaiye — isse uski priority badhegi. Jod doon?`;
    }
    return `Hold on — ${result.count} neighbour(s) in ${result.ward} already reported this.\n${m.ticketId}: "${m.text}" (${m.daysOpen} days old, ${m.supportCount} supporters)\n\nInstead of a duplicate, join theirs — it raises that ticket's priority. Shall I add you?`;
  }

  return "";
}

/* ==========================================================================
 * PATH B — deterministic policy engine
 * ========================================================================== */

async function runDeterministic({ session, message, ctx, analysis }) {
  const lang = analysis.language;
  const actions = [];
  const draft = session.draft || {};

  const push = async (name, input) => {
    const r = await tools.execute(name, input, ctx);
    actions.push({ tool: name, result: r });
    return r;
  };

  const finish = (reply) => ({ reply, actions });

  /* ---- 0. Emergencies override everything ---- */
  if (analysis.emergency.isEmergency) {
    const r = await push("emergency_protocol", { description: message, locality: draft.locality });
    if (r.ok && r.ticket) session.lastTicketId = r.ticket.ticketId;
    session.draft = {};
    return finish(narrate(r, lang));
  }

  /* ---- 1. Answering a question we asked last turn ---- */
  if (draft.awaiting === "join_choice" && draft.candidateTicketId) {
    if (isAffirmative(message)) {
      const r = await push("join_grievance", { ticketId: draft.candidateTicketId });
      if (r.ok) session.lastTicketId = draft.candidateTicketId;
      session.draft = {};
      return finish(narrate(r, lang));
    }
    if (isNegative(message)) {
      const r = await push("file_grievance", {
        description: draft.text,
        locality: draft.locality,
        landmark: draft.landmark,
        hasPhoto: draft.hasPhoto,
      });
      if (r.ok) session.lastTicketId = r.ticket.ticketId;
      session.draft = {};
      return finish(narrate(r, lang));
    }
  }

  if (draft.awaiting === "location") {
    const ward = brain.extractWard(message);
    if (ward || message.trim().length >= 3) {
      session.draft.locality = message.trim();
      session.draft.awaiting = "";
      return await proceedToFile({ session, ctx, lang, push, finish });
    }
  }

  if (draft.awaiting === "clarify_problem") {
    // Citizen re-describing the actual problem after a plausibility
    // rejection — keep the location/landmark they already gave, only the
    // description text is being replaced.
    session.draft.text = message.trim();
    session.draft.awaiting = "";
    return await proceedToFile({ session, ctx, lang, push, finish });
  }

  /* ---- 2. Intent routing ---- */
  switch (analysis.intent) {
    case "greeting":
      return finish(say("greeting", lang));

    case "help":
      return finish(say("help", lang));

    case "track_status": {
      const r = await push("track_grievance", { ticketId: analysis.ticketId || "" });
      if (r.ok && r.ticket) session.lastTicketId = r.ticket.ticketId;
      else if (r.ok && r.tickets && r.tickets.length) session.lastTicketId = r.tickets[0].ticketId;
      return finish(narrate(r, lang) || say("noTickets", lang));
    }

    case "reopen": {
      let ticketId = analysis.ticketId || session.lastTicketId;
      if (!ticketId) {
        const list = await push("track_grievance", {});
        if (list.ok && list.tickets && list.tickets.length) {
          ticketId = list.tickets[0].ticketId;
          session.lastTicketId = ticketId;
        } else {
          return finish(say("noTickets", lang));
        }
      }
      const r = await push("reopen_and_escalate", { ticketId, reason: message });
      if (r.ok) session.lastTicketId = ticketId;
      return finish(narrate(r, lang));
    }

    case "verify_resolved": {
      const ticketId = analysis.ticketId || session.lastTicketId;
      if (!ticketId) return finish(say("noTickets", lang));
      const r = await push("verify_resolved", { ticketId });
      return finish(narrate(r, lang));
    }

    case "escalate": {
      const ticketId = analysis.ticketId || session.lastTicketId;
      if (!ticketId) {
        const list = await push("track_grievance", {});
        if (!list.ok || !list.tickets || !list.tickets.length) return finish(say("noTickets", lang));
        session.lastTicketId = list.tickets[0].ticketId;
        return finish(narrate(list, lang));
      }
      const wantsRti = /rti|आरटीआई|information act/i.test(message);
      const r = await push("draft_escalation_letter", { ticketId, mode: wantsRti ? "rti" : "escalation" });
      return finish(narrate(r, lang));
    }

    case "rights_info": {
      const ticketId = analysis.ticketId || session.lastTicketId;
      const r = await push("explain_entitlement", ticketId ? { ticketId } : { problemType: message });
      return finish(narrate(r, lang));
    }

    case "file_complaint":
    default: {
      session.draft = {
        text: draft.text && draft.text.length > message.length ? draft.text : message,
        locality: draft.locality || (analysis.ward ? analysis.ward.wardName : ""),
        landmark: analysis.landmark || draft.landmark || "",
        hasPhoto: ctx.hasPhoto || draft.hasPhoto || false,
        awaiting: "",
        candidateTicketId: "",
      };

      // Cheap heuristic pre-check BEFORE asking for a location — rejecting
      // gibberish on the first turn instead of walking the citizen through a
      // location question for a "complaint" that was never going to be filed.
      // This is the fast layer only; the full gate (with the LLM second
      // opinion, when configured) still runs again inside file_grievance at
      // actual filing time — this is just to avoid a wasted round-trip.
      const quickCheck = heuristicCheck(session.draft.text);
      if (quickCheck.verdict === "gibberish" || quickCheck.verdict === "placeholder_text") {
        session.draft = { ...session.draft, text: "", awaiting: "clarify_problem" };
        return finish(narrate({ ok: false, needsClarification: true, reason: quickCheck.reasons[0] }, lang));
      }

      if (!analysis.ward && !session.draft.locality) {
        session.draft.awaiting = "location";
        return finish(say("askLocation", lang));
      }
      return await proceedToFile({ session, ctx, lang, push, finish });
    }
  }
}

/** Shared tail: dedupe check, then either offer to join or file. */
async function proceedToFile({ session, ctx, lang, push, finish }) {
  const d = session.draft || {};
  if (!d.text || d.text.trim().length < 8) {
    session.draft.awaiting = "";
    return finish(say("askProblem", lang));
  }

  const similar = await push("find_similar_grievances", { description: d.text, locality: d.locality });

  if (similar.ok && similar.count > 0) {
    session.draft.awaiting = "join_choice";
    session.draft.candidateTicketId = similar.matches[0].ticketId;
    return finish(narrate(similar, lang));
  }

  const r = await push("file_grievance", {
    description: d.text,
    locality: d.locality,
    landmark: d.landmark,
    hasPhoto: d.hasPhoto,
  });

  if (!r.ok && r.needsClarification) {
    // Keep what the citizen already told us (location/landmark/photo) —
    // only the problem description gets asked again.
    session.draft = { ...d, text: "", awaiting: "clarify_problem" };
    return finish(narrate(r, lang));
  }

  if (r.ok) session.lastTicketId = r.ticket.ticketId;
  session.draft = {};
  return finish(narrate(r, lang));
}

/* ==========================================================================
 * PATH A — LLM tool-calling loop
 * ========================================================================== */

async function runLLM({ session, message, ctx, analysis }) {
  const grounding = buildGrounding(analysis, session);
  const system = buildSystemPrompt(ctx, grounding);
  const schemas = tools.toolSchemas(session.role || "citizen");

  // Replay recent transcript so the model has conversational memory
  const history = (session.messages || []).slice(-12).map((m) => ({
    role: m.role,
    content: m.content,
    toolCalls: m.toolCalls || undefined,
    toolCallId: m.toolCallId || undefined,
    toolName: m.toolName || undefined,
  }));

  const messages = [...history, { role: "user", content: message }];
  const actions = [];
  const newMessages = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const res = await llm.chat({ system, messages, tools: schemas, temperature: 0.35 });

    if (!res.ok) {
      return { ok: false, reason: res.reason, provider: res.provider, actions };
    }

    if (!res.toolCalls.length) {
      // The model produced a final answer with no tool calls this round.
      // If it ALSO never called a tool in any earlier round of this turn AND
      // it is describing a completed action, that is an ungrounded claim —
      // reject the whole LLM turn so the caller falls back to the
      // deterministic engine, which cannot talk without also acting.
      const intentNeedsAction = ACTION_INTENTS.has(analysis.intent) && !analysis.emergency.isEmergency;
      const talkedInsteadOfActed = intentNeedsAction && actions.length === 0;

      if (claimsActionWithoutToolCall(res.text, actions) || talkedInsteadOfActed) {
        return {
          ok: false,
          reason: talkedInsteadOfActed
            ? `Citizen's intent (${analysis.intent}) requires a tool call and none was made.`
            : "Model claimed a completed action without calling the matching tool.",
          provider: res.provider,
          actions,
          ungrounded: true,
        };
      }
      newMessages.push({ role: "assistant", content: res.text });
      return {
        ok: true,
        reply: res.text,
        actions,
        provider: res.provider,
        model: res.model,
        ms: res.ms,
        newMessages,
      };
    }

    // Model asked for tools — run them for real
    const assistantMsg = { role: "assistant", content: res.text || "", toolCalls: res.toolCalls };
    messages.push(assistantMsg);
    newMessages.push(assistantMsg);

    for (const call of res.toolCalls) {
      const result = await tools.execute(call.name, call.input, ctx);
      actions.push({ tool: call.name, input: call.input, result });

      if (result.ok && result.ticket && result.ticket.ticketId) {
        session.lastTicketId = result.ticket.ticketId;
      }

      const toolMsg = {
        role: "tool",
        toolCallId: call.id,
        toolName: call.name,
        content: JSON.stringify(result).slice(0, 6000),
      };
      messages.push(toolMsg);
      newMessages.push(toolMsg);
    }
  }

  // Ran out of rounds — summarise whatever the tools produced
  const last = actions[actions.length - 1];
  return {
    ok: true,
    reply: last ? narrate(last.result, analysis.language) : "",
    actions,
    provider: "llm",
    truncated: true,
    newMessages,
  };
}

/* ==========================================================================
 * Public entry point
 * ========================================================================== */

async function respond({ session, message, ctx }) {
  const analysis = brain.analyze(message, { photo: !!ctx.hasPhoto });

  if (ctx.forceLanguage === "hi" || ctx.forceLanguage === "en") {
    // Explicit citizen choice from the UI toggle always wins — no auto-detect,
    // no stickiness heuristic, no exceptions.
    analysis.language = ctx.forceLanguage;
    session.language = ctx.forceLanguage;
  } else {
    // Language stickiness: a one-word reply like "haan" or "ok" carries no
    // reliable language signal. Snapping back to English mid-conversation reads
    // as the bot forgetting who it is talking to, so short turns inherit the
    // language the citizen has already been using.
    const wordCount = String(message).trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 4 && session.language && analysis.language === "en") {
      analysis.language = session.language;
    } else {
      session.language = analysis.language;
    }
  }

  const info = llm.getProviderInfo();
  let engine = "civic-engine";
  let reply = "";
  let actions = [];
  let degraded = null;

  if (info.ready) {
    const out = await runLLM({ session, message, ctx, analysis });
    if (out.ok) {
      engine = `${out.provider}:${out.model || info.model}`;
      reply = out.reply;
      actions = out.actions;
      session.messages.push({ role: "user", content: message, at: new Date() });
      for (const m of out.newMessages || []) session.messages.push({ ...m, at: new Date() });
    } else {
      // Provider failed mid-demo — fall through silently to the civic engine.
      degraded = out.reason;
      console.warn("[agentRuntime] LLM path failed, falling back:", out.reason);
    }
  }

  if (!reply) {
    const out = await runDeterministic({ session, message, ctx, analysis });
    reply = out.reply;
    actions = [...actions, ...out.actions];
    session.messages.push({ role: "user", content: message, at: new Date() });
    session.messages.push({ role: "assistant", content: reply, at: new Date() });
  }

  session.provider = engine;
  session.turnCount = (session.turnCount || 0) + 1;

  return { reply, actions, analysis, engine, degraded };
}

module.exports = { respond, runDeterministic, runLLM, narrate, buildSystemPrompt, SAY };
