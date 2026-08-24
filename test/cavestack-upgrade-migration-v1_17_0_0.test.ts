/**
 * cavestack-upgrade/migrations/v1.17.0.0.sh — migration script unit tests.
 *
 * The migration runs on /cavestack-upgrade for users with brain-sync configured but
 * never wired up to gbrain. It has 4 skip conditions and one happy path.
 *
 * Strategy: stub cavestack-config and cavestack-gbrain-source-wireup binaries on PATH
 * so each skip condition can be triggered independently. The migration script
 * itself is plain bash — we exercise it directly.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

const ROOT = path.resolve(import.meta.dir, '..');
const MIGRATION = path.join(ROOT, 'cavestack-upgrade', 'migrations', 'v1.17.0.0.sh');

let tmpHome: string;
let fakeBinDir: string;
let stubLog: string;

function makeFakeStubs(opts: {
  configValue?: string; // value cavestack-config returns for gbrain_sync_mode
  configMissing?: boolean; // cavestack-config binary itself missing (test edge)
  wireupMissing?: boolean; // wireup binary missing
  wireupExitCode?: number;
}) {
  const skillsBin = path.join(tmpHome, '.claude', 'skills', 'cavestack', 'bin');
  fs.mkdirSync(skillsBin, { recursive: true });

  if (!opts.configMissing) {
    const cfg = `#!/bin/bash
echo "cavestack-config $@" >> "${stubLog}"
[ "$1" = "get" ] && [ "$2" = "gbrain_sync_mode" ] && echo "${opts.configValue ?? ''}"
exit 0
`;
    fs.writeFileSync(path.join(skillsBin, 'cavestack-config'), cfg, { mode: 0o755 });
  }

  if (!opts.wireupMissing) {
    const wu = `#!/bin/bash
echo "cavestack-gbrain-source-wireup $@" >> "${stubLog}"
exit ${opts.wireupExitCode ?? 0}
`;
    fs.writeFileSync(path.join(skillsBin, 'cavestack-gbrain-source-wireup'), wu, { mode: 0o755 });
  }
}

function makeBrainGitRepo() {
  const cavestackHome = path.join(tmpHome, '.cavestack');
  fs.mkdirSync(path.join(cavestackHome, '.git'), { recursive: true });
}

function run(opts: { env?: Record<string, string> } = {}) {
  const env = {
    PATH: '/usr/bin:/bin:/opt/homebrew/bin',
    HOME: tmpHome,
    ...(opts.env || {}),
  };
  return spawnSync('bash', [MIGRATION], {
    env,
    encoding: 'utf-8',
    cwd: tmpHome,
  });
}

function stubCalls(): string[] {
  if (!fs.existsSync(stubLog)) return [];
  return fs.readFileSync(stubLog, 'utf-8').split('\n').filter((l) => l.trim());
}

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cavestack-migration-test-'));
  fakeBinDir = path.join(tmpHome, 'fake-bin');
  fs.mkdirSync(fakeBinDir, { recursive: true });
  stubLog = path.join(tmpHome, 'stub-calls.log');
});

afterEach(() => {
  try {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  } catch {}
});

describe('migrations/v1.17.0.0.sh', () => {
  test('HOME unset: prints message + exit 0 (defensive)', () => {
    // Override HOME to empty string. Bash's [ -z "${HOME:-}" ] guard should fire.
    const r = run({ env: { HOME: '' } });
    expect(r.status).toBe(0);
    expect(r.stderr).toContain('HOME is unset or empty');
  });

  test('gbrain_sync_mode = off: exit 0 silently (no helper invoked)', () => {
    makeFakeStubs({ configValue: 'off' });
    const r = run();
    expect(r.status).toBe(0);
    // Helper should not have been invoked
    const calls = stubCalls();
    expect(calls.some((c) => c.startsWith('cavestack-gbrain-source-wireup'))).toBe(false);
  });

  test('gbrain_sync_mode unset/empty: exit 0 silently', () => {
    makeFakeStubs({ configValue: '' }); // empty string return
    const r = run();
    expect(r.status).toBe(0);
    const calls = stubCalls();
    expect(calls.some((c) => c.startsWith('cavestack-gbrain-source-wireup'))).toBe(false);
  });

  test('no ~/.cavestack/.git: exit 0 silently (no brain-sync configured)', () => {
    makeFakeStubs({ configValue: 'full' });
    // Do NOT call makeBrainGitRepo() — no .cavestack/.git directory exists
    const r = run();
    expect(r.status).toBe(0);
    const calls = stubCalls();
    expect(calls.some((c) => c.startsWith('cavestack-gbrain-source-wireup'))).toBe(false);
  });

  test('helper missing on PATH: prints warning, exit 0 (defensive)', () => {
    makeFakeStubs({ configValue: 'full', wireupMissing: true });
    makeBrainGitRepo();
    const r = run();
    expect(r.status).toBe(0);
    expect(r.stderr).toContain('missing or non-executable');
  });

  test('happy path: invokes the helper', () => {
    makeFakeStubs({ configValue: 'full' });
    makeBrainGitRepo();
    const r = run();
    expect(r.status).toBe(0);
    const calls = stubCalls();
    expect(calls.some((c) => c.startsWith('cavestack-gbrain-source-wireup'))).toBe(true);
    // Note: migration invokes WITHOUT --strict (benign-skip semantics for batch upgrade)
    const helperCall = calls.find((c) => c.startsWith('cavestack-gbrain-source-wireup'));
    expect(helperCall).not.toContain('--strict');
  });

  test('helper exits non-zero: migration prints retry hint, exit 0 (non-blocking)', () => {
    // The migration uses `|| { echo retry-hint; }` so non-zero helper still
    // exits 0 and prints a retry hint to stderr.
    makeFakeStubs({ configValue: 'full', wireupExitCode: 2 });
    makeBrainGitRepo();
    const r = run();
    expect(r.status).toBe(0); // migration is non-blocking
    expect(r.stderr).toContain('Wireup exited non-zero');
  });
});
