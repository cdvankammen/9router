#!/bin/bash
# mini4 recovery script — agent broke it on 2026-10-30 by installing v0.5.112
# via npm install -g, which shipped a tray binary with wrong CPU architecture.
# mini4 is currently: cleanly down (launchd service booted out, no processes).
#
# Usage: ssh mini4, then run this script (or its equivalent manually).
# Choose ONE of the three options below.

set -euo pipefail

PLIST=~/Library/LaunchAgents/com.9router.app.plist
PKG_DIR=/Users/chris/.local/lib/node_modules/9router

echo "=== mini4 recovery — current state ==="
echo "launchd service: $(launchctl list | grep 9router || echo NOT_REGISTERED)"
echo "processes: $(pgrep -fl 'cli.js|next-server' | head -3 || echo NONE)"
echo "port 20128: $(lsof -nP -iTCP:20128 -sTCP:LISTEN 2>/dev/null || echo FREE)"
echo "installed version: $(cat $PKG_DIR/package.json 2>/dev/null | grep version | head -1 || echo UNKNOWN)"
echo "DB intact: $(ls -la ~/.9router/db/data.sqlite 2>/dev/null | awk '{print $5, $9}')"
echo

echo "=== Choose recovery option ==="
echo "  1) Restore old v0.5.69 (safest, loses #295 encryption)"
echo "  2) Keep v0.5.112 but drop --tray flag (gets #295 live, loses tray icon)"
echo "  3) Quit and investigate tray binary manually"
read -p "Choice [1-3]: " choice

case "$choice" in
  1)
    echo "--- Restoring v0.5.69 ---"
    npm uninstall -g 9router
    npm install -g 9router@0.5.69
    launchctl bootstrap gui/$(id -u) $PLIST
    sleep 5
    echo "Health: $(curl -s -m 5 http://localhost:20128/api/health)"
    echo "Version: $(curl -s -m 5 http://localhost:20128/api/version)"
    ;;
  2)
    echo "--- Keeping v0.5.112, dropping --tray ---"
    # Backup plist
    cp $PLIST $PLIST.bak.$(date +%Y%m%d%H%M%S)
    # Remove --tray from ProgramArguments using Python (safe plist editor)
    python3 -c "
import plistlib
p = plistlib.load(open('$PLIST', 'rb'))
args = p.get('ProgramArguments', [])
p['ProgramArguments'] = [a for a in args if a != '--tray']
with open('$PLIST', 'wb') as f:
    plistlib.dump(p, f)
print('New args:', p['ProgramArguments'])
"
    launchctl bootstrap gui/$(id -u) $PLIST
    sleep 8
    echo "Health: $(curl -s -m 5 http://localhost:20128/api/health)"
    echo "Version: $(curl -s -m 5 http://localhost:20128/api/version)"
    echo "Schema: $(sqlite3 ~/.9router/db/data.sqlite "SELECT value FROM _meta WHERE key='schemaVersion'")"
    echo "Encrypted apiKeys: $(sqlite3 ~/.9router/db/data.sqlite "SELECT COUNT(*) FROM apiKeys WHERE key LIKE 'enc:v1:%'")"
    ;;
  3)
    echo "--- Manual investigation ---"
    echo "Tray binary locations:"
    find $PKG_DIR -name "*tray*" -o -name "*.app" 2>/dev/null
    echo
    echo "Check architecture:"
    find $PKG_DIR -name "*.app" -exec file {}/Contents/MacOS/* \; 2>/dev/null
    echo
    echo "mini4 arch: $(uname -m)"
    echo
    echo "Edit plist manually: nano $PLIST"
    echo "Then: launchctl bootstrap gui/\$(id -u) $PLIST"
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo
echo "=== Final state ==="
echo "launchd: $(launchctl list | grep 9router)"
echo "PID: $(pgrep -f cli.js | head -1 || echo NONE)"
echo "Port: $(lsof -nP -iTCP:20128 -sTCP:LISTEN 2>/dev/null | head -1 || echo FREE)"
echo "Health: $(curl -s -m 5 http://localhost:20128/api/health)"
