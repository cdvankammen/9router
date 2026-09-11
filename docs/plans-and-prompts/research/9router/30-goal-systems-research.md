---
title: Goal Systems Research for Agent Persistence
date: 2026-09-08
author: Hermes Agent (automated research)
status: active
tags: [goal-systems, agent-persistence, BDI, copilot-goal-system, hermes, deep-research]
---

# Goal Systems Research for Agent Persistence Design

## Executive Summary

Exhaustive research into goal-tracking systems across VS Code extensions, GitHub repos, BDI academic frameworks, and modern LLM agent frameworks. The local **copilot-goal-system** extension (gabrimatic v1.1.22) provides the most complete reference implementation for a Hermes goal-persistence plugin — it already implements hierarchical goals, session persistence, completion detection, and hooks integration.

---

## 1. Local VS Code Extension: copilot-goal-system

### Extension Identity
- **Extension ID**: `gabrimatic.copilot-goal-system` v1.1.22
- **Publisher**: Soroush Yousefpour (gabrimatic)
- **Installed at**: `~/.vscode-insiders/extensions/gabrimatic.copilot-goal-system-1.1.22/`
- **Also mirrored at**: `~/.copilot/extensions/goal-system/` (active Copilot plugin)
- **GitHub**: https://github.com/gabrimatic/copilot-goal-system

### Architecture Overview

The extension has a multi-layered architecture:

1. **VS Code Extension Shell** (`extension.cjs`): Registers VS Code commands (install, status, walkthrough, etc.)
2. **Copilot Plugin** (`extension.mjs`): Hooks into Copilot sessions via context providers
3. **Goal Core Library** (`lib/goal-core.mjs`): The actual goal management engine
4. **CLI Tool** (`bin/goalctl.mjs`): Command-line goal control
5. **MCP Server** (`adapters/mcp/server.mjs`): Model Context Protocol interface
6. **Hook System** (`hooks/goal-context.sh`): Shell hooks for context injection

### Goal Schema (from goal-core.mjs)

```javascript
// Goal state machine: draft → active → paused → done | failed | cancelled
const GOAL_STATES = {
  draft: 'draft',
  active: 'active', 
  paused: 'paused',
  done: 'done',
  failed: 'failed',
  cancelled: 'cancelled'
};

// Goal object structure
const goal = {
  id: string,           // unique identifier
  parentId: string|null, // parent goal ID (null for top-level)
  title: string,
  description: string,
  status: 'draft'|'active'|'paused'|'done'|'failed'|'cancelled',
  priority: 'low'|'medium'|'high'|'critical',
  subgoals: Goal[],      // child goals (recursive decomposition)
  completionCriteria: string,  // human-readable check
  blockers: string[],    // list of blocker descriptions
  progress: number,      // 0-100 percentage
  createdAt: string,     // ISO timestamp
  updatedAt: string,
  completedAt: string|null,
  metadata: object       // extensible key-value store
};
```

### Persistence Mechanism

State stored in JSON files under `~/.copilot/session-state/goal-system/`:
- **Per-session state**: `by-session/<session-id>.json` — active goals for a session
- **Compacted history**: `compact/<session-id>.txt.json` — compressed summaries
- **Audit log**: `audit.log` — append-only log of all goal state transitions

```bash
# State directory structure
~/.copilot/session-state/goal-system/
├── by-session/
│   └── b42a5176-ba20-474d-a8ab-0d054e10e2c3.json
├── compact/
│   └── b42a5176-ba20-474d-a8ab-0d054e10e2c3.txt.json
└── audit.log
```

### Completion Detection

The system uses two mechanisms:
1. **Explicit marking**: `goalctl complete <goal-id>` sets status to `done`
2. **Criteria evaluation**: `completionCriteria` string is evaluated against current state
3. **Subgoal aggregation**: Parent goal completes when ALL subgoals are `done`
4. **Blocker resolution**: Goal blocked = has unresolved blockers; unblocked = all blockers cleared

### Hook Integration (goal-context.sh)

The hook script injects goal context into Copilot conversations:

```bash
# Injects into every Copilot prompt:
# - Current goal hierarchy
# - Active subgoals and their status
# - Blockers requiring attention
# - Progress percentages
# - Completion criteria for current goal
```

### Decomposition Logic

Goals decompose via explicit sub-goal creation:
- `goalctl add --parent <parent-id> --title "Subgoal title"`
- Parent progress auto-calculated from subgoal completion ratio
- Recursive decomposition: subgoals can have their own subgoals
- No automatic decomposition — agent/user must explicitly create subgoals

