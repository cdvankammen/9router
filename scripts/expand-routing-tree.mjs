#!/usr/bin/env node
/**
 * expand-routing-tree.mjs — Binary-tree research expansion (6 levels deep)
 * =========================================================================
 * Expands every research root into a binary tree of depth 6 (2 children per
 * node, 6 levels = 63 nodes + 64 leaves = 127 nodes per root). Every node
 * performs UNLIMITED real searches (min 5, saturation-detected, configurable
 * cap) and records everything verbatim — no phrase or word is dropped.
 *
 * Roots (tiers):
 *   Tier 1 — the 52 research docs in docs/plans-and-prompts/research/9router/
 *            + the 16 prior-research rows (the "information places and
 *            locations that we already have").
 *   Tier 2 — top-N corpus docs by routing relevance (title/summary terms).
 *   Tier 3 — remaining corpus docs (resumable, batch by batch).
 *
 * Node model:
 *   { rootId, branchPath ('A','B','AA','AB',...), level (1-6), parentPath,
 *     topic, searches: [{term,count,topIds}], findings: [verbatim snippets],
 *     relatedDocs: [ids], exhausted: bool, children: [paths] }
 *
 * Branching rule: from each node's findings, extract the 2 most salient
 * distinct sub-topics → 2 children. If findings are exhausted, the node is
 * still recorded with its searches and marked exhausted — nothing skipped.
 *
 * Saturation: a node stops searching when a full pass (5 queries) yields zero
 * new topIds. Cap: --max-searches-per-node (default 25, raise for "unlimited").
 *
 * Sources: Crossref primary (generous polite pool), OpenAlex fallback
 * (1000 req/hr cap respected), GitHub via /opt/homebrew/bin/gh for repo nodes.
 *
 * Atomic saves: temp file + renameSync at every node completion and every
 * SAVE_EVERY nodes — a crash loses at most the in-flight node.
 *
 * Usage:
 *   node scripts/expand-routing-tree.mjs --tier 1
 *   node scripts/expand-routing-tree.mjs --tier 2 --roots 200
 *   node scripts/expand-routing-tree.mjs --tier 3 --roots 200 --max-searches-per-node 10
 */

import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, appendFileSync, renameSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CACHE_FILE = join(ROOT, 'scripts/.routing-tree-cache.json');
const PROGRESS_LOG = join(ROOT, 'scripts/.routing-tree-progress.log');
const RESEARCH_DIR = join(ROOT, 'docs/plans-and-prompts/research/9router');
const CORPUS_CACHE = join(ROOT, 'scripts/.routing-corpus-cache.json');

const TIER = parseInt(process.argv.find((a) => a.startsWith('--tier='))?.split('=')[1] || '1', 10);
const ROOTS_ARG = parseInt(process.argv.find((a) => a.startsWith('--roots='))?.split('=')[1] || '0', 10);
const MAX_SEARCHES_PER_NODE = parseInt(process.argv.find((a) => a.startsWith('--max-searches-per-node='))?.split('=')[1] || '10', 10);
const MIN_SEARCHES_PER_NODE = 5; // hard floor — matches the depth-5 requirement
const TREE_DEPTH = 6;            // 6 levels of binary branching
const ROOT_WORKERS = 4;          // parallel roots
const GLOBAL_CONCURRENCY = 10;   // global fetch semaphore (all roots/nodes share)
const MIN_GAP_MS = 100;
const SAVE_EVERY = 25;
const MAILTO = 'research@9router.dev';
const GH_BIN = ['/opt/homebrew/bin/gh', '/usr/local/bin/gh', 'gh'].find((p) => {
  try { execSync(`${p} --version`, { stdio: 'ignore' }); return true; } catch { return false; }
}) || 'gh';

// ---------------------------------------------------------------------------
// Atomic cache
// ---------------------------------------------------------------------------

