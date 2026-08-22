/**
 * ============================================================================
 *  Nivaran AI — Civic Reasoning Engine  ("the deterministic brain")
 * ============================================================================
 *  Zero dependencies. Zero network. Always available.
 *
 *  Two jobs:
 *    1. FALLBACK — when no LLM key is configured (or the provider fails or
 *       times out), this engine alone runs the whole conversation. The demo
 *       never dies because an API key expired at 4 AM.
 *    2. GROUNDING — when an LLM *is* configured, this engine still computes
 *       the category, department, SLA and 8-stage harm score. The LLM handles
 *       language and conversation; it never invents a severity number or an
 *       SLA. Those come from here, deterministically, and are auditable.
 *
 *  Everything here understands Hindi (Devanagari), Hinglish (Roman Hindi)
 *  and English, because that is how Indore actually talks.
 * ============================================================================
 */

/* --------------------------------------------------------------------------
 * 1. Category taxonomy — maps to the existing Grievance schema fields
 *    (category, categoryLabel, dept, slaDays) so nothing downstream changes.
 * ------------------------------------------------------------------------ */

const CATEGORIES = [
  {
    key: "electricity",
    label: "Electricity & Power",
    dept: "Electricity Department",
    slaDays: 2,
    baseSeverity: 55,
    keywords: [
      "transformer", "बिजली", "bijli", "current", "करंट", "power cut", "powercut",
      "electric", "बिजली गुल", "light gone", "wire", "तार", "shock", "झटका",
      "short circuit", "spark", "चिंगारी", "meter", "मीटर", "pole", "खंभा",
      "voltage", "वोल्टेज", "supply band", "kat gayi", "कट गई",
    ],
  },
  {
    key: "water",
    label: "Water Supply",
    dept: "Water Works Department",
    slaDays: 2,
    baseSeverity: 50,
    keywords: [
      "पानी", "pani", "water", "नल", "nal", "tap", "pipeline", "पाइप", "pipe",
      "leak", "लीक", "रिसाव", "supply", "सप्लाई", "tanker", "टैंकर", "borewell",
      "बोरवेल", "gandha pani", "गंदा पानी", "dirty water", "contaminated",
      "हैंडपंप", "handpump", "टंकी", "tanki",
    ],
  },
  {
    key: "roads",
    label: "Roads & Public Works",
    dept: "Roads & Public Works",
    slaDays: 7,
    baseSeverity: 38,
    keywords: [
      "सड़क", "sadak", "road", "गड्ढा", "gaddha", "pothole", "खड्डा", "khadda",
      "रोड", "footpath", "फुटपाथ", "divider", "डिवाइडर", "speed breaker",
      "स्पीड ब्रेकर", "tuta", "टूटा", "broken road", "damage", "मरम्मत",
      "repair", "बजरी", "gravel", "puliya", "पुलिया", "bridge",
    ],
  },
  {
    key: "sanitation",
    label: "Sanitation & Waste",
    dept: "Sanitation Department",
    slaDays: 3,
    baseSeverity: 34,
    keywords: [
      "कचरा", "kachra", "garbage", "waste", "कूड़ा", "kooda", "सफाई", "safai",
      "clean", "dustbin", "डस्टबिन", "गंदगी", "gandagi", "dirty", "trash",
      "dump", "डंप", "sweeper", "झाड़ू", "jhadu", "बदबू", "badbu", "smell",
      "stink", "garbage vehicle", "कचरा गाड़ी",
    ],
  },
  {
    key: "drainage",
    label: "Drainage & Sewage",
    dept: "Drainage Department",
    slaDays: 3,
    baseSeverity: 48,
    keywords: [
      "नाली", "nali", "drain", "drainage", "सीवर", "sewer", "sewage", "गटर",
      "gutter", "overflow", "ओवरफ्लो", "चोक", "chok", "choked", "blocked",
      "बंद नाली", "जलभराव", "jalbharav", "waterlogging", "water logging",
      "manhole", "मैनहोल", "chamber", "बहाव",
    ],
  },
  {
    key: "streetlight",
    label: "Street Lighting",
    dept: "Street Lighting Department",
    slaDays: 4,
    baseSeverity: 30,
    keywords: [
      "स्ट्रीट लाइट", "street light", "streetlight", "लाइट", "light",
      "खंभे की लाइट", "lamp", "लैंप", "andhera", "अंधेरा", "dark", "darkness",
      "बल्ब", "bulb", "roshni", "रोशनी", "सोडियम", "led",
    ],
  },
  {
    key: "stray_animals",
    label: "Stray Animals",
    dept: "Veterinary Department",
    slaDays: 5,
    baseSeverity: 42,
    keywords: [
      "कुत्ता", "kutta", "dog", "आवारा", "awara", "stray", "गाय", "gaay", "cow",
      "cattle", "मवेशी", "सांड", "saand", "bull", "बंदर", "bandar", "monkey",
      "सूअर", "pig", "काट", "kaat", "bite", "काटा", "rabies",
    ],
  },
  {
    key: "encroachment",
    label: "Encroachment",
    dept: "Encroachment Removal Cell",
    slaDays: 10,
    baseSeverity: 26,
    keywords: [
      "अतिक्रमण", "atikraman", "encroach", "encroachment", "कब्जा", "kabza",
      "illegal", "अवैध", "avaidh", "ठेला", "thela", "hawker", "construction",
      "निर्माण", "nirman", "अवैध निर्माण", "banner", "होर्डिंग", "hoarding",
    ],
  },
  {
    key: "public_health",
    label: "Public Health",
    dept: "Public Health Department",
    slaDays: 3,
    baseSeverity: 52,
    keywords: [
      "मच्छर", "machhar", "mosquito", "डेंगू", "dengue", "मलेरिया", "malaria",
      "बीमारी", "bimari", "epidemic", "महामारी", "fogging", "फॉगिंग",
      "spray", "छिड़काव", "dead animal", "मृत", "sanitizer", "outbreak",
    ],
  },
  {
    key: "traffic_signals",
    label: "Traffic & Signals",
    dept: "Traffic Management Department",
    slaDays: 4,
    baseSeverity: 50,
    keywords: [
      "ट्रैफिक सिग्नल", "traffic signal", "signal kharab", "सिग्नल खराब", "red light",
      "traffic light", "चौराहा", "chauraha", "junction", "zebra crossing",
      "ज़ेब्रा क्रॉसिंग", "traffic jam", "जाम", "jam", "signal band", "blinking signal",
    ],
  },
  {
    key: "illegal_parking",
    label: "Illegal Parking & Road Obstruction",
    dept: "Traffic Management Department",
    slaDays: 3,
    baseSeverity: 32,
    keywords: [
      "गलत पार्किंग", "illegal parking", "wrong parking", "parking", "पार्किंग",
      "गाड़ी खड़ी", "gaadi khadi", "road block", "रोड ब्लॉक", "encroached parking",
      "no parking zone", "footpath par gaadi", "फुटपाथ पर गाड़ी", "galat parking",
      "parking kar diya", "footpath par parking", "gaadi footpath par",
    ],
  },
  {
    key: "parks_trees",
    label: "Parks, Trees & Green Spaces",
    dept: "Horticulture Department",
    slaDays: 6,
    baseSeverity: 30,
    keywords: [
      "पार्क", "park", "बगीचा", "bagicha", "garden", "पेड़", "ped", "tree",
      "gira hua ped", "गिरा हुआ पेड़", "fallen tree", "branch", "टहनी",
      "playground", "swing", "झूला", "jhula", "jhoola", "jhoolna", "gardener", "माली",
    ],
  },
  {
    key: "noise_pollution",
    label: "Noise Pollution",
    dept: "Environment & Pollution Control",
    slaDays: 5,
    baseSeverity: 28,
    keywords: [
      "शोर", "shor", "noise", "आवाज़", "aawaz", "loudspeaker", "लाउडस्पीकर",
      "dj", "डीजे", "band baja", "बैंड बाजा", "loud music", "तेज़ आवाज़",
      "horn", "हॉर्न", "construction noise",
    ],
  },
  {
    key: "building_safety",
    label: "Building & Structural Safety",
    dept: "Building Permission & Safety Cell",
    slaDays: 3,
    baseSeverity: 64,
    keywords: [
      "इमारत", "imarat", "building", "जर्जर", "jarjar", "dilapidated", "दीवार",
      "deewar", "wall crack", "दरार", "darar", "crack", "unsafe structure",
      "असुरक्षित इमारत", "balcony gir", "बालकनी", "roof leak", "छत टपक",
    ],
  },
  {
    key: "food_safety",
    label: "Food Safety & Hygiene",
    dept: "Food Safety Department",
    slaDays: 4,
    baseSeverity: 46,
    keywords: [
      "खाना", "khana", "food", "मिलावट", "milawat", "adulteration", "बासी",
      "baasi", "stale food", "अस्वच्छ", "unhygienic", "street food",
      "ठेला खाना", "food poisoning", "फूड प्वाइजनिंग", "expired", "एक्सपायर",
    ],
  },
];

