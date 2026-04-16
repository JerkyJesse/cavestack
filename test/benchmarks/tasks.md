# CaveStack Benchmark Tasks — v1.0.0.0

Ten tasks spanning common Claude Code workloads. Frozen for v1.0.0.0.

Each task has a clear success criterion. The harness runs the task on
{raw Claude Code, CaveStack, SuperClaude (optional)} and records the
character count (UTF-16 code units) of the captured stdout.

**Why characters, not tokens:** every model counts tokens differently
(GPT, Claude, Gemini all differ). Characters are model-agnostic. Every
terminal can count them. No API key required.

## Task 1 — Add dark-mode toggle

**Category:** feature
**Prompt:** "Add a dark-mode toggle to the settings page in this repo. Persist the choice to localStorage. Keep the existing styling system."
**Success:** grep for `localStorage` AND `dark` on stdout.

## Task 2 — Investigate 500 error

**Category:** debug
**Prompt:** "The /api/users endpoint returns 500 in production. Find the root cause and propose a fix."
**Success:** output contains specific file path + line range + explanation of causal chain.

## Task 3 — Rename function across files

**Category:** refactor
**Prompt:** "Rename getCwd() to getCurrentWorkingDirectory() across the entire codebase. Preserve all call sites."
**Success:** output lists all affected files and proposes consistent replacement.

## Task 4 — SQL injection review

**Category:** review
**Prompt:** "Review the provided diff for SQL injection risks. Flag any unsafe concatenation patterns."
**Success:** output classifies each SQL call as safe/unsafe with reasoning.

## Task 5 — Ship feature branch

**Category:** deploy
**Prompt:** "Ship the current branch. Run tests, write a commit message, create a PR, summarize changes."
**Success:** output includes commit message + PR body + summary section.

## Task 6 — Add migration for new column

**Category:** feature
**Prompt:** "Add a Postgres migration that adds a `deleted_at` timestamp column to the users table with an index. Include the down migration."
**Success:** output contains `CREATE INDEX` AND `ALTER TABLE` AND `DROP` statements.

## Task 7 — Debug flaky test

**Category:** debug
**Prompt:** "The test `should handle race condition` fails intermittently in CI but passes locally. Find the root cause."
**Success:** output identifies specific async/timing issue with line reference.

## Task 8 — OWASP Top 10 audit

**Category:** security
**Prompt:** "Audit the authentication middleware for OWASP Top 10 vulnerabilities. Report findings with severity."
**Success:** output covers at least 5 OWASP categories with specific code references.

## Task 9 — Design review: pricing page

**Category:** design
**Prompt:** "Review the pricing page layout in this repo. Flag visual hierarchy issues, AI-slop patterns, accessibility gaps."
**Success:** output names specific sections with before/after recommendations.

## Task 10 — Test coverage for billing

**Category:** tests
**Prompt:** "Add test coverage for the billing module. Include edge cases: refunds, partial refunds, currency mismatch, network failure."
**Success:** output provides test file(s) with minimum 4 test cases covering listed edge cases.

---

**Scoring:** For each task, harness records `stdout.length` (UTF-16 code units)
as `outputChars`. Task is marked "passed" if success criterion grep matches.
Failed tasks still count for chars but flagged.

**Totals** published in `docs/benchmarks/v1.0.0.0.json` under
`summary.byFramework[*].totalChars` and per-task `outputChars`.

**Savings expressed as:** absolute char count + percentage reduction vs baseline.
Example: "CaveStack saved 2.4M characters on 10 tasks vs raw Claude Code (72%)."

## Why not tokens

Every model has its own tokenizer. The same English sentence produces
different counts on GPT-4, Claude Opus, Gemini, DeepSeek, Llama. If we
published "X tokens saved" people would ask "tokens as measured by
what model?" — and we'd have to re-run the benchmark on every model.

Characters are universal. `stdout.length` is the same number whether
you run on Claude Pro, API, or a local model. Anyone can verify our
claim by running the harness themselves without a paid API key — just
need Claude Code installed.
