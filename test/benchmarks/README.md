# CaveStack Benchmark Suite

**Maintainer-run, pre-release only.** Not weekly. Not on user machines.

## What this is

Fixed task set measuring token consumption across {raw Claude Code,
CaveStack} (and SuperClaude if license permits). Results published to
`docs/benchmarks/vX.Y.Z.W.json` and surfaced on the github.io `/methodology`
page as the proof behind the hero number.

## Principles

1. **Never runs on user machines.** No cron, no scheduled job, no
   background telemetry. Only runs when maintainer invokes `bun run bench`
   ahead of a release.
2. **Maintainer pays.** Every benchmark run burns Anthropic API tokens.
   The maintainer budget is ~$20-50 per release. Documented publicly.
3. **Reproducible.** Every benchmark task is versioned in
   `tasks.md`. Anyone with an API key can re-run and compare.
4. **Honest about scope.** Task set is maintainer-selected. Published JSON
   lists exactly what was measured, when, on what hardware.
5. **No baseline inflation.** Raw Claude Code runs with default settings —
   no hidden flags that would disadvantage it.

## Running locally

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
bun run bench
# Writes docs/benchmarks/v<current-version>.json
```

You will need:
- Anthropic API key with Opus 4.7 access
- bun 1.0+
- An hour of wall clock
- ~3-5M tokens of API budget

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
- Network + API latency varies run-to-run.
- Claude API model updates can shift baseline mid-release. We pin to a
  specific model snapshot and document it in the JSON output.

## Extending

Add a task: PR a new entry to `tasks.md` with a success criterion that
grep-able on stdout. We'll re-run and publish in the next release.
