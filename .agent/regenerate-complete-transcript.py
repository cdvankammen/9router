#!/usr/bin/env python3
"""Regenerate the COMPLETE transcript of chat 552ecf4c from the raw JSONL,
including ALL entry types: session.start, user.message, assistant.turn_start,
assistant.message (with reasoningText), assistant.turn_end,
tool.execution_start, tool.execution_complete."""
import json
import sys

SRC = '/Users/chris/Library/Application Support/Code - Insiders/User/workspaceStorage/9d36bc98974e3588f27c01391c3ae20e/GitHub.copilot-chat/transcripts/552ecf4c-e195-4feb-8a13-56a60521caef.jsonl'
OUT = '/Users/chris/Documents/GitHub/9router/.agent/recovered-chat-552ecf4c-COMPLETE.md'

SEP = '=' * 80

def fmt_session_start(d):
    return f"""{SEP}
[SESSION.START] {d.get('timestamp')}
{SEP}
{json.dumps(d.get('data', {}), indent=1)}
{SEP}"""

def fmt_user(d):
    data = d.get('data', {})
    content = data.get('content', '')
    atts = data.get('attachments') or []
    out = [f"{SEP}", f"[USER] {d.get('timestamp')}", SEP]
    if atts:
        out.append('ATTACHMENTS:')
        for a in atts:
            out.append(json.dumps(a, indent=1)[:4000])
    out.append(content)
    out.append(SEP)
    return '\n'.join(out)

def fmt_turn_start(d):
    return f"""{SEP}
[ASSISTANT.turn_start] {d.get('timestamp')}
{SEP}
{json.dumps(d.get('data', {}), indent=1)}
{SEP}"""

def fmt_turn_end(d):
    return f"""{SEP}
[ASSISTANT.turn_end] {d.get('timestamp')}
{SEP}
{json.dumps(d.get('data', {}), indent=1)}
{SEP}"""

def fmt_assistant(d):
    data = d.get('data', {})
    out = [f"{SEP}", f"[ASSISTANT] {d.get('timestamp')}", SEP]
    reasoning = data.get('reasoningText')
    if reasoning:
        out.append('[THINKING/REASONING]:')
        out.append(reasoning)
        out.append('')
    content = data.get('content', '')
    if content:
        out.append('[CONTENT]:')
        out.append(content)
        out.append('')
    trs = data.get('toolRequests') or []
    if trs:
        out.append('[TOOL REQUESTS]:')
        for tr in trs:
            out.append(f"toolCallId: {tr.get('toolCallId')}")
            out.append(f"name: {tr.get('name')}")
            out.append(f"arguments: {tr.get('arguments')}")
            out.append('')
    out.append(SEP)
    return '\n'.join(out)

def fmt_tool_start(d):
    data = d.get('data', {})
    return f"""{SEP}
[TOOL.execution_start] {d.get('timestamp')}
{SEP}
toolCallId: {data.get('toolCallId')}
toolName: {data.get('toolName')}
arguments: {data.get('arguments')}
{SEP}"""

def fmt_tool_complete(d):
    data = d.get('data', {})
    return f"""{SEP}
[TOOL.execution_complete] {d.get('timestamp')}
{SEP}
toolCallId: {data.get('toolCallId')}
success: {data.get('success')}
{SEP}"""

fmt_map = {
    'session.start': fmt_session_start,
    'user.message': fmt_user,
    'assistant.turn_start': fmt_turn_start,
    'assistant.turn_end': fmt_turn_end,
    'assistant.message': fmt_assistant,
    'tool.execution_start': fmt_tool_start,
    'tool.execution_complete': fmt_tool_complete,
}

counts = {}
out_lines = []
with open(SRC) as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        t = d.get('type')
        counts[t] = counts.get(t, 0) + 1
        fn = fmt_map.get(t)
        if fn:
            out_lines.append(fn(d))

header = f"""# COMPLETE Recovered Chat: 552ecf4c-e195-4feb-8a13-56a60521caef
# Source: raw JSONL transcript (all entry types)
# Total entries: {sum(counts.values())}
# {dict(counts)}

"""
with open(OUT, 'w') as f:
    f.write(header)
    f.write('\n'.join(out_lines))
    f.write('\n')

print('Wrote', OUT)
print('Counts:', counts)
import os
print('Size:', os.path.getsize(OUT), 'bytes')
print('Lines:', sum(1 for _ in open(OUT)))