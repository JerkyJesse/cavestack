---
name: landing-report
preamble-tier: 2
version: 1.0.0
description: |
  Read-only snapshot of the workspace-aware ship queue. Shows which version
  slots are claimed, which sibling workspaces have WIP, and the status of
  each active branch. Dashboard view — no mutations, just visibility.
  Use when: "landing report", "what's in the queue", "ship queue status",
  "what branches are active", "workspace status". (cavestack)
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
---

# /landing-report — Ship Queue Dashboard

Read-only snapshot of the workspace-aware ship queue.

## When to use

- Before starting new work — see what's already in flight
- To check if any branches are stuck or stale
- To see which version slots are claimed
- When coordinating parallel work streams

## Dashboard output

```
+================================================================+
|                      LANDING REPORT                             |
+================================================================+
| Branch                  | Status    | Last Activity | Owner    |
|-------------------------|-----------|---------------|----------|
| feature/smart-upload    | IN REVIEW | 2h ago        | you      |
| feature/auth-refactor   | WIP       | 15min ago     | you      |
| fix/n-plus-one          | MERGED    | 1d ago        | you      |
| feature/new-dashboard   | STALE     | 5d ago        | you      |
+----------------------------------------------------------------+
| Active: 2  |  Review: 1  |  Merged: 1  |  Stale: 1            |
+================================================================+

Version slots:
  v1.4.0 — claimed by feature/smart-upload (PR #42)
  v1.4.1 — available
  v1.5.0 — available (next minor)
```

## Status definitions

| Status | Meaning |
|--------|---------|
| WIP | Active work in progress, uncommitted or unreviewed changes |
| IN REVIEW | PR open, awaiting review or CI |
| MERGED | PR merged, may need deploy |
| STALE | No activity in 3+ days, likely abandoned |
| BLOCKED | CI failing or review requested changes |

## Flags

- `--all` — include merged/closed branches (default: active only)
- `--json` — output as JSON for scripting
