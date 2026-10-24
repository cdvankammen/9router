# Copilot Chat Recovery Playbook

> **Purpose:** Merge orphaned chat sessions from an old workspace hash into the current workspace hash so they appear in the VS Code Copilot Chat UI history panel.
>
> **Workspace:** `/Users/chris/Documents/GitHub/9router`
> **IDE:** VS Code Insiders (`Code - Insiders`)
> **Date created:** 2026-08-19

---

## Background

VS Code stores Copilot chat data per-workspace under:
```
~/Library/Application Support/Code - Insiders/User/workspaceStorage/<hash>/
```

The `<hash>` is derived from the workspace folder path. If the path changes (rename, symlink, different open method), VS Code generates a **new hash** and the old chats become orphaned — invisible to the UI but still on disk.

### Two key storage locations per workspace hash

| Path | Purpose |
|------|---------|
| `GitHub.copilot-chat/transcripts/*.jsonl` | Raw conversation transcripts (JSONL) |
| `GitHub.copilot-chat/chatSessions/*.jsonl` | Session metadata copies |
| `state.vscdb` → key `chat.ChatSessionStore.index` | **UI session index** (JSON blob listing which sessions the history panel shows) |

The UI reads from `state.vscdb`, NOT from the transcript files directly. Copying transcripts alone does not make chats visible.

### Current state for this workspace

| Hash | Folder | Sessions in UI index | Notes |
|------|--------|---------------------|-------|
| `9d36bc98974e3588f27c01391c3ae20e` | Current (active) | 8 | What VS Code currently uses |
| `26cc7c60abef7512df5917e81b12305f` | Old (orphaned) | 13 | Contains 12 sessions missing from current |

Both hashes map to the same folder: `file:///Users/chris/Documents/GitHub/9router`

---

## Prerequisites

- macOS with VS Code Insiders installed
- `sqlite3` available (pre-installed on macOS)
- `python3` available (pre-installed on macOS)
- Terminal access

---

## STEP 0: Full Backup (MANDATORY — DO NOT SKIP)

Before making ANY changes, create a complete backup of both workspace storage directories.

```bash
# Define paths
WS="$HOME/Library/Application Support/Code - Insiders/User/workspaceStorage"
CUR_HASH="9d36bc98974e3588f27c01391c3ae20e"
OLD_HASH="26cc7c60abef7512df5917e81b12305f"
BACKUP_DIR="$HOME/Desktop/copilot-chat-backup-$(date +%Y%m%d-%H%M%S)"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Back up BOTH workspace hashes completely
cp -R "$WS/$CUR_HASH" "$BACKUP_DIR/$CUR_HASH"
cp -R "$WS/$OLD_HASH" "$BACKUP_DIR/$OLD_HASH"

# Verify backup
echo "Backup created at: $BACKUP_DIR"
ls -la "$BACKUP_DIR/"
du -sh "$BACKUP_DIR/"
```

**Verify the backup exists and has reasonable size before proceeding.** The current hash DB should be ~360KB and the old hash DB ~16KB. Transcript folders are ~23MB combined.

### Restore procedure (if anything goes wrong)

```bash
# Stop VS Code Insiders first (Cmd+Q)
# Then restore from backup:
cp -R "$BACKUP_DIR/$CUR_HASH/"* "$WS/$CUR_HASH/"
cp -R "$BACKUP_DIR/$OLD_HASH/"* "$WS/$OLD_HASH/"
```

---

## STEP 1: Ensure VS Code Insiders is FULLY CLOSED

This is critical. VS Code keeps `state.vscdb` in memory and flushes it on shutdown. If VS Code is running when you modify the DB, your changes will be overwritten when VS Code exits.

```bash
# Check if VS Code Insiders is running
pgrep -f "Visual Studio Code - Insiders" && echo "VS CODE IS RUNNING — QUIT IT FIRST (Cmd+Q)" || echo "VS Code is not running — safe to proceed"
```

**Do NOT proceed until VS Code Insiders is fully quit (not just window closed).**

---

## STEP 2: Copy transcript files from old hash to current hash

The transcript `.jsonl` files contain the actual conversation data. They must be in the current hash's folder for VS Code to load them when a session is selected.

```bash
SRC="$WS/$OLD_HASH/GitHub.copilot-chat/transcripts"
DST="$WS/$CUR_HASH/GitHub.copilot-chat/transcripts"

# Copy all transcripts (won't overwrite existing files with same name)
cp -vn "$SRC"/*.jsonl "$DST/" 2>&1

# Also copy chatSessions metadata
mkdir -p "$DST/../chatSessions"
cp -vn "$SRC/../chatSessions/"*.jsonl "$DST/../chatSessions/" 2>&1

# Verify
echo "Transcripts in current hash: $(ls "$DST"/*.jsonl 2>/dev/null | wc -l)"
echo "ChatSessions in current hash: $(ls "$DST/../chatSessions/"*.jsonl 2>/dev/null | wc -l)"
```

Expected result: 13 transcripts and 13 chatSessions in the current hash.

---

## STEP 3: Merge the UI session index

This is the step that actually makes chats visible in the UI. The `chat.ChatSessionStore.index` key in `state.vscdb` contains a JSON object listing all sessions the history panel should display.

### 3a: Read and inspect both indexes

