/**
 * ============================================================================
 *  Nivaran AI — Multi-Provider LLM Adapter
 * ============================================================================
 *  Zero npm dependencies. Uses Node 18+ native fetch.
 *
 *  Supported providers (auto-detected from whichever API key is present):
 *      anthropic | gemini | groq | openai | none
 *
 *  Design rules that matter for a live demo:
 *    1. NEVER throws. Every failure returns { ok:false, reason } so the caller
 *       can fall back to the deterministic civic engine. The bot must never
 *       show a stack trace on stage.
 *    2. Hard timeout (default 22s) via AbortController — a slow provider can
 *       not hang the demo.
 *    3. Model fallback chain — if a model id is retired/unavailable (404/400),
 *       we transparently retry the next one.
 *    4. One canonical message + tool format internally; each provider adapter
 *       translates in and out. Swapping providers changes nothing upstream.
 *
 *  Canonical message shape used by the rest of the app:
 *      { role: 'user' | 'assistant' | 'tool',
 *        content: string,
 *        toolCalls?: [ { id, name, input } ],   // assistant only
 *        toolCallId?: string, toolName?: string } // tool only
 *
 *  Canonical tool shape:
 *      { name, description, parameters }   // parameters = JSON Schema object
 * ============================================================================
 */

const DEFAULT_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 22000);

/* --------------------------------------------------------------------------
 * Provider registry
 * ------------------------------------------------------------------------ */

const PROVIDERS = {
  anthropic: {
    label: "Anthropic Claude",
    envKeys: ["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"],
    models: ["claude-sonnet-4-5", "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
  },
  gemini: {
    label: "Google Gemini",
    envKeys: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    models: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"],
  },
  groq: {
    label: "Groq",
    envKeys: ["GROQ_API_KEY"],
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
  },
  openai: {
    label: "OpenAI",
    envKeys: ["OPENAI_API_KEY"],
    models: ["gpt-4o-mini", "gpt-4o"],
  },
};

/**
 * Resolve which provider to use.
 * Explicit LLM_PROVIDER wins; otherwise first provider with a key present.
 * A generic LLM_API_KEY can be paired with LLM_PROVIDER.
 */
function resolveProvider() {
  const forced = (process.env.LLM_PROVIDER || "").trim().toLowerCase();

  if (forced && forced !== "none" && forced !== "auto") {
    const spec = PROVIDERS[forced];
    if (!spec) {
      return { name: "none", reason: `Unknown LLM_PROVIDER "${forced}"` };
    }
    const key = firstEnv(spec.envKeys) || (process.env.LLM_API_KEY || "").trim();
    if (!key) {
      return { name: "none", reason: `LLM_PROVIDER=${forced} but no API key found` };
    }
    return { name: forced, key, spec };
  }

  if (forced === "none") {
    return { name: "none", reason: "LLM disabled via LLM_PROVIDER=none" };
  }

  for (const [name, spec] of Object.entries(PROVIDERS)) {
    const key = firstEnv(spec.envKeys);
    if (key) return { name, key, spec };
  }

  return { name: "none", reason: "No API key configured" };
}

function firstEnv(keys) {
  for (const k of keys) {
    const v = (process.env[k] || "").trim();
    if (v) return v;
  }
  return null;
}

/** Public: describe the active provider (used by /api/chat/health and the UI badge). */
function getProviderInfo() {
  const p = resolveProvider();
  if (p.name === "none") {
    return {
      provider: "none",
      label: "Nivaran Civic Engine",
      model: "deterministic-v1",
      ready: false,
      reason: p.reason,
    };
  }
  return {
    provider: p.name,
    label: p.spec.label,
    model: (process.env.LLM_MODEL || "").trim() || p.spec.models[0],
    ready: true,
  };
}

/* --------------------------------------------------------------------------
 * fetch with timeout — never leaves a socket hanging during a demo
 * ------------------------------------------------------------------------ */

async function fetchJSON(url, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, ok: res.ok, json, text };
  } catch (err) {
    const aborted = err && (err.name === "AbortError" || err.code === "ABORT_ERR");
    return {
      status: 0,
      ok: false,
      json: null,
      text: aborted ? `Timed out after ${timeoutMs}ms` : String((err && err.message) || err),
      aborted,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** A 404/400 on the model id means "try the next model in the chain". */
function isModelError(status, json) {
  if (status !== 404 && status !== 400) return false;
  const msg = JSON.stringify(json || "").toLowerCase();
  return msg.includes("model") || status === 404;
}

/* ==========================================================================
 * Adapter: Anthropic
 * ========================================================================== */

function anthropicBuild({ system, messages, tools, temperature, maxTokens }) {
  const out = [];
  for (const m of messages) {
    if (m.role === "tool") {
      out.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: m.toolCallId,
            content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
          },
        ],
      });
      continue;
    }
    if (m.role === "assistant" && m.toolCalls && m.toolCalls.length) {
      const content = [];
      if (m.content) content.push({ type: "text", text: m.content });
      for (const tc of m.toolCalls) {
        content.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.input || {} });
      }
      out.push({ role: "assistant", content });
      continue;
    }
    out.push({ role: m.role, content: String(m.content || "") });
  }

  const body = {
    model: null, // filled by caller
    max_tokens: maxTokens,
    temperature,
    messages: out,
  };
  if (system) body.system = system;
  if (tools && tools.length) {
    body.tools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));
  }
  return body;
}