### Auto-Resume Features

- Session state persisted to disk, surviving VS Code restarts
- On session start, loads `by-session/<session-id>.json` and restores goal tree
- `goalctl status` shows all active goals across sessions
- Audit log enables recovery from any state transition

---

## 2. GitHub Repos Analyzed (10+ repos)

### 2.1 agentralabs/agentic-planning
- **URL**: https://github.com/agentralabs/agentic-planning
- **Focus**: Planning agent with task decomposition
- **Schema**: Tasks with dependencies, priorities, and states
- **Completion**: Dependency graph resolution — task done when all deps satisfied
- **Persistence**: JSON state files with session ID
- **Decomposition**: LLM-driven task breakdown into atomic subtasks
- **Hermes adaptation**: Task dependency graph maps to goal subgoal hierarchy

### 2.2 MAX0MAX/goal-driven
- **URL**: https://github.com/MAX0MAX/goal-driven
- **Focus**: Goal-driven agent architecture
- **Schema**: Goal → Plan → Action hierarchy
- **Completion**: Goal achieved when plan steps complete successfully
- **Persistence**: SQLite database with goal snapshots
- **Decomposition**: Plans generated per-goal, actions generated per-plan
- **Hermes adaptation**: Plan generation hook could auto-create subgoals

### 2.3 prevalentWare/opencode-goal-plugin
- **URL**: https://github.com/prevalentWare/opencode-goal-plugin
- **Focus**: OpenCode goal persistence plugin
- **Schema**: State machine with explicit transitions
- **Completion**: State reaches terminal state (done/failed)
- **Persistence**: JSON state file with session resume
- **Decomposition**: Goal hierarchy with parent-child relationships
- **Hermes adaptation**: Direct model for Hermes plugin — same hook pattern

### 2.4 kyegomez/swarms
- **URL**: https://github.com/kyegomez/swarms
- **Focus**: Multi-agent swarm orchestration with goal persistence
- **Schema**: Task objects with assignee, status, dependencies
- **Completion**: All tasks in workflow complete
- **Persistence**: Redis/SQLite backend for state storage
- **Decomposition**: Workflow DAG with task decomposition
- **Hermes adaptation**: Swarm pattern for parallel goal execution

### 2.5 gabrimatic/copilot-goal-system
- **URL**: https://github.com/gabrimatic/copilot-goal-system
- **Focus**: The local extension analyzed above
- **Schema**: Hierarchical goals with status/priority/progress
- **Completion**: Status = done OR all subgoals done
- **Persistence**: JSON files in session-state directory
- **Decomposition**: Explicit subgoal creation via CLI
- **Hermes adaptation**: **PRIMARY REFERENCE** — proven architecture

### 2.6 gammon-bio/claude-brain
- **URL**: https://github.com/gammon-bio/claude-brain
- **Focus**: Claude-powered persistent task management
- **Schema**: Brain → Memories → Tasks hierarchy
- **Completion**: Task completion triggers memory consolidation
- **Persistence**: Markdown files with YAML frontmatter
- **Decomposition**: LLM-driven task breakdown
- **Hermes adaptation**: Memory + goal integration pattern

### 2.7 alnewkirk/tbc-agent
- **URL**: https://github.com/alnewkirk/tbc-agent
- **Focus**: TBC agent with goal tracking
- **Schema**: Goal → Milestone → Task hierarchy
- **Completion**: Milestone completion = all tasks done
- **Persistence**: File-based state with git-like commits
- **Decomposition**: Milestones decomposed into tasks
- **Hermes adaptation**: Git-like state tracking for audit trail

### 2.8 willytop8/OpenCode-goal-plugin
- **URL**: https://github.com/willytop8/OpenCode-goal-plugin
- **Focus**: OpenCode goal management
- **Schema**: Goal with dependencies, blockers, progress
- **Completion**: Progress = 100% AND no blockers
- **Persistence**: SQLite database
- **Decomposition**: Explicit subgoal creation
- **Hermes adaptation**: Blocker tracking pattern for Hermes

### 2.9 langchain-ai/langgraph (persistence patterns)
- **URL**: https://github.com/langchain-ai/langgraph
- **Focus**: State graph with checkpoint persistence
- **Schema**: StateGraph with typed state nodes
- **Completion**: Graph reaches END node
- **Persistence**: Checkpointers (MemorySaver, SqliteSaver, PostgresSaver)
- **Decomposition**: Graph nodes = decomposition units
- **Hermes adaptation**: Checkpoint pattern for goal state snapshots

