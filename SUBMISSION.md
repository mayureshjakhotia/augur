# 🔮 AUGUR — The only AI that keeps score

**Tagline:** Ask any question about the future. AUGUR reads the living omens, divines a
calibrated forecast *with receipts*, speaks it aloud — then comes back and **grades itself.**

**Tracks:** GameCraft Arena (a self-scoring forecasting game) · Potion Lab (a personal foresight companion)

**Live demo:** `./start.sh` → http://localhost:5173 (run with sound on)

---

## The one-liner
Every AI tool gives you a confident answer and walks away. **None of them ever come back and tell you if they were wrong.** AUGUR makes falsifiable, cited forecasts, inscribes them to a permanent ledger, then re-reads the live web to grade itself — and publishes its calibration.

## Why it's hard to copy (the moat)
A stateless agent can produce a one-shot answer. It **cannot** produce:
- **Compounding state** — a track record that grows (the InsForge ledger).
- **Calibration** — "when AUGUR says 70%, it's right ~68% of the time."
- **A closed loop** — predict → inscribe → wait → *resolve against live evidence* → score.

The LLM is interchangeable; the **accountability loop + ledger** is the product.

## How it works
```
You.com Search   →   Groq (Llama-3.3-70B)   →   InsForge (Postgres + auto-REST)
 live cited "omens"   calibrated forecast +       the ledger: inscribe, self-grade,
 (3-angle, real-time)  spoken oracular verse       live-sync across every client
                              ↓
        RESOLVE: AUGUR re-reads the omens & grades itself ✓ / ✗  ("The Fates Have Spoken")
                              ↓
        RECORD: public accuracy + calibration buckets + You-vs-AUGUR duels
```

## Sponsor stack (all LIVE)
| Sponsor | Role | Depth |
|---|---|---|
| **You.com** | Real-time, citation-backed search — the omens behind every forecast AND the evidence used to grade resolutions | 3-angle agentic search; every claim traceable |
| **InsForge** | Agent-native Postgres + auto REST — the prophecy ledger, provisioned via its REST admin API; live-synced across clients | Compounding state + the calibration engine |
| **Groq** | Streaming Llama-3.3-70B for divination + self-judging | Token-streamed verse; <1s to first token |

## The 90-second demo
1. **Tap 🎤 and SPEAK a question** ("Will Bitcoin close above 150k this year?") — hands-free.
2. The ritual: crystal ball swirls, the **verse channels in token-by-token** (real Groq stream), a **deep voice speaks the prophecy aloud**, the certainty orb fills.
3. **The case for / against** (cited), then **lock YOUR call** on the slider before AUGUR's number is revealed → **You vs AUGUR**, side by side.
4. Scroll to **AUGUR's Ledger** (live · synced via InsForge). Hit **⚖️ Resolve** on *"Will PSG win the 2026 UCL?"* → a toll sounds, **THE FATES DELIBERATE…**, then a giant **✓ STAMPS down**, "THE FATES HAVE SPOKEN," and AUGUR declares it called it.
5. Then resolve *"Will Arsenal win…?"* → **✗**. AUGUR *admits it was wrong, out loud.* **That honesty is the whole point.**
6. Up top: **70% track record**, calibration buckets (60/67/100%), You-vs-AUGUR **2–1**.

## Honest framing (for the "is this real?" question)
- **Every forecast is 100% real-time:** type any novel question → unique live You.com sources (dated today) + a fresh Groq forecast. Nothing canned.
- **The historical track record is seeded** — you can't accumulate a real one in a day. The *methodology* is what's real: each new prophecy is inscribed and graded live. A shipped AUGUR earns its record over weeks.
- **Self-grading needs the event to have resolved** — so the live Resolve demo uses past events (PSG/Arsenal). Future prophecies sit ⏳ pending until their time comes. That's honest forecasting, not a bug.

## Who uses it (ICP)
The forecasting / prediction-market crowd (Manifold, Polymarket, Kalshi), analysts, PMs, and founders making bets under uncertainty — people who value calibration and a track record. AUGUR speaks their language and gives them the one thing no AI does: accountability.

## Awards targeted
You.com ($1,000) · InsForge ($500) · Best Overall · Most Innovative · Best Design · Best Technical Execution · Best Use of Sponsor Technology

## Tech
React + Vite + Tailwind (arcane UI, Web Audio chimes/toll, Web Speech voice in/out) ·
Node/Express (SSE streaming) · You.com Search · Groq (streaming, OpenAI-compatible) ·
InsForge REST. Pluggable LLM (Groq → Nebius → Anthropic). Runs in mock mode with no keys.
