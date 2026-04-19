import { setDefaultTimeout } from 'bun:test';

// Bun's default per-test timeout is 5s. Tests that shell out to bash scripts
// which then spawn `bun -e` subprocesses can exceed this on Windows, where
// each spawn has ~500ms-1s of overhead. Linux/macOS stay well under 5s.
setDefaultTimeout(20000);