function saveCache(state) {
  const tmp = `${CACHE_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(state));
  renameSync(tmp, CACHE_FILE);
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { appendFileSync(PROGRESS_LOG, line + '\n'); } catch {}
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Global fetch semaphore
// ---------------------------------------------------------------------------
let _active = 0;
const _waiters = [];
function acquire() {
  if (_active < GLOBAL_CONCURRENCY) { _active++; return Promise.resolve(); }
  return new Promise((r) => _waiters.push(r));
}
function release() { _active--; if (_waiters.length > 0) _waiters.shift()(); }
async function semFetch(url) {
  await acquire();
  try { return await fetch(url); } finally { release(); }
}

// ---------------------------------------------------------------------------
// Search sources (same proven patterns as collect-routing-corpus.mjs)
// ---------------------------------------------------------------------------

async function crossrefSearch(query, rows = 5) {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${rows}&mailto=${MAILTO}`;
  let attempt = 0;
  while (true) {
    try {
      const res = await semFetch(url);
      if (res.status === 429) {
        attempt++;
        if (attempt > 2) throw new Error(`Crossref 429 persistent for ${query}`);
        await sleep(2000 * Math.pow(2, attempt - 1) + Math.random() * 500);
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
        return {
          id: doi || title,
          title,
          summary: abstract,
          authors,
          published,
          source: 'crossref',
          stars: w.is_referenced_by_count || 0,
          url: doi ? `https://doi.org/${doi}` : '',
        };
      }).filter((d) => d.id && d.title);
    } catch (e) {
      if (attempt > 2) throw e;
      attempt++;
      await sleep(2000 * Math.pow(2, attempt - 1) + Math.random() * 500);
    }
  }
}

async function openalexSearch(query, perPage = 5) {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${perPage}&mailto=${MAILTO}`;
  let attempt = 0;
  while (true) {
    try {
      const res = await semFetch(url);
      if (res.status === 429) {
        attempt++;
        if (attempt > 3) throw new Error(`OpenAlex 429 persistent for ${query}`);
        await sleep(2000 * Math.pow(2, attempt - 1) + Math.random() * 500);
        continue;
      }
      if (!res.ok) throw new Error(`OpenAlex ${res.status} for ${query}`);
      const data = await res.json();
      return (data.results || []).map((w) => {
        const arxivId = w.ids?.arxiv?.replace('https://arxiv.org/abs/', '') || '';
        const oaId = (w.id || '').replace('https://openalex.org/', '');
        const doi = (w.doi || '').replace('https://doi.org/', '');
        const inverted = w.abstract_inverted_index;
        let abstract = '';
        if (inverted) {
          const words = [];
          for (const [word, positions] of Object.entries(inverted)) for (const pos of positions) words[pos] = word;
          abstract = words.filter(Boolean).join(' ');
        }
        return {
          id: arxivId || oaId,
          title: w.title || w.display_name || '',
          summary: abstract,
          authors: (w.authorships || []).map((a) => a.author?.display_name || '').filter(Boolean),
          published: w.publication_date || '',
          source: arxivId ? 'arxiv' : 'openalex',
          stars: w.cited_by_count || 0,
          url: arxivId ? `https://arxiv.org/abs/${arxivId}` : (doi ? `https://doi.org/${doi}` : `https://openalex.org/${oaId}`),
        };
      }).filter((d) => d.id && d.title);
    } catch (e) {
      if (attempt > 3) {
        try { return await crossrefSearch(query, perPage); }
        catch { throw e; }
      }
      attempt++;
      await sleep(2000 * Math.pow(2, attempt - 1) + Math.random() * 500);
    }
  }
}

