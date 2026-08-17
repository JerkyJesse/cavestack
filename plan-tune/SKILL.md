---
name: plan-tune
preamble-tier: 2
version: 1.0.0
description: |
  Self-tune AskUserQuestion sensitivity per question type. Mark questions as
  never-ask (auto-resolve using prior decisions), always-ask (always surface
  for user input), or only-for-one-way (ask only when the decision is hard
  to reverse). Reduces question fatigue in /autoplan and review skills while
  preserving control over irreversible decisions.
  Use when: "tune questions", "stop asking me about X", "always ask about Y",
  "plan-tune", "reduce questions", "question sensitivity". (cavestack)
allowed-tools:
  - Bash
  - Read
  - Write
  - Grep
  - Glob
  - AskUserQuestion
---

# /plan-tune — Question Sensitivity Tuner

Self-tune which questions get surfaced vs. auto-resolved.

## When to use

- After `/autoplan` or a review skill asks too many obvious questions
- To mark decisions you always make the same way as auto-resolve
- To ensure irreversible decisions always get surfaced
- To calibrate the tradeoff between autonomy and control

## Sensitivity levels

| Level | Behavior | When to use |
|-------|----------|-------------|
| `never-ask` | Auto-resolve using prior decision pattern | Repetitive, obvious, always same answer |
| `always-ask` | Always surface for explicit user input | Irreversible, costly, taste-dependent |
| `only-for-one-way` | Ask only when hard to reverse | Default for most architectural decisions |
| `ask-first-time` | Ask once, remember forever | Style preferences, team conventions |

## How it works

1. **Review history** — shows questions from recent sessions grouped by type
2. **Classify** — for each question type, user picks a sensitivity level
3. **Persist** — saves to `~/.cavestack/projects/$SLUG/question-prefs.json`
4. **Apply** — subsequent skill runs respect the tuning

## Example

```
User: /plan-tune

Agent: Recent questions from plan skills:

       TYPE: scope-expansion
       Example: "Add search? (borderline expansion)"
       Current: always-ask
       Your pattern: said "yes" 4/5 times for search features
       → Suggestion: ask-first-time

       TYPE: test-framework-choice
       Example: "Use vitest or jest?"
       Current: always-ask
       Your pattern: always vitest
       → Suggestion: never-ask (auto-resolve: vitest)

       TYPE: database-migration
       Example: "Add migration for schema change?"
       Current: only-for-one-way
       Your pattern: always yes for additive, asks for destructive
       → Suggestion: keep only-for-one-way

       Apply these suggestions? [Y/n/customize]
```

## Integration

Tuning applies to all plan skills:
- `/plan-ceo-review`
- `/plan-eng-review`
- `/plan-design-review`
- `/plan-devex-review`
- `/autoplan`
