// setup-gbrain bin invocation path lint.
//
// Pins the correct bun-run + .ts invocation form for cavestack-memory-ingest
// and cavestack-gbrain-sync wherever setup-gbrain's docs instruct the agent
// to run them. Regression coverage for #2393 / #2250: both scripts are
// .ts files with no package.json bin alias stripping the extension, so a
// bare name (no `bun run` prefix, no `.ts` suffix) fails with "No such
// file or directory" the moment an agent follows the doc literally.
//
// Why a structural test instead of a full Agent SDK E2E:
//   - The failure is entirely in the prose an agent reads, not in
//     runtime behavior a service test could exercise. A grep-based
//     regression on the template/reference-doc text is fast (<200ms),
//     free, and catches the same drift a full E2E would, without the
//     token cost. Same rationale as test/setup-gbrain-path4-structure.test.ts.
//   - The correct invocation form and the stale one differ only by
//     `bun run ` + `.ts`, right next to each other in the same files —
//     exactly the kind of drift a cheap structural check exists to catch,
//     matching this repo's convention (e.g. test/memory-ingest-no-put_page.test.ts
//     pinning fix #1346).

import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');
const TMPL = path.join(ROOT, 'setup-gbrain', 'SKILL.md.tmpl');
const MEMORY_DOC = path.join(ROOT, 'setup-gbrain', 'memory.md');

const tmpl = fs.readFileSync(TMPL, 'utf-8');
const memoryDoc = fs.readFileSync(MEMORY_DOC, 'utf-8');

// A "bare invocation" is the tool name immediately followed by a flag/arg
// with no `.ts` in between — the exact stale shape #2393/#2250 reported.
// The negative lookahead means `cavestack-memory-ingest.ts --probe` (correct)
// does NOT match, while `cavestack-memory-ingest --probe` (stale) does.
// `(?:\s|\\\r?\n)+` also spans a backslash line-continuation between the
// name and its flag (e.g. `cavestack-memory-ingest \` newline `  --probe`),
// a style this same template already uses for other commands (see the
// read_secret_to_env invocation a few hundred lines up) — a plain `\s+`
// would miss a stale invocation reintroduced in that form.
const bareMemoryIngest = /\bcavestack-memory-ingest\b(?!\.ts)(?:\s|\\\r?\n)+--/;
const bareGbrainSync = /\bcavestack-gbrain-sync\b(?!\.ts)(?:\s|\\\r?\n)+--/;

describe('setup-gbrain/SKILL.md.tmpl — bin invocation paths', () => {
  test('no bare cavestack-memory-ingest invocation remains', () => {
    expect(tmpl).not.toMatch(bareMemoryIngest);
  });

  test('no bare cavestack-gbrain-sync invocation remains', () => {
    expect(tmpl).not.toMatch(bareGbrainSync);
  });

  test('the probe step uses bun run + .ts (R1)', () => {
    expect(tmpl).toContain(
      'bun run ~/.claude/skills/cavestack/bin/cavestack-memory-ingest.ts --probe'
    );
  });

  test('the silent-bulk mention uses bun run + .ts (R2)', () => {
    expect(tmpl).toContain(
      'bun run ~/.claude/skills/cavestack/bin/cavestack-memory-ingest.ts --bulk --quiet'
    );
  });

  test('the post-answer full-sync step uses bun run + .ts (R3)', () => {
    expect(tmpl).toContain(
      'bun run ~/.claude/skills/cavestack/bin/cavestack-gbrain-sync.ts --full --no-brain-sync'
    );
  });

  test('the preamble-hook incremental-sync mention uses bun run + .ts (R4)', () => {
    expect(tmpl).toContain(
      'bun run ~/.claude/skills/cavestack/bin/cavestack-gbrain-sync.ts --incremental --quiet'
    );
  });

  test('the neighboring cavestack-config line in the post-answer block is untouched (bash script, no extension)', () => {
    expect(tmpl).toContain(
      '~/.claude/skills/cavestack/bin/cavestack-config set transcript_ingest_mode <choice>'
    );
  });

  test('the prose-only mention naming the tool as a sentence subject is left unchanged (KTD4 — not a literal invocation)', () => {
    expect(tmpl).toContain('cavestack-memory-ingest now persists staged transcripts to');
  });
});

describe('setup-gbrain/memory.md — bin invocation paths', () => {
  test('no bare cavestack-memory-ingest invocation remains', () => {
    expect(memoryDoc).not.toMatch(bareMemoryIngest);
  });

  test('no bare cavestack-gbrain-sync invocation remains', () => {
    expect(memoryDoc).not.toMatch(bareGbrainSync);
  });

  test('the secret-scanning example uses bun run + .ts (R5)', () => {
    expect(memoryDoc).toContain('bun run bin/cavestack-memory-ingest.ts --bulk --scan-secrets');
    expect(memoryDoc).toContain(
      'CAVESTACK_MEMORY_INGEST_SCAN_SECRETS=1 bun run bin/cavestack-memory-ingest.ts --bulk'
    );
  });

  test('the troubleshooting full-pass mention uses bun run + .ts (R5)', () => {
    expect(memoryDoc).toContain('Run `bun run bin/cavestack-gbrain-sync.ts --full` to do a full pass.');
  });

  test('the troubleshooting incremental-reingest mention uses bun run + .ts (R5)', () => {
    expect(memoryDoc).toContain(
      're-run `bun run bin/cavestack-gbrain-sync.ts --incremental` to re-ingest from'
    );
  });

  test('the already-correct reference line at the top of the file is unchanged', () => {
    expect(memoryDoc).toContain('bun run bin/cavestack-memory-ingest.ts --probe` (which');
  });
});

describe('bare-invocation regex — backslash line-continuation coverage', () => {
  // This template writes multi-line commands with a trailing backslash
  // continuation elsewhere (e.g. the read_secret_to_env invocation), so a
  // stale invocation reintroduced in that same style must still be caught.
  test('catches a bare invocation split across a backslash continuation', () => {
    const staleContinuation = 'cavestack-memory-ingest \\\n  --probe';
    expect(staleContinuation).toMatch(bareMemoryIngest);
  });

  test('does not flag a correct invocation split across a backslash continuation', () => {
    const fixedContinuation = 'bun run bin/cavestack-gbrain-sync.ts \\\n  --incremental';
    expect(fixedContinuation).not.toMatch(bareGbrainSync);
  });
});
