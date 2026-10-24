# Branch V: Analytics & Insights — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, analytics, insights, dashboards, binary-tree, branch-v

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch V: ANALYTICS & INSIGHTS

Turn imported messages into actionable analytics: usage trends, provider comparisons, cost breakdowns, error rates, and model performance — unified with native traffic.

### L2 V1: USAGE ANALYTICS

#### L3 V1a: Unified Usage Stats
- **L4 V1a1: Combined Queries**
  - L5: Extend usageDb queries to UNION imported_messages
  - L6: Dashboard quota page shows native + imported together
- **L4 V1a2: Source Breakdown**
  - L5: Usage stats grouped by source (native/hermes/log-file/manual)
  - L6: Stacked bar charts

#### L3 V1b: Trend Analysis
- **L4 V1b1: Daily/Monthly Trends**
  - L5: Requests, tokens, cost per day/month
  - L6: Line charts with source breakdown

### L2 V2: PROVIDER COMPARISON

#### L3 V2a: Provider Leaderboard
- **L4 V2a1: Cost per Provider**
  - L5: Total cost, avg cost/request, tokens per provider
  - L6: Table + bar chart
- **L4 V2a2: Reliability per Provider**
  - L5: Error rate, avg latency per provider
  - L6: Identifies underperforming providers

#### L3 V2b: Model Comparison
- **L4 V2b1: Model Cost/Quality**
  - L5: Cost per model, error rate per model
  - L6: Helps choose models for combos

### L2 V3: ERROR ANALYTICS

#### L3 V3a: Error Dashboard
- **L4 V3a1: Error Rate Trends**
  - L5: Error rate over time (native + imported)
  - L6: Anomaly detection (spike > 2x baseline)
- **L4 V3a2: Top Errors**
  - L5: Top error categories with counts and sample messages
  - L6: Reuses errorCategorizer

#### L3 V3b: Cost of Errors
- **L4 V3b1: Wasted Spend**
  - L5: Cost of failed requests (tokens consumed before error)
  - L6: Highlights retry waste

### L2 V4: AGENT ANALYTICS

#### L3 V4a: Per-Agent Stats
- **L4 V4a1: Agent Usage**
  - L5: Requests, tokens, cost per agent (hermes, claude-code, cursor)
  - L6: Filter by agent in dashboard

#### L3 V4b: Session Analytics
- **L4 V4b1: Session Duration**
  - L5: Avg session length, messages per session
  - L6: From conversation reconstruction (Branch E)

### L2 V5: REPORTING

#### L3 V5a: Scheduled Reports
- **L4 V5a1: Weekly Summary**
  - L5: Email/file report: usage, cost, top errors, provider health
  - L6: Configurable recipients

#### L3 V5b: Exportable Reports
- **L4 V5b1: CSV/PDF Export**
  - L5: Export analytics tables to CSV/PDF
  - L6: Reuses Branch O export infra

### L2 V6: ANOMALY DETECTION

#### L3 V6a: Cost Anomalies
- **L4 V6a1: Cost Spike Alert**
  - L5: Daily cost > 2x 7-day average → alert
  - L6: Dashboard banner + optional webhook

#### L3 V6b: Usage Anomalies
- **L4 V6b1: Request Spike Alert**
  - L5: Request volume > 3x baseline → alert
  - L6: Could indicate runaway agent loop

## Open Questions

1. Which analytics matter most: cost, errors, or provider health?
2. Should analytics be a new dashboard page or extend existing quota page?
3. Are scheduled reports needed or is on-demand enough?

## Related Implementation Plans

- `9router/impl-plan-import-16-analytics-insights.md` — unified stats queries, provider leaderboard, error dashboard with code