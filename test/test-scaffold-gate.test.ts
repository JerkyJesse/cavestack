import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const ROOT = path.resolve(import.meta.dir, '..');
const HOOK_JS = path.join(ROOT, 'hooks', 'test-scaffold-gate.js');

let TMP_STATE: string;
let SESSIONS_DIR: string;

beforeAll(() => {
  expect(fs.existsSync(HOOK_JS)).toBe(true);
  TMP_STATE = fs.mkdtempSync(path.join(os.tmpdir(), 'cavestack-tsgate-'));
  SESSIONS_DIR = path.join(TMP_STATE, 'sessions');
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
});

afterAll(() => {
  try { fs.rmSync(TMP_STATE, { recursive: true, force: true }); } catch { /* best-effort */ }
});

beforeEach(() => {
  // Clear session logs between tests to keep cases independent.
  try {
    for (const f of fs.readdirSync(SESSIONS_DIR)) fs.unlinkSync(path.join(SESSIONS_DIR, f));
  } catch { /* best-effort */ }
});

interface HookResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function runHook(input: Record<string, unknown>, mode: 'off' | 'soft' | 'hard' = 'soft', extraEnv: Record<string, string> = {}): HookResult {
  const r = spawnSync('node', [HOOK_JS], {
    input: JSON.stringify(input),
    env: {
      ...process.env,
      CAVESTACK_STATE_DIR: TMP_STATE,
      CAVESTACK_TEST_SCAFFOLD_GATE: mode,
      ...extraEnv,
    },
    encoding: 'utf-8',
    timeout: 5000,
  });
  return {
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    exitCode: r.status ?? -1,
  };
}

const SESSION = 'test-session-abc';

describe('test-scaffold-gate hook', () => {
  test('exits 0 silently when mode=off', () => {
    const r = runHook(
      { session_id: SESSION, tool_name: 'Write', tool_input: { file_path: 'scripts/foo.ts' } },
      'off'
    );
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe('');
    expect(r.stderr).toBe('');
  });

  test('exits 0 silently for non-Write/Edit tool', () => {
    const r = runHook(
      { session_id: SESSION, tool_name: 'Read', tool_input: { file_path: 'scripts/foo.ts' } },
      'hard'
    );
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe('');
  });

  test('exits 0 silently for markdown file', () => {
    const r = runHook(
      { session_id: SESSION, tool_name: 'Write', tool_input: { file_path: 'docs/foo.md' } },
      'hard'
    );
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe('');
  });

  test('exits 0 silently for config file', () => {
    const r = runHook(
      { session_id: SESSION, tool_name: 'Write', tool_input: { file_path: 'config.json' } },
      'hard'
    );
    expect(r.exitCode).toBe(0);
  });

  test('exits 0 silently for test file itself', () => {
    const r = runHook(
      { session_id: SESSION, tool_name: 'Write', tool_input: { file_path: 'test/foo.test.ts' } },
      'hard'
    );
    expect(r.exitCode).toBe(0);
  });

  test('exits 0 silently for dist/ artifact', () => {
    const r = runHook(
      { session_id: SESSION, tool_name: 'Write', tool_input: { file_path: 'dist/build.js' } },
      'hard'
    );
    expect(r.exitCode).toBe(0);
  });

  test('soft mode warns on source without matching test', () => {
    // Fresh temp file path that does NOT exist on disk and has no paired test.
    const fakeSource = path.join(TMP_STATE, 'scripts', 'nonexistent-source.ts');
    const r = runHook(
      { session_id: SESSION, tool_name: 'Write', tool_input: { file_path: fakeSource } },
      'soft'
    );
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toMatch(/\[test-scaffold-gate\] WARN/);
    expect(r.stderr).toMatch(/without matching test/);
  });

  test('hard mode blocks source without matching test', () => {
    const fakeSource = path.join(TMP_STATE, 'scripts', 'nonexistent-source.ts');
    const r = runHook(
      { session_id: SESSION, tool_name: 'Write', tool_input: { file_path: fakeSource } },
      'hard'
    );
    expect(r.exitCode).toBe(2);
    const decision = JSON.parse(r.stdout);
    expect(decision.decision).toBe('block');
    expect(decision.reason).toMatch(/BLOCK/);
  });

  test('soft mode silent when test written earlier in same session', () => {
    // The "test logged earlier" state is produced by `appendSessionWrite` in
    // the hook. Previously this case chained two spawnSync calls, which was
    // flaky on Windows: spawnSync returns when the child exits, but the
    // JSONL write the first child performed was occasionally not visible to
    // the second child under AV / indexer load. Pre-populate the session log
    // directly so the assertion exercises only the pair-detection path —
    // session-log write durability is covered by the "session log
    // accumulates writes across calls" test below.
    const testPath = path.join(TMP_STATE, 'scripts', 'bar.test.ts');
    const sourcePath = path.join(TMP_STATE, 'scripts', 'bar.ts');
    const sessionLog = path.join(SESSIONS_DIR, `${SESSION}-writes.jsonl`);
    const logEntry = JSON.stringify({
      path: testPath.replace(/\\/g, '/'),
      tool: 'Write',
      ts: new Date().toISOString(),
    }) + '\n';
    fs.writeFileSync(sessionLog, logEntry);

    const r = runHook(
      { session_id: SESSION, tool_name: 'Write', tool_input: { file_path: sourcePath } },
      'soft'
    );
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toBe('');
  });

  test('hard mode passes when sibling test exists on disk', () => {
    // Create real files: source + sibling test on disk.
    const srcDir = path.join(TMP_STATE, 'onDisk');
    fs.mkdirSync(srcDir, { recursive: true });
    const sourcePath = path.join(srcDir, 'widget.ts');
    const testPath = path.join(srcDir, 'widget.test.ts');
    fs.writeFileSync(sourcePath, 'export {};\n');
    fs.writeFileSync(testPath, 'import {} from "./widget";\n');

    const r = runHook(
      { session_id: SESSION, tool_name: 'Edit', tool_input: { file_path: sourcePath } },
      'hard'
    );
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe('');
  });

  test('session log accumulates writes across calls', () => {
    runHook(
      { session_id: SESSION, tool_name: 'Write', tool_input: { file_path: 'scripts/a.ts' } },
      'soft'
    );
    runHook(
      { session_id: SESSION, tool_name: 'Write', tool_input: { file_path: 'scripts/b.ts' } },
      'soft'
    );
    const logPath = path.join(SESSIONS_DIR, `${SESSION}-writes.jsonl`);
    expect(fs.existsSync(logPath)).toBe(true);
    const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n');
    expect(lines.length).toBe(2);
    const first = JSON.parse(lines[0]);
    expect(first.tool).toBe('Write');
    expect(first.path).toMatch(/a\.ts$/);
  }, 15000);

  test('d.ts type-only file excluded from gate', () => {
    const r = runHook(
      { session_id: SESSION, tool_name: 'Write', tool_input: { file_path: 'types/foo.d.ts' } },
      'hard'
    );
    expect(r.exitCode).toBe(0);
  });

  test('CHANGELOG file excluded from gate', () => {
    const r = runHook(
      { session_id: SESSION, tool_name: 'Write', tool_input: { file_path: 'CHANGELOG.md' } },
      'hard'
    );
    expect(r.exitCode).toBe(0);
  });
});
