# Deploying AUGUR

AUGUR is a **single deployable**: the Express server serves both the API and the
built React frontend on one port (`process.env.PORT`).

## Local
```bash
npm run build      # builds the frontend + installs server deps
npm start          # serves everything on http://localhost:3001
```
(Or run them split for hot-reload: `cd server && node index.js` + `cd web && npm run dev`.)

## Instant public URL (for a live demo, no account)
With the app running locally on :3001:
```bash
cloudflared tunnel --url http://localhost:3001
```
→ prints a public `https://*.trycloudflare.com` URL. Live while the tunnel runs.

## Render (persistent, free)
1. Push this repo to GitHub.
2. render.com → New → Web Service → connect the repo (it reads `render.yaml`).
3. Add the secret env vars (from `server/.env.example`): `YOUCOM_API_KEY`,
   `GROQ_API_KEY`, `INSFORGE_BASE_URL`, `INSFORGE_API_KEY` (+ optional `ELEVEN_API_KEY`).
4. Deploy. Build: `npm run build`, Start: `npm start`.

## Notes
- Secrets live only in env vars / `server/.env` (gitignored) — never in the bundle.
- Rate limiting + input clamping protect the sponsor credits if exposed publicly.
- Runs in **mock mode** with no keys, so a deploy won't crash without secrets.
