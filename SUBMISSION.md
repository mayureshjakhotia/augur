# 🔮 AUGUR — The only AI that keeps score

**Tagline:** Ask any question about the future. AUGUR reads the living omens, divines a calibrated forecast *with receipts* — then comes back and **grades itself**.

**Tracks:** GameCraft Arena (a self-scoring forecasting game with calibration) · Potion Lab (a personal foresight companion that learns its own track record)

**Live demo:** runs locally — `./start.sh` → http://localhost:5173

---

## The one-liner
Every AI tool gives you a confident answer and walks away. **None of them ever come back and tell you if they were wrong.** AUGUR is the one that does — it makes falsifiable, cited forecasts, inscribes them to a permanent ledger, then re-reads the live web to grade itself and publishes its calibration.

## Why this is hard to copy (the moat)
A swarm of agents can produce a one-shot answer. It **cannot** produce:
- **Compounding state** — a track record that grows (the InsForge ledger).
- **Calibration** — "when AUGUR says 70%, it's right ~68% of the time."
- **A closed loop** — predict → inscribe → wait → *resolve against live evidence* → score.

That accountability loop is the product. The LLM is interchangeable; the ledger + self-grading is the moat.

## How it works
```
You.com Web Search   →   Groq (Llama 3.3 70B)   →   InsForge (Postgres + auto-REST)
  reads live, cited        divines a calibrated         the ledger: inscribes every
  "omens" (real-time)      probability + reasoning      prophecy, status, resolution
                                    ↓
                         RESOLVE: AUGUR re-reads the omens and grades itself ✓ / ✗
                                    ↓
                         RECORD: public accuracy + calibration buckets
```

## Sponsor stack (all LIVE, not mocked)
| Sponsor | Role | Load-bearing? |
|---|---|---|
| **You.com** | Real-time, citation-backed search — the "omens" behind every forecast AND the evidence used to grade resolutions | ✅ Core |
| **InsForge** | Agent-native Postgres + auto-generated REST — the prophecy ledger; the compounding dataset that makes calibration possible | ✅ Core |
| **Groq** | Fast Llama-3.3-70B inference for divination + self-judging | ✅ |

> InsForge was provisioned agent-natively: the `prophecies` table was created via its REST admin API (`POST /api/database/tables`), and all reads/writes/grading go through its auto-generated REST — zero backend boilerplate.

## What to look at in the demo
1. **Divine** — ask any future question; watch a calibrated, cited forecast appear in seconds with 10 live dated sources.
2. **The Ledger** — every prophecy on the record, color-coded ✓ correct / ✗ wrong, with AUGUR's own resolution text.
3. **The money shot** — hit **Resolve** on a pending prophecy: AUGUR re-reads the live web and *publicly grades itself*, even admitting when it was wrong.
4. **The track record** — 71% accuracy + calibration buckets at the top. An AI brave enough to be measured.

## Awards we're gunning for
You.com ($1,000) · InsForge ($500) · Best Overall · Most Innovative · Best Design · Best Technical Execution · Best Use of Sponsor Technology

## Tech
React + Vite + Tailwind (arcane UI) · Node/Express · You.com Search API · Groq (OpenAI-compatible) · InsForge REST. Pluggable LLM layer (Groq → Nebius → Anthropic). Runs fully in mock mode with no keys; flips to LIVE as each key lands.
