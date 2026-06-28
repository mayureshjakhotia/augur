#!/usr/bin/env bash
# One-command launch for OVERTIME (backend :3001 + frontend :5173)
set -e
cd "$(dirname "$0")"

echo "▶ starting backend…"
(cd server && node index.js) &
SERVER_PID=$!

echo "▶ starting frontend…"
(cd web && npm run dev) &
WEB_PID=$!

trap "kill $SERVER_PID $WEB_PID 2>/dev/null" EXIT
echo "OVERTIME → http://localhost:5173"
wait
