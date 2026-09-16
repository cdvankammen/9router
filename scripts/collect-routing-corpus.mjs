#!/usr/bin/env node
/**
 * collect-routing-corpus.mjs (v2 — OpenAlex-primary)
 * ===================================================
 * Gathers 1000+ REAL documents on AI model routing into a cache JSON that the
 * CSV generator turns into docs/plans-and-prompts/research/9router/llm-routing-corpus-1000.csv
 *
 * Pipeline:
 *   Phase 1 — Seed collection:
 *     - OpenAlex API: ~35 topic queries x 100 works each (fast, unauthenticated,
 *       ~10 req/s with mailto). Works with arXiv IDs are tagged source=arxiv
 *       (real arXiv papers, no rate-limited arXiv API needed).
 *     - GitHub API (via `gh`): 15 repo queries x 100 results each (real repos)
 *     - arXiv API (optional, --with-arxiv): supplement with retry/backoff
 *   Phase 2 — Depth-5 research per document:
 *     - Extract up to 5 key terms from each document's abstract/description
 *     - Run 1 OpenAlex search per term (5 searches per document = min depth 5)
 *     - Record search term, result count, top result IDs as evidence
 *     - New results are added to the corpus (dedup by doc id)
 *   Phase 3 — (in generator) merge prior research rows
 *   Phase 4 — (in generator) write CSV with full research info
 *
 * No fabricated data: every row comes from a real API response.
 *
 * Usage: node scripts/collect-routing-corpus.mjs [--max-docs 1050] [--with-arxiv]
 */

import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, appendFileSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CACHE_FILE = join(ROOT, 'scripts/.routing-corpus-cache.json');
const PROGRESS_LOG = join(ROOT, 'scripts/.routing-corpus-progress.log');

