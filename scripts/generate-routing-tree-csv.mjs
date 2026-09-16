#!/usr/bin/env node
/**
 * generate-routing-tree-csv.mjs
 * Reads scripts/.routing-tree-cache.json → docs/plans-and-prompts/research/9router/llm-routing-tree-6levels.csv
 * Columns per master plan §6:
 *   row_id, root_id, root_title, branch_path, level, node_topic, parent_topic,
 *   searches_count, search_terms, search_evidence, findings, related_docs, exhausted, source_root
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(__dirname, '.routing-tree-cache.json');
const OUT = path.join(__dirname, '..', 'docs', 'plans-and-prompts', 'research', '9router', 'llm-routing-tree-6levels.csv');

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

const state = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
const { roots, nodes } = state;

const rows = [];
let rowId = 0;
for (const [rootId, root] of Object.entries(roots)) {
  if (!root.complete) continue;
  for (const [key, node] of Object.entries(nodes)) {
    if (!key.startsWith(rootId + '|')) continue;
    rowId++;
    const searchTerms = (node.searches || []).map(s => s.term).join(' | ');
    const searchEvidence = (node.searches || [])
      .map(s => `${s.term}(${s.count})`)
      .join(' | ');
    const findings = (node.findings || []).join(' || ');
    const relatedDocs = (node.relatedDocs || []).join(' | ');
    rows.push([
      rowId,
      rootId,
      root.title,
      node.branchPath,
      node.level,
      node.topic,
      node.parentTopic ?? '',
      (node.searches || []).length,
      searchTerms,
      searchEvidence,
      findings,
      relatedDocs,
      node.exhausted ? 'yes' : 'no',
      root.source ?? '',
    ].map(csvEscape).join(','));
  }
}

const header = [
  'row_id', 'root_id', 'root_title', 'branch_path', 'level', 'node_topic',
  'parent_topic', 'searches_count', 'search_terms', 'search_evidence',
  'findings', 'related_docs', 'exhausted', 'source_root',
].join(',');

fs.writeFileSync(OUT, header + '\n' + rows.join('\n') + '\n', 'utf8');
console.log(`Wrote ${rows.length} rows → ${OUT}`);
console.log(`Roots: ${Object.values(roots).filter(r => r.complete).length}/${Object.keys(roots).length}`);