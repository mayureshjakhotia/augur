import "dotenv/config";
import express from "express";
import cors from "cors";
import { youSearch, hasYouCom } from "./providers/youcom.js";
import { llmComplete, llmStream, llmProvider } from "./providers/llm.js";
import { insList, insInsert, insUpdate, storageMode } from "./providers/insforge.js";
import * as game from "./game.js";
import { hasEleven, ttsMode, elevenSpeak } from "./providers/tts.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "32kb" })); // cap body size

// --- Minimal security headers ---
app.use((_req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "no-referrer");
  next();
});

// --- Lightweight in-memory rate limiter (protects our sponsor credits) ---
const RL = { windowMs: 60_000, max: 40, hits: new Map() };
app.use("/api", (req, res, next) => {
  // only throttle the expensive AI/search routes
  if (!/^\/(prophecy|ask)/.test(req.path)) return next();
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const rec = RL.hits.get(ip) || { count: 0, reset: now + RL.windowMs };
  if (now > rec.reset) { rec.count = 0; rec.reset = now + RL.windowMs; }
  rec.count++;
  RL.hits.set(ip, rec);
  if (RL.hits.size > 5000) RL.hits.clear(); // crude memory guard
  if (rec.count > RL.max) {
    return res.status(429).json({ error: "The omens tire — too many requests. Try again shortly." });
  }
  next();
});

// Clamp user-supplied text to sane lengths before it reaches the LLM/search.
const clamp = (s, n = 300) => (s || "").toString().slice(0, n);

const TABLE = "prophecies";

app.get("/api/status", (_req, res) => {
  res.json({
    youcom: hasYouCom() ? "live" : "mock",
    llm: llmProvider(),
    storage: storageMode(),
    tts: ttsMode(),
  });
});

// Studio-grade voice (ElevenLabs) when a key is present; else 404 → browser TTS.
app.get("/api/speak", async (req, res) => {
  const text = (req.query.text || "").toString().slice(0, 600);
  if (!hasEleven() || !text) return res.status(404).end();
  try {
    const audio = await elevenSpeak(text);
    res.set("Content-Type", "audio/mpeg");
    res.set("Cache-Control", "no-store");
    res.send(audio);
  } catch (e) {
    console.error("tts error:", e.message);
    res.status(500).end();
  }
});

// Read the omens — multi-angle real-time search via You.com, deduped.
async function searchOmens(question) {
  const queries = [question, `${question} latest news evidence`, `${question} analysis prediction odds`];
  const batches = await Promise.all(queries.map((q) => youSearch(q, { count: 5 }).catch(() => [])));
  const seen = new Set(), sources = [];
  for (const batch of batches) for (const s of batch) {
    if (s.url && !seen.has(s.url)) { seen.add(s.url); sources.push(s); }
  }
  return sources.slice(0, 10);
}
const omenContext = (top) =>
  top.map((s, i) => `[${i + 1}] ${s.title} (${s.source}${s.published ? ", " + s.published : ""})\n${s.snippet}`).join("\n\n");

const FORECAST_SYSTEM =
  "You are AUGUR, a disciplined forecasting oracle. You read live omens " +
  "(search results) and produce CALIBRATED probability forecasts. You are " +
  "well-calibrated: when you say 70%, you are right ~70% of the time. You " +
  "cite omens inline as [n]. You never overclaim. Output strictly valid JSON.";

function forecastUser(question, context) {
  return `QUESTION: ${question}

OMENS (live search results):
${context || "(no omens retrieved — reason from base rates and say so)"}

Forecast like a superforecaster:
1. ANCHOR on the base rate for this class of event.
2. ADJUST up or down for the specific live evidence above.
3. STEELMAN both sides before committing.
Use the FULL range — say 80-92% when the evidence is genuinely strong, 8-20% when
it's genuinely weak. Do NOT default to skepticism or cluster around 30%; a calibrated
forecaster's numbers are spread out. Avoid exactly 0 or 100. Match "verdict" to your
number: >=80 Very likely, 60-79 Likely, 40-59 Toss-up, 20-39 Unlikely, <20 Very unlikely.
Produce a JSON object with EXACTLY these fields:
{
  "verse": "a 2-line cryptic oracular couplet foretelling the answer — mystical, evocative, spoken aloud by a seer. NO numbers, NO citations, NO brackets. Use a newline between the two lines.",
  "headline": "one sharp sentence on the current state of play",
  "bull_case": ["exactly 2 short reasons YES — max 11 words each, end with [n]"],
  "bear_case": ["exactly 2 short reasons NO — max 11 words each, end with [n]"],
  "verdict": "one of: Very likely | Likely | Toss-up | Unlikely | Very unlikely",
  "probability": <integer 0-100, your calibrated probability the answer is YES>,
  "reasoning": "ONE punchy sentence justifying the number, citing [n]",
  "wildcard": "the single X-factor that could flip this — max 12 words",
  "resolve_by": "a concrete date or condition by which this resolves",
  "category": "one short tag: Tech | Markets | Sports | Politics | Science | Business | Other"
}
Be terse. Brevity is a feature.`;
}

