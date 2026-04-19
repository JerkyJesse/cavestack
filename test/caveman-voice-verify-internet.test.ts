import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const ROOT = path.resolve(import.meta.dir, '..');
const HOOK_JS = path.join(ROOT, 'hooks', 'caveman-voice-verify.js');

beforeAll(() => {
  if (!fs.existsSync(HOOK_JS)) {
    const build = spawnSync(
      'bun',
      ['build', 'hooks/caveman-voice-verify.ts', '--target=node', '--outfile=hooks/caveman-voice-verify.js'],
      { cwd: ROOT, stdio: 'pipe' }
    );
    if (build.status !== 0) {
      throw new Error(`Hook build failed: ${build.stderr?.toString()}`);
    }
  }
});

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cavestack-voice-internet-'));
afterAll(() => {
  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch { /* best-effort */ }
});

interface TranscriptEvent {
  type?: string;
  message?: {
    role: 'user' | 'assistant' | 'system';
    content: string | Array<{ type: 'text'; text: string }>;
  };
  timestamp?: string;
}

function writeTranscript(events: TranscriptEvent[]): string {
  const file = path.join(TMP_DIR, `transcript-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);
  const lines = events.map((e) => JSON.stringify(e));
  fs.writeFileSync(file, lines.join('\n') + '\n');
  return file;
}

function makeAssistantEvent(text: string): TranscriptEvent {
  return {
    type: 'assistant',
    timestamp: new Date().toISOString(),
    message: { role: 'assistant', content: [{ type: 'text', text }] },
  };
}

function makeUserEvent(text: string): TranscriptEvent {
  return {
    type: 'user',
    timestamp: new Date().toISOString(),
    message: { role: 'user', content: text },
  };
}

function runHook(input: Record<string, unknown>, env: Record<string, string> = {}) {
  const r = spawnSync('node', [HOOK_JS], {
    input: JSON.stringify(input),
    encoding: 'utf-8',
    timeout: 5000,
    env: { ...process.env, ...env },
  });
  return {
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    exitCode: r.status ?? -1,
  };
}

// ─── Scenarios ──────────────────────────────────────────────

// Cave-compressed but asserts WebSearch as fact without hedge.
const UNHEDGED_CLAIM = `Hook fires Stop event. WebSearch says Node 24 drops CJS fallback entirely.
Action: rewrite all hooks as ESM. Ship now.`;

// Same claim, with hedge — should pass.
const HEDGED_CLAIM = `Hook fires Stop event. WebSearch says Node 24 drops CJS fallback — hypothesis,
needs verification. Check node changelog before rewriting hooks. Ship after verify.`;

// No internet trigger at all — always passes.
const NO_CLAIM = `Hook fires Stop event. Drop articles. Fragments OK. Ship terse.
Short synonyms win. Code blocks stay verbatim. Done.`;

describe('caveman-voice-verify internet-claim floor', () => {
  test('unhedged WebSearch claim blocks on first attempt', () => {
    const transcript = writeTranscript([
      makeUserEvent('test'),
      makeAssistantEvent(UNHEDGED_CLAIM),
    ]);
    const result = runHook({ transcript_path: transcript, stop_hook_active: false });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.decision).toBe('block');
    expect(parsed.reason).toMatch(/Content floor failed/);
    expect(parsed.reason).toMatch(/unverified internet/i);
  });

  test('hedged WebSearch claim passes', () => {
    const transcript = writeTranscript([
      makeUserEvent('test'),
      makeAssistantEvent(HEDGED_CLAIM),
    ]);
    const result = runHook({ transcript_path: transcript, stop_hook_active: false });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('');
  });

  test('no internet trigger passes regardless', () => {
    const transcript = writeTranscript([
      makeUserEvent('test'),
      makeAssistantEvent(NO_CLAIM),
    ]);
    const result = runHook({ transcript_path: transcript, stop_hook_active: false });
    expect(result.exitCode).toBe(0);
  });

  test('unhedged claim on retry emits marker, exit 0', () => {
    const transcript = writeTranscript([
      makeUserEvent('test'),
      makeAssistantEvent(UNHEDGED_CLAIM),
    ]);
    const result = runHook({ transcript_path: transcript, stop_hook_active: true });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/unverified-internet-claim/);
    expect(result.stdout).toMatch(/shipped as-is/);
  });

  test('content-floor check runs before density check', () => {
    // Short message (under density word-count floor) with unhedged claim
    // should still block on content floor.
    const short = `WebSearch confirms Node 24 behavior changed. Rewrite all hooks now.`;
    const transcript = writeTranscript([
      makeUserEvent('test'),
      makeAssistantEvent(short),
    ]);
    const result = runHook({ transcript_path: transcript, stop_hook_active: false });
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.decision).toBe('block');
  });

  test('CAVESTACK_VOICE=none disables all floors', () => {
    const transcript = writeTranscript([
      makeUserEvent('test'),
      makeAssistantEvent(UNHEDGED_CLAIM),
    ]);
    const result = runHook(
      { transcript_path: transcript, stop_hook_active: false },
      { CAVESTACK_VOICE: 'none' },
    );
    expect(result.exitCode).toBe(0);
  });

  test('CAVESTACK_VOICE_VERIFY=0 disables hook entirely', () => {
    const transcript = writeTranscript([
      makeUserEvent('test'),
      makeAssistantEvent(UNHEDGED_CLAIM),
    ]);
    const result = runHook(
      { transcript_path: transcript, stop_hook_active: false },
      { CAVESTACK_VOICE_VERIFY: '0' },
    );
    expect(result.exitCode).toBe(0);
  });
});