### 2.10 jason-lang/jason (BDI framework)
- **URL**: https://github.com/jason-lang/jason
- **Focus**: BDI agent programming language
- **Schema**: Beliefs → Desires → Intentions
- **Completion**: Intention execution completes
- **Persistence**: Belief base serialized to JSON
- **Decomplan**: Plans triggered by event + context matching
- **Hermes adaptation**: BDI event-driven goal activation pattern

### 2.11 bebop-a0x/reboot (LangGraph persistence patterns)
- **URL**: https://github.com/bebop-a0x/reboot
- **Focus**: LangGraph persistence patterns
- **Schema**: State checkpoints with thread isolation
- **Completion**: Checkpoint reaches terminal state
- **Persistence**: Postgres/SQLite checkpointers
- **Decomposition**: Graph nodes = subtask units
- **Hermes adaptation**: Thread-based goal isolation

---

## 3. Academic Frameworks (BDI Architecture)

### 3.1 Jason (AgentSpeak)
- **URL**: https://jason-lang.github.io/
- **Architecture**: Beliefs → Desires → Intentions (BDI)
- **Goal Persistence**: Belief base persisted to JSON; intentions stack serialized
- **Decomposition**: Plans triggered by events + context matching
- **Completion**: Intention stack empty = goal achieved
- **Key Insight**: Goals are **events** (+!goal) matched to plans; persistence is belief-base serialization

```prolog
// Jason goal example
+!say(hello) : happy(bob) <- .print(hello).
// Event: +!say(hello)
// Context: happy(bob)
// Plan body: .print(hello)
// When executed, intention completes = goal achieved
```

### 3.2 GAMA (Multi-Agent Platform)
- **URL**: https://gama-platform.org/
- **Architecture**: Agent-based simulation with goal-driven behavior
- **Goal Persistence**: Agent state serialized per tick
- **Decomposition**: Species definitions = goal templates
- **Completion**: Simulation termination condition
- **Key Insight**: Goal persistence via periodic state snapshots (tick-based)

### 3.3 SPADE (Smart Python Agent Development Environment)
- **URL**: https://github.com/python-spade/spade
- **Architecture**: XMPP-based multi-agent system with BDI
- **Goal Persistence**: Agent behavior serialized to XML/JSON
- **Decomposition**: Behaviors = goal execution units
- **Completion**: Behavior completion triggers next behavior
- **Key Insight**: Goal persistence via behavior serialization

### 3.4 BDI State Machine (Academic Synthesis)

```
┌─────────────┐
│   BELIEFS    │  (World model)
│  (persist)   │
└──────┬──────┘
       │ +event
       ▼
┌─────────────┐
│   DESIRES    │  (Goal candidates)
│  (generate)  │
└──────┬──────┘
       │ select
       ▼
┌─────────────┐
│  INTENTIONS  │  (Active goals)
│  (commit)    │
└──────┬──────┘
       │ execute
       ▼
┌─────────────┐
│    PLANS     │  (Action sequences)
│  (persist)   │
└──────┬──────┘
       │ complete/fail
       ▼
┌─────────────┐
│   RESULTS    │  (Update beliefs)
│  (persist)   │
└─────────────┘
```

---

## 4. Agent Framework Persistence (LangGraph, AutoGen, CrewAI, LlamaIndex)

### 4.1 LangGraph
- **Persistence**: Checkpoint-based (MemorySaver, SqliteSaver, PostgresSaver)
- **Thread Isolation**: `thread_id` in config = conversation namespace
- **State Shape**: TypedDict with message lists and custom fields
- **Resume**: `app.invoke(None, config)` resumes from last checkpoint
- **Time Travel**: `get_state_history()` enables branching from any checkpoint
- **Key Code**:
```python
from langgraph.checkpoint.sqlite import SqliteSaver
saver = SqliteSaver.from_conn_string("checkpoints.db")
graph = builder.compile(checkpointer=saver)
config = {"configurable": {"thread_id": "session-1"}}
graph.invoke(input, config)  # saves checkpoint
# Later, same thread_id resumes automatically
```

### 4.2 AutoGen (Microsoft Agent Framework)
- **Persistence**: In-memory only; no built-in serialization
- **State**: Shared memory pool between agents
- **Resume**: Manual retry logic required
- **Key Insight**: Delegates persistence to external integrations (Redis, Mem0, ChromaDB)
- **Hermes adaptation**: Could use Hermes memory MCP as persistence backend

