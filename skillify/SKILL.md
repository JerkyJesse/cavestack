---
name: skillify
preamble-tier: 2
version: 1.0.0
description: |
  Skill codifier. Walks back through conversation history, finds the last
  /scrape prototype, synthesizes a reusable script + test + fixture from it,
  runs the test, and asks before committing. Turns ad-hoc browser extractions
  into permanent, tested browser-skills. Use when: "save this as a skill",
  "codify this scrape", "make this repeatable", "skillify". (cavestack)
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

# /skillify — Skill Codifier

Turn ad-hoc browser extractions into permanent, tested browser-skills.

## When to use

- After a successful `/scrape` that you want to reuse
- When you have a working browser automation sequence to save
- To build a library of repeatable extraction patterns

## How it works

1. **Find prototype** — walks back through conversation, finds the last `/scrape`
   sequence (the `$B` commands that successfully extracted data)
2. **Synthesize script** — generates a TypeScript/JS extraction script from
   the prototype commands
3. **Generate test** — creates a test file with a fixture (saved HTML snapshot
   of the target page for offline testing)
4. **Run test** — executes the test to verify the skill works against the fixture
5. **Ask before commit** — shows you the generated files and asks for approval

## Generated files

```
~/.cavestack/browser-skills/
  <domain>-<intent>/
    script.ts        # The extraction script
    test.ts          # Test against fixture
    fixture.html     # Saved page snapshot for offline testing
    metadata.json    # Intent matching, domain, created date
```

## Example

```
User: /skillify

Agent: Found last scrape: pricing-table from example.com

       Generated:
       - script.ts (14 lines — navigate, snapshot, extract table)
       - test.ts (assertion: 3 rows, correct column headers)
       - fixture.html (saved page at extraction time)

       Test result: PASS (3/3 assertions)

       Commit these files? [Y/n]
```