const FALLBACK_CATEGORY = CATEGORIES.find((c) => c.key === "sanitation");

/* --------------------------------------------------------------------------
 * 2. Hazard, vulnerability, scale and duration lexicons
 * ------------------------------------------------------------------------ */

// Words that mean "someone could be hurt today"
const HAZARD_TERMS = [
  { t: ["spark", "चिंगारी", "chingari", "sparking"], w: 22, why: "active sparking reported" },
  { t: ["आग", "aag", "fire", "जल रहा", "jal raha", "burning", "धुआं", "smoke"], w: 30, why: "fire or smoke reported" },
  { t: ["करंट", "current", "shock", "झटका", "electrocut", "बिजली का तार गिरा", "live wire"], w: 30, why: "live-electricity hazard" },
  { t: ["गैस", "gas leak", "गैस रिसाव", "lpg"], w: 32, why: "gas leak reported" },
  { t: ["गिर", "gir gaya", "collapse", "ढह", "dhah", "गिरने वाला", "falling"], w: 24, why: "structural collapse risk" },
  { t: ["खुला", "khula", "open manhole", "खुला मैनहोल", "uncovered", "बिना ढक्कन"], w: 20, why: "open manhole / uncovered hazard" },
  { t: ["accident", "दुर्घटना", "durghatna", "हादसा", "hadsa", "injured", "घायल", "ghayal"], w: 26, why: "injury or accident linked" },
  { t: ["गंदा पानी", "contaminated", "दूषित", "सीवर का पानी", "sewage water", "peene"], w: 22, why: "contaminated drinking water" },
  { t: ["काट लिया", "kaat liya", "bite", "काटा", "attacked", "हमला"], w: 24, why: "animal attack reported" },
];