const VERSE_SYSTEM =
  "You are AUGUR, an ancient seer channeling a vision. Utter a 2-line cryptic " +
  "oracular couplet that foretells the answer. Mystical, evocative, a little ominous. " +
  "NO numbers, NO citations, NO brackets. Newline between the two lines. Output ONLY the couplet.";

// ---- Core: divine a calibrated, cited forecast for any question ----
app.post("/api/prophecy", async (req, res) => {
  const question = clamp(req.body?.question).trim();
  if (!question) return res.status(400).json({ error: "question is required" });
  try {
    const top = await searchOmens(question);
    const analysis = safeJson(await llmComplete(FORECAST_SYSTEM, forecastUser(question, omenContext(top)), { jsonMode: true }));
    res.json({
      question, generated_at: new Date().toISOString(), analysis, sources: top,
      meta: { youcom: hasYouCom() ? "live" : "mock", llm: llmProvider() },
    });
  } catch (err) {
    console.error("prophecy error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

// ---- Streaming divination (SSE): the verse channels in live, then the receipts ----
app.get("/api/prophecy/stream", async (req, res) => {
  const question = clamp(req.query.question).trim();
  if (!question) return res.status(400).end();
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  try {
    const top = await searchOmens(question);
    send("omens", { count: top.length });
    const ctx = omenContext(top);

    // Full structured forecast runs in parallel while the verse streams.
    const analysisP = llmComplete(FORECAST_SYSTEM, forecastUser(question, ctx), { jsonMode: true })
      .then(safeJson).catch(() => null);

    let verse = "";
    await llmStream(VERSE_SYSTEM, `Question: ${question}\nOmens:\n${ctx}`, (tok) => {
      verse += tok;
      send("verse", { t: tok });
    });

    const analysis = (await analysisP) || {};
    analysis.verse = (analysis.verse && analysis.verse.trim()) || verse.trim();
    send("done", {
      question, generated_at: new Date().toISOString(), analysis, sources: top,
      meta: { youcom: hasYouCom() ? "live" : "mock", llm: llmProvider() },
    });
  } catch (e) {
    send("error", { message: String(e.message || e) });
  } finally {
    res.end();
  }
});

// ---- Conversational follow-up: drill into a forecast, grounded in fresh omens ----
app.post("/api/ask", async (req, res) => {
  const question = clamp(req.body?.question).trim();
  const followup = clamp(req.body?.followup).trim();
  if (!followup) return res.status(400).json({ error: "followup is required" });
  try {
    const top = await searchOmens(`${question} ${followup}`);
    const system =
      "You are AUGUR, a sharp research assistant for questions about the future. " +
      "Answer the user's follow-up in 2-4 tight sentences, grounded ONLY in the omens, " +
      "citing [n]. Be direct and useful — no fluff, no hedging theatre.";
    const user = `Original question: ${question}\nFollow-up: ${followup}\n\nOMENS (live):\n${omenContext(top)}`;
    const answer = await llmComplete(system, user);
    res.json({ answer, sources: top });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// ---- The Ledger (InsForge) ----
app.get("/api/prophecies", async (_req, res) => {
  try {
    res.json(await insList(TABLE));
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Inscribe a prophecy into the ledger (status: pending)
app.post("/api/prophecies", async (req, res) => {
  try {
    const { question, analysis, sources, userProbability } = req.body || {};
    if (!question) return res.status(400).json({ error: "question required" });
    const merged = { ...(analysis || {}) };
    if (typeof userProbability === "number") merged.user_probability = userProbability;
    const row = await insInsert(TABLE, {
      question,
      category: analysis?.category || "Other",
      verdict: analysis?.verdict || null,
      probability: typeof analysis?.probability === "number" ? analysis.probability : null,
      analysis: merged,
      sources: sources || [],
      status: "pending",
      resolve_by: analysis?.resolve_by || null,
    });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// ---- The accountability loop: AUGUR re-reads the omens and grades itself ----
app.post("/api/prophecies/:id/resolve", async (req, res) => {
  try {
    const all = await insList(TABLE);
    const p = all.find((r) => String(r.id) === String(req.params.id));
    if (!p) return res.status(404).json({ error: "prophecy not found" });

    const a = typeof p.analysis === "string" ? safeJson(p.analysis) : p.analysis || {};

    // Re-read the omens for the OUTCOME.
    const batches = await Promise.all(
      [`${p.question} result outcome`, `${p.question} confirmed latest`].map((q) =>
        youSearch(q, { count: 5 }).catch(() => [])
      )
    );
    const seen = new Set();
    const sources = [];
    for (const batch of batches) for (const s of batch) {
      if (s.url && !seen.has(s.url)) { seen.add(s.url); sources.push(s); }
    }
    const context = sources.slice(0, 8)
      .map((s, i) => `[${i + 1}] ${s.title} (${s.source}${s.published ? ", " + s.published : ""})\n${s.snippet}`)
      .join("\n\n");

    const system =
      "You are AUGUR's judge. Given a past prophecy and fresh live omens, decide " +
      "whether the predicted YES outcome actually happened. Be honest and strict — " +
      "AUGUR's credibility depends on grading itself truthfully. Output strict JSON.";
    const user = `PROPHECY QUESTION: ${p.question}
AUGUR predicted: ${a.verdict || ""} (${p.probability ?? "?"}% YES)

FRESH OMENS:
${context || "(no fresh omens found)"}

Has the YES outcome resolved? JSON only:
{
  "status": "correct | wrong | pending",
  "outcome": "one sentence on what actually happened (or 'not yet resolved')",
  "graded_confidence": <0-100 how sure you are of this grading>
}
Rules: "correct" = YES happened AND AUGUR leaned YES (>=50%), OR NO happened and AUGUR leaned NO (<50%). "wrong" = the opposite. "pending" = no clear outcome yet.`;

    const verdict = safeJson(await llmComplete(system, user, { jsonMode: true })) || {};
    const status = ["correct", "wrong", "pending"].includes(verdict.status) ? verdict.status : "pending";

    const updated = await insUpdate(TABLE, p.id, {
      status,
      resolution: verdict.outcome || null,
    });
    res.json({ ...updated, _judge: verdict, _evidence: sources.slice(0, 5) });
  } catch (e) {
    console.error("resolve error:", e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

// ---- AUGUR's public track record + calibration ----
app.get("/api/record", async (_req, res) => {
  try {
    const all = await insList(TABLE);
    const resolved = all.filter((p) => p.status === "correct" || p.status === "wrong");
    const correct = resolved.filter((p) => p.status === "correct").length;
    const total = resolved.length;
    const accuracy = total ? Math.round((correct / total) * 100) : null;

    // Calibration: for prophecies in a confidence bucket, how often right?
    const buckets = [
      { label: "50-65%", lo: 50, hi: 65 },
      { label: "66-80%", lo: 66, hi: 80 },
      { label: "81-100%", lo: 81, hi: 100 },
    ].map((b) => {
      const inB = resolved.filter((p) => {
        const conf = p.probability >= 50 ? p.probability : 100 - p.probability;
        return conf >= b.lo && conf <= b.hi;
      });
      const hit = inB.filter((p) => p.status === "correct").length;
      return { ...b, n: inB.length, hitRate: inB.length ? Math.round((hit / inB.length) * 100) : null };
    });

    // You vs AUGUR — Brier head-to-head where the human locked a guess.
    let youWins = 0, augurWins = 0, ties = 0, h2hN = 0;
    for (const p of resolved) {
      const a = typeof p.analysis === "string" ? safeJson(p.analysis) : p.analysis || {};
      if (typeof a.user_probability !== "number" || typeof p.probability !== "number") continue;
      const leanYes = p.probability >= 50;
      const truth = p.status === "correct" ? (leanYes ? 1 : 0) : (leanYes ? 0 : 1);
      const bAug = (p.probability / 100 - truth) ** 2;
      const bYou = (a.user_probability / 100 - truth) ** 2;
      h2hN++;
      if (bYou < bAug) youWins++; else if (bAug < bYou) augurWins++; else ties++;
    }

    res.json({
      total_prophecies: all.length, resolved: total, correct, accuracy,
      pending: all.length - total, calibration: buckets,
      head_to_head: { n: h2hN, you: youWins, augur: augurWins, ties },
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// ===================== THE CHANGELING — party game =====================
const wrap = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (e) { res.status(400).json({ error: String(e.message || e) }); }
};

app.post("/api/game/create", wrap((req) => game.createRoom(req.body?.name)));
app.post("/api/game/join", wrap((req) => game.joinRoom(req.body?.code, req.body?.name)));
app.get("/api/game/:code", wrap((req) => game.getState(req.params.code, req.query.playerId)));
app.post("/api/game/:code/start", wrap((req) => game.startRound(req.params.code, req.body?.playerId)));
app.post("/api/game/:code/answer", wrap((req) => game.submitAnswer(req.params.code, req.body?.playerId, req.body?.text)));
app.post("/api/game/:code/vote", wrap((req) => game.castVote(req.params.code, req.body?.playerId, req.body?.answerId)));
app.post("/api/game/:code/next", wrap((req) => game.nextRound(req.params.code, req.body?.playerId)));
// =======================================================================

function safeJson(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch {}
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return { headline: "Prophecy", reasoning: raw, key_factors: [], probability: null };
}

// --- Serve the built frontend (single deployable in production) ---
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.join(__dirname, "../web/dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(webDist, "index.html")));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AUGUR server on http://localhost:${PORT}`);
  console.log(`  You.com: ${hasYouCom() ? "LIVE" : "mock"} | LLM: ${llmProvider()} | storage: ${storageMode()}`);
});