function anthropicParse(json) {
  const parts = (json && json.content) || [];
  let text = "";
  const toolCalls = [];
  for (const p of parts) {
    if (p.type === "text") text += p.text;
    else if (p.type === "tool_use") toolCalls.push({ id: p.id, name: p.name, input: p.input || {} });
  }
  return { text: text.trim(), toolCalls };
}

/* ==========================================================================
 * Adapter: Google Gemini
 * ========================================================================== */

function geminiBuild({ system, messages, tools, temperature, maxTokens }) {
  const contents = [];
  for (const m of messages) {
    if (m.role === "tool") {
      let payload;
      try {
        payload = typeof m.content === "string" ? JSON.parse(m.content) : m.content;
      } catch {
        payload = { result: String(m.content) };
      }
      contents.push({
        role: "user",
        parts: [{ functionResponse: { name: m.toolName || "tool", response: payload } }],
      });
      continue;
    }
    if (m.role === "assistant" && m.toolCalls && m.toolCalls.length) {
      const parts = [];
      if (m.content) parts.push({ text: m.content });
      for (const tc of m.toolCalls) {
        parts.push({ functionCall: { name: tc.name, args: tc.input || {} } });
      }
      contents.push({ role: "model", parts });
      continue;
    }
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "") }],
    });
  }

  const body = {
    contents,
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (tools && tools.length) {
    body.tools = [
      {
        functionDeclarations: tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: stripSchemaForGemini(t.parameters),
        })),
      },
    ];
  }
  return body;
}

/** Gemini rejects some JSON-Schema keywords; keep only what it accepts. */
function stripSchemaForGemini(schema) {
  if (!schema || typeof schema !== "object") return schema;
  const allowed = ["type", "description", "enum", "properties", "required", "items", "nullable"];
  const out = {};
  for (const k of Object.keys(schema)) {
    if (!allowed.includes(k)) continue;
    if (k === "properties") {
      out.properties = {};
      for (const [pk, pv] of Object.entries(schema.properties || {})) {
        out.properties[pk] = stripSchemaForGemini(pv);
      }
    } else if (k === "items") {
      out.items = stripSchemaForGemini(schema.items);
    } else {
      out[k] = schema[k];
    }
  }
  return out;
}

function geminiParse(json) {
  const cand = json && json.candidates && json.candidates[0];
  const parts = (cand && cand.content && cand.content.parts) || [];
  let text = "";
  const toolCalls = [];
  let i = 0;
  for (const p of parts) {
    if (p.text) text += p.text;
    if (p.functionCall) {
      toolCalls.push({
        id: `gem_${Date.now()}_${i++}`,
        name: p.functionCall.name,
        input: p.functionCall.args || {},
      });
    }
  }
  return { text: text.trim(), toolCalls };
}

/* ==========================================================================
 * Adapter: OpenAI-compatible (OpenAI + Groq)
 * ========================================================================== */

