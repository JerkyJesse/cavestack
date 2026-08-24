/**
 * cavestack-session-kind — classifies the session so skills know whether a human can
 * answer an AskUserQuestion. Drives the AUQ-failure fallback branch:
 *   spawned     → auto-choose (orchestrator)
 *   headless    → BLOCK on AUQ failure
 *   interactive → prose fallback on AUQ failure
 *
 * These permutations are the contract the resolver rule depends on. Run with a
 * SCRUBBED env (the test process itself runs inside Conductor, so CONDUCTOR_* /
 * CLAUDE_CODE_* would leak in and contaminate the classification).
 *
 * Free, deterministic, gate-tier.
 */
import { describe, test, expect } from 'bun:test';
import { execFileSync } from 'child_process';
import * as path from 'path';

const BIN = path.resolve(__dirname, '..', 'bin', 'cavestack-session-kind');

/** Run the helper with ONLY the supplied env (plus PATH so bash resolves). */
function kind(env: Record<string, string>): string {
  return execFileSync(BIN, [], {
    env: { PATH: process.env.PATH ?? '/usr/bin:/bin', ...env },
    encoding: 'utf-8',
  }).trim();
}

describe('cavestack-session-kind', () => {
  test('OPENCLAW_SESSION → spawned (highest precedence)', () => {
    expect(kind({ OPENCLAW_SESSION: '1' })).toBe('spawned');
    // spawned wins even when other markers are also present
    expect(kind({ OPENCLAW_SESSION: '1', CAVESTACK_HEADLESS: '1', CONDUCTOR_PORT: '5' })).toBe('spawned');
  });

  test('CAVESTACK_HEADLESS → headless', () => {
    expect(kind({ CAVESTACK_HEADLESS: '1' })).toBe('headless');
  });

  test('CONDUCTOR_* → interactive (a human host is present)', () => {
    expect(kind({ CONDUCTOR_WORKSPACE_PATH: '/tmp/ws' })).toBe('interactive');
    expect(kind({ CONDUCTOR_PORT: '55010' })).toBe('interactive');
  });

  test('CLAUDE_CODE_ENTRYPOINT=cli → interactive', () => {
    expect(kind({ CLAUDE_CODE_ENTRYPOINT: 'cli' })).toBe('interactive');
  });

  test('interactive host beats CI markers', () => {
    expect(kind({ CONDUCTOR_PORT: '5', CI: '1' })).toBe('interactive');
  });

  test('CI / GITHUB_ACTIONS with no host → headless', () => {
    expect(kind({ CI: '1' })).toBe('headless');
    expect(kind({ GITHUB_ACTIONS: 'true' })).toBe('headless');
  });

  test('CAVESTACK_HEADLESS beats CONDUCTOR (explicit override wins)', () => {
    expect(kind({ CAVESTACK_HEADLESS: '1', CONDUCTOR_PORT: '5' })).toBe('headless');
  });

  test('bare env → interactive (degrade-safe default)', () => {
    expect(kind({})).toBe('interactive');
  });

  test('empty CAVESTACK_HEADLESS is treated as unset (interactive)', () => {
    // The resolver/helper guard on -n, so an empty string must NOT mean headless —
    // this is the opt-out path harness suites use to exercise the interactive branch.
    expect(kind({ CAVESTACK_HEADLESS: '' })).toBe('interactive');
  });
});
