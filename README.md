# 🔮 AUGUR — The only AI that keeps score

Ask any question about the future. AUGUR reads the living **omens** (real-time
You.com search), divines a **calibrated forecast with receipts** (Groq), inscribes
it to a permanent **ledger** (InsForge), then comes back and **grades itself**
against fresh evidence — publishing its accuracy and calibration.

**Tracks:** GameCraft Arena (self-scoring forecasting game) · Potion Lab (personal foresight companion)

## Why it's different
Every AI gives a confident answer and walks away. AUGUR is the one that closes the
loop: falsifiable prophecies → a compounding track record → public calibration.
A stateless agent can't fake that — the moat is the **ledger + self-grading**.

## How it works
```
You.com Search → Groq (Llama 3.3 70B) → InsForge (Postgres + auto-REST)
  live cited "omens"   calibrated forecast    the ledger + self-grading loop
```

## Run
```bash
# backend
cd server && npm install && cp .env.example .env   # add keys (or run mock), then:
node index.js
# frontend (new terminal)
cd web && npm install && npm run dev
# open http://localhost:5173
```
Or `./start.sh`. The app runs fully in **mock mode** with no keys; add keys in
`server/.env` to flip each integration to **LIVE** (header badges turn green).

## Keys (server/.env)
- `YOUCOM_API_KEY` — you.com/platform (real-time cited search)
- `GROQ_API_KEY` (+ `GROQ_MODEL`) — console.groq.com (free, no card)
- `INSFORGE_BASE_URL` + `INSFORGE_API_KEY` — insforge.dev (the `prophecies` ledger)
- Optional fallbacks: `NEBIUS_API_KEY`, `ANTHROPIC_API_KEY`

## API
- `POST /api/prophecy {question}` — divine a cited, calibrated forecast
- `POST /api/prophecies` — inscribe to the ledger
- `GET  /api/prophecies` — the ledger
- `POST /api/prophecies/:id/resolve` — AUGUR re-reads the omens and grades itself
- `GET  /api/record` — public accuracy + calibration buckets

See [SUBMISSION.md](./SUBMISSION.md) for the full pitch.
