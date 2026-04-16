# CaveStack Benchmark Suite

**Maintainer-run, pre-release only.** Not weekly. Not on user machines.

## What this is

Fixed task set measuring **output characters** across {raw Claude Code,
CaveStack} (and SuperClaude if license permits). Results published to
`docs/benchmarks/vX.Y.Z.W.json` and surfaced on the github.io
`/methodology` page as the proof behind the hero number.

## Why characters, not tokens

Every model counts tokens differently. GPT, Claude, Gemini, DeepSeek,
Llama — all use different tokenizers. "75% fewer tokens" is meaningless
without saying "as measured by which model."

Characters are universal. `stdout.length` in any language gives you the
same number. Every terminal can count them. No API key required.

This also means:
- You can re-run the benchmark without a paid API key (as long as
  Claude Code is installed).
- Anyone can independently verify the numbers. No trust-the-maintainer.
- Results stay valid across model revisions. Opus 5 has a new tokenizer?
  Our char counts don't care.

## Principles

1. **Never runs on user machines.** No cron, no scheduled job, no
   background telemetry. Only runs when maintainer invokes `bun run bench`
   ahead of a release.
2. **No API key needed.** Char counts work on any Claude Code install,
   including Pro subscription. Anyone can rerun.
3. **Reproducible.** Every benchmark task is versioned in
   `tasks.md`. Run the harness, compare your numbers to ours.
4. **Honest about scope.** Task set is maintainer-selected. Published JSON
   lists exactly what was measured, when, on what hardware.
5. **No baseline inflation.** Raw Claude Code runs with default settings —
   no hidden flags that would disadvantage it.

## Running locally

```bash
bun run bench
# Writes docs/benchmarks/v<current-version>.json
```

You will need:
- Claude Code installed and authenticated (Pro sub OR API key — either works)
- bun 1.0+
- About an hour of wall clock

You will NOT need:
- A paid API key (Claude Code subscription is fine)
- Network access beyond what Claude Code itself needs

## What "SuperClaude" means in the harness

If `SUPERCLAUDE_DIR` env var points to a SuperClaude install, the harness
runs each task through that stack too and includes it in results. If the
variable is unset, the `superclaude` column is null.

We do NOT bundle or redistribute SuperClaude. Users install it themselves
per its own license.

## Task set

See `tasks.md` for the 10 benchmark tasks and their success criteria.
These tasks change only between major versions — each version freezes
its own task set, so v1.0.0.0 always reproduces with the same tasks.

## What this does NOT prove

- Task set is maintainer-selected. Different tasks, different ratios.
- Char count ≠ user value. A shorter response can still be worse quality.
  Our success criterion is a grep on key indicators; it doesn't catch
  subtle quality differences.
- Network + Claude Code latency varies run-to-run; wall time will differ.
- Model revisions shift baselines. We pin to a specific snapshot per
  release and document it.

## Extending

Add a task: PR a new entry to `tasks.md` with a success criterion that's
grep-able on stdout. We'll re-run and publish in the next release.