```bash
python3 << 'PYEOF'
import sqlite3, json, os

ws = os.path.expanduser("~/Library/Application Support/Code - Insiders/User/workspaceStorage")
cur_db = os.path.join(ws, "9d36bc98974e3588f27c01391c3ae20e/state.vscdb")
old_db = os.path.join(ws, "26cc7c60abef7512df5917e81b12305f/state.vscdb")

def read_index(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT value FROM ItemTable WHERE key='chat.ChatSessionStore.index'")
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    return json.loads(row[0])

cur_idx = read_index(cur_db)
old_idx = read_index(old_db)

print(f"Current index: {len(cur_idx['entries'])} sessions")
for sid, meta in cur_idx['entries'].items():
    print(f"  {sid} | {meta.get('title', '?')[:60]}")

print(f"\nOld index: {len(old_idx['entries'])} sessions")
for sid, meta in old_idx['entries'].items():
    print(f"  {sid} | {meta.get('title', '?')[:60]}")

# Show what would be added
missing = [sid for sid in old_idx['entries'] if sid not in cur_idx['entries']]
print(f"\nSessions to add: {len(missing)}")
for sid in missing:
    print(f"  + {sid} | {old_idx['entries'][sid].get('title', '?')[:60]}")
PYEOF
```

Review the output. Confirm the sessions listed as "to add" are the ones you want to recover.

### 3b: Perform the merge

```bash
python3 << 'PYEOF'
import sqlite3, json, os

ws = os.path.expanduser("~/Library/Application Support/Code - Insiders/User/workspaceStorage")
cur_db = os.path.join(ws, "9d36bc98974e3588f27c01391c3ae20e/state.vscdb")
old_db = os.path.join(ws, "26cc7c60abef7512df5917e81b12305f/state.vscdb")

def read_index(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT value FROM ItemTable WHERE key='chat.ChatSessionStore.index'")
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    return json.loads(row[0])

cur_idx = read_index(cur_db)
old_idx = read_index(old_db)

# Merge: add old entries not in current
added = 0
for sid, meta in old_idx['entries'].items():
    if sid not in cur_idx['entries']:
        cur_idx['entries'][sid] = meta
        added += 1

print(f"Added {added} sessions. New total: {len(cur_idx['entries'])}")

# Write merged index back to current DB
new_value = json.dumps(cur_idx)
conn = sqlite3.connect(cur_db)
cur = conn.cursor()
cur.execute("UPDATE ItemTable SET value=? WHERE key='chat.ChatSessionStore.index'", (new_value,))
conn.commit()
conn.close()
print(f"Written {len(new_value)} bytes to state.vscdb")
print("Done.")
PYEOF
```

Expected output: "Added 12 sessions. New total: 20"

### 3c: Verify the write

```bash
sqlite3 "$WS/$CUR_HASH/state.vscdb" "SELECT length(value) FROM ItemTable WHERE key='chat.ChatSessionStore.index';"
```

Should return ~9138 (or similar, significantly larger than the original ~4049).

---

## STEP 4: Open VS Code Insiders and verify

1. Launch VS Code Insiders
2. Open the 9router workspace (`/Users/chris/Documents/GitHub/9router`)
3. Open the Copilot Chat panel
4. Click the **history icon** (clock) in the chat panel header
5. You should now see all 20 sessions including the 12 recovered ones

### If chats still don't appear

- Try `Cmd+Shift+P` → `Developer: Reload Window`
- Try toggling `github.copilot.chat.localIndex.enabled` off then on in Settings
- The Markdown exports at `docs/plans-and-prompts/temp/chat-logs/` are always available regardless of UI state

---

## Rollback Procedure

If anything breaks or the UI shows corrupted data:

1. **Quit VS Code Insiders** (`Cmd+Q`)
2. Run:
   ```bash
   BACKUP_DIR="$HOME/Desktop/copilot-chat-backup-YYYYMMDD-HHMMSS"  # use actual timestamp
   WS="$HOME/Library/Application Support/Code - Insiders/User/workspaceStorage"
   CUR_HASH="9d36bc98974e3588f27c01391c3ae20e"
   cp -R "$BACKUP_DIR/$CUR_HASH/"* "$WS/$CUR_HASH/"
   ```
3. Reopen VS Code Insiders

---

## Reference: File Locations Summary

| Item | Path |
|------|------|
| Current workspace storage | `~/Library/Application Support/Code - Insiders/User/workspaceStorage/9d36bc98974e3588f27c01391c3ae20e/` |
| Old workspace storage | `~/Library/Application Support/Code - Insiders/User/workspaceStorage/26cc7c60abef7512df5917e81b12305f/` |
| UI session index key | `chat.ChatSessionStore.index` in `state.vscdb` → `ItemTable` |
| Transcript files | `<hash>/GitHub.copilot-chat/transcripts/*.jsonl` |
| Session metadata | `<hash>/GitHub.copilot-chat/chatSessions/*.jsonl` |
| Markdown exports | `/Users/chris/Documents/GitHub/9router/docs/plans-and-prompts/temp/chat-logs/` |
| Backup location | `~/Desktop/copilot-chat-backup-<timestamp>/` |

---

## Notes

- The `state.vscdb` is a SQLite database with table `ItemTable (key TEXT UNIQUE, value BLOB)`
- The `chat.ChatSessionStore.index` value is a JSON string with structure: `{"version": 1, "entries": {"<sessionId>": {"sessionId": "...", "title": "...", ...}}}`
- VS Code may re-index or compact sessions over time; recovered sessions may need re-recovery after major VS Code updates
- The old hash folder (`26cc7c60...`) can be safely deleted AFTER confirming recovery works, but keeping it as a secondary backup is recommended