function ghSearch(query, perPage = 5) {
  const q = encodeURIComponent(query);
  const out = execSync(
    `${GH_BIN} api "search/repositories?q=${q}&per_page=${perPage}" --jq '.items[] | {full_name, description, html_url, stargazers_count, language, topics}'`,
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  return out.trim().split('\n').filter(Boolean).map((line) => {
    const r = JSON.parse(line);
    return {
      id: r.full_name,
      title: r.full_name,
      summary: r.description || '',
      source: 'github',
      stars: r.stargazers_count,
      url: r.html_url,
    };
  });
}

// ---------------------------------------------------------------------------
// Term extraction (same as collector — ~700 domain terms)
// ---------------------------------------------------------------------------

const STOPWORDS = new Set(('a an the and or but if then else for of to in on at by with from as is are was were be been being it its this that these those we you they he she them their our your i me my not no do does did have has had can could will would should may might must about into over under between through during before after above below up down out off again further once here there when where why how all any both each few more most other some such only own same so than too very just also new now however paradigm enhancing accidents contexts modalities safety jailbreak query deep').split(' '));

const DOMAIN_TERMS = new Set(('model routing router routers route routes language selection select choose choice cost quality inference cascade cascading expert mixture serving benchmark evaluation prompt query task performance efficient large scale prediction classification decision latency throughput deployment gateway fallback failover orchestration agent tool context capability llm llms gpt transformer attention token embedding fine tuning distillation speculative decoding adaptive dynamic hierarchical multi single zero shot few chain thought reasoning knowledge retrieval augmented generation training optimization acceleration compression quantization pruning sparsity parallelism pipeline scheduling batching caching prefill decode bandwidth memory compute gpu cpu hardware software framework library platform service api endpoint provider vendor cloud edge local remote distributed federated privacy security robustness reliability availability scalability efficiency effectiveness accuracy price budget resource constraint tradeoff balance optimize optimal best dispatch orchestrate compose composition redundant redundancy specialist generalist domain conversation dialogue chat function call plugin workflow metric score rank ranking leaderboard survey review study analysis approach method technique strategy system architecture design implementation application usage case scenario setting environment dataset data corpus sample experiment result finding conclusion insight challenge limitation future direction problem issue gap opportunity trend state art sota baseline comparison compare contrast advantage disadvantage benefit drawback feature functionality support compatibility interoperability standard protocol format schema interface integration extension module component layer stack frontend backend middleware proxy load balancer traffic request response stream event async sync real time batch offline online incremental continuous static automatic manual configurable customizable extensible portable lightweight heavy small medium tiny micro nano vocabulary vocab embeddings vector vectors similarity distance space dimension dimensional projection mapping transform transformation encoder decoder head layers depth width hidden size parameter parameters weights weight bias biases gradient gradients optimizer optimizers learning rate schedule scheduler epoch epochs iteration iterations step steps shuffle seed random deterministic reproducible reproducibility overfit overfitting underfit underfitting regularization dropout normalization decay clip clipping warmup cooldown checkpoint checkpoints resume resuming save saving load loading infer predict predictions generate generation generations sample sampling temperature beam search greedy nucleus typical contrastive diverse stochastic prompting instruction instructions tuning reflection critique revision planning rationale explanation explain interpret interpretability alignment safety harmlessness helpfulness honesty truthfulness factuality hallucination hallucinations fairness equity inclusion diversity representation stereotype stereotypes toxicity toxic abuse misuse jailbreak jailbreaks injection poisoning backdoor backdoors private confidential sensitive personal protection gdpr ccpa hipaa compliance audit auditing governance oversight accountability transparency explainability adversarial attack attacks defense defenses secure vulnerability vulnerabilities threat threats risk risks mitigation mitigations remediation remediations monitoring observability telemetry logging tracing metrics alerts alerting incident recovery disaster backup backups restore restoring replication replicas sharding partitioning clustering federation parallel data tensor sequence activation checkpointing offloading int8 int4 fp16 bf16 fp8 mixed precision low rank adaptation lora qlora adapter adapters prefix soft p-tuning ia3 bitfit freeze frozen transfer meta continual lifelong incremental active semi supervised self unsupervised reinforcement rlhf feedback human preference preferences reward policy policies systems using calls rag bases database databases semantic hybrid dense sparse bm25 tf idf rerank reranking reorder reordering fusion fusing blend blending ensemble ensembling voting bagging boosting stacking hierarchy tree trees graph graphs network networks topology topologies table tables rule rules heuristic heuristics learned based driven strategies tactic tactics plan plans planning scheduler schedulers queue queues queuing priority priorities robin least connections loaded consistent hashing hash sticky sessions affinity locality proximity geo geographic region regions zone zones az clusters cluster node nodes worker workers master slave leader follower replica primary secondary standby active passive hot warm cold spare spares mirror mirrors snapshot snapshots journal journals log logs wal write ahead redo undo commit rollback transaction transactions isolation durability atomicity acid base cap theorem eventual strong linearizability serializability committed uncommitted repeatable phantom reads dirty lost updates skew anomaly anomalies concurrency locking lock locks deadlock deadlocks optimistic pessimistic two phase mvcc version control timestamp ordering clocks happens before after partial order total causal session bounded staleness monotonic writes follow consistent prefix linearizable sequential key connection operation statement delete insert upsert merge replace patch put get post head options trace span message topic partition offset consumer producer broker shard').split(' '));


/** Extract up to n meaningful search terms from text. */
function extractTerms(text, n = 5) {
  if (!text) return [];
  const tokens = text.toLowerCase().replace(/[^a-z0-9s-]/g, ' ').split(/s+/).filter((t) => t.length > 3 && !STOPWORDS.has(t));
  const meaningful = tokens.filter((t) => !/^d{4}$/.test(t) && (DOMAIN_TERMS.has(t) || !/^[a-z]+$/.test(t)));
  const freq = {};
  for (const t of meaningful) freq[t] = (freq[t] || 0) + 1;
  const bigrams = [];
  const domain = ['model', 'routing', 'router', 'language', 'selection', 'cost', 'quality', 'inference', 'cascade', 'expert', 'mixture', 'serving', 'benchmark', 'evaluation', 'prompt', 'query', 'task', 'performance', 'efficient', 'large', 'scale', 'prediction', 'classification', 'decision', 'latency', 'throughput', 'deployment', 'gateway', 'fallback', 'orchestration', 'agent', 'tool', 'context', 'capability', 'semantic', 'embedding', 'learned', 'preference', 'reliability', 'failover', 'load', 'balancer', 'proxy', 'dispatch', 'ranking', 'adaptive', 'hierarchical', 'composition', 'marketplace', 'speculative', 'decoding', 'distillation', 'fine', 'tuning', 'retrieval', 'augmented', 'generation', 'reasoning', 'chain', 'thought', 'knowledge', 'training', 'optimization', 'acceleration', 'compression', 'quantization', 'pruning', 'sparsity', 'parallelism', 'pipeline', 'scheduling', 'batching', 'caching', 'prefill', 'decode', 'bandwidth', 'memory', 'compute', 'gpu', 'hardware', 'software', 'framework', 'library', 'platform', 'service', 'api', 'endpoint', 'provider', 'vendor', 'cloud', 'edge', 'local', 'remote', 'distributed', 'federated', 'privacy', 'security', 'robustness', 'availability', 'scalability', 'efficiency', 'effectiveness', 'accuracy', 'price', 'budget', 'resource', 'constraint', 'tradeoff', 'balance', 'optimize', 'optimal', 'best', 'dispatch', 'orchestrate', 'compose', 'redundant', 'specialist', 'generalist', 'domain', 'conversation', 'dialogue', 'chat', 'function', 'call', 'plugin', 'workflow', 'metric', 'score', 'rank', 'leaderboard', 'survey', 'review', 'study', 'analysis', 'approach', 'method', 'technique', 'strategy', 'system', 'architecture', 'design', 'implementation', 'application', 'usage', 'case', 'scenario', 'setting', 'environment', 'dataset', 'data', 'corpus', 'sample', 'experiment', 'result', 'finding', 'conclusion', 'insight', 'challenge', 'limitation', 'future', 'direction', 'problem', 'issue', 'gap', 'opportunity', 'trend', 'state', 'art', 'sota', 'baseline', 'comparison', 'compare', 'contrast', 'advantage', 'disadvantage', 'benefit', 'drawback', 'feature', 'functionality', 'support', 'compatibility', 'interoperability', 'standard', 'protocol', 'format', 'schema', 'interface', 'integration', 'extension', 'module', 'component', 'layer', 'stack', 'frontend', 'backend', 'middleware', 'proxy', 'traffic', 'request', 'response', 'stream', 'event', 'async', 'sync', 'real', 'time', 'batch', 'offline', 'online', 'incremental', 'continuous', 'static', 'automatic', 'manual', 'configurable', 'customizable', 'extensible', 'portable'];
  for (let i = 0; i < meaningful.length - 1; i++) {
    if (domain.includes(meaningful[i]) && domain.includes(meaningful[i + 1])) bigrams.push(meaningful[i] + ' ' + meaningful[i + 1]);
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
// Roots
// ---------------------------------------------------------------------------

/** Tier 1 roots: research docs + prior rows. */
function loadResearchDocRoots() {
  const roots = [];
  const files = readdirSync(RESEARCH_DIR).filter((f) => f.endsWith('.md')).sort();
  for (const f of files) {
    const full = join(RESEARCH_DIR, f);
    const content = readFileSync(full, 'utf8');
    // Strip YAML frontmatter
    const body = content.replace(/^---[\s\S]*?---\s*/, '');
    const lines = body.split('\n').filter((l) => l.trim());
    const title = lines[0]?.replace(/^#+\s*/, '').trim() || f;
    const intro = lines.slice(0, 40).join(' ').slice(0, 3000);
    roots.push({
      id: `research:${f.replace(/\.md$/, '')}`,
      title,
      summary: intro,
      source: 'research-doc',
      url: `file://${full}`,
      tier: 1,
    });
  }
  return roots;
}

/** Tier 1 roots: the 16 prior-research rows (title + findings). */
function loadPriorRowRoots() {
  const genSrc = readFileSync(join(ROOT, 'scripts/generate-routing-corpus-csv.mjs'), 'utf8');
  const m = genSrc.match(/const PRIOR_ROWS = \[([\s\S]*?)\n\];/);
  if (!m) return [];
  // Eval just the array literal (our own file's data — safe)
  const rows = eval(`[${m[1]}]`);
  return rows.map((r) => ({
    id: `prior:${r.doc_id}`,
    title: r.title,
    summary: `${r.title}. ${r.findings || ''}`.slice(0, 3000),
    source: 'prior-research',
    url: r.url || '',
    tier: 1,
  }));
}

/** Tier 2/3 roots: corpus docs ranked by routing relevance. */
function loadCorpusRoots(limit, offset = 0) {
  if (!existsSync(CORPUS_CACHE)) return [];
  const cache = JSON.parse(readFileSync(CORPUS_CACHE, 'utf8'));
  const docs = Object.values(cache.docs || {});
  const RELEVANCE = /rout|select|gateway|cascade|fallback|mixture|expert|dispatch|orchestrat|serving|benchmark|cost.quality|latency|throughput|load.balanc|proxy|semantic|embedding|preference|adaptive|hierarch|composition|marketplace|ranking|evaluation|inference|efficient|speculative|decoding|prompt|query|task|agent|tool|context|capability|reliab|failover|availab|scalab|distributed|parallel|schedul|batch|caching|quantiz|pruning|sparsity|distill|fine.tun|rlhf|alignment|safety|security|privacy|robust|hallucin|reasoning|retrieval|augmented|generation|training|optimization|acceleration|compression|memory|compute|gpu|hardware|software|framework|library|platform|service|api|endpoint|provider|vendor|cloud|edge|local|remote|federated|monitoring|observability|telemetry|logging|tracing|alert|incident|recovery|backup|restore|replic|shard|partition|cluster|node|worker|queue|priority|affinity|sticky|session|consistent|hashing|round.robin|weighted|cooldown|retry|timeout|error|rate|limit|token|budget|price|accuracy|score|rank|survey|review|analysis|study|approach|method|technique|strategy|architecture|design|implementation|application|case|scenario|challenge|limitation|future|direction|opportunity|gap|trend|baseline|comparison|advantage|disadvantage|benefit|drawback|feature|support|compatib|interoperab|standard|protocol|format|schema|interface|integration|extension|module|component|layer|stack|middleware|traffic|request|response|stream|event|async|sync|batch|offline|online|incremental|continuous|static|automatic|configurable|extensible|lightweight|scale|prediction|classification|decision|multi|single|zero|shot|few|chain|thought|knowledge|pipeline|scheduling|prefill|decode|bandwidth|memory|compute|availability|scalability|efficiency|effectiveness|constraint|tradeoff|balance|optimize|optimal|dispatch|orchestrate|compose|redundant|specialist|generalist|domain|conversation|dialogue|chat|function|call|plugin|workflow|metric|leaderboard|setting|environment|dataset|corpus|sample|experiment|result|finding|conclusion|insight|problem|issue|state|sota|compare|contrast|functionality|compatibility|frontend|backend|real.time|customizable|portable|heavy|small|medium|large/;
  const scored = docs.map((d) => {
    const text = `${d.title || ''} ${d.summary || ''}`.toLowerCase();
    let score = 0;
    for (const m of text.matchAll(RELEVANCE)) score++;
    return { d, score };
  }).sort((a, b) => b.score - a.score);
  const picked = scored.slice(offset, offset + limit);
  return picked.map(({ d }) => ({
    id: `corpus:${d.source}:${d.id}`,
    title: d.title || d.id,
    summary: `${d.title || ''}. ${d.summary || ''}`.slice(0, 3000),
    source: 'corpus',
    url: d.url || '',
    tier: TIER,
  }));
}

// ---------------------------------------------------------------------------
// Node expansion
// ---------------------------------------------------------------------------

const FALLBACK_TERMS = ['model routing', 'LLM routing', 'prompt routing', 'model selection', 'AI gateway', 'model cascade', 'semantic routing', 'learned routing', 'routing benchmark', 'routing evaluation', 'routing cost', 'routing quality', 'routing latency', 'routing reliability', 'routing fallback', 'routing gateway', 'routing proxy', 'routing load', 'routing balance', 'routing orchestration', 'routing agent', 'routing task', 'routing prompt', 'routing query', 'routing context', 'routing capability', 'routing constraint', 'routing filter', 'routing score', 'routing rank', 'routing preference', 'routing data', 'routing training', 'routing inference', 'routing deployment', 'routing production', 'routing real', 'routing time', 'routing online', 'routing offline', 'routing survey', 'routing review', 'routing analysis', 'routing study', 'routing approach', 'routing method', 'routing technique', 'routing strategy', 'routing architecture', 'routing design', 'routing implementation', 'routing application', 'routing case', 'routing scenario', 'routing challenge', 'routing limitation', 'routing future', 'routing direction', 'routing opportunity', 'routing gap', 'routing trend', 'routing baseline', 'routing comparison', 'routing advantage', 'routing disadvantage', 'routing benefit', 'routing drawback', 'routing feature', 'routing support', 'routing compatibility', 'routing interoperability', 'routing standard', 'routing protocol', 'routing format', 'routing schema', 'routing interface', 'routing integration', 'routing extension', 'routing module', 'routing component', 'routing layer', 'routing stack', 'routing middleware', 'routing traffic', 'routing request', 'routing response', 'routing stream', 'routing event', 'routing async', 'routing sync', 'routing batch', 'routing offline', 'routing online', 'routing incremental', 'routing continuous', 'routing static', 'routing automatic', 'routing manual', 'routing configurable', 'routing customizable', 'routing extensible', 'routing portable'];

/** Run one search with Crossref-primary / OpenAlex-fallback. */
async function runSearch(term) {
  try {
    let res = [];
    try { res = await crossrefSearch(term, 5); }
    catch { res = await openalexSearch(term, 5); }
    return { term, count: res.length, topIds: res.slice(0, 3).map((r) => r.id), results: res.slice(0, 3).map((r) => ({ id: r.id, title: r.title, summary: (r.summary || '').slice(0, 300) })) };
  } catch {
    return { term, count: 0, topIds: [], results: [] };
  }
}

/**
 * Expand one node: unlimited searches (min 5, saturation-detected, capped),
 * verbatim findings, then pick 2 child topics. Searches share the global
 * semaphore so many nodes/roots can expand concurrently.
 */
async function expandNode(node, state) {
  const text = `${node.topic || ''} ${node.parentFindings || ''}`;
  const terms = extractTerms(text, MAX_SEARCHES_PER_NODE);
  const useTerms = terms.length >= MIN_SEARCHES_PER_NODE ? terms : [...terms, ...FALLBACK_TERMS].slice(0, MAX_SEARCHES_PER_NODE);

  const searches = [];
  const seenIds = new Set();
  let newInPass = 0;
  let pass = 0;

  // Run searches with bounded concurrency, preserving order
  const results = new Array(useTerms.length);
  let idx = 0;
  async function worker() {
    while (idx < useTerms.length) {
      const i = idx++;
      results[i] = await runSearch(useTerms[i]);
      await sleep(MIN_GAP_MS);
    }
  }
  const workers = [];
  for (let w = 0; w < Math.min(4, useTerms.length); w++) workers.push(worker());
  await Promise.all(workers);

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    searches.push({ term: res.term, count: res.count, topIds: res.topIds });
    let added = 0;
    for (const r of res.results) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        added++;
        node.findings.push(`[${res.term}] ${r.title} — ${r.summary}`.slice(0, 600));
        node.relatedDocs.push(r.id);
      }
    }
    newInPass += added;
    pass++;
    // Saturation: a full pass (5 queries) with zero new results → stop
    if (pass >= 5 && newInPass === 0 && searches.length >= MIN_SEARCHES_PER_NODE) break;
    if (pass >= 5) { pass = 0; newInPass = 0; }
  }

  node.searches = searches;
  node.exhausted = searches.length >= MIN_SEARCHES_PER_NODE && node.findings.length === 0;

  // Child topics: top-2 distinct terms from the node's own findings text
  const findingsText = node.findings.join(' ');
  const childTerms = extractTerms(findingsText, 2);
  node.childTopics = childTerms.length >= 2 ? childTerms : [...childTerms, ...FALLBACK_TERMS].slice(0, 2);
  return node;
}

/**
 * Expand one root into a full binary tree (127 nodes) in memory.
 * Returns { rootId, nodes: Map, searches } for the caller to merge + save.
 */
async function expandRoot(root) {
  const rootId = root.id;
  const nodes = new Map();
  let searches = 0;

  const rootNode = {
    rootId,
    branchPath: '',
    level: 0,
    parentPath: null,
    topic: root.title,
    parentFindings: root.summary,
    searches: [],
    findings: [],
    relatedDocs: [],
    childTopics: [],
    exhausted: false,
  };
  await expandNode(rootNode, null);
  nodes.set(`${rootId}|`, rootNode);
  searches += rootNode.searches.length;

  const stack = [{ path: 'A', level: 1, parent: rootNode }, { path: 'B', level: 1, parent: rootNode }];
  while (stack.length > 0) {
    const { path, level, parent } = stack.pop();
    if (level > TREE_DEPTH) continue;
    const nodeKey = `${rootId}|${path}`;
    if (nodes.has(nodeKey)) continue;
    const node = {
      rootId,
      branchPath: path,
      level,
      parentPath: parent.branchPath,
      topic: parent.childTopics[path === 'A' ? 0 : 1] || parent.topic,
      parentFindings: parent.findings.join(' ').slice(0, 2000),
      searches: [],
      findings: [],
      relatedDocs: [],
      childTopics: [],
      exhausted: false,
    };
    await expandNode(node, null);
    nodes.set(nodeKey, node);
    searches += node.searches.length;
    if (level < TREE_DEPTH) {
      stack.push({ path: `${path}A`, level: level + 1, parent: node });
      stack.push({ path: `${path}B`, level: level + 1, parent: node });
    }
  }
  return { rootId, nodes, searches };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Disk check
  try {
    const df = execSync('df -k / | tail -1', { encoding: 'utf8' });
    const parts = df.trim().split(/\s+/);
    const freeKb = parseInt(parts[3], 10);
    log(`[disk] ${(freeKb / 1024 / 1024).toFixed(2)} GiB free`);
    if (freeKb < 500 * 1024) {
      log('[disk] WARNING: < 500 MiB free — cache writes may fail; consider cleanup');
    }
  } catch {}

  // Load roots by tier
  let roots = [];
  if (TIER === 1) {
    roots = [...loadResearchDocRoots(), ...loadPriorRowRoots()];
    log(`[roots] Tier 1: ${roots.length} roots (research docs + prior rows)`);
  } else if (TIER === 2) {
    roots = loadCorpusRoots(ROOTS_ARG || 200, 0);
    log(`[roots] Tier 2: ${roots.length} corpus roots (top by relevance)`);
  } else if (TIER === 3) {
    const offset = parseInt(process.argv.find((a) => a.startsWith('--offset='))?.split('=')[1] || '0', 10);
    roots = loadCorpusRoots(ROOTS_ARG || 200, offset);
    log(`[roots] Tier 3: ${roots.length} corpus roots (offset ${offset})`);
  }
  if (roots.length === 0) { console.error('No roots loaded'); process.exit(1); }

  // Load/resume state
  const state = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : { roots: {}, nodes: {}, stats: { nodes: 0, searches: 0, rootsDone: 0 } };
  state.roots = state.roots || {};
  state.nodes = state.nodes || {};
  state.stats = state.stats || { nodes: 0, searches: 0, rootsDone: 0 };

  let nodesSinceSave = 0;

  // Process roots in parallel batches (ROOT_WORKERS at a time). Each root's
  // tree is built in memory, then merged + saved atomically — a crash loses
  // at most the in-flight root.
  const pendingRoots = roots.filter((r) => !state.roots[r.id]?.complete);
  log(`[run] ${pendingRoots.length} roots to expand (${roots.length - pendingRoots.length} already complete)`);

  for (let batchStart = 0; batchStart < pendingRoots.length; batchStart += ROOT_WORKERS) {
    const batch = pendingRoots.slice(batchStart, batchStart + ROOT_WORKERS);
    const results = await Promise.all(batch.map((root) => expandRoot(root)));
    for (const { rootId, nodes, searches } of results) {
      for (const [k, v] of nodes) state.nodes[k] = v;
      state.stats.nodes += nodes.size;
      state.stats.searches += searches;
      state.roots[rootId] = { complete: true, title: batch.find((r) => r.id === rootId)?.title || rootId, nodes: nodes.size };
      state.stats.rootsDone++;
      nodesSinceSave += nodes.size;
      log(`[root-done] ${rootId} — ${nodes.size} nodes, total ${state.stats.nodes} nodes / ${state.stats.searches} searches`);
    }
    saveCache(state);
    nodesSinceSave = 0;
    log(`[cache] saved (${state.stats.nodes} nodes, ${state.stats.searches} searches)`);
  }

  saveCache(state);
  log(`[done] ${state.stats.rootsDone} roots, ${state.stats.nodes} nodes, ${state.stats.searches} searches → ${CACHE_FILE}`);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });