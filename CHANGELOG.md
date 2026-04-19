# Changelog

## [1.3.0.1] - 2026-04-19 — v1.3.0.0 docs refresh

The README feature table now lists the three guards that shipped with
v1.3.0.0: CAVE rails (Cave protocol + Zero-Test-Drift in the preamble),
the test-scaffold gate (`soft` / `hard` / `off`), and the internet hedge
guard that blocks unhedged `WebSearch says` claims. The landing page
footer and JSON-LD both advertise v1.3.0.0 instead of the old 1.0.1.0
placeholder, and `voices/README.md` documents the `content_floors`
schema alongside density thresholds so profile authors can add their
own substance checks.

## [1.3.0.0] - 2026-04-18 — Think Inside the Cave

CaveStack now owns its own metaphors. Skills lead with cavestack vocabulary
(skills, dashboards, gates) instead of comparing to external tools. Credits and
CHANGELOG still name upstream projects where attribution matters. Prose is ours.

**Ship smaller first.** Plan skills now surface three-tier options where
Approach **A** is the simplest viable slot — the thing that solves the stated
problem and nothing else. B adds one rail. C is the full buildout. Shortcuts
are still labeled, but "complete" no longer means "maximal."

**Internet flagged as hypothesis.** When your session mentions `WebSearch says`,
`Google confirms`, `according to the latest docs`, or similar internet-sourced
claims without a hedge nearby, the voice-verify hook now blocks the message and
asks you to reframe: the web is a starting point, not a verdict. Hedges like
`hypothesis`, `claim`, `unverified`, `verify before` clear the floor. Disable
per-session with `CAVESTACK_VOICE=none`.

**Caught when you skip tests.** New `test_scaffold_gate` hook watches `Write`
and `Edit` tool calls. When source code ships without a paired test file,
soft mode prints a stderr warning; hard mode blocks the call and names the
expected test path. Default is **soft** — visible nudge, no friction. Flip
to **hard** for strict CI-like enforcement locally, or **off** to disable.

**Less gstack-style framing.** Live skill prose (AskUserQuestion text, CAVE
protocol body, diagnostic tables) no longer pitches cavestack via comparison
to gstack or other frameworks. The skills describe what cavestack does on its
own terms.

**Claude Code only now.** cavestack is done pretending to be a multi-agent
framework. The Codex, Factory Droid, Kiro, OpenCode, Slate, Cursor, and
OpenClaw host targets are gone — along with `--host`, the `.agents/` /
`.factory/` / `.kiro/` sidecars, and the ClawHub publishing flow. If you were
running cavestack under any of those hosts, pin to `v1.2.2.0` or migrate to
Claude Code. `./setup` no longer takes `--host`; it just installs for Claude.
`cavestack-uninstall` still scrubs legacy sidecars when it finds them, so
upgrading cleans up after itself. Why: the cross-host adapters were a
constant tax on every new skill, and in practice nearly all usage is under
Claude. Dropping them lets the skill surface stay sharp instead of trying to
be everything to everyone.

### Added

- **Content-floor enforcement** — Voice profiles now support `content_floors`,
  substance-level checks that fire before density checks. First floor shipped:
  `unverified_internet_claim`. Trigger patterns, required hedges, and violation
  thresholds are configurable per-voice in `voices/*.json`.
- **Test-scaffold gate** — `hooks/test-scaffold-gate.js` runs as a `PreToolUse`
  hook on `Write|Edit`. Detects source files without paired tests (sibling,
  `__tests__/`, `test/`, `scripts-mirror`, browse/design sub-repos, hooks/
  patterns). Session-scoped write log at `~/.cavestack/sessions/${id}-writes.jsonl`
  clears pairings once the test lands in the same session.
- **`cavestack-config set test_scaffold_gate {off|soft|hard}`** — three-mode
  config knob registered in the header annotation block. Hook reads live on
  every invocation, no restart needed.
- **CAVE behavioral rails** — Preamble resolver now emits a Cave protocol
  (identity, trust model, simplicity) and a Zero-Test-Drift protocol (pair
  sources with tests) alongside Zero-Shortcuts / Try-First / Musk 5-Step.
  Both rails persist regardless of voice profile.