### 4.3 CrewAI
- **Persistence**: Flow state with "precise" persistence (SQLite)
- **State**: Role-based task assignments with status tracking
- **Resume**: Manual checkpoint restore
- **Key Insight**: Cognitive memory architecture (short-term, long-term, entity)
- **Hermes adaptation**: Role-based goal assignment pattern

### 4.4 LlamaIndex
- **Persistence**: In-memory + JSON export
- **State**: Session-based with context objects
- **Resume**: Manual retry logic
- **Key Insight**: Data-first approach; persistence is secondary
- **Hermes adaptation**: Less relevant for goal persistence

### 4.5 Framework Comparison Matrix

| Framework | Persistence | Resume | Decomposition | Goal Schema | Hermes Fit |
|-----------|-------------|--------|---------------|-------------|------------|
| LangGraph | Checkpointers (SQLite/Postgres) | Automatic via thread_id | Graph nodes | TypedDict state | ⭐⭐⭐⭐⭐ |
| AutoGen | External (Redis, Mem0) | Manual | Agent roles | Message passing | ⭐⭐⭐ |
| CrewAI | SQLite + cognitive memory | Manual checkpoint | Role-based tasks | Task objects | ⭐⭐⭐⭐ |
| LlamaIndex | In-memory + JSON | Manual | Data pipelines | Context objects | ⭐⭐ |

---

## 5. Goal Schema Patterns (Synthesized)

### Pattern 1: Hierarchical Tree
```json
{
  "goal_id": "root",
  "parent_id": null,
  "children": ["sub1", "sub2"],
  "status": "active",
  "progress": 50
}
```

### Pattern 2: State Machine
```json
{
  "goal_id": "g1",
  "state": "active",
  "transitions": {
    "draft": ["active"],
    "active": ["paused", "done", "failed"],
    "paused": ["active", "cancelled"]
  }
}
```

### Pattern 3: Dependency Graph
```json
{
  "goal_id": "g1",
  "depends_on": ["g0"],
  "blocks": ["g2", "g3"],
  "status": "blocked"
}
```

### Pattern 4: Event-Driven (BDI)
```json
{
  "goal_id": "g1",
  "trigger_event": "+!achieve(X)",
  "context": "belief_match(X)",
  "plan": ["action1", "action2"]
}
```

### Pattern 5: Checkpointed
```json
{
  "thread_id": "session-123",
  "checkpoint_id": "cp-456",
  "state": {"messages": [...], "goal_status": "active"},
  "metadata": {"step": 7, "timestamp": "..."}
}
```

---

## 6. Completion Detection Methods

### Method 1: Status Flag
- Goal has `status: "done"` field
- Simplest approach; requires explicit marking

### Method 2: Subgoal Aggregation
- Parent goal completes when ALL children are `done`
- Progress = completed_children / total_children * 100

### Method 3: Dependency Resolution
- Goal completes when all `depends_on` goals are `done`
- No explicit status needed; inferred from graph

### Method 4: Criteria Evaluation
- `completionCriteria` string evaluated against world state
- Example: "file exists AND tests pass"

### Method 5: Event Matching (BDI)
- Goal completes when plan execution succeeds
- Failure triggers replanning or goal drop

### Method 6: Checkpoint Terminal State
- Graph reaches END node = goal complete
- Checkpoint saved with terminal status

---

## 7. Adaptation for Hermes Plugin Hooks

### 7.1 Recommended Architecture

```
┌─────────────────────────────────────────────────┐
│                 Hermes Goal System               │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Plugin   │◄──│   Core   │──►│  MCP     │  │
│  │  Hooks    │   │  Engine  │   │  Server  │  │
│  └────┬─────┘   └────┬─────┘   └──────────┘  │
│       │              │                          │
│       ▼              ▼                          │
│  ┌──────────┐    ┌──────────┐                  │
│  │ Context  │    │  State   │                  │
│  │ Provider │    │  Store   │                  │
│  └──────────┘    └──────────┘                  │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 7.2 Plugin Hooks

```json
{
  "hooks": {
    "onSessionStart": {
      "command": "bash",
      "args": ["~/.hermes/hooks/goal-resume.sh"],
      "description": "Load active goals from disk, inject into context"
    },
    "onContext": {
      "command": "bash", 
      "args": ["~/.hermes/hooks/goal-context.sh"],
      "description": "Inject current goal hierarchy into prompt"
    },
    "onToolCall": {
      "command": "bash",
      "args": ["~/.hermes/hooks/goal-progress.sh"],
      "description": "Update goal progress based on tool outcomes"
    },
    "onGoalComplete": {
      "command": "bash",
      "args": ["~/.hermes/hooks/goal-complete.sh"],
      "description": "Mark goal done, update parent progress, persist state"
    }
  }
}
```

### 7.3 State Store (SQLite)

```sql
-- Goal hierarchy
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES goals(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  priority TEXT DEFAULT 'medium',
  progress REAL DEFAULT 0,
  completion_criteria TEXT,
  blockers TEXT,  -- JSON array
  metadata TEXT,  -- JSON object
  created_at TEXT,
  updated_at TEXT,
  completed_at TEXT
);

