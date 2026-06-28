// You.com Web Search API integration.
// Real-time, citation-backed search results. Falls back to mock data if no key.

// Verified: GET https://api.ydc-index.io/v1/search, header X-API-Key.
// Response: { results: { web: [...], news: [...] }, metadata: {...} }
const BASE = "https://ydc-index.io/v1/search";

export function hasYouCom() {
  return Boolean(process.env.YOUCOM_API_KEY);
}

// Returns a normalized list of { title, url, snippet, source, published }
export async function youSearch(query, { count = 8, freshness = "month" } = {}) {
  if (!hasYouCom()) return mockSearch(query, count);

  const url = new URL(BASE);
  url.searchParams.set("query", query);
  url.searchParams.set("count", String(count));
  if (freshness) url.searchParams.set("freshness", freshness);

  const res = await fetch(url, {
    headers: { "X-API-Key": process.env.YOUCOM_API_KEY },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`You.com search failed ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return normalize(data);
}

function normalize(data) {
  const web = data?.results?.web || [];
  const news = data?.results?.news || [];
  const all = [...news, ...web]; // news first — fresher for sports
  return all.map((h) => ({
    title: h.title || "Untitled",
    url: h.url || "",
    snippet:
      h.description ||
      (Array.isArray(h.snippets) && h.snippets.join(" ")) ||
      "",
    source: hostOf(h.url || ""),
    published: h.page_age || null,
  }));
}

function hostOf(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function mockSearch(query, count) {
  const team = query.split(/news|injury|form|prediction/i)[0].trim() || "the team";
  const base = [
    {
      title: `${team} secure crucial win ahead of weekend fixture`,
      url: "https://www.espn.com/example/match-report",
      snippet: `${team} delivered a dominant performance, with manager praising the squad's depth and form heading into the next match. Analysts highlight improved defensive structure.`,
      source: "espn.com",
      published: "2h ago",
    },
    {
      title: `Injury update: key ${team} player rated doubtful`,
      url: "https://www.skysports.com/example/injury",
      snippet: `A fitness concern over a first-choice starter could force a tactical reshuffle. The club has not confirmed availability for the upcoming fixture.`,
      source: "skysports.com",
      published: "5h ago",
    },
    {
      title: `${team} form guide: unbeaten in last 4 across competitions`,
      url: "https://www.theathletic.com/example/form",
      snippet: `Recent results show a clear upward trend in xG and possession-adjusted defensive metrics, suggesting strong underlying performance.`,
      source: "theathletic.com",
      published: "1d ago",
    },
    {
      title: `Head-to-head: how ${team} match up historically`,
      url: "https://www.bbc.com/sport/example/h2h",
      snippet: `Historical data favors a tight contest, with the last five meetings producing narrow margins and a mix of results.`,
      source: "bbc.com",
      published: "3d ago",
    },
  ];
  return base.slice(0, count);
}
