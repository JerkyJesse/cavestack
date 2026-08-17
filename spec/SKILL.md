---
name: spec
preamble-tier: 2
version: 1.0.0
description: |
  Turn vague intent into a precise, executable spec. Five phases: why (problem
  statement), scope (boundaries + non-goals), technical (mandatory code-reading
  + architecture), draft (structured spec document), file (output to disk or
  issue tracker). Quality gate blocks filing below 7/10 score. Fail-closed
  secret redaction, dedupe against existing issues, archive to state root for
  team-corpus recall. --execute spawns agent in fresh worktree; /ship auto-closes
  source issue on merge. Plan-mode aware.
  Use when: "write a spec", "spec this out", "turn this into a ticket",
  "make this precise", "what exactly should we build". Proactively suggest
  when user describes a feature vaguely or jumps to implementation without
  clear requirements. (cavestack)
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
  - WebSearch
---

# /spec — Spec Author

Turn vague intent into a precise, executable specification.

## When to use

- User describes a feature without clear boundaries
- Before starting implementation on anything non-trivial
- When you need to align on scope before coding
- When filing issues or tickets that others will pick up

## Five Phases

### Phase 1: Why
Establish the problem statement. What pain exists? Who feels it? What does
success look like? Challenge assumptions — the stated problem may not be the
real problem.

### Phase 2: Scope
Define boundaries explicitly:
- **In scope:** What this spec covers
- **Out of scope:** What it deliberately excludes
- **Non-goals:** Things that sound related but aren't part of this work

### Phase 3: Technical
Mandatory code-reading phase. Before designing anything:
1. Read the relevant source files
2. Map the current architecture
3. Identify integration points
4. Document existing patterns to follow

### Phase 4: Draft
Write the structured spec:
- Problem statement (from Phase 1)
- Proposed solution with implementation details
- Data model changes (if any)
- API surface (if any)
- Test plan
- Migration/rollback strategy
- Open questions

### Phase 5: File
Output the spec:
- Save to `~/.cavestack/projects/$SLUG/specs/`
- Optionally file as a GitHub issue
- Quality gate: self-score 1-10, block below 7
- Secret redaction: scan for API keys, tokens, PEM blocks before filing

## Flags

- `--execute` — After filing, spawn an agent in a fresh worktree to implement
- `--dry-run` — Generate spec but don't file or save
- `--issue` — File as GitHub issue after approval

## Quality Gate

Before filing, the spec is scored on:
- Clarity (can someone implement from this alone?)
- Completeness (are edge cases addressed?)
- Testability (can success be verified?)
- Scope precision (are boundaries clear?)

Score below 7/10 blocks filing and returns to drafting.