- **Per-skill smoke test.** `bun test` now runs `test/skill-smoke.test.ts`
  on every top-level skill directory: parses YAML frontmatter, confirms
  `name` and `description` are set, and cross-references each skill
  against `docs/skills.md`. Add a new skill, you get a test for free —
  a regression in any skill's frontmatter fails the build before ship.

### Tuning

Enable hard-mode test scaffolding:

```bash
~/.claude/skills/cavestack/bin/cavestack-config set test_scaffold_gate hard
```

Disable entirely:

```bash
~/.claude/skills/cavestack/bin/cavestack-config set test_scaffold_gate off
```

Disable voice-verify content floors for one session:

```bash
CAVESTACK_VOICE=none
```

### For contributors

- `voices/schema.json` gains `content_floors` object with
  `unverified_internet_claim.{enabled, trigger_patterns, required_hedges, max_violations}`.
- `scripts/lib/voice-density.ts` exports `checkContentFloors()` with a 200-char
  hedge-proximity window and per-violation line/context reporting.
- `hooks/caveman-voice-verify.ts` runs content-floor checks before density
  checks; build artifact at `hooks/caveman-voice-verify.js` via `bun run build:hook`.
- `hooks/test-scaffold-gate.js` is ESM (package.json declares `"type": "module"`);
  reads config via `cavestack-config get test_scaffold_gate`; resolves pair
  candidates via the Test-Match Table in the hook body.
- `bin/cavestack-settings-hook` gains `install-test-scaffold-gate` and
  `remove-test-scaffold-gate` actions; `setup` wires them during CAVEMAN_INSTALL.
- Test timeouts bumped to 10s (voice-verify) / 15s (scaffold-gate multi-spawn)
  to survive Windows Node startup (~2–3s per `spawnSync`).
- New tests: `test/test-scaffold-gate.test.ts` (13 cases),
  `test/caveman-voice-verify-internet.test.ts` (7 cases),
  `test/skill-smoke.test.ts` (dynamic discovery, 1 test per skill).
- `hosts/` collapsed to `claude.ts` + `index.ts`. Former host configs
  (`codex.ts`, `cursor.ts`, `factory.ts`, `kiro.ts`, `opencode.ts`,
  `slate.ts`, `openclaw.ts`) and `scripts/host-adapters/` deleted.
- `scripts/gen-skill-docs.ts` loses `ALL_HOST_CONFIGS`, `ALL_HOST_NAMES`,
  `resolveHostArg`, `codex-helpers` imports, `HOST_ARG` parsing, and the
  `hostsToRun` loop. Single Claude pass; `Host` type is now a `'claude'`
  literal. `agents/openai.yaml` emission is gone.
- `./setup` loses `--host`, the `CODEX_CAVESTACK` / `FACTORY_CAVESTACK`
  branches, and the per-host runtime-root helpers
  (`create_codex_runtime_root`, `link_codex_skill_dirs`,
  `create_factory_runtime_root`, `link_factory_skill_dirs`,
  `create_agents_sidecar`, `migrate_direct_codex_install`).
- `test/codex-e2e.test.ts`, `test/gemini-e2e.test.ts`,
  `test/openclaw-native-skills.test.ts`, `test/host-config.test.ts`,
  `test/helpers/codex-session-runner.ts` removed. Golden fixtures for
  `codex-ship-SKILL.md` and `factory-ship-SKILL.md` removed; Claude
  fixture kept.
- `openclaw/` directory removed (4 native skills + OpenClaw docs). The
  `cavestack-openclaw-*` skills on ClawHub remain published but are
  **abandoned** — no further updates, no bug fixes.
- `contrib/add-host/`, `docs/OPENCLAW.md`, `docs/ADDING_A_HOST.md`,
  `agents/openai.yaml` removed.
- `.github/workflows/evals.yml` + `evals-periodic.yml` drop `e2e-codex`
  / `e2e-gemini` matrix entries and `OPENAI_API_KEY` / `GEMINI_API_KEY`
  env. `skill-docs.yml` drops its Codex/Factory freshness steps.
- `package.json` drops `test:codex{,:all}` and `test:gemini{,:all}`
  scripts and their matching test globs.