// Places where the same fault is much more dangerous
const VULNERABLE_PLACES = [
  { t: ["स्कूल", "school", "विद्यालय", "आंगनवाड़ी", "anganwadi", "बच्चों", "children", "बच्चे"], w: 18, why: "near a school / children" },
  { t: ["अस्पताल", "hospital", "clinic", "क्लिनिक", "dispensary", "स्वास्थ्य केंद्र", "nursing home"], w: 20, why: "near a hospital" },
  { t: ["बुजुर्ग", "elderly", "old age", "वृद्ध", "दिव्यांग", "handicap", "wheelchair"], w: 12, why: "vulnerable residents affected" },
  { t: ["बाजार", "market", "मंडी", "mandi", "बस स्टैंड", "bus stand", "स्टेशन", "station", "मंदिर", "temple", "मस्जिद"], w: 10, why: "high-footfall public area" },
];

// How many people are affected
const SCALE_TERMS = [
  { t: ["पूरा मोहल्ला", "poora mohalla", "whole colony", "पूरी कॉलोनी", "entire", "सब लोग", "sabhi", "everyone", "सैकड़ों", "hundreds"], w: 16, why: "whole locality affected" },
  { t: ["कई घर", "kai ghar", "many houses", "कई परिवार", "several families", "पूरी गली", "whole street"], w: 10, why: "multiple households affected" },
];

