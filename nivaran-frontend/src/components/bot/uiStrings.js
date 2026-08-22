/**
 * Static chrome text for the bot panel in both languages. This is separate
 * from the AGENT'S reply language (agentRuntime.js on the backend) — this
 * file only covers labels, placeholders and buttons the citizen sees before
 * they've said anything.
 */
export const UI = {
  en: {
    name: 'NIVARAN AI',
    heroTitle: 'I work for you, not the other way around',
    heroBody: 'File a complaint, check status, reject a fake resolution, or escalate a missed deadline — just say it.',
    placeholder: 'Type or speak your problem…',
    placeholderListening: 'Listening…',
    footer: 'every action is written to the audit ledger',
    thinking: 'Nivaran AI is working…',
    newChat: 'New conversation',
    history: 'Conversation history',
    close: 'Close',
    mic: 'Speak (Hindi & English)',
    chips: [
      'Transformer is sparking',
      'What is my complaint status?',
      "It's not fixed, still the same problem",
      'What are my rights?',
    ],
    detecting: 'Reading your report…',
    detected: 'Detected',
    confidence: 'confidence',
    noHistory: 'No conversations yet. Start one!',
    historyError: 'Could not load your conversation history.',
    turns: (n) => `${n} turn${n === 1 ? '' : 's'}`,
    current: 'current',
    loginRequired: 'Please log in as a citizen first — I can only act on your own tickets.',
    connError: (m) => `Sorry, I could not reach the server. ${m || ''}`,
    voiceUnsupported: 'Voice input needs Chrome or Edge. You can still type.',
    notAReportYet: "Doesn't look like a describable problem yet",
    notAReportHint: 'Keep writing — say what the issue is and where.',
    checkingReport: 'Checking if this is a real report…',
  },
  hi: {
    name: 'निवारण AI',
    heroTitle: 'मैं आपके लिए काम करता हूँ',
    heroBody: 'शिकायत दर्ज करना, स्थिति जाँचना, झूठे समाधान को रद्द करना, या समय-सीमा टूटने पर आगे बढ़ाना — बस बोलिए।',
    placeholder: 'अपनी समस्या लिखिए या बोलिए…',
    placeholderListening: 'सुन रहा हूँ…',
    footer: 'हर कार्रवाई ऑडिट लेजर में दर्ज होती है',
    thinking: 'निवारण AI काम कर रहा है…',
    newChat: 'नई बातचीत',
    history: 'बातचीत का इतिहास',
    close: 'बंद करें',
    mic: 'बोलिए (हिंदी और अंग्रेज़ी)',
    chips: [
      'ट्रांसफार्मर से चिंगारी निकल रही है',
      'मेरी शिकायत की स्थिति क्या है?',
      'ठीक नहीं हुआ, वही समस्या अभी भी है',
      'मेरा अधिकार क्या है?',
    ],
    detecting: 'आपकी रिपोर्ट पढ़ रहा हूँ…',
    detected: 'पहचाना गया',
    confidence: 'विश्वास',
    noHistory: 'अभी कोई बातचीत नहीं है। एक शुरू करें!',
    historyError: 'बातचीत का इतिहास लोड नहीं हो सका।',
    turns: (n) => `${n} बारी`,
    current: 'वर्तमान',
    loginRequired: 'कृपया पहले नागरिक के रूप में लॉगिन करें — मैं केवल आपके अपने टिकट पर कार्रवाई कर सकता हूँ।',
    connError: (m) => `क्षमा करें, सर्वर से संपर्क नहीं हो सका। ${m || ''}`,
    voiceUnsupported: 'आवाज़ इनपुट के लिए Chrome या Edge चाहिए। आप टाइप कर सकते हैं।',
    notAReportYet: 'अभी यह किसी समस्या का विवरण नहीं लग रहा',
    notAReportHint: 'लिखते रहिए — बताइए समस्या क्या है और कहाँ है।',
    checkingReport: 'जाँच रहा हूँ कि यह असली रिपोर्ट है या नहीं…',
  },
}

export const LANG_STORAGE_KEY = 'nivaran_lang_pref'
