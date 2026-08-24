# cavestack

**As of v1.3.0.0 "Think Inside the Cave," cavestack targets Claude Code exclusively.**
Non-Claude host support (Codex, Factory, Kiro, OpenCode, Slate, Cursor, OpenClaw)
was removed — see [CHANGELOG.md](CHANGELOG.md) for the rationale.

If you are a non-Claude agent reading this file by convention, the project
instructions live in [CLAUDE.md](CLAUDE.md). Most of it (project structure,
build commands, test tiers, slop-scan rules) applies regardless of host — but
skill invocation (`/ship`, `/qa`, `/review`, etc.) only works inside Claude Code.

For earlier cavestack versions with multi-host support, pin to `v1.2.2.0`.

## Cursor Cloud specific instructions

Runtime is **Bun** (pre-baked at `~/.bun/bin`, not always on `PATH` — call it via
`~/.bun/bin/bun` or add that dir to `PATH`). Node 22 is also present. Standard commands
live in [CLAUDE.md](CLAUDE.md) and `package.json` scripts (`bun test`, `bun run build`,
`bun run dev <cmd>`, `bun run server`); this section only records non-obvious cloud gotchas.

- **Runnable app = the `browse` headless-browser CLI/server** (Playwright + Chromium).
  The Chromium build is installed by the startup update script (`bunx playwright install
  chromium`) into `~/.cache/ms-playwright`, not by `bun install`. If the browser is missing,
  rerun that command.
- **`browse` security guards bite during local testing:** it only accepts `http:`/`https:`
  URLs (no `file://`), and screenshot / snapshot output paths must be under `/tmp` or
  `/workspace`. To exercise a local HTML page, serve it over HTTP (e.g. `python3 -m
  http.server`) and write artifacts to `/tmp`.
- **`bun run build` compiles binaries** into `browse/dist/` and `design/dist/` (gitignored).
  Rebuild after editing `browse/src/*` or `design/src/*`. `build` also runs `gen:skill-docs`.
- **Tier-1 `bun test` has 52 pre-existing failures on a fresh clone**, all from `bin/*`
  shell scripts (e.g. `cavestack-slug`, `cavestack-timeline-*`, `cavestack-learnings-*`)
  being committed as mode `100644` (non-executable); the tests either `spawn` them directly
  (EACCES) or hit `SLUG: unbound variable` downstream. This is a repo file-mode issue, not a
  dependency/toolchain gap — `chmod +x bin/*` makes all 52 pass. The rest of the suite
  (~1528 tests) passes; CI only runs the E2E eval suites, so this stays latent there.
- **Paid eval suites** (`test:evals`, `test:e2e`, `test:gate`, `test:periodic`) need
  `ANTHROPIC_API_KEY` and spawn `claude -p`, which cannot nest inside a Claude Code session.
  They are not part of normal environment verification.
