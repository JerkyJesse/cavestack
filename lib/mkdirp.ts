import { mkdirSync, statSync } from "fs";

/**
 * mkdir -p that tolerates the target directory already existing.
 *
 * Node's mkdirSync(dir, { recursive: true }) is a no-op when dir already
 * exists, but bun on Windows throws EEXIST in the same situation. Swallow
 * EEXIST only when statSync confirms the path is an existing directory;
 * anything else — a regular file occupying the path, a stat failure, a
 * different errno — rethrows the original error, so a real collision still
 * fails loudly.
 */
function mkdirpSyncImpl(dir: string): void {
  try {
    mkdirSync(dir, { recursive: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException | null)?.code === "EEXIST") {
      try {
        if (statSync(dir).isDirectory()) return;
      } catch {
        // stat failed — fall through and rethrow the original mkdir error
      }
    }
    throw e;
  }
}

export const mkdirpSync = mkdirpSyncImpl;
