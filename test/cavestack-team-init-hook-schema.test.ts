import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { execSync, execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Regression guard for #2413: cavestack-team-init required generated a
// PreToolUse hook that emitted a flat {"permissionDecision":...} payload and
// exited 0. Claude Code only nests decisions under hookSpecificOutput, and
// only exit code 2 reliably blocks a PreToolUse call. The old shape was
// silently ignored as a non-blocking error, so `required` mode enforced
// nothing — the BLOCKED text printed to stderr but the tool call proceeded.

const ROOT = path.resolve(import.meta.dir, '..');
const TEAM_INIT = path.join(ROOT, 'bin', 'cavestack-team-init');

let repoDir: string;
let fakeHomeAbsent: string;
let fakeHomePresent: string;

describe('cavestack-team-init required: PreToolUse hook schema (#2413)', () => {
  beforeEach(() => {
    repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cavestack-team-init-repo-'));
    execFileSync('git', ['init', '-q'], { cwd: repoDir });
    execFileSync(TEAM_INIT, ['required'], { cwd: repoDir, encoding: 'utf-8' });

    fakeHomeAbsent = fs.mkdtempSync(path.join(os.tmpdir(), 'cavestack-team-init-home-absent-'));

    fakeHomePresent = fs.mkdtempSync(path.join(os.tmpdir(), 'cavestack-team-init-home-present-'));
    fs.mkdirSync(path.join(fakeHomePresent, '.claude', 'skills', 'cavestack', 'bin'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(fakeHomeAbsent, { recursive: true, force: true });
    fs.rmSync(fakeHomePresent, { recursive: true, force: true });
  });

  function runHook(home: string): { status: number; stdout: string; stderr: string } {
    const hookPath = path.join(repoDir, '.claude', 'hooks', 'check-cavestack.sh');
    try {
      const stdout = execSync(`bash "${hookPath}"`, {
        env: { ...process.env, HOME: home },
        encoding: 'utf-8',
      });
      return { status: 0, stdout, stderr: '' };
    } catch (err) {
      const e = err as { status: number; stdout: string; stderr: string };
      return { status: e.status, stdout: e.stdout, stderr: e.stderr };
    }
  }

  test('generates the hook and registers it in settings.json', () => {
    expect(fs.existsSync(path.join(repoDir, '.claude', 'hooks', 'check-cavestack.sh'))).toBe(true);
    const settings = JSON.parse(
      fs.readFileSync(path.join(repoDir, '.claude', 'settings.json'), 'utf-8'),
    );
    expect(JSON.stringify(settings)).toContain('check-cavestack.sh');
  });

  test('cavestack absent: exits 2 (blocking) with schema-valid deny JSON', () => {
    const { status, stdout, stderr } = runHook(fakeHomeAbsent);
    expect(status).toBe(2);
    expect(stderr).toContain('BLOCKED: cavestack is not installed globally.');

    const payload = JSON.parse(stdout.trim());
    expect(payload.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    expect(payload.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(typeof payload.hookSpecificOutput.permissionDecisionReason).toBe('string');
    // The old top-level shape must be gone, not just supplemented.
    expect(payload.permissionDecision).toBeUndefined();
    expect(payload.message).toBeUndefined();
  });

  test('cavestack present: exits 0 with an empty (no-opinion) payload', () => {
    const { status, stdout, stderr } = runHook(fakeHomePresent);
    expect(status).toBe(0);
    expect(stderr).toBe('');
    expect(JSON.parse(stdout.trim())).toEqual({});
  });
});