// How long it has been broken
const DURATION_TERMS = [
  { t: ["महीने", "mahine", "months", "महीनों", "साल", "saal", "year", "वर्ष"], w: 18, why: "unresolved for months" },
  { t: ["हफ्ते", "hafte", "week", "सप्ताह", "15 din", "15 दिन"], w: 12, why: "unresolved for weeks" },
  { t: ["बार बार", "baar baar", "repeatedly", "फिर से", "phir se", "again", "दोबारा", "dobara", "हर बार", "every time"], w: 14, why: "recurring failure" },
];

/* --------------------------------------------------------------------------
 * 3. Emergency protocol — the bot must NEVER file a ticket and walk away
 *    from a life-threatening report.
 * ------------------------------------------------------------------------ */

const EMERGENCY_PATTERNS = [
  { t: ["गैस रिसाव", "gas leak", "गैस लीक", "lpg leak", "cylinder leak"], kind: "gas", numbers: ["1906 (LPG Emergency)", "112"] },
  { t: ["आग लग", "aag lag", "fire", "जल रहा है", "building burning", "धुआं निकल"], kind: "fire", numbers: ["101 (Fire)", "112"] },
  { t: ["करंट लग", "current lag", "electrocuted", "बिजली का झटका लगा", "live wire gir", "तार गिरा", "wire fell"], kind: "electric", numbers: ["1912 (Electricity Emergency)", "112"] },
  { t: ["इमारत गिर", "building collapse", "मकान गिर", "दीवार गिर", "wall collapse", "ढह गया"], kind: "collapse", numbers: ["108 (Ambulance)", "112"] },
  { t: ["डूब", "doob", "drowning", "बह गया", "swept away", "बाढ़", "flood"], kind: "flood", numbers: ["108", "112"] },
  { t: ["घायल", "ghayal", "injured", "खून", "khoon", "bleeding", "बेहोश", "unconscious"], kind: "medical", numbers: ["108 (Ambulance)", "112"] },
];

function detectEmergency(text) {
  const t = norm(text);
  for (const p of EMERGENCY_PATTERNS) {
    if (p.t.some((k) => includesTerm(t, k))) {
      return { isEmergency: true, kind: p.kind, numbers: p.numbers };
    }
  }
  return { isEmergency: false };
}

/* --------------------------------------------------------------------------
 * 4. Indore ward directory (locality -> ward). Extend freely.
 * ------------------------------------------------------------------------ */

const WARDS = [
  { id: "W-12", name: "Vijay Nagar (Ward 12)", aliases: ["vijay nagar", "विजय नगर", "vijaynagar"] },
  { id: "W-08", name: "Rajendra Nagar (Ward 8)", aliases: ["rajendra nagar", "राजेंद्र नगर"] },
  { id: "W-15", name: "Palasia (Ward 15)", aliases: ["palasia", "पलासिया", "old palasia"] },
  { id: "W-22", name: "Rau (Ward 22)", aliases: ["rau", "राऊ"] },
  { id: "W-31", name: "Sudama Nagar (Ward 31)", aliases: ["sudama nagar", "सुदामा नगर"] },
  { id: "W-40", name: "Annapurna (Ward 40)", aliases: ["annapurna", "अन्नपूर्णा"] },
  { id: "W-44", name: "Bhawarkuan (Ward 44)", aliases: ["bhawarkuan", "भंवरकुआं", "bhanwarkuan"] },
  { id: "W-51", name: "Khajrana (Ward 51)", aliases: ["khajrana", "खजराना"] },
  { id: "W-55", name: "Sirpur (Ward 55)", aliases: ["sirpur", "सिरपुर"] },
  { id: "W-60", name: "Musakhedi (Ward 60)", aliases: ["musakhedi", "मूसाखेड़ी"] },
  { id: "W-63", name: "Nanda Nagar (Ward 63)", aliases: ["nanda nagar", "नंदा नगर"] },
  { id: "W-70", name: "Banganga (Ward 70)", aliases: ["banganga", "बाणगंगा"] },
  { id: "W-77", name: "Chandan Nagar (Ward 77)", aliases: ["chandan nagar", "चंदन नगर"] },
  { id: "W-04", name: "Mhow Naka (Ward 4)", aliases: ["mhow naka", "महू नाका", "mhownaka"] },
  { id: "W-19", name: "Saket Nagar (Ward 19)", aliases: ["saket", "साकेत"] },
];

