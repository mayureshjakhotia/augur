// LLM synthesis layer. Pluggable OpenAI-compatible providers:
//   Groq (free, no card) → Nebius Token Factory → mock.

// Provider configs (OpenAI-compatible).
const PROVIDERS = {
  groq: {
    key: () => process.env.GROQ_API_KEY,
    base: () => "https://api.groq.com/openai/v1",
    model: () => process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  },
  nebius: {
    key: () => process.env.NEBIUS_API_KEY,
    base: () => process.env.NEBIUS_BASE_URL || "https://api.tokenfactory.nebius.com/v1",
    model: () => process.env.NEBIUS_MODEL || "meta-llama/Meta-Llama-3.1-70B-Instruct",
  },
};

export function llmProvider() {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.NEBIUS_API_KEY) return "nebius";
  return "mock";
}

// messages: [{role, content}]. Returns string. Asks for JSON when jsonMode true.
export async function llmComplete(system, user, { jsonMode = false } = {}) {
  const provider = llmProvider();
  if (provider === "mock") return mock(user, jsonMode);
  return openaiCompatible(PROVIDERS[provider], provider, system, user, jsonMode);
}

async function openaiCompatible(cfg, name, system, user, jsonMode) {
  const res = await fetch(`${cfg.base()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.key()}`,
    },
    body: JSON.stringify({
      model: cfg.model(),
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${name} failed ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// Stream tokens from an OpenAI-compatible provider (Groq/Nebius). onToken(str)
// fires per delta. Falls back to a single emit for non-streaming providers.
export async function llmStream(system, user, onToken) {
  const provider = llmProvider();
  const cfg = PROVIDERS[provider];
  if (!cfg) { const t = await llmComplete(system, user); onToken(t); return t; }
  const res = await fetch(`${cfg.base()}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key()}` },
    body: JSON.stringify({
      model: cfg.model(), temperature: 0.7, stream: true,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok || !res.body) {
    const t = await llmComplete(system, user); onToken(t); return t;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      const l = line.trim();
      if (!l.startsWith("data:")) continue;
      const payload = l.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const tok = JSON.parse(payload).choices?.[0]?.delta?.content || "";
        if (tok) { full += tok; onToken(tok); }
      } catch {}
    }
  }
  return full;
}

function mock(user, jsonMode) {
  if (jsonMode) {
    return JSON.stringify({
      prediction: "Narrow win for the favored side",
      confidence: 62,
      reasoning:
        "Recent form and underlying metrics point to a slight edge, though an injury concern adds uncertainty. Expect a tight, low-margin contest.",
      key_factors: [
        "Strong recent form (unbeaten in last 4)",
        "Key player fitness in doubt",
        "Favorable head-to-head history",
      ],
      hype:
        "This one has all the makings of a classic. Momentum, tension, and a squad hitting its stride — strap in.",
    });
  }
  return "This is a mock briefing generated without an LLM key configured. Add a Groq or Nebius key to enable real synthesis.";
}
