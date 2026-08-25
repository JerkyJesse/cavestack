import { describe, test, expect } from 'bun:test';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const SERVER_NODE = path.join(DIST_DIR, 'server-node.mjs');

function readBundleWithRetry(file: string, attempts = 10): string {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return fs.readFileSync(file, 'utf-8');
    } catch (err) {
      last = err;
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'EUNKNOWN' && code !== 'EBUSY' && code !== 'EPERM') throw err;
      Bun.sleepSync(50 * (i + 1));
    }
  }
  throw last;
}

function isQuarantined(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException).code;
  return code === 'EUNKNOWN' || code === 'EBUSY' || code === 'EPERM' || code === 'ENOENT';
}

describe('build: server-node.mjs', () => {
  test('passes node --check if present', () => {
    if (!fs.existsSync(SERVER_NODE)) {
      // browse/dist is gitignored; no build has run in this checkout.
      // Skip rather than fail so plain `bun test` without a prior build passes.
      return;
    }
    // execFileSync keeps paths with spaces intact (this checkout lives under
    // "Bucket Of Pythons"). A shell string `node --check ${path}` splits on spaces.
    try {
      execFileSync('node', ['--check', SERVER_NODE], { stdio: 'pipe' });
    } catch (err) {
      if (isQuarantined(err)) return; // CS403: Defender ate the bundle
      throw err;
    }
  });

  test('does not inline @ngrok/ngrok (must be external)', () => {
    if (!fs.existsSync(SERVER_NODE)) return;
    let bundle: string;
    try {
      bundle = readBundleWithRetry(SERVER_NODE);
    } catch (err) {
      if (isQuarantined(err)) return;
      throw err;
    }
    // Dynamic imports of externalized packages show up as string literals in the bundle,
    // not as inlined module code. The heuristic: ngrok's native binding loader would
    // reference its own internals. If any ngrok internal identifier appears, the module
    // got inlined despite the --external flag.
    expect(bundle).not.toMatch(/ngrok_napi|ngrokNapi|@ngrok\/ngrok-darwin|@ngrok\/ngrok-linux|@ngrok\/ngrok-win32/);
  });
});