-- State transitions (audit trail)
CREATE TABLE goal_transitions (
  id INTEGER PRIMARY KEY,
  goal_id TEXT REFERENCES goals(id),
  from_state TEXT,
  to_state TEXT,
  timestamp TEXT,
  reason TEXT
);

-- Session-goal mapping
CREATE TABLE session_goals (
  session_id TEXT,
  goal_id TEXT REFERENCES goals(id),
  PRIMARY KEY (session_id, goal_id)
);
```

### 7.4 Context Injection

```bash
#!/bin/bash
# goal-context.sh — inject into Hermes prompt

HERMES_GOALS_DB="$HOME/.hermes/goals.db"

# Get current session's active goals
ACTIVE_GOALS=$(sqlite3 "$HERMES_GOALS_DB" "
  SELECT g.id, g.title, g.status, g.progress, g.parent_id
  FROM goals g
  JOIN session_goals sg ON g.id = sg.goal_id
  WHERE sg.session_id = '$HERMES_SESSION_ID'
    AND g.status IN ('active', 'paused')
  ORDER BY g.priority DESC, g.created_at ASC;
")

# Build goal hierarchy string
echo "## Active Goals"
echo "$ACTIVE_GOALS" | while IFS='|' read -r id title status progress parent_id; do
  echo "- [$status] $title ($progress%) — ID: $id"
done
```

### 7.5 Key Adaptation Patterns

| Copilot Goal System Pattern | Hermes Adaptation |
|---------------------------|-------------------|
| `~/.copilot/session-state/goal-system/` | `~/.hermes/goals.db` (SQLite) |
| `goalctl` CLI | `hermes goal` CLI subcommand |
| `hooks.json` context provider | Plugin hook `onContext` |
| Per-session JSON files | SQLite with session_goals table |
| Audit log file | goal_transitions table |
| `extension.mjs` Copilot plugin | Hermes plugin `goal-system` |
| MCP server adapter | Hermes MCP tool `goal_*` |

---

## 8. Open Questions

1. **Goal naming convention**: Should goals use UUID or human-readable IDs?
2. **Concurrency**: How to handle multiple agents working on same goal?
3. **Timeout handling**: Should goals auto-fail after inactivity period?
4. **Cross-session goals**: Goals that span multiple Hermes sessions?
5. **Goal templates**: Predefined goal structures for common task types?

---

## 9. Sources

### Local Files
- `~/.vscode-insiders/extensions/gabrimatic.copilot-goal-system-1.1.22/`
- `~/.copilot/extensions/goal-system/`
- `~/.copilot/session-state/goal-system/`

### GitHub Repos
1. https://github.com/gabrimatic/copilot-goal-system
2. https://github.com/agentralabs/agentic-planning
3. https://github.com/MAX0MAX/goal-driven
4. https://github.com/prevalentWare/opencode-goal-plugin
5. https://github.com/kyegomez/swarms
6. https://github.com/gammon-bio/claude-brain
7. https://github.com/alnewkirk/tbc-agent
8. https://github.com/willytop8/OpenCode-goal-plugin
9. https://github.com/langchain-ai/langgraph
10. https://github.com/jason-lang/jason
11. https://github.com/bebop-a0x/reboot

### Documentation
- https://docs.langchain.com/oss/python/langgraph/persistence
- https://jason-lang.github.io/
- https://deepwiki.com/jason-lang/jason/3.3-goal-lifecycle

### Research Papers
- Khan, S. (2026). "Resume Means Resume: A Machine-Checked Conformance Contract for Checkpoint, Interrupt, and Resume Semantics in Workflow Persistence Layers." arXiv:2608.03836v3

---

## Status

- [x] Local extension source code analyzed
- [x] 10+ GitHub repos researched
- [x] BDI frameworks (Jason, GAMA, SPADE) reviewed
- [x] LangGraph/AutoGen/CrewAI/LlamaIndex persistence analyzed
- [x] Goal schema patterns synthesized
- [x] Completion detection methods cataloged
- [x] Hermes adaptation design proposed
- [ ] Implementation of Hermes goal system plugin (future work)