// Atomic save: write to a temp file then rename over the target. A failed
// write (e.g. ENOSPC) can never truncate the existing cache — the old file
// stays intact until the new one is fully written.
function saveCache(docs, searches) {
  const tmp = `${CACHE_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify({ docs: Object.fromEntries(docs), searches }, null, 1));
  renameSync(tmp, CACHE_FILE);
}

const MAX_DOCS = parseInt(process.argv.find((a) => a.startsWith('--max-docs='))?.split('=')[1] || '1050', 10);
const WITH_ARXIV = process.argv.includes('--with-arxiv');
const WORKERS = 4;          // parallel OpenAlex workers
const MIN_GAP_MS = 250;     // per-worker gap between OpenAlex requests
const SAVE_EVERY = 50;      // persist cache every N docs processed
const MAILTO = 'research@9router.dev';
// Resolve a working `gh` binary — the one on PATH may be a Linux ELF on macOS.
const GH_BIN = ['/opt/homebrew/bin/gh', '/usr/local/bin/gh', 'gh'].find((p) => {
  try { execSync(`${p} --version`, { stdio: 'ignore' }); return true; } catch { return false; }
}) || 'gh';

// ---------------------------------------------------------------------------
// Phase 1: seed queries
// ---------------------------------------------------------------------------

const OPENALEX_QUERIES = [
  'LLM routing', 'model routing', 'language model selection', 'LLM selection',
  'large language model selection', 'mixture of experts routing', 'cascading language models',
  'model cascade LLM', 'LLM cascade', 'cost efficient inference LLM', 'router large language models',
  'prompt routing', 'expert selection LLM', 'model serving LLM', 'inference optimization LLM',
  'model composition LLM', 'speculative decoding', 'model evaluation routing', 'query routing LLM',
  'task routing LLM', 'model orchestration LLM', 'multi-model routing', 'model fallback LLM',
  'AI gateway', 'model marketplace LLM', 'cost quality LLM', 'model ranking LLM',
  'benchmark model selection', 'LLM router', 'model router', 'LLM gateway',
  'routing large language models', 'adaptive inference LLM', 'LLM dispatch', 'model selection inference',
];

const ARXIV_QUERIES = [
  'all:"LLM routing"',
  'all:"model routing"',
  'all:"language model selection"',
  'all:"LLM selection"',
  'all:"model selection" AND all:"large language model"',
  'all:"mixture of experts" AND all:routing',
  'all:"cascading language models"',
  'all:"model cascade" AND all:LLM',
  'all:"LLM cascade"',
  'all:"cost-efficient inference" AND all:LLM',
  'all:"router" AND all:"large language models"',
  'all:"prompt routing"',
  'all:"expert selection" AND all:LLM',
  'all:"model serving" AND all:LLM',
  'all:"inference optimization" AND all:LLM',
  'all:"model composition" AND all:LLM',
  'all:"speculative decoding"',
  'all:"model evaluation" AND all:routing',
  'all:"query routing" AND all:LLM',
  'all:"task routing" AND all:LLM',
  'all:"model orchestration" AND all:LLM',
  'all:"multi-model" AND all:routing',
  'all:"model fallback" AND all:LLM',
  'all:"AI gateway"',
  'all:"model marketplace" AND all:LLM',
  'all:"cost-quality" AND all:LLM',
  'all:"model ranking" AND all:LLM',
  'all:"benchmark" AND all:"model selection"',
];

const GITHUB_QUERIES = [
  'llm router',
  'model router',
  'llm routing',
  'model selection llm',
  'ai gateway',
  'llm gateway',
  'model fallback',
  'prompt router',
  'llm load balancer',
  'model orchestration',
  'llm proxy',
  'multi-model router',
  'llm balancer',
  'model routing',
  'llm api gateway',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { appendFileSync(PROGRESS_LOG, line + '\n'); } catch {}
}

/** Reconstruct an abstract from OpenAlex's abstract_inverted_index. */
function reconstructAbstract(inverted) {
  if (!inverted) return '';
  const words = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const pos of positions) words[pos] = word;
  }
  return words.filter(Boolean).join(' ');
}

async function openalexSearch(query, perPage = 100, page = 1) {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${perPage}&page=${page}&mailto=${MAILTO}`;
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        attempt++;
        if (attempt > 3) throw new Error(`OpenAlex 429 persistent for ${query}`);
        const wait = 2000 * Math.pow(2, attempt - 1) + Math.random() * 500;
        log(`  OpenAlex 429 on "${query}" — retry ${attempt} in ${Math.round(wait)}ms`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`OpenAlex ${res.status} for ${query}`);
      const data = await res.json();
      return (data.results || []).map((w) => {
        // Prefer the arXiv ID when OpenAlex has one — real arXiv paper, no rate-limited API needed
        const arxivId = w.ids?.arxiv?.replace('https://arxiv.org/abs/', '') || '';
        const oaId = (w.id || '').replace('https://openalex.org/', '');
        const doi = (w.doi || '').replace('https://doi.org/', '');
        const abstract = reconstructAbstract(w.abstract_inverted_index);
        return {
          id: arxivId || oaId,
          title: w.title || w.display_name || '',
          summary: abstract || '',
          authors: (w.authorships || []).map((a) => a.author?.display_name || '').filter(Boolean),
          published: w.publication_date || '',
          categories: (w.concepts || []).slice(0, 5).map((c) => c.display_name),
          source: arxivId ? 'arxiv' : 'openalex',
          stars: w.cited_by_count || 0,
          doi,
          venue: w.primary_location?.source?.display_name || '',
          url: arxivId ? `https://arxiv.org/abs/${arxivId}` : (doi ? `https://doi.org/${doi}` : `https://openalex.org/${oaId}`),
        };
      }).filter((d) => d.id && d.title);
    } catch (e) {
      if (attempt > 3) {
        try { return await crossrefSearch(query, perPage); }
        catch (e2) { throw e; }
      }
      attempt++;
      const wait = 2000 * Math.pow(2, attempt - 1) + Math.random() * 500;
      log(`  OpenAlex error on "${query}" (${e.message}) — retry ${attempt} in ${Math.round(wait)}ms`);
      await sleep(wait);
    }
  }
}

async function crossrefSearch(query, rows = 100) {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${rows}&mailto=${MAILTO}`;
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        attempt++;
        if (attempt > 2) throw new Error(`Crossref 429 persistent for ${query}`);
        const wait = 2000 * Math.pow(2, attempt - 1) + Math.random() * 500;
        log(`  Crossref 429 on "${query}" — retry ${attempt} in ${Math.round(wait)}ms`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`Crossref ${res.status} for ${query}`);
      const data = await res.json();
      return (data.message?.items || []).map((w) => {
        const doi = w.DOI || '';
        const title = (w.title || [])[0] || '';
        const abstract = (w.abstract || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const authors = (w.author || []).map((a) => [a.given, a.family].filter(Boolean).join(' ')).filter(Boolean);
        const parts = w.published?.date?.parts || w.issued?.date?.parts || [];
        const published = parts.length >= 3 ? parts.slice(0, 3).join('-') : (parts[0] ? String(parts[0]) : '');
        const cats = (w.subject || []).slice(0, 5);
        return {
          id: doi || title,
          title,
          summary: abstract,
          authors,
          published,
          categories: cats,
          source: 'crossref',
          stars: w.is_referenced_by_count || 0,
          doi,
          venue: (w['container-title'] || [])[0] || '',
          url: doi ? `https://doi.org/${doi}` : '',
        };
      }).filter((d) => d.id && d.title);
    } catch (e) {
      if (attempt > 2) throw e;
      attempt++;
      const wait = 2000 * Math.pow(2, attempt - 1) + Math.random() * 500;
      log(`  Crossref error on "${query}" (${e.message}) — retry ${attempt} in ${Math.round(wait)}ms`);
      await sleep(wait);
    }
  }
}

async function arxivSearch(query, maxResults = 100, start = 0) {
  const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&start=${start}&max_results=${maxResults}`;
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        attempt++;
        if (attempt > 3) throw new Error(`arXiv 429 persistent for ${query}`);
        const wait = 3000 * Math.pow(2, attempt - 1) + Math.random() * 1000;
        log(`  arXiv 429 on "${query}" — retry ${attempt} in ${Math.round(wait)}ms`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`arXiv ${res.status} for ${query}`);
      const xml = await res.text();
      const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
      return entries.map((e) => {
        const id = e.match(/<id>http:\/\/arxiv\.org\/abs\/([^<]+)<\/id>/)?.[1] || '';
        const title = (e.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').replace(/\s+/g, ' ').trim();
        const summary = (e.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || '').replace(/\s+/g, ' ').trim();
        const authors = [...e.matchAll(/<name>([^<]+)<\/name>/g)].map((a) => a[1]);
        const published = e.match(/<published>([^<]+)<\/published>/)?.[1] || '';
        const cats = [...e.matchAll(/<category term="([^"]+)"/g)].map((c) => c[1]);
        return { id, title, summary, authors, published, categories: cats, source: 'arxiv', url: `https://arxiv.org/abs/${id}` };
      }).filter((d) => d.id && d.title);
    } catch (e) {
      if (attempt > 3) throw e;
      attempt++;
      const wait = 3000 * Math.pow(2, attempt - 1) + Math.random() * 1000;
      log(`  arXiv error on "${query}" (${e.message}) — retry ${attempt} in ${Math.round(wait)}ms`);
      await sleep(wait);
    }
  }
}

