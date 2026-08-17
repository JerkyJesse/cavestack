---
name: context-restore
preamble-tier: 2
version: 1.0.0
description: |
  Resume from a saved context. Reads the latest WIP commit with
  [cavestack-context] body or state file, reconstructs session state:
  which branch, what was decided, what remains, what failed. Works across
  workspace handoffs and session boundaries.
  Use when: "restore context", "resume work", "where was I", "pick up
  where I left off", "context restore", "continue from last session".
  Proactively suggest at session start when WIP commits or context files
  are detected. (cavestack)
allowed-tools:
  - Bash
  - Read
  - Write
  - Grep
  - Glob
  - AskUserQuestion
---

# /context-restore — Resume From Saved State

Resume from a saved context, even across session boundaries.

## When to use

- At the start of a new session to resume prior work
- After switching back to a branch with saved context
- When picking up someone else's WIP

## How it works

1. **Detect context** — searches for:
   - Latest `WIP:` commit with `[cavestack-context]` body on current branch
   - Context files in `~/.cavestack/projects/$SLUG/context-saves/`
   - Multiple contexts? Shows a picker

2. **Parse state** — extracts:
   - Decisions made (so we don't re-debate them)
   - Remaining work (prioritized task list)
   - Failed approaches (so we don't retry them)
   - Key files (opens them for immediate context)

3. **Reconstruct** — presents a briefing:
   ```
   Resuming: feature/smart-upload (saved 2h ago)

   Decisions locked:
   - SQLite for local storage (not Postgres)
   - Session tokens for auth (not JWTs)

   Remaining (3 items):
   1. Add error handling to upload endpoint
   2. Write tests for parser
   3. Update README

   Failed (don't retry):
   - Streaming upload via CDN (CORS issues)

   Ready to continue. Start with item 1?
   ```

4. **Continue** — picks up remaining work in order

## Flags

- `--list` — show all saved contexts without restoring
- `--branch <name>` — restore context for a specific branch
- `--latest` — auto-pick the most recent context (skip picker)

## Integration with /ship

When `/ship` runs on a branch with WIP commits, it filter-squashes them
before the PR — preserving non-WIP commits so bisect stays clean. The
context metadata is stripped; only the actual code changes survive.
