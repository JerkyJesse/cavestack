---
name: document-generate
preamble-tier: 2
version: 1.0.0
description: |
  Generate missing docs from scratch using the Diataxis framework. Researches
  the codebase first, then writes reference / how-to / tutorial / explanation
  docs that actually match the code. Invokable standalone or chained from
  /document-release when the coverage map finds gaps.
  Use when: "generate docs", "write documentation", "document this feature",
  "add docs", "create a tutorial", "write a how-to guide". Proactively suggest
  when user ships a feature that has no documentation. (cavestack)
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

# /document-generate — Documentation Author

Generate missing documentation from scratch using the Diataxis framework.

## When to use

- After shipping a feature that needs docs
- When a codebase has no documentation at all
- To fill gaps identified by `/document-release`
- When users are confused by lack of onboarding material

## Diataxis Framework

All generated docs follow the [Diataxis](https://diataxis.fr/) framework:

| Type | Purpose | Example |
|------|---------|---------|
| **Tutorial** | Learning-oriented, guided steps | "Build your first widget" |
| **How-to** | Task-oriented, specific goals | "How to deploy to production" |
| **Reference** | Information-oriented, complete specs | API reference, config options |
| **Explanation** | Understanding-oriented, context | "Why we chose PostgreSQL" |

## How it works

1. **Research** — reads source code, existing docs, tests, and README to
   understand the system
2. **Coverage map** — identifies which Diataxis quadrants are covered vs. missing
3. **Generate** — writes docs for the missing quadrants, matched to actual code
4. **Verify** — cross-references generated docs against code to ensure accuracy
5. **Present** — shows the generated docs with a coverage map in the PR body

## Flags

- `--type tutorial` — generate only tutorials
- `--type howto` — generate only how-to guides
- `--type reference` — generate only reference docs
- `--type explanation` — generate only explanations
- `--feature <name>` — scope docs to a specific feature
- `--dry-run` — show what would be generated without writing

## Example

```
User: /document-generate --feature authentication

Agent: Researching authentication system...
       Read: src/auth/, tests/auth/, README.md#authentication

       Diataxis coverage map:
       - Tutorial:    MISSING
       - How-to:      PARTIAL (deploy section only)
       - Reference:   MISSING
       - Explanation: MISSING

       Generating 3 docs:
       1. docs/tutorials/authentication-setup.md
       2. docs/reference/auth-api.md
       3. docs/explanation/auth-architecture.md

       All cross-referenced against source code. Ready to commit.
```

## Chaining

- `/document-release` identifies gaps → `/document-generate` fills them
- Generated docs respect `DESIGN.md` voice and terminology
