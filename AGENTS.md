# cavestack

**As of v1.3.0.0 "Think Inside the Cave," cavestack targets Claude Code exclusively.**
Non-Claude host support (Codex, Factory, Kiro, OpenCode, Slate, Cursor, OpenClaw)
was removed — see [CHANGELOG.md](CHANGELOG.md) for the rationale.

If you are a non-Claude agent reading this file by convention, the project
instructions live in [CLAUDE.md](CLAUDE.md). Most of it (project structure,
build commands, test tiers, slop-scan rules) applies regardless of host — but
skill invocation (`/ship`, `/qa`, `/review`, etc.) only works inside Claude Code.

For earlier cavestack versions with multi-host support, pin to `v1.2.2.0`.