- `bin/cavestack-uninstall` preserves multi-host cleanup for a release
  window so upgraders from a pre-1.3 install don't carry stale
  `~/.codex/skills/cavestack*` / `~/.factory/skills/cavestack*` /
  `~/.kiro/skills/cavestack*` dirs forward.

## [1.2.2.0] - 2026-04-18 — Windows cookie import, cookie picker survives CLI exit, caveman locked to full

Windows cookie import works now. Chrome 80+ moved cookies from
`profile/Cookies` to `profile/Network/Cookies`, uses DPAPI for the master
key, and v20 App-Bound Encryption on newer versions. cavestack handles all
three: profile auto-discovery, DPAPI decryption via PowerShell (with a
`pwsh.exe` fallback on hardened systems), and a CDP headless fallback for
v20 cookies that bypass user-space decryption.

When v20 decryption kicks in, the cookie picker now pops a confirmation
dialog first. The fallback has to launch Chrome against your real profile
directory (v20 keys are path-bound, so a copy won't work). If Chrome is
force-killed mid-launch, profile state can corrupt. You get the warning
before the launch happens so the risk is your call.

The cookie picker UI survives after the CLI exits. Before, `$B cookies
import --picker` spawned a picker server that died the moment the CLI
process ended, leaving users staring at a dead port. Now the picker stays
alive while codes are pending and shuts itself down after timeout.

The browse server persists across Claude Code Bash calls. The sandbox
sends SIGTERM between tool invocations, which previously killed the
server mid-session. Now SIGTERM is ignored in normal (headless) mode.
Headed + tunnel modes still respect it (leaked browsers on shared
machines were a real resource leak). SIGINT and `/stop` still work.

The server watchdog that detects a vanished parent process is now
resilient to Windows PID reuse. Before, a recycled PID could make the
server think its parent was still alive forever; now we capture the
parent's start time at launch and reject a mismatch as a dead parent
even when the PID is reusing.

Caveman mode is now locked to **full**. No more `/caveman lite` or
`/caveman ultra` — one compression level for everyone. Wenyan variants
(`wenyan-lite`, `wenyan-full`, `wenyan-ultra`) are still available via
`/caveman wenyan`. "stop caveman" and "normal mode" still disable per
session. Reduces decision fatigue; nobody was switching levels anyway.

### Added

- **Windows cookie import** (#892). DPAPI decryption, profile discovery
  under `%LOCALAPPDATA%\Google\Chrome\User Data`, Chrome 80+ cookie path
  handling, AES-256-GCM decryption with platform branching (Windows vs.
  AES-128-CBC on mac/linux), v20 App-Bound Encryption detection.
- **CDP fallback for v20 cookies** (#892). When v20 encryption blocks
  direct key access, cavestack launches Chrome headless on the real
  profile and extracts cookies via `Network.getAllCookies` over CDP
  WebSocket. Chrome picks a debug port itself (`--remote-debugging-port=0`)
  and we read the chosen port from `DevToolsActivePort` in user-data-dir,
  so there's no collision risk with other Chrome-based tools.
- **Preflight warning in the cookie picker** before v20 CDP launch. The
  UI now asks you to confirm before launching Chrome against your real
  profile, surfacing the profile-corruption risk of a force-killed
  headless launch.
- **`hasActivePicker()` gate** (#996). Cookie picker stays alive while
  codes are pending; only shuts down after all codes expire.

### Changed

- **Browse server SIGTERM behavior** (#994 + #1020). Normal headless mode
  ignores SIGTERM and parent-PID watchdog so the server persists across
  Claude Code Bash calls. Headed + tunnel modes still shut down cleanly
  on SIGTERM (prevents leaked browsers on shared machines). SIGINT always
  shuts down. Idle timeout (30 min) handles eventual cleanup.
- **Parent-PID watchdog guards against Windows PID reuse.** The watchdog
  captures the parent's creation time at launch (via WMIC / PowerShell on
  Windows, `ps -o lstart=` on mac/linux) and shuts the server down when
  the start time mismatches, even if the PID still resolves. The probes
  run async so the 15s tick no longer blocks the event loop.
- **Windows tree-kill for spawned processes.** Every kill site
  (DPAPI PowerShell, macOS Keychain, secret-tool, Chrome headless) now
  routes through `taskkill /F /T /PID` on Windows so Chrome's renderer,
  GPU, and utility children no longer orphan and lock the profile.
- **Windows AES-256 key handling is now per-session.** The master key is
  cached as the DPAPI-encrypted blob (safe at rest) instead of the
  decrypted key. Plaintext is zeroed after each import. macOS and Linux
  still cache the derived key — the Keychain prompt makes re-derivation
  expensive and the threat model is unchanged there.
- **Temp cookie-DB copies are swept on process crash.** If the server
  dies via SIGKILL or an uncaught exception before `Database.close()`
  runs, the exit + uncaughtException + unhandledRejection handlers now
  unlink the `.db` / `.db-wal` / `.db-shm` files they created.
- **Caveman voice locked to full**. `/caveman lite` and `/caveman ultra`
  removed. `caveman-lite.json` and `caveman-ultra.json` voice profiles
  deleted. SKILL docs, README, setup, web docs, and tests updated to
  reflect the single level.

### Fixed

- **Tilde-in-assignment triggering Claude Code permission prompts**
  (#993). `scripts/resolvers/design.ts` (3 spots) and 4 skill templates
  (`design-shotgun`, `plan-design-review`, `design-consultation`,
  `design-review`, `cavestack-upgrade`) now use `"$HOME/..."` instead of
  bare `~/...`. Resolves the permission-dialog spam when skills set up
  their design/browse/report directories.
- **OpenClaw native skills now load in Codex** (#864). Normalized YAML
  frontmatter on the 4 hand-authored OpenClaw skills
  (`cavestack-openclaw-ceo-review`, `cavestack-openclaw-investigate`,
  `cavestack-openclaw-office-hours`, `cavestack-openclaw-retro`). Dropped
  non-standard `version` and `metadata` fields; rewrote descriptions into
  simple "Use when..." form without inline colons. Codex CLI was
  rejecting the old frontmatter with "mapping values are not allowed in
  this context."

### For contributors

- New regression tests: `test/openclaw-native-skills.test.ts` enforces
  strict frontmatter (name + description only) on the four native
  OpenClaw skills, CRLF-tolerant for Windows git checkouts. New direct
  unit tests for `hasActivePicker()` and the `/cookie-picker/preflight`
  endpoint.
- `importCookiesWithV20Fallback()` consolidates the v10→CDP fallback
  heuristic previously duplicated between the picker route and the
  write-commands direct-import path.
- `extractCookiesViaCdp` now has a fresh 15s budget for target
  discovery; the shared deadline with DevToolsActivePort polling could
  silently shrink the target-discovery window on a cold Chrome launch.
- Exit-sweep handlers for temp cookie DBs no longer re-throw from
  `uncaughtException` / `unhandledRejection` — they sweep and let Node's
  default handler produce the diagnostic.
- Ported from garrytan/gstack#1028 (community wave v0.18.1.0): PRs #892
  (msr-hickory), #864 (cathrynlavery), #994 + #1020 + #996 + #993
  (upstream contributors + Claude).

## [1.2.1.0] - 2026-04-17 — Resume Protocol rail: every skill ends with a paste-ready handoff

Every cavestack skill now closes with a two-section Resume Protocol: a
`## Shipped this session` bullet list (what concretely landed) and a
`## Next session resume prompt` block containing a single ```text fence
with a prose paragraph you can select-all and paste into a fresh Claude
session. No more "what was I doing?" when context evaporates.

The paragraph shape is fixed: `Continue <slug>. <state sentence>. Next:
(1) <step>. (2) <step>. (3) <step>.` — no slash commands, no bullets inside
the fence, no hedging. One paragraph, one fence, one paste.

Also new: the `cavestack-resume` CLI reconstructs the resume prompt from
local state when a session dies before the skill emits its Resume Protocol
section. Pulls the last completed skill from `timeline.jsonl` and the
latest design doc or checkpoint, then prints both sections to stdout.

### Added

- **Resume Protocol directive** in every tier 2+ cavestack skill. Verbose
  at tier 2-3 (full anti-pattern list, paragraph shape rules), compact at
  tier 4 (one-line rule). Tier 1 utility skills skip it.
- **`cavestack-resume` CLI** at `bin/cavestack-resume`. Run it anywhere
  and it reconstructs both Resume Protocol sections from your local state.
  Supports `--branch <name>` and `--project <slug>` flags; falls back to
  the current branch and most-recently-touched project when omitted.
  Tolerates missing checkpoints dirs and malformed JSONL lines.

### Changed

- **Office-hours, plan-design-review, plan-devex-review** no longer emit
  their own next-skill recommendation prose at close. The Resume Protocol
  supplies the closing pattern uniformly.

### For contributors

- New `RESUME_FULL`, `RESUME_COMPACT`, and `generateResumeProtocol(tier)`
  in `scripts/resolvers/behavioral-protocols.ts`. Wired into tier 2+
  composition in `scripts/resolvers/preamble.ts` after the Musk directive.
- The CLI is pure bash + `bun -e` for JSONL parsing. Reads only. No
  network, no writes.

## [1.2.0.0] - 2026-04-17 — Musk 5-step algorithm baked into every skill

Every cavestack skill now applies the Musk 5-step algorithm before scoping
work. Question every requirement, delete first, simplify, accelerate,
automate — in **strict order**, never reverse, never skip ahead. No new
commands, no new flags. Sharper scope, fewer half-finished features.

The directive ships verbose at tier 2-3 (workflow + planning skills) and
compact at tier 4 (ship/review/qa/qa-only/design-review/land-and-deploy).
Tier 1 utility skills (browse, setup-cookies, benchmark) skip it entirely
since they don't author code or scope tasks.

### Added

- **Musk 5-Step Algorithm directive** in every tier 2+ cavestack skill.
  Caveman-styled to pass the existing voice-density Stop hook. Strict-order
  reinforcement: caught on step 4-5 without finishing 1-3 = stop and restart
  at step 1.
- **Opt-in CLAUDE.md injection.** After accepting the proactive setting,
  the next cavestack skill invocation in a project offers to append a
  `## Build philosophy` section to your CLAUDE.md (~10 lines). Same UX as
  the routing-injection prompt. Decline once and we never ask again. Gate
  is the HTML comment marker `<!-- cavestack-build-philosophy -->`, not the
  H2 header — so CHANGELOG quotes won't trip the gate.

### For contributors

- New `MUSK_RULES_FULL`, `MUSK_RULES_COMPACT`, and
  `BUILD_PHILOSOPHY_CLAUDE_MD_SECTION` constants in
  `scripts/resolvers/behavioral-protocols.ts`. Single source of truth — the
  CLAUDE.md template body derives from `MUSK_RULES_COMPACT` via H2→H3
  string interpolation, not literal duplication. Editing the constant
  propagates everywhere.
- Tier 4 skills get the compact variant to bound SKILL.md growth
  (`ship/SKILL.md` pre-existing 112KB; this change adds ~1.7KB). Tier 1
  skills skip the directive entirely.
- New tests in `test/gen-skill-docs.test.ts` `build philosophy directive`
  describe block: tier-3 inclusion, tier-4 compact variant, tier-1 exclusion,
  CLAUDE.md template structure, opt-in flow, marker-comment gate.
- Golden files `test/fixtures/golden/{claude,codex,factory}-ship-SKILL.md`
  regenerated. Diff is the new directive content only.

## [1.1.1.0] - 2026-04-17 — Voice-verify hardening + review comparison relaunch

Patch release on top of v1.1.0.0. Plugs four evasion paths the `/review`
skill surfaced right after shipping closed-loop voice enforcement, and
restores the text side-by-side `/review` comparison on the marketing site.

### Voice-verify hardening

- **Unclosed code fences no longer silence density scoring.** Previously,
  an assistant could emit ```` ```bash ```` and talk prose afterward without
  ever closing the fence — the rest of the response read as "code" and
  passed density unchecked. Now an unclosed fence reverts the opening
  line to prose and the whole body scores normally.
- **YAML frontmatter bounded to the first 20 lines.** Starting a message
  with `---` and never closing used to strip everything until the next
  stray `---`. Now the closing delimiter must appear within 20 lines;
  otherwise the leading `---` is treated as prose and the rest scores.
- **Retry detection simplified to Claude Code's authoritative flag.**
  Dropped the "previous assistant message less than 5 seconds ago"
  fallback. That fallback false-positived on fast legitimate
  conversations — a genuinely over-floor turn right after a passing
  turn got soft-markered instead of blocked. Now `stop_hook_active`
  from Claude Code is the only retry signal.
- **Stop hook timeout bumped 1s → 5s.** Matches the other caveman
  hooks. p95 is 183ms on Windows, but cold-start Node + antivirus
  scan + a near-cap transcript could previously exceed 1 second and
  trigger a silent fail-open. 5s absorbs that variance.
- **Installing caveman now also installs the voice-verify Stop hook.**
  Previously, a user who ran `./setup --no-caveman` and later enabled
  caveman via `install-caveman` would end up with SessionStart +
  UserPromptSubmit hooks registered but no Stop hook, because the
  v1.1.0.0 migration marker blocked a rerun. Now `install-caveman`
  bundles `install-voice-verify`, and `remove-caveman` is symmetric.
- **Minor fixes:** `computeDensity` verbose-phrase count now stays in
  sync with the flagged-items list when a phrase appears multiple
  times on one line; `readStdin` clears its safety timeout on
  success/error instead of leaking a stale callback.

### Marketing site

- Replaced the PNG carousel with a text side-by-side rendition of the
  exact `/review` output a user sees in default verbose mode vs CaveStack
  caveman mode. Same findings, 82% less prose, rendered as panes users
  can scroll independently.

### Tests

Three new regression tests cover the evasion guards (unclosed fence,
unbounded YAML, bounded YAML). Scenario 4 of the Stop hook integration
suite rewritten as a regression guard asserting fast legitimate turns
still block on first attempt. Total suite: 41 pass, 0 fail (up from 38).

## [1.1.0.0] - 2026-04-17 — Closed-loop voice enforcement

Caveman voice is no longer a suggestion. Every assistant response now passes
through a density check before it reaches you. If the model drifts verbose
mid-session, the response is blocked and rewritten. No more "starts tight,
ends verbose by turn 40." Voice invariance over time, not just at turn 1.

### What you can now do

- **See voice drift die at the gate.** A new Stop hook reads your last
  message, counts articles/filler/hedges/verbose phrases per 100 words,
  and blocks if it fails your active profile's floor. The model rewrites
  once, then ships (with a marker if still over-floor) so you're never stuck.
- **Pick your intensity.** Each caveman profile has its own runtime floor:
  `caveman-full` (default, articles ≤2.0/100w), `caveman-lite` (looser,
  ≤3.0/100w — keeps articles + sentences), `caveman-ultra` (strictest,
  ≤1.0/100w — fragments + tables). `none` profile stays exempt.
- **Stop writing Phase 2 / future work / later TODOs.** A second terminal
  rule ("NO DEFERRED WORK") lives in every caveman profile and in
  CLAUDE.md. Ship scope complete in one shot or cut scope — no third state.
  Design docs, plans, and TODOs all get this guardrail.
- **Opt out without uninstalling.** `CAVESTACK_VOICE_VERIFY=0` per-session,
  or `cavestack-config set voice_verify false` persistent. Hook fails open
  on any error (missing transcript, bad config, timeout) — never traps you.
- **Keep your code/commits/PRs normal.** Code blocks, inline backtick code,
  GitHub markdown tables, YAML frontmatter, and HTML comments are stripped
  before scoring. Only prose is checked. Security warnings stay verbose.

### Under the hood

- New shared density math at `scripts/lib/voice-density.ts` — single source
  of truth for `voice-audit.ts` (build-time template check) and
  `caveman-voice-verify.js` (runtime Stop hook). No duplication.
- New `hooks/caveman-voice-verify.ts` source compiles to
  `hooks/caveman-voice-verify.js` via `bun run build:hook`. Node-compatible,
  no dependencies, p95 latency 183ms on Windows (300ms budget).
- `density_thresholds` object populated in every caveman profile JSON.
  Schema already supported it — no schema change needed.
- `voices/README.md` documents threshold derivation and when to adjust.
- `setup` auto-registers the Stop hook when caveman mode is installed.
  `setup --no-caveman` removes it. Existing installs get it via the
  `v1.1.0.0.sh` upgrade migration.
- `bin/cavestack-settings-hook` gains `install-voice-verify` and
  `remove-voice-verify` subcommands.

### Tests

- 26 unit tests for the density lib (computeDensity, checkThresholds,
  extractNonFloorText, loadProfile).
- 11 integration scenarios for the Stop hook (pass, block, two retry
  paths, opt-out, short-message guard, profile=none, missing transcript,
  no-stdin, code stripping, profile comparison) plus a latency benchmark.
- 12 validation assertions for the new profile clauses and threshold
  ordering invariant.

## [1.0.1.0] - 2026-04-17 — Cave Mural website redesign

The marketing site now looks like the tool itself feels: cave wall, torch glow,
hand-drawn petroglyphs, zero clickthrough. Every pitch fact is visible in the
first screen. Everything verbose hides in a single collapsible at the bottom.

### What you can now do

- **Visit one page and get the whole pitch.** Hero + terminal demo + 9 skills
  grid + collapsible deep-dive. No nav, no tabs, no "learn more" round trips.
- **Copy-paste install in one click.** The install box has an amber border,
  a firelight glow, and a big copy button that turns green when it worked.
- **Read the docs without leaving the page.** Everything you'd want on a
  "How it works" page is folded into a single `<details>` at the bottom —
  install, voice, philosophy, character-based metrics, what's on disk, team
  mode, troubleshooting, license.
- **Tell a story with cave art.** Four hand-authored petroglyph SVGs (handprint,
  mammoth, spiral, torch) anchor the sections without stock-clipart energy.
  Amber is rare and meaningful: only on torch, install border, `<details>` marker.

### Accessibility + SEO upgrades

- Skip link to content (WCAG 2.4.1 now A-level compliant).
- Every interactive surface has a visible focus ring (amber outline, 2px).
- Torch cursor auto-disables on touch and on `prefers-reduced-motion`.
- Terminal `aria-live` is off so screen readers don't narrate every keystroke.
- JSON-LD SoftwareApplication schema so Google gets the name, price, license,
  download URL right.
- `sitemap.xml` and `robots.txt` so search engines can actually crawl the site.
- Proper `og:` and `twitter:` tags so the link preview on Twitter/X, Slack,
  Discord, LinkedIn all look right.

### What's gone

- `docs/methodology.html` and `docs/roadmap.md` — both were dead ends that
  distracted from the pitch. Deferred items now live as GitHub Issues.
- The benchmark table on the marketing page — moved to the collapsible docs
  section. The front page is for "what and why", not "prove it to me".

### For contributors

- Inline `<style>` in `docs/index.html` extracted to `docs/styles.css` so the
  two pages share a stylesheet and CSS caches across navigation.
- `docs/install` (no extension) mirrors `docs/install.sh` so the one-liner
  resolves. GitHub Pages serves the extensionless file as octet-stream; curl
  still pipes it to sh without issue.
- 8-token color palette locked in CSS custom properties. Anyone contributing
  a new skill card should use `var(--heading)` / `var(--cave-brown)` and
  keep amber off the chrome.
- `TODOS.md` preamble updated: deferred ideas → GitHub Issues, not a
  phantom roadmap doc.

## [1.0.0.0] - 2026-04-16 — v1.0 finished product

CaveStack is now a **finished product**. You can install it in one line, see
every skill from inside your terminal, and know exactly what's getting
measured — without running a single line of telemetry anywhere.

**Savings now measured in characters, not tokens.** Every model counts tokens
differently (GPT, Claude, Gemini all use different tokenizers). Characters are
universal. `stdout.length` is the same number on every machine, every model.
Anyone can reproduce the benchmark without an API key — Claude Code Pro
subscription is enough.

### What you can now do

- **Install in one line.** `curl -fsSL https://cavestack.jerkyjesse.com/install | sh` —
  detects and installs bun if missing (with SHA256-verified installer), clones
  cavestack into the right place, builds binaries, wires hooks, and prints
  a post-install message pointing you at your first three skills.
- **Discover every skill without leaving your terminal.** New
  `cavestack-skills list` shows all 40 installed skills with one-line
  descriptions, hero six highlighted. `cavestack-skills search <term>`
  fuzzy-matches. `cavestack-skills info <name>` shows details.
- **Ask `/help` from inside Claude Code** to see the same catalog. No website
  round-trip needed.
- **Type `cs-*` instead of `cavestack-*`.** 20+ shortcut aliases installed
  automatically: `cs-skills`, `cs-config`, `cs-analytics`, `cs-dx`, `cs-run`,
  `cs-replay`. Same CLIs, fewer keystrokes.
- **Measure your own DX locally.** `cavestack-dx show` displays your
  personal time-to-hello-world and skill discovery events. Zero network.
  Zero telemetry. Purge with `rm ~/.cavestack/analytics/dx-metrics.jsonl`.
- **See the benchmark proof.** New `/methodology` page shows exactly what
  tasks we ran, on what hardware, with what model — and how to rerun yourself.
  Honest about three trust tiers (verifiable, probabilistic, unaudited).
- **Wrap Claude Code for productivity.** New `cavestack run "<task>"` command
  opts into session replay with redact-on-record. Built-in redaction catches
  AWS/Anthropic/GitHub/GitLab tokens, JWTs, `.env` fragments, and URL-embedded
  credentials. The `share` command refuses to publish non-redacted records.
- **Every error you hit now tells you what broke + why + the exact fix +
  a docs link.** New Tier-2 error pattern (`CS001`-`CS901`) shared across
  every CLI via `lib/error.sh` and `lib/error.ts`.
- **Rebuilt github.io landing.** Identity-first hero (brand before benchmark),
  typeset skill list (anti-slop — no generic 3-col feature grid), bespoke
  SVG cave-painting silhouettes replace decorative emoji layer, quiet
  breather section breaks section rhythm, methodology page for transparency.
- **Zero skills removed.** All 40 skills ship in 1.0. Hero six are featured
  on the landing page.

### Under the hood

- **`lib/error-codes.json` + `lib/error.ts` + `lib/error.sh`** — shared
  error registry. Bash and TypeScript print identical output.
- **`lib/redact.ts`** — reusable redaction pipeline. `redact(text)` replaces
  matches with `[REDACTED:<type>]`. `verifyRedacted(text)` returns an array
  of remaining findings (share command refuses if nonempty).
- **`bin/cavestack-skills`** — skill catalog CLI. List, info, search, count.
- **`bin/cavestack-dx`** — local DX metrics. Tracks `install_completed`,
  `first_skill_run`, `skill_list_viewed`. Shows TTHW classification.
- **`bin/cavestack-run`** — Claude Code wrapper with `--record` +
  `--no-redact` flags for session replay with redact-on-record.
- **`bin/cavestack-replay`** — replay sessions, `share` gates on redaction.
- **`bin/cavestack-cs-aliases`** — idempotent short-alias generator. Creates
  `cs-*` for every `cavestack-*` CLI.
- **`bin/cavestack-redact-stream.ts`** — stdin→stdout redaction filter used
  by `cavestack run --record`.
- **`cavestack-upgrade/migrations/v1.0.0.0.sh`** — idempotent upgrade.
  Bootstraps DX metrics file, records `install_completed`, creates cs-* aliases.
- **`test/benchmarks/`** — benchmark harness + 10 fixed tasks + methodology
  README. Runs via `bun run bench` on maintainer machine only. Pre-release.
- **`docs/methodology.html`, `docs/skills.html`** — new static pages.
- **`docs/install.sh`** — one-liner installer with auto-bun-detect + verify.
- **`docs/roadmap.md`** — deferred items from prior TODOs moved here.
  Not promised, no version targets.

### For contributors

- Error codes live in `lib/error-codes.json`. Any new error site: add a code,
  call `cavestack_error CSXXX` from bash or `throw new CavestackError("CSXXX")`
  from TS.
- Benchmark harness scaffolded but not wired to actual invocation. Maintainer
  runs `bun run bench` once before v1.0.0.0 release tag to populate
  `docs/benchmarks/v1.0.0.0.json`. See `test/benchmarks/README.md`.
- `docs/roadmap.md` is the new home for deferred ideas. `TODOS.md` is only
  for active work. If it's not happening soon, move it.

