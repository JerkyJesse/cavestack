---
name: context-save
preamble-tier: 2
version: 1.0.0
description: |
  Save working context (git state, decisions made, remaining work, failed
  approaches) so any future session can resume seamlessly. Writes structured
  context to a WIP commit with [cavestack-context] body or to state file.
  Use when: "save context", "I need to stop", "save my progress",
  "context save", "pause work", "checkpoint my state". Proactively suggest
  before session ends on complex multi-step work. (cavestack)
allowed-tools:
  - Bash
  - Read
  - Write
  - Grep
  - Glob
---

# /context-save — Save Working State

Save working context so any future session can resume seamlessly.

## When to use

- Before ending a session on multi-step work
- When switching between branches or tasks
- Before a potentially destructive operation
- When you want to capture decisions and rationale

## What gets saved

1. **Git state** — current branch, uncommitted changes, stash status
2. **Decisions made** — architectural choices, rejected approaches
3. **Remaining work** — what's left to do, in priority order
4. **Failed approaches** — what was tried and why it didn't work
5. **Key files** — which files are most relevant to resume

## Storage

Context is saved as a structured commit with `WIP:` prefix and a
`[cavestack-context]` body containing:

```
[cavestack-context]
branch: feature/my-feature
decisions:
  - Chose SQLite over PostgreSQL for local-first simplicity
  - Auth uses session tokens, not JWTs (simpler for this scale)
remaining:
  - [ ] Add error handling to upload endpoint
  - [ ] Write tests for the new parser
  - [ ] Update README with new CLI flags
failed:
  - Tried streaming upload but hit CORS issues with the CDN
files:
  - src/upload.ts (main work area)
  - src/parser.ts (new module, needs tests)
```

## Modes

- **commit** (default) — creates a WIP commit that `/context-restore` reads
- **file** — writes to `~/.cavestack/projects/$SLUG/context-saves/`
- **both** — saves to both locations

## Restore

Use `/context-restore` to resume from a saved context. It reads the latest
WIP commit or context file and reconstructs the session state.
