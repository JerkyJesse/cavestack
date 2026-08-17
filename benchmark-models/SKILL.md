---
name: benchmark-models
preamble-tier: 2
version: 1.0.0
description: |
  Cross-model benchmark. Run the same prompt through multiple AI models
  (Claude, GPT, Gemini) and compare: latency, token usage, cost, and
  optionally LLM-judge quality score. Auth detected per provider —
  unavailable providers skip cleanly. Output as table, JSON, or markdown.
  --dry-run validates flags + auth without spending API calls.
  Use when: "compare models", "benchmark models", "which model is better
  for this", "cross-model comparison", "model benchmark". (cavestack)
allowed-tools:
  - Bash
  - Read
  - Write
  - AskUserQuestion
---

# /benchmark-models — Cross-Model Benchmark

Side-by-side comparison of AI models on the same task.

## When to use

- Evaluating which model is best for a specific task type
- Comparing cost vs. quality tradeoffs across providers
- Benchmarking latency for time-sensitive operations
- Building evidence for model selection decisions

## How it works

1. **Detect auth** — checks for API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY,
   GOOGLE_AI_API_KEY). Unavailable providers skip cleanly.
2. **Run prompt** — sends the same prompt to each available model
3. **Measure** — captures latency, input/output tokens, cost
4. **Score** (optional) — LLM-judge rates quality 1-10 with rationale
5. **Compare** — side-by-side table with winner highlighted

## Output

```
+====================================================================+
|                    MODEL BENCHMARK                                  |
+====================================================================+
| Metric          | Claude Sonnet | GPT-4o    | Gemini Pro           |
|-----------------|---------------|-----------|----------------------|
| Latency         | 2.1s          | 3.4s      | 1.8s                 |
| Input tokens    | 1,204         | 1,198     | 1,210                |
| Output tokens   | 847           | 1,203     | 692                  |
| Cost            | $0.008        | $0.014    | $0.005               |
| Quality (judge) | 9/10          | 8/10      | 7/10                 |
+--------------------------------------------------------------------+
| WINNER: Claude Sonnet (best quality/cost ratio)                    |
+====================================================================+
```

## Flags

- `--models claude,gpt,gemini` — select which models to include
- `--judge` — enable LLM-judge quality scoring
- `--runs 3` — multiple runs for latency averaging
- `--dry-run` — validate auth and flags without API calls
- `--output json|table|markdown` — output format

## Providers

| Provider | Env var | Models |
|----------|---------|--------|
| Anthropic | ANTHROPIC_API_KEY | claude-sonnet, claude-opus |
| OpenAI | OPENAI_API_KEY | gpt-4o, gpt-4-turbo |
| Google | GOOGLE_AI_API_KEY | gemini-pro, gemini-ultra |
