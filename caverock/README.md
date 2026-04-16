# CaveRock

> AI talk too much. CaveRock fix.

Lightweight caveman mode for Claude Code. One skill. Always on. No fluff.

Want the full framework with 40 skills? Install [CaveStack](https://github.com/JerkyJesse/cavestack) instead.

## Install

Need [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Node.js](https://nodejs.org/), Git.

```bash
git clone https://github.com/JerkyJesse/caverock.git ~/.claude/skills/caverock
cd ~/.claude/skills/caverock && ./setup
```

Open new Claude Code session. Caveman mode active. No command needed.

## What You Get

| Thing | What It Do |
|-------|-----------|
| Caveman mode | Always on. Every response = terse. Automatic. |
| 3 intensity levels | `/caveman lite` (gentle), `full` (default), `ultra` (maximum grunt) |
| Reversible | `stop caveman` to disable. `/caveman` to re-enable. |

## Before / After

| Default Claude | CaveRock Claude |
|---------------|----------------|
| "I'd be happy to help! Let me look at your code..." | *[reads code]* |
| "The issue appears to be related to the authentication middleware where..." | "Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:" |
| 47 lines explaining what it's about to do | 5 lines doing it |

## Commands

```bash
/caveman lite    # gentle compression
/caveman full    # classic caveman (default)
/caveman ultra   # maximum grunt
stop caveman     # disable
normal mode      # same as stop caveman
```

## Uninstall

```bash
~/.claude/skills/caverock/caverock-uninstall
```

## CaveStack

CaveRock is the lightweight version. [CaveStack](https://github.com/JerkyJesse/cavestack) includes:

- 40 skills (`/review`, `/ship`, `/qa`, `/investigate`, `/cso`...)
- Headless browser (`/browse`)
- Design tools (`/design-review`, `/design-consultation`)
- Security audit (`/cso`)
- Everything CaveRock has, plus more

## Credit

MIT. Caveman hooks: [Julius Brussee](https://github.com/JuliusBrussee/caveman). Built by [JerkyJesse](https://github.com/JerkyJesse).
