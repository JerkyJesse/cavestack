#!/usr/bin/env node
// CaveStack test-scaffold-gate — PreToolUse hook for Zero-Test-Drift Protocol.
//
// Fires on every Write|Edit tool call. Gates source-code writes that lack a
// matching test either (a) written earlier this session, or (b) already on disk.
//
// Modes (via `cavestack-config get test_scaffold_gate`):
//   off  — exit 0, no output.
//   soft — stderr warning, exit 0 (tool call proceeds). DEFAULT.
//   hard — stdout JSON `{decision:"block", reason}`, exit 2 (tool call refused).
//
// Session tracking: appends to ~/.cavestack/sessions/<session_id>-writes.jsonl
// so later calls in the same session can detect that a pair was written.
// GC: same 120-minute TTL pattern as ~/.cavestack/sessions/ markers.
//
// No test scaffold = drift. Hook makes drift loud.

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Constants ──────────────────────────────────────────────

const STATE_DIR = process.env.CAVESTACK_STATE_DIR || path.join(os.homedir(), '.cavestack');
const SESSIONS_DIR = path.join(STATE_DIR, 'sessions');
const SESSION_TTL_MIN = 120;
const MAX_STDIN_BYTES = 1 * 1024 * 1024; // 1 MB — hook input is small JSON

// Source extensions that trigger the gate (per Zero-Test-Drift Applies-to list).
const SOURCE_EXTS = new Set(['.ts', '.js', '.py', '.go', '.rs', '.java']);

// Config defaults when cavestack-config missing or unset.
const DEFAULT_MODE = 'soft';
const VALID_MODES = new Set(['off', 'soft', 'hard']);

// ─── Stdin ──────────────────────────────────────────────────

function readStdinSync() {
  try {
    const data = fs.readFileSync(0, 'utf-8');
    if (data.length > MAX_STDIN_BYTES) return '';
    return data;
  } catch {
    return '';
  }
}

