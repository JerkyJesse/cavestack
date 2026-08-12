---
name: make-pdf
preamble-tier: 2
version: 1.0.0
description: |
  Markdown in, publication-quality document out. Mermaid and excalidraw fences
  render as vector diagrams, fully offline. Images scale to page without
  truncation; wide diagrams get landscape pages. --to html emits one
  self-contained file, --to docx a Word document. Proper margins, page
  numbers, cover pages, clickable TOC.
  Use when: "make a PDF", "export this as PDF", "generate a document",
  "create a report", "turn this markdown into a PDF". (cavestack)
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - AskUserQuestion
---

# /make-pdf — Document Publisher

Turn any markdown file into a publication-quality PDF.

## When to use

- Exporting specs, design docs, or reports as shareable documents
- Creating polished PDFs from project documentation
- Generating Word docs for stakeholders who need `.docx`
- Building self-contained HTML reports

## Features

- **Mermaid diagrams** — fenced code blocks render as vector SVGs in the PDF
- **Excalidraw diagrams** — `.excalidraw` fences render in hand-drawn style
- **Smart image sizing** — images scale to page width, never truncate
- **Landscape pages** — wide diagrams auto-rotate to landscape
- **Cover page** — title, author, date extracted from frontmatter
- **Clickable TOC** — auto-generated table of contents with page numbers
- **Code highlighting** — syntax-highlighted code blocks with line numbers
- **Cross-references** — internal links resolve to page numbers

## Output formats

- **PDF** (default) — publication-quality, print-ready
- **HTML** (`--to html`) — single self-contained file, no external dependencies
- **DOCX** (`--to docx`) — Word document for stakeholders

## Usage

```bash
$B make-pdf README.md                    # → README.pdf
$B make-pdf spec.md --to html            # → spec.html (self-contained)
$B make-pdf design.md --to docx          # → design.docx
$B make-pdf report.md --cover --toc      # → with cover page and TOC
```

## Frontmatter

```yaml
---
title: "Architecture Design Document"
author: "Engineering Team"
date: 2026-08-12
---
```

## Example

```
User: /make-pdf ARCHITECTURE.md

Agent: Generated: ARCHITECTURE.pdf
       - 12 pages
       - 3 Mermaid diagrams rendered as vector SVGs
       - Table of contents with clickable links
       - Code blocks syntax-highlighted
```
