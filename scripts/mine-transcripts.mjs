#!/usr/bin/env node
/**
 * mine-transcripts.mjs — Extract user prompts + assistant summaries from VS Code Copilot chat transcripts.
 * Usage: node mine-transcripts.mjs <transcripts-dir> <output-dir>
 * Output: one .md per transcript: <sessionId>.md with user prompts (verbatim) and assistant message summaries.
 */
import fs from 'node:fs';
import path from 'node:path';

const [transcriptsDir, outDir] = process.argv.slice(2);
if (!transcriptsDir || !outDir) {
  console.error('Usage: node mine-transcripts.mjs <transcripts-dir> <output-dir>');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

function extractText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part?.type === 'text') return part.text ?? '';
        if (part?.type === 'toolInvocation') {
          const name = part.toolInvocation?.name ?? 'tool';
          const args = part.toolInvocation?.args;
          return `[tool:${name} ${args ? JSON.stringify(args).slice(0, 300) : ''}]`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

const files = fs.readdirSync(transcriptsDir).filter((f) => f.endsWith('.jsonl'));
let grandTotal = 0;
for (const file of files) {
  const sessionId = file.replace('.jsonl', '');
  const lines = fs.readFileSync(path.join(transcriptsDir, file), 'utf8').split('\n').filter(Boolean);
  const md = [];
  md.push(`# Chat transcript: ${sessionId}`);
  md.push('');
  md.push(`- Source file: \`${file}\``);
  md.push(`- Lines: ${lines.length}`);
  md.push('');
  let userCount = 0;
  let assistantCount = 0;
  for (const line of lines) {
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    if (o.type === 'user.message') {
      userCount++;
      const text = extractText(o.data?.content);
      if (text.trim()) {
        md.push(`## USER ${userCount}`);
        md.push('');
        md.push(text.trim());
        md.push('');
      }
    } else if (o.type === 'assistant.message') {
      assistantCount++;
      const text = extractText(o.data?.content);
      if (text.trim()) {
        md.push(`### ASSISTANT ${assistantCount}`);
        md.push('');
        md.push(text.trim().slice(0, 4000));
        md.push('');
      }
    }
  }
  const outFile = path.join(outDir, `${sessionId}.md`);
  fs.writeFileSync(outFile, md.join('\n'));
  grandTotal += userCount;
  console.log(`${file}: ${userCount} user msgs, ${assistantCount} assistant msgs -> ${outFile}`);
}
console.log(`\nTotal user messages across all transcripts: ${grandTotal}`);