function openaiBuild({ system, messages, tools, temperature, maxTokens }) {
  const msgs = [];
  if (system) msgs.push({ role: "system", content: system });

  for (const m of messages) {
    if (m.role === "tool") {
      msgs.push({
        role: "tool",
        tool_call_id: m.toolCallId,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      });
      continue;
    }
    if (m.role === "assistant" && m.toolCalls && m.toolCalls.length) {
      msgs.push({
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.input || {}) },
        })),
      });
      continue;
    }
    msgs.push({ role: m.role, content: String(m.content || "") });
  }

  const body = { model: null, messages: msgs, temperature, max_tokens: maxTokens };
  if (tools && tools.length) {
    body.tools = tools.map((t) => ({
      type: "function",
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
    body.tool_choice = "auto";
  }
  return body;
}

function openaiParse(json) {
  const msg = json && json.choices && json.choices[0] && json.choices[0].message;
  if (!msg) return { text: "", toolCalls: [] };
  const toolCalls = (msg.tool_calls || []).map((tc) => {
    let input = {};
    try {
      input = JSON.parse(tc.function.arguments || "{}");
    } catch {
      input = {};
    }
    return { id: tc.id, name: tc.function.name, input };
  });
  return { text: (msg.content || "").trim(), toolCalls };
}

/* ==========================================================================
 * Unified entry point
 * ========================================================================== */

/**
 * Send one turn to the active provider.
 *
 * @returns {Promise<{ok:true, text:string, toolCalls:Array, provider:string, model:string, ms:number}
 *                 | {ok:false, reason:string, provider:string, status?:number}>}
 */
async function chat({
  system = "",
  messages = [],
  tools = [],
  temperature = 0.4,
  maxTokens = 1400,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const p = resolveProvider();
  if (p.name === "none") {
    return { ok: false, reason: p.reason || "No LLM configured", provider: "none" };
  }

  const forcedModel = (process.env.LLM_MODEL || "").trim();
  const modelChain = forcedModel ? [forcedModel, ...p.spec.models] : [...p.spec.models];

  const started = Date.now();
  let lastReason = "unknown error";
  let lastStatus = 0;

  for (const model of modelChain) {
    let url;
    let options;
    let parse;

    if (p.name === "anthropic") {
      const body = anthropicBuild({ system, messages, tools, temperature, maxTokens });
      body.model = model;
      url = "https://api.anthropic.com/v1/messages";
      options = {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": p.key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      };
      parse = anthropicParse;
    } else if (p.name === "gemini") {
      const body = geminiBuild({ system, messages, tools, temperature, maxTokens });
      url =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}` +
        `:generateContent?key=${encodeURIComponent(p.key)}`;
      options = {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      };
      parse = geminiParse;
    } else {
      // groq + openai share the OpenAI chat-completions contract
      const body = openaiBuild({ system, messages, tools, temperature, maxTokens });
      body.model = model;
      url =
        p.name === "groq"
          ? "https://api.groq.com/openai/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions";
      options = {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${p.key}`,
        },
        body: JSON.stringify(body),
      };
      parse = openaiParse;
    }

    const res = await fetchJSON(url, options, timeoutMs);

    if (res.ok && res.json) {
      const parsed = parse(res.json);
      if (!parsed.text && !parsed.toolCalls.length) {
        lastReason = "Provider returned an empty completion";
        continue;
      }
      return {
        ok: true,
        text: parsed.text,
        toolCalls: parsed.toolCalls,
        provider: p.name,
        model,
        ms: Date.now() - started,
      };
    }

    lastStatus = res.status;
    lastReason =
      (res.json && (res.json.error?.message || res.json.message)) ||
      res.text ||
      `HTTP ${res.status}`;

    // Auth / quota problems will not be fixed by another model — stop early.
    if (res.status === 401 || res.status === 403) break;
    if (res.status === 429) break;
    if (res.aborted) break;
    if (!isModelError(res.status, res.json)) break;
  }

  return {
    ok: false,
    reason: String(lastReason).slice(0, 400),
    status: lastStatus,
    provider: p.name,
  };
}

module.exports = {
  chat,
  getProviderInfo,
  resolveProvider,
  PROVIDERS,
  // exported for unit tests
  _internal: { anthropicBuild, anthropicParse, geminiBuild, geminiParse, openaiBuild, openaiParse, stripSchemaForGemini },
};
