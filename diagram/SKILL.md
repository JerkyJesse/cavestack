---
name: diagram
preamble-tier: 2
version: 1.0.0
description: |
  English in, editable diagram out. Emits a triplet: mermaid source (for
  markdown embedding), .excalidraw file (open and edit on excalidraw.com,
  hand-drawn style), and rendered SVG/PNG. Fully offline, zero network
  dependencies. Embed the mermaid source in markdown and /make-pdf renders it.
  Use when: "draw a diagram", "create a flowchart", "architecture diagram",
  "sequence diagram", "state diagram", "visualize this". (cavestack)
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - AskUserQuestion
---

# /diagram — Diagram Maker

English in, editable diagram out.

## When to use

- Visualizing architecture, data flows, state machines
- Creating sequence diagrams for API interactions
- Drawing flowcharts for business logic
- Any time a picture would communicate better than text

## Output triplet

Every diagram produces three files:

1. **Mermaid source** (`.mmd`) — embeddable in markdown, renders in GitHub,
   and `/make-pdf` converts it to vector SVG in PDFs
2. **Excalidraw file** (`.excalidraw`) — open on excalidraw.com for hand-drawn
   style editing, drag nodes around, add annotations
3. **Rendered image** (`.svg` or `.png`) — ready to embed anywhere

## Supported diagram types

- **Flowchart** — decision trees, process flows
- **Sequence** — API calls, message passing, auth flows
- **State** — state machines, lifecycle diagrams
- **Architecture** — component diagrams, system boundaries
- **Entity-Relationship** — data models, table relationships
- **Gantt** — timelines, project schedules
- **Class** — inheritance, composition, interfaces

## Example

```
User: diagram the auth flow — user logs in, gets JWT, makes API call,
      token expires, refresh token flow

Agent: Generated 3 files:
       - auth-flow.mmd (mermaid source)
       - auth-flow.excalidraw (editable, hand-drawn style)
       - auth-flow.svg (rendered, ready to embed)

       Mermaid preview:
       sequenceDiagram
         User->>Auth: POST /login (email, password)
         Auth->>User: 200 {access_token, refresh_token}
         User->>API: GET /data (Bearer access_token)
         API->>User: 200 {data}
         Note over User,API: Token expires (15min)
         User->>Auth: POST /refresh (refresh_token)
         Auth->>User: 200 {new_access_token}
```

## Integration

- Embed mermaid in any markdown → GitHub renders it natively
- Use `/make-pdf` to render diagrams as vector SVGs in PDFs
- Open `.excalidraw` files at excalidraw.com for collaborative editing
