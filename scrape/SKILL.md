---
name: scrape
preamble-tier: 2
version: 1.0.0
description: |
  Browser data extraction skill. Pull structured data from a web page using
  the browse daemon. First call prototypes via $B commands; subsequent calls
  on a matching intent run a codified browser-skill in ~200ms. Use when:
  "scrape this page", "extract data from", "pull the prices", "get the list",
  "grab the table". Proactively suggest when user wants structured data from
  a live web page. (cavestack)
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

# /scrape — Browser Data Extractor

Pull structured data from a web page using the browse daemon.

## When to use

- User wants to extract data from a live web page
- Pulling tables, lists, prices, or any structured content
- Building a repeatable data extraction workflow

## How it works

### First call: Prototype
1. Navigate to the target URL via `$B goto`
2. Take a snapshot to understand page structure
3. Use DOM queries and ref-based extraction to pull data
4. Output structured data (JSON, CSV, or markdown table)
5. Save the extraction pattern for future reuse

### Subsequent calls: Codified skill
When the same intent matches a previously saved extraction pattern:
1. Load the saved browser-skill script
2. Execute it (~200ms, no exploration needed)
3. Return structured data in the same format

## Output formats

- **JSON** (default) — structured, machine-readable
- **CSV** — tabular data, importable to spreadsheets
- **Markdown table** — human-readable, embeddable in docs

## Example

```
User: scrape the pricing table from https://example.com/pricing

Agent: [navigates, snapshots, extracts]

| Plan    | Price  | Features          |
|---------|--------|-------------------|
| Starter | $9/mo  | 1 user, 5GB       |
| Pro     | $29/mo | 5 users, 50GB     |
| Team    | $99/mo | Unlimited, 500GB  |

Saved extraction pattern: pricing-table-example-com
Next time you ask about this page, extraction runs in ~200ms.
```

## Chaining

After scraping, use `/skillify` to codify the extraction into a
permanent, tested browser-skill with fixtures.
