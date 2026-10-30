#!/bin/bash
# Robust 9Router launcher for mini4 (Mac.lan / 100.76.147.49 / 192.168.1.189)
# Kills any stale server procs, ensures ports free, then starts ONE process on :20129.
NODE=/opt/homebrew/bin/node
APP_DIR="$HOME/9router-build"

echo "=== killing existing server procs ==="
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "custom-server" 2>/dev/null || true
sleep 2

echo "=== port check before start ==="
lsof -nP -iTCP:20128 -sTCP:LISTEN 2>/dev/null || echo "  20128 free"
lsof -nP -iTCP:20129 -sTCP:LISTEN 2>/dev/null || echo "  20129 free"

cd "$APP_DIR" || { echo "FATAL: no $APP_DIR"; exit 1; }
export JWT_SECRET="$(cat ~/.9router/jwt-secret)"
export PORT=20129
export HOSTNAME=0.0.0.0
export STRICT_SSL=true
export NODE_ENV=production

echo "=== starting server on :20129 ==="
nohup "$NODE" custom-server.js > /tmp/9router.log 2>&1 &
SERVER_PID=$!
disown
echo "launched PID=$SERVER_PID"
sleep 6

echo "=== verify ==="
echo "BUILD_ID: $(cat "$APP_DIR/.next/BUILD_ID" 2>/dev/null)"
echo "--- port owner ---"
lsof -nP -iTCP:20129 -sTCP:LISTEN 2>/dev/null || echo "NOT LISTENING ON 20129"
echo "--- health ---"
curl -s --max-time 4 -o /dev/null -w "health=%{http_code}\n" http://localhost:20129/api/health
echo "--- log tail ---"
tail -5 /tmp/9router.log