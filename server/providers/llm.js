// LLM synthesis layer. Pluggable OpenAI-compatible providers:
//   Groq (free, no card) → Nebius Token Factory → Anthropic Claude → mock.

// Provider configs (all OpenAI-compatible except anthropic).
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
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "mock";
}

// messages: [{role, content}]. Returns string. Asks for JSON when jsonMode true.
export async function llmComplete(system, user, { jsonMode = false } = {}) {
  const provider = llmProvider();
  if (provider === "anthropic") return anthropic(system, user, jsonMode);
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

async function anthropic(system, user, jsonMode) {
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system: system + (jsonMode ? " Respond with valid JSON only, no markdown." : ""),
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Anthropic failed ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || "";
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
  return "This is a mock briefing generated without an LLM key configured. Add a Nebius or Anthropic key to enable real synthesis.";
}