function parseInput(raw) {
  if (!raw || !raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ─── Mode resolution ────────────────────────────────────────

function getMode() {
  // Env override for tests
  const envMode = process.env.CAVESTACK_TEST_SCAFFOLD_GATE;
  if (envMode && VALID_MODES.has(envMode)) return envMode;

  try {
    const binPath = path.resolve(__dirname, '..', 'bin', 'cavestack-config');
    if (!fs.existsSync(binPath)) return DEFAULT_MODE;
    const out = execSync(`"${binPath}" get test_scaffold_gate`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 2000,
      encoding: 'utf-8',
    }).trim();
    if (VALID_MODES.has(out)) return out;
    return DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

// ─── Path classification ────────────────────────────────────

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function isTestPath(p) {
  const s = toPosix(p);
  if (/(^|\/)test\//.test(s)) return true;
  if (/(^|\/)__tests__\//.test(s)) return true;
  if (/\.test\.[a-z]+$/.test(s)) return true;
  if (/\.spec\.[a-z]+$/.test(s)) return true;
  return false;
}

function isExcluded(p) {
  const s = toPosix(p);
  if (/(^|\/)(dist|build|node_modules|\.git|docs|\.github)\//.test(s)) return true;
  if (/(^|\/)LICENSE/.test(s)) return true;
  if (/(^|\/)CHANGELOG/.test(s)) return true;
  if (/\.md$/.test(s)) return true;
  if (/\.txt$/.test(s)) return true;
  if (/\.json$/.test(s)) return true;
  if (/\.ya?ml$/.test(s)) return true;
  if (/\.toml$/.test(s)) return true;
  if (/\.d\.ts$/.test(s)) return true;
  return false;
}

function isSource(p) {
  const s = toPosix(p);
  const ext = path.extname(s).toLowerCase();
  if (!SOURCE_EXTS.has(ext)) return false;
  if (isTestPath(s)) return false;
  if (isExcluded(s)) return false;
  // Barrel re-export detection (index.ts with only export-from lines)
  if (/\/index\.ts$/.test(s) && fs.existsSync(p)) {
    try {
      const body = fs.readFileSync(p, 'utf-8');
      if (/^(\s*export\s+.*from\s+.*;?\s*\n?)+$/.test(body)) return false;
    } catch { /* fall through */ }
  }
  return true;
}

// ─── Test-pair resolution (Test-Match Table) ────────────────

function expectedTestPaths(sourcePath) {
  const s = toPosix(sourcePath);
  const ext = path.extname(s);
  const dir = path.posix.dirname(s);
  const base = path.posix.basename(s, ext);
  const paired = [];

  // Sibling .test.<ext>
  paired.push(path.posix.join(dir, `${base}.test${ext}`));
  // __tests__ subdir
  paired.push(path.posix.join(dir, '__tests__', `${base}.test${ext}`));
  // Repo-root test/ (Windows: source might be abs path, but pair check works on basename)
  paired.push(path.posix.join('test', `${base}.test.ts`));
  paired.push(path.posix.join('test', `${base}.test${ext}`));

  // Scripts-subdir mirror: scripts/resolvers/foo.ts → test/resolvers/foo.test.ts
  const scriptsMatch = s.match(/(?:^|\/)scripts\/(.+?)\/[^\/]+\.[a-z]+$/);
  if (scriptsMatch) {
    paired.push(path.posix.join('test', scriptsMatch[1], `${base}.test.ts`));
  }

  // browse/src/foo.ts → browse/test/foo.test.ts
  const subRepo = s.match(/(?:^|\/)(browse|design)\/src\//);
  if (subRepo) {
    paired.push(path.posix.join(subRepo[1], 'test', `${base}.test.ts`));
  }

  // hooks/foo.js → test/foo.test.ts
  if (/(?:^|\/)hooks\//.test(s)) {
    paired.push(path.posix.join('test', `${base}.test.ts`));
  }

  return Array.from(new Set(paired));
}

// ─── Session log ────────────────────────────────────────────

function gcStaleSessions() {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) return;
    const cutoff = Date.now() - SESSION_TTL_MIN * 60 * 1000;
    for (const entry of fs.readdirSync(SESSIONS_DIR)) {
      if (!entry.endsWith('-writes.jsonl')) continue;
      const p = path.join(SESSIONS_DIR, entry);
      try {
        const stat = fs.statSync(p);
        if (stat.mtimeMs < cutoff) fs.unlinkSync(p);
      } catch { /* best-effort */ }
    }
  } catch { /* best-effort */ }
}

function sessionLogPath(sessionId) {
  return path.join(SESSIONS_DIR, `${sessionId}-writes.jsonl`);
}

function readSessionWrites(sessionId) {
  const p = sessionLogPath(sessionId);
  if (!fs.existsSync(p)) return [];
  try {
    return fs
      .readFileSync(p, 'utf-8')
      .split('\n')
      .filter(l => l.trim())
      .map(l => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter(e => e && typeof e.path === 'string');
  } catch {
    return [];
  }
}

function appendSessionWrite(sessionId, filePath, toolName) {
  try {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    const line = JSON.stringify({
      path: toPosix(filePath),
      tool: toolName,
      ts: new Date().toISOString(),
    });
    fs.appendFileSync(sessionLogPath(sessionId), line + '\n');
  } catch { /* best-effort */ }
}

// ─── Pair detection ─────────────────────────────────────────

function hasPairedTest(sourcePath, sessionId) {
  const expected = expectedTestPaths(sourcePath);
  const expectedSet = new Set(expected.map(toPosix));

  // (a) Session-logged test for this source
  const writes = readSessionWrites(sessionId);
  for (const w of writes) {
    const wp = toPosix(w.path);
    if (expectedSet.has(wp)) return true;
    // Also match by basename — handles when cwd differs from abs-path
    const wBase = path.posix.basename(wp);
    for (const e of expected) {
      if (path.posix.basename(e) === wBase) return true;
    }
  }

  // (b) Test exists on disk (edit path — pair already established)
  for (const e of expected) {
    if (fs.existsSync(e)) return true;
  }

  return false;
}

// ─── Main ───────────────────────────────────────────────────

function main() {
  if (process.env.CAVESTACK_TEST_SCAFFOLD_GATE === 'off') {
    return 0;
  }

  const raw = readStdinSync();
  const input = parseInput(raw);

  const toolName = input.tool_name;
  if (toolName !== 'Write' && toolName !== 'Edit') return 0;

  const filePath = input.tool_input && input.tool_input.file_path;
  if (!filePath || typeof filePath !== 'string') return 0;

  const sessionId = input.session_id || 'unknown';

  gcStaleSessions();

  // Always log every Write/Edit — lets later calls detect pair.
  appendSessionWrite(sessionId, filePath, toolName);

  // Test files never trigger the gate.
  if (isTestPath(filePath)) return 0;

  // Non-source files never trigger.
  if (!isSource(filePath)) return 0;

  // Pair resolution.
  if (hasPairedTest(filePath, sessionId)) return 0;

  // Mode branch.
  const mode = getMode();
  const expected = expectedTestPaths(filePath);
  const expectedPreview = expected.slice(0, 3).join(', ');

  if (mode === 'off') return 0;

  if (mode === 'hard') {
    const reason = `[test-scaffold-gate] BLOCK: ${toPosix(filePath)} edited without matching test. Write one of: ${expectedPreview} first. Set test_scaffold_gate=soft to warn instead, off to silence.`;
    process.stdout.write(JSON.stringify({ decision: 'block', reason }));
    return 2;
  }

  // soft (default)
  process.stderr.write(
    `[test-scaffold-gate] WARN: ${toPosix(filePath)} edited without matching test. Expected one of: ${expectedPreview}. Set test_scaffold_gate=hard to block, off to silence.\n`
  );
  return 0;
}

try {
  const code = main();
  process.exit(code);
} catch (err) {
  // Fail open — never block on internal hook error.
  if (process.env.CAVESTACK_TEST_SCAFFOLD_GATE_DEBUG === '1') {
    process.stderr.write(`test-scaffold-gate error: ${err && err.message ? err.message : String(err)}\n`);
  }
  process.exit(0);
}
