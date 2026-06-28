# Session 001 — Wizard Hackathon — AUGUR (2026-06-28)

## What we built
**AUGUR** — "the only AI that keeps score." Ask any question about the future →
live cited forecast (You.com) → calibrated probability (Groq) → inscribed to a
ledger (InsForge) → AUGUR re-reads the omens and grades itself. Public accuracy +
calibration.

Evolved from: OVERTIME (sports companion) → THE ORACLE (sports prophet, themed) →
AUGUR (general foresight engine + accountability loop) after adversarial analysis
showed sports = a thin AI wrapper. The moat is the ledger + self-grading loop.

## Status: COMPLETE, all integrations LIVE
- You.com search: LIVE (key `ydc-sk-...`, host `https://ydc-index.io/v1/search`)
- Groq LLM: LIVE (key `gsk_...`, `llama-3.3-70b-versatile`, free, no card)
- InsForge: LIVE (project `the-oracle`, URL `https://ph97cnrw.us-east.insforge.app`,
  key `ik_...`, table `prophecies` created via REST admin API, RLS off)
- Track record seeded: 7 resolved prophecies, 71% accuracy, calibration populated.

## Key files
- `server/index.js` — endpoints: /api/prophecy, /api/prophecies (GET/POST),
  /api/prophecies/:id/resolve (self-grade), /api/record (calibration)
- `server/providers/{youcom,llm,insforge}.js` — pluggable providers + mock fallback
- `server/.env` — all live keys
- `web/src/App.jsx` — AUGUR UI (arcane theme, Cinzel font, confidence orb, ledger)
- `web/index.html` — theme + Tailwind CDN
- `SUBMISSION.md` — full pitch copy for the form
- Screenshots: `web/augur-home.png`, `web/augur-prophecy.png`

## Run
`cd server && node index.js` + `cd web && npm run dev` → http://localhost:5173
(or `./start.sh`)

## Next action
SUBMIT on https://sublet--saurabhskhire.replit.app/ before 5 PM with SUBMISSION.md
copy. Backup form: the Google Form. Consider optional deploy (InsForge Sites /
Replit) if time; otherwise demo locally.

## Awards targeted
You.com $1k · InsForge $500 · Best Overall · Most Innovative · Best Design ·
Best Technical · Best Use of Sponsor Tech