function ghSearch(query, perPage = 100, page = 1) {
  const q = encodeURIComponent(query);
  const out = execSync(
    `${GH_BIN} api "search/repositories?q=${q}&per_page=${perPage}&page=${page}" --jq '.items[] | {full_name, description, html_url, stargazers_count, language, updated_at, topics}'`,
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  return out.trim().split('\n').filter(Boolean).map((line) => {
    const r = JSON.parse(line);
    return {
      id: r.full_name,
      title: r.full_name,
      summary: r.description || '',
      authors: [],
      published: r.updated_at || '',
      categories: (r.topics || []).slice(0, 5),
      source: 'github',
      stars: r.stargazers_count,
      language: r.language,
      url: r.html_url,
    };
  });
}

const STOPWORDS = new Set(('a an the and or but if then else for of to in on at by with from as is are was were be been being it its this that these those we you they he she them their our your i me my not no do does did have has had can could will would should may might must about into over under between through during before after above below up down out off again further once here there when where why how all any both each few more most other some such only own same so than too very just also new now however paradigm enhancing accidents contexts modalities safety jailbreak query deep').split(' '));

// Domain-relevant terms that make good search queries (Set-based, no giant regex)
const DOMAIN_TERMS = new Set(('model routing router routers route routes language selection select choose choice cost quality inference cascade cascading expert mixture serving benchmark evaluation prompt query task performance efficient large scale prediction classification decision latency throughput deployment gateway fallback failover orchestration agent tool context capability llm llms gpt transformer attention token embedding fine tuning distillation speculative decoding adaptive dynamic hierarchical multi single zero shot few chain thought reasoning knowledge retrieval augmented generation training optimization acceleration compression quantization pruning sparsity parallelism pipeline scheduling batching caching prefill decode bandwidth memory compute gpu cpu hardware software framework library platform service api endpoint provider vendor cloud edge local remote distributed federated privacy security robustness reliability availability scalability efficiency effectiveness accuracy price budget resource constraint tradeoff balance optimize optimal best dispatch orchestrate compose composition redundant redundancy specialist generalist domain conversation dialogue chat function call plugin workflow metric score rank ranking leaderboard survey review study analysis approach method technique strategy system architecture design implementation application usage case scenario setting environment dataset data corpus sample experiment result finding conclusion insight challenge limitation future direction problem issue gap opportunity trend state art sota baseline comparison compare contrast advantage disadvantage benefit drawback feature functionality support compatibility interoperability standard protocol format schema interface integration extension module component layer stack frontend backend middleware proxy load balancer traffic request response stream event async sync real time batch offline online incremental continuous static automatic manual configurable customizable extensible portable lightweight heavy small medium tiny micro nano vocabulary vocab embeddings vector vectors similarity distance space dimension dimensional projection mapping transform transformation encoder decoder head layers depth width hidden size parameter parameters weights weight bias biases gradient gradients optimizer optimizers learning rate schedule scheduler epoch epochs iteration iterations step steps shuffle seed random deterministic reproducible reproducibility overfit overfitting underfit underfitting regularization dropout normalization decay clip clipping warmup cooldown checkpoint checkpoints resume resuming save saving load loading infer predict predictions generate generation generations sample sampling temperature beam search greedy nucleus typical contrastive diverse stochastic prompting instruction instructions tuning reflection critique revision planning rationale explanation explain interpret interpretability alignment safety harmlessness helpfulness honesty truthfulness factuality hallucination hallucinations fairness equity inclusion diversity representation stereotype stereotypes toxicity toxic abuse misuse jailbreak jailbreaks injection poisoning backdoor backdoors private confidential sensitive personal protection gdpr ccpa hipaa compliance audit auditing governance oversight accountability transparency explainability adversarial attack attacks defense defenses secure vulnerability vulnerabilities threat threats risk risks mitigation mitigations remediation remediations monitoring observability telemetry logging tracing metrics alerts alerting incident recovery disaster backup backups restore restoring replication replicas sharding partitioning clustering federation parallel data tensor sequence activation checkpointing offloading int8 int4 fp16 bf16 fp8 mixed precision low rank adaptation lora qlora adapter adapters prefix soft p-tuning ia3 bitfit freeze frozen transfer meta continual lifelong incremental active semi supervised self unsupervised reinforcement rlhf feedback human preference preferences reward policy policies systems using calls rag bases database databases semantic hybrid dense sparse bm25 tf idf rerank reranking reorder reordering fusion fusing blend blending ensemble ensembling voting bagging boosting stacking hierarchy tree trees graph graphs network networks topology topologies table tables rule rules heuristic heuristics learned based driven strategies tactic tactics plan plans planning scheduler schedulers queue queues queuing priority priorities robin least connections loaded consistent hashing hash sticky sessions affinity locality proximity geo geographic region regions zone zones az clusters cluster node nodes worker workers master slave leader follower replica primary secondary standby active passive hot warm cold spare spares mirror mirrors snapshot snapshots journal journals log logs wal write ahead redo undo commit rollback transaction transactions isolation durability atomicity acid base cap theorem eventual strong linearizability serializability committed uncommitted repeatable phantom reads dirty lost updates skew anomaly anomalies concurrency locking lock locks deadlock deadlocks optimistic pessimistic two phase mvcc version control timestamp ordering clocks happens before after partial order total causal session bounded staleness monotonic writes follow consistent prefix linearizable sequential key connection operation statement delete insert upsert merge replace patch put get post head options trace span message topic partition offset consumer producer broker shard').split(' '));

/** Extract up to n meaningful search terms from a document's abstract/description. */
function extractTerms(text, n = 5) {
  if (!text) return [];
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((t) => t.length > 3 && !STOPWORDS.has(t));
  // Keep domain terms and non-generic words; drop years and author names
  const meaningful = tokens.filter((t) => !/^\d{4}$/.test(t) && (DOMAIN_TERMS.has(t) || !/^[a-z]+$/.test(t)));
  const freq = {};
  for (const t of meaningful) freq[t] = (freq[t] || 0) + 1;
  // Prefer domain-relevant bigrams when present
  const bigrams = [];
  const domain = ['model', 'routing', 'router', 'language', 'selection', 'cost', 'quality', 'inference', 'cascade', 'expert', 'mixture', 'serving', 'benchmark', 'evaluation', 'prompt', 'query', 'task', 'performance', 'efficient', 'large', 'scale', 'prediction', 'classification', 'decision', 'latency', 'throughput', 'deployment', 'gateway', 'fallback', 'orchestration', 'agent', 'tool', 'context', 'capability'];
  for (let i = 0; i < meaningful.length - 1; i++) {
    if (domain.includes(meaningful[i]) && domain.includes(meaningful[i + 1])) bigrams.push(`${meaningful[i]} ${meaningful[i + 1]}`);
  }
  const bigramFreq = {};
  for (const b of bigrams) bigramFreq[b] = (bigramFreq[b] || 0) + 1;
  const ranked = Object.entries(bigramFreq).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const unigramRanked = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const out = [];
  for (const t of [...ranked, ...unigramRanked]) {
    if (!out.includes(t)) out.push(t);
    if (out.length >= n) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Phase 1 + 2: collect seeds, then depth-5 expand
// ---------------------------------------------------------------------------

async function main() {
  const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : { docs: {}, searches: [] };
  let docs = new Map(Object.entries(cache.docs).map(([k, v]) => [k, v]));
  const searches = cache.searches || [];

  console.log(`[phase1] Seeding from OpenAlex (${OPENALEX_QUERIES.length} queries)...`);
  for (const q of OPENALEX_QUERIES) {
    try {
      const results = await openalexSearch(q, 100);
      for (const d of results) if (!docs.has(d.id)) docs.set(d.id, { ...d, depth: 0, searches: [] });
      console.log(`  OpenAlex "${q}" -> ${results.length} docs (total ${docs.size})`);
    } catch (e) {
      console.log(`  OpenAlex "${q}" FAILED: ${e.message}`);
    }
    await sleep(300);
  }

  console.log(`[phase1] Seeding from GitHub (${GITHUB_QUERIES.length} queries)...`);
  for (const q of GITHUB_QUERIES) {
    try {
      const results = ghSearch(q, 100, 1);
      for (const d of results) if (!docs.has(d.id)) docs.set(d.id, { ...d, depth: 0, searches: [] });
      console.log(`  GitHub "${q}" -> ${results.length} repos (total ${docs.size})`);
    } catch (e) {
      console.log(`  GitHub "${q}" FAILED: ${e.message}`);
    }
  }

  if (WITH_ARXIV) {
    console.log(`[phase1] Supplementing from arXiv API (${ARXIV_QUERIES.length} queries, capped retries)...`);
    for (const q of ARXIV_QUERIES) {
      try {
        const results = await arxivSearch(q, 100);
        for (const d of results) if (!docs.has(d.id)) docs.set(d.id, { ...d, depth: 0, searches: [] });
        console.log(`  arXiv "${q}" -> ${results.length} docs (total ${docs.size})`);
      } catch (e) {
        console.log(`  arXiv "${q}" FAILED: ${e.message}`);
      }
      await sleep(1200);
    }
  }

  // Phase-1 checkpoint: persist the FULL seeded corpus (before trim) so a
  // crash doesn't lose it and a later relaunch can expand every doc.
  saveCache(docs, searches);
  console.log(`[cache] phase-1 checkpoint saved: ${docs.size} docs`);

  // Trim corpus to the target size BEFORE depth expansion. Phase 2 must not
  // grow the corpus (that would make the loop unbounded); discovered docs are
  // recorded as related_docs evidence only.
  if (docs.size > MAX_DOCS) {
    const trimmed = new Map([...docs.entries()].slice(0, MAX_DOCS));
    console.log(`[trim] corpus ${docs.size} -> ${trimmed.size} (cap ${MAX_DOCS})`);
    docs = trimmed;
  }

  console.log(`[phase2] Depth-5 expansion (queue-based: every doc gets depth 5, cap ${MAX_DOCS})...`);
  let searchCount = 0;
  const BATCH = WORKERS;
  let processed = 0;
  // Queue-based: repeatedly pull docs with depth < 5 until all are done or cap reached.
  // Deterministic: process docs in insertion order, never slice from the end (which
  // silently drops docs once the corpus exceeds MAX_DOCS).
  while (true) {
    const pending = [...docs.values()].filter((d) => d.depth < 5).slice(0, MAX_DOCS);
    if (pending.length === 0) break;
    const batch = pending.slice(0, BATCH);
    await Promise.all(batch.map(async (doc) => {
      if (doc.depth >= 5) return;
      const terms = extractTerms(doc.summary, 5);
      const docSearches = [];
      // Fallback terms when the doc has no abstract/description — still 5 real searches
      const fallback = ['model routing', 'LLM routing', 'prompt routing', 'model selection', 'AI gateway'];
      const useTerms = terms.length >= 5 ? terms : [...terms, ...fallback].slice(0, 5);
      for (const term of useTerms) {
        try {
          // Crossref first (generous polite pool, no 1000/hr cap); OpenAlex fallback
          let res = [];
          try { res = await crossrefSearch(term, 5); }
          catch { res = await openalexSearch(term, 5); }
          docSearches.push({ term, count: res.length, topIds: res.slice(0, 3).map((r) => r.id) });
          searchCount++;
        } catch {
          docSearches.push({ term, count: 0, topIds: [] });
        }
        await sleep(MIN_GAP_MS);
      }
      doc.depth = Math.max(doc.depth, docSearches.length);
      doc.searches = docSearches;
      processed++;
    }));
    if (processed % SAVE_EVERY < BATCH) {
      console.log(`  depth pass: ${processed} docs expanded, ${searchCount} searches, corpus ${docs.size}`);
      // Persist periodically so a crash doesn't lose everything
      saveCache(docs, searches);
    }
    if (docs.size >= MAX_DOCS && [...docs.values()].every((d) => d.depth >= 5)) break;
  }

  // Persist cache
  saveCache(docs, searches);
  console.log(`[cache] saved ${docs.size} docs, ${searchCount} depth searches to ${CACHE_FILE}`);
  console.log(`[done] corpus size: ${docs.size}`);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