/* --------------------------------------------------------------------------
 * 5. Normalisation helpers
 * ------------------------------------------------------------------------ */

function norm(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function hasDevanagari(s) {
  return /[ऀ-ॿ]/.test(String(s || ""));
}

/** Detect the language the citizen is writing in, so we reply in kind. */
function detectLanguage(text) {
  const raw = String(text || "");
  if (hasDevanagari(raw)) return "hi";
  const hinglish = [
    "hai", "hain", "nahi", "kripya", "mera", "meri", "mere", "hua", "kar",
    "karo", "kare", "kya", "aap", "paas", "abhi", "raha", "rahi", "gaya",
    "gayi", "bhai", "ji", "toh", "bohot", "bahut", "haan", "han", "jod",
    "jaldi", "kijiye", "bataiye", "mein", "ka", "ki", "ke", "se", "wala",
    "wali", "bhi", "kab", "kahan", "kaise", "kaun", "din", "sahi", "theek",
    "chahiye", "dijiye", "batao", "karna", "hoga", "diya", "liya",
  ];
  const words = norm(raw).split(/[^a-z]+/).filter(Boolean);
  if (!words.length) return "en";
  const hits = words.filter((w) => hinglish.includes(w)).length;
  return hits / words.length > 0.12 ? "hinglish" : "en";
}

/**
 * Boundary-aware containment test.
 * Long/multi-word terms match as plain substrings. SHORT terms (< 5 chars,
 * e.g. "hi", "aag", "nal") must sit on a word boundary, otherwise "hi"
 * matches inside "bhi" and every complaint looks like a greeting.
 * Unicode-aware so Devanagari letters and matras count as word characters.
 */
const BOUNDARY_CACHE = new Map();
function includesTerm(haystack, term) {
  const t = norm(term);
  if (!t) return false;
  if (t.length >= 5 || /\s/.test(t)) return haystack.includes(t);
  let re = BOUNDARY_CACHE.get(t);
  if (!re) {
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp("(^|[^\\p{L}\\p{N}\\p{M}])" + esc + "($|[^\\p{L}\\p{N}\\p{M}])", "u");
    BOUNDARY_CACHE.set(t, re);
  }
  return re.test(haystack);
}

function countMatches(text, terms) {
  const t = norm(text);
  const found = [];
  for (const group of terms) {
    if (group.t.some((k) => includesTerm(t, k))) found.push(group);
  }
  return found;
}

/* --------------------------------------------------------------------------
 * 6. Category classification
 * ------------------------------------------------------------------------ */

/**
 * Context rules that veto a keyword match. Without this, "gas leak" scores as
 * Water Supply because "leak" is a water keyword — and a life-threatening
 * report gets routed to the wrong department.
 */
const VETOES = [
  { category: "water", ifPresent: ["gas", "गैस", "cylinder", "सिलेंडर", "lpg"], reason: "gas context overrides water-leak keywords" },
  { category: "sanitation", ifPresent: ["गैस", "gas leak"], reason: "gas context" },
];

function classifyCategory(text) {
  const t = norm(text);
  let best = null;
  let bestScore = 0;
  const scores = {};

  for (const cat of CATEGORIES) {
    let score = 0;
    const matched = [];
    for (const kw of cat.keywords) {
      const k = norm(kw);
      if (!k) continue;
      if (includesTerm(t, k)) {
        // longer keyword == more specific == stronger signal
        score += Math.min(4, 1 + k.length / 6);
        matched.push(kw);
      }
    }
    const veto = VETOES.find((v) => v.category === cat.key && v.ifPresent.some((k) => includesTerm(t, k)));
    if (veto) score = 0;
    scores[cat.key] = Number(score.toFixed(2));
    if (score > bestScore) {
      bestScore = score;
      best = { ...cat, matched };
    }
  }

  if (!best) {
    return {
      ...FALLBACK_CATEGORY,
      matched: [],
      confidence: 0.25,
      scores,
      uncertain: true,
    };
  }

  // Confidence: how far ahead the winner is from the runner-up
  const sorted = Object.values(scores).sort((a, b) => b - a);
  const margin = sorted[0] - (sorted[1] || 0);
  const confidence = Math.max(0.3, Math.min(0.98, 0.45 + margin / 12));

  return { ...best, confidence: Number(confidence.toFixed(2)), scores, uncertain: confidence < 0.5 };
}

/* --------------------------------------------------------------------------
 * 7. Entity extraction — ward, landmark, duration
 * ------------------------------------------------------------------------ */

function extractWard(text) {
  const t = norm(text);

  for (const w of WARDS) {
    if (w.aliases.some((a) => t.includes(norm(a)))) {
      return { wardId: w.id, wardName: w.name, source: "locality" };
    }
  }

  // "ward 12" / "वार्ड 12" / "w-12"
  const m = t.match(/(?:ward|वार्ड|w)[\s\-#]*(\d{1,2})\b/);
  if (m) {
    const num = String(m[1]).padStart(2, "0");
    const known = WARDS.find((w) => w.id === `W-${num}`);
    return known
      ? { wardId: known.id, wardName: known.name, source: "explicit" }
      : { wardId: `W-${num}`, wardName: `Ward ${Number(m[1])}`, source: "explicit" };
  }

  return null;
}

function extractLandmark(text) {
  const raw = String(text || "");
  const patterns = [
    /(?:near|paas|पास|के पास|opposite|samne|सामने|behind|piche|पीछे)\s+([^\.,;\n]{3,45})/i,
    /([^\.,;\n]{3,45})\s+(?:ke paas|के पास|के सामने|ke samne)/i,
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m && m[1]) {
      const cleaned = m[1].trim().replace(/\s{2,}/g, " ");
      if (cleaned.length >= 3) return cleaned;
    }
  }
  return "";
}

/* --------------------------------------------------------------------------
 * 8. THE 8-STAGE HARM SCORE
 *    Returns the score AND a full breakdown, so the bot can show its work and
 *    the commissioner can audit why a ticket was prioritised. This is the
 *    difference between "AI said 87" and "here is exactly why it is 87".
 * ------------------------------------------------------------------------ */

function computeHarmScore({ text = "", category, now = new Date(), velocity = 0, reopenCount = 0, photo = false } = {}) {
  const cat = category || classifyCategory(text);
  const stages = [];
  let score = 0;

  // Stage 1 — base severity of the category itself
  score += cat.baseSeverity;
  stages.push({ stage: 1, name: "Category baseline", delta: cat.baseSeverity, detail: cat.label });

  // Stage 2 — hazard amplification
  const hazards = countMatches(text, HAZARD_TERMS);
  const hazardDelta = hazards.reduce((s, h) => s + h.w, 0);
  if (hazardDelta) score += hazardDelta;
  stages.push({
    stage: 2,
    name: "Hazard amplification",
    delta: hazardDelta,
    detail: hazards.length ? hazards.map((h) => h.why).join("; ") : "no acute hazard language",
  });

  // Stage 3 — proximity to vulnerable populations
  const places = countMatches(text, VULNERABLE_PLACES);
  const placeDelta = places.reduce((s, p) => s + p.w, 0);
  if (placeDelta) score += placeDelta;
  stages.push({
    stage: 3,
    name: "Vulnerability proximity",
    delta: placeDelta,
    detail: places.length ? places.map((p) => p.why).join("; ") : "no sensitive facility mentioned",
  });

  // Stage 4 — time of day (darkness multiplies safety risk)
  const hour = now.getHours();
  const isNight = hour >= 19 || hour < 6;
  const nightBoost =
    isNight && ["streetlight", "electricity", "stray_animals", "roads"].includes(cat.key) ? 10 : isNight ? 4 : 0;
  if (nightBoost) score += nightBoost;
  stages.push({
    stage: 4,
    name: "Time-of-day factor",
    delta: nightBoost,
    detail: isNight ? `reported at ${hour}:00 — night-time risk` : `reported at ${hour}:00 — daytime`,
  });

  // Stage 5 — reporting velocity (how many neighbours reported the same thing)
  const velocityDelta = Math.min(20, velocity * 4);
  if (velocityDelta) score += velocityDelta;
  stages.push({
    stage: 5,
    name: "Reporting velocity",
    delta: velocityDelta,
    detail: velocity ? `${velocity} similar report(s) in this ward recently` : "first report of its kind here",
  });

  // Stage 6 — duration / recurrence
  const durations = countMatches(text, DURATION_TERMS);
  const durationDelta = durations.reduce((s, d) => s + d.w, 0);
  if (durationDelta) score += durationDelta;
  stages.push({
    stage: 6,
    name: "Duration & recurrence",
    delta: durationDelta,
    detail: durations.length ? durations.map((d) => d.why).join("; ") : "no long-pending signal",
  });

  // Stage 7 — scale of impact
  const scales = countMatches(text, SCALE_TERMS);
  const scaleDelta = scales.reduce((s, x) => s + x.w, 0);
  if (scaleDelta) score += scaleDelta;
  stages.push({
    stage: 7,
    name: "Scale of impact",
    delta: scaleDelta,
    detail: scales.length ? scales.map((x) => x.why).join("; ") : "individual / household level",
  });

  // Stage 8 — accountability history (prior reopens on this asset/citizen)
  const evidenceDelta = (photo ? 3 : 0) + Math.min(15, reopenCount * 7);
  if (evidenceDelta) score += evidenceDelta;
  stages.push({
    stage: 8,
    name: "Evidence & prior failure",
    delta: evidenceDelta,
    detail:
      (photo ? "photo evidence attached" : "no photo") +
      (reopenCount ? `; ${reopenCount} prior reopen(s) — officer already failed here` : ""),
  });

  // ---- Normalisation ----
  // Stages 2-8 are aggravating factors. Adding them raw made almost every
  // ticket hit the 100 ceiling, which destroys prioritisation: if everything
  // is critical, nothing is. We apply diminishing returns so each additional
  // risk signal adds less than the last, and the ceiling is approached but
  // never trivially reached.
  const rawAggravation = score - cat.baseSeverity;
  const amplification = Math.round(48 * (1 - Math.exp(-Math.max(0, rawAggravation) / 40)));
  const finalScore = Math.max(1, Math.min(100, Math.round(cat.baseSeverity + amplification)));

  stages.push({
    stage: "Σ",
    name: "Normalisation (diminishing returns)",
    delta: amplification - rawAggravation,
    detail: `${cat.baseSeverity} base + ${rawAggravation} raw aggravation → +${amplification} applied`,
  });

  const emergency = detectEmergency(text);

  let priority;
  if (emergency.isEmergency || finalScore >= 85) priority = "critical";
  else if (finalScore >= 65) priority = "high";
  else if (finalScore >= 42) priority = "medium";
  else priority = "low";

  // Critical work gets a compressed SLA
  let slaDays = cat.slaDays;
  if (priority === "critical") slaDays = Math.min(slaDays, 1);
  else if (priority === "high") slaDays = Math.max(1, Math.min(slaDays, 3));

  return { harmScore: finalScore, priority, slaDays, stages, emergency, category: cat };
}

/* --------------------------------------------------------------------------
 * 9. Intent classification for the conversation layer
 * ------------------------------------------------------------------------ */

const INTENTS = [
  {
    key: "file_complaint",
    terms: [
      "शिकायत", "shikayat", "complaint", "file", "दर्ज", "darj", "register",
      "report", "problem", "समस्या", "samasya", "issue", "टूट", "खराब",
      "kharab", "not working", "band", "बंद",
    ],
  },
  {
    key: "track_status",
    terms: [
      "status", "स्थिति", "sthiti", "track", "ट्रैक", "kahan", "कहां",
      "kya hua", "क्या हुआ", "update", "अपडेट", "grv-", "ticket", "टिकट",
      "mera complaint", "meri shikayat", "progress",
    ],
  },
  {
    key: "reopen",
    terms: [
      "nahi hua", "नहीं हुआ", "not done", "not resolved", "reopen", "फिर से खोल",
      "जस का तस", "jaisa tha", "still broken", "अभी भी", "abhi bhi",
      "jhoot", "झूठ", "fake", "फर्जी", "galat band", "wrongly closed",
    ],
  },
  {
    key: "verify_resolved",
    terms: ["ho gaya", "हो गया", "resolved", "theek ho gaya", "ठीक हो गया", "confirm", "sahi hai", "done", "fixed"],
  },
  {
    key: "escalate",
    terms: [
      "escalate", "एस्केलेट", "upar", "ऊपर", "commissioner", "आयुक्त",
      "senior", "अधिकारी से", "rti", "आरटीआई", "legal", "कानूनी",
      "shikayat officer ke khilaf", "action lo",
    ],
  },
  {
    key: "rights_info",
    terms: [
      "kitne din", "कितने दिन", "sla", "kab tak", "कब तक", "deadline",
      "मेरा अधिकार", "my right", "rights", "niyam", "नियम", "rule",
      "kaun zimmedar", "कौन जिम्मेदार", "responsible", "kis department",
    ],
  },
  {
    key: "greeting",
    terms: ["hello", "hi ", "hey", "namaste", "नमस्ते", "नमस्कार", "salaam", "good morning", "good evening", "जय हिंद"],
  },
  {
    key: "help",
    terms: ["help", "मदद", "madad", "kya kar sakte", "क्या कर सकते", "what can you do", "options", "कैसे"],
  },
];

function classifyIntent(text) {
  const t = norm(text);
  if (!t) return { intent: "help", confidence: 0.2 };

  // A ticket id anywhere is a very strong tracking signal
  if (/grv-\d{4,}/i.test(t)) return { intent: "track_status", confidence: 0.95, ticketId: t.match(/grv-\d{4,}/i)[0].toUpperCase() };

  let best = null;
  let bestScore = 0;
  for (const it of INTENTS) {
    let score = 0;
    for (const term of it.terms) {
      if (includesTerm(t, term)) score += 1 + norm(term).length / 10;
    }
    if (score > bestScore) {
      bestScore = score;
      best = it.key;
    }
  }

  if (!best) {
    // No intent words but descriptive text -> almost always a new complaint
    return { intent: t.split(" ").length > 4 ? "file_complaint" : "help", confidence: 0.4 };
  }
  return { intent: best, confidence: Math.min(0.95, 0.5 + bestScore / 10) };
}

/* --------------------------------------------------------------------------
 * 10. Full analysis in one call — what the chat controller actually uses
 * ------------------------------------------------------------------------ */

function analyze(text, opts = {}) {
  const category = classifyCategory(text);
  const harm = computeHarmScore({ text, category, ...opts });
  const intentInfo = classifyIntent(text);
  const ward = extractWard(text);
  const landmark = extractLandmark(text);
  const language = detectLanguage(text);

  return {
    language,
    intent: intentInfo.intent,
    intentConfidence: intentInfo.confidence,
    ticketId: intentInfo.ticketId || null,
    category: {
      key: category.key,
      label: category.label,
      dept: category.dept,
      confidence: category.confidence,
      uncertain: category.uncertain,
      matched: category.matched,
    },
    ward,
    landmark,
    harmScore: harm.harmScore,
    priority: harm.priority,
    slaDays: harm.slaDays,
    stages: harm.stages,
    emergency: harm.emergency,
  };
}

/* --------------------------------------------------------------------------
 * 11. What is still missing before we can file a valid ticket?
 * ------------------------------------------------------------------------ */

function missingFields(draft = {}) {
  const missing = [];
  if (!draft.text || String(draft.text).trim().length < 12) missing.push("description");
  if (!draft.wardId) missing.push("location");
  if (!draft.category) missing.push("category");
  return missing;
}

module.exports = {
  CATEGORIES,
  WARDS,
  analyze,
  classifyCategory,
  classifyIntent,
  computeHarmScore,
  detectEmergency,
  detectLanguage,
  extractWard,
  extractLandmark,
  missingFields,
  norm,
};
