// Tavily — AI-native search/research API (sponsor). Used as a SECOND omen source
// alongside You.com, so forecasts are cross-verified across two independent indices.
const BASE = "https://api.tavily.com/search";

export function hasTavily() {
  return Boolean(process.env.TAVILY_API_KEY);
}

// Returns normalized { title, url, snippet, source, published }[]
export async function tavilySearch(query, { count = 5 } = {}) {
  if (!hasTavily()) return [];
  try {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: count,
        search_depth: "basic",
        topic: "news",
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r) => ({
      title: r.title || "Untitled",
      url: r.url || "",
      snippet: (r.content || "").slice(0, 300),
      source: hostOf(r.url || ""),
      published: r.published_date || null,
    }));
  } catch {
    return [];
  }
}

function hostOf(u) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
}
