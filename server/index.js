import "dotenv/config";
import express from "express";
import cors from "cors";
import { youSearch, hasYouCom } from "./providers/youcom.js";
import { llmComplete, llmProvider } from "./providers/llm.js";
import { insList, insInsert, insUpdate, storageMode } from "./providers/insforge.js";

const app = express();
app.use(cors());
app.use(express.json());

const TABLE = "prophecies";

app.get("/api/status", (_req, res) => {
  res.json({
    youcom: hasYouCom() ? "live" : "mock",
    llm: llmProvider(),
    storage: storageMode(),
  });
});

// ---- Core: divine a calibrated, cited forecast for any question ----
app.post("/api/prophecy", async (req, res) => {
  const question = (req.body?.question || "").trim();
  if (!question) return res.status(400).json({ error: "question is required" });

  try {
    // 1. Read the omens — multi-angle real-time search via You.com.
    const queries = [
      question,
      `${question} latest news evidence`,
      `${question} analysis prediction odds`,
    ];
    const batches = await Promise.all(
      queries.map((q) => youSearch(q, { count: 5 }).catch(() => []))
    );
    const seen = new Set();
    const sources = [];
    for (const batch of batches) {
      for (const s of batch) {
        if (!s.url || seen.has(s.url)) continue;
        seen.add(s.url);
        sources.push(s);
      }
    }
    const top = sources.slice(0, 10);

    // 2. Divine — calibrated forecast grounded strictly in the cited omens.
    const context = top
      .map((s, i) => `[${i + 1}] ${s.title} (${s.source}${s.published ? ", " + s.published : ""})\n${s.snippet}`)
      .join("\n\n");

    const system =
      "You are AUGUR, a disciplined forecasting oracle. You read live omens " +
      "(search results) and produce CALIBRATED probability forecasts. You are " +
      "well-calibrated: when you say 70%, you are right ~70% of the time. You " +
      "cite omens inline as [n]. You never overclaim. Output strictly valid JSON.";

    const user = `QUESTION: ${question}

OMENS (live search results):
${context || "(no omens retrieved — reason from base rates and say so)"}

Produce a JSON object with EXACTLY these fields:
{
  "headline": "one sharp sentence on the current state of play",
  "verdict": "one of: Very likely | Likely | Toss-up | Unlikely | Very unlikely",
  "probability": <integer 0-100, your calibrated probability the answer is YES>,
  "reasoning": "2-3 sentences justifying the probability, citing [n]",
  "key_factors": ["3-5 short cited factors, each ending with [n] where possible"],
  "wildcard": "the single X-factor that could flip this",
  "resolve_by": "a concrete date or condition by which this resolves (e.g. 'Aug 1 2026' or 'when the deal closes')",
  "category": "one short tag: Tech | Markets | Sports | Politics | Science | Business | Other"
}`;

    const raw = await llmComplete(system, user, { jsonMode: true });
    const analysis = safeJson(raw);

    res.json({
      question,
      generated_at: new Date().toISOString(),
      analysis,
      sources: top,
      meta: { youcom: hasYouCom() ? "live" : "mock", llm: llmProvider() },
    });
  } catch (err) {
    console.error("prophecy error:", err);
    res.status(500).json({ error: String(err.message || err) });
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
    const { question, analysis, sources } = req.body || {};
    if (!question) return res.status(400).json({ error: "question required" });
    const row = await insInsert(TABLE, {
      question,
      category: analysis?.category || "Other",
      verdict: analysis?.verdict || null,
      probability: typeof analysis?.probability === "number" ? analysis.probability : null,
      analysis: analysis || {},
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

    res.json({ total_prophecies: all.length, resolved: total, correct, accuracy, pending: all.length - total, calibration: buckets });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

function safeJson(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch {}
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return { headline: "Prophecy", reasoning: raw, key_factors: [], probability: null };
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AUGUR server on http://localhost:${PORT}`);
  console.log(`  You.com: ${hasYouCom() ? "LIVE" : "mock"} | LLM: ${llmProvider()} | storage: ${storageMode()}`);
});
