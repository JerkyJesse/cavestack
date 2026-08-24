/**
 * Splice the Windows Node polyfill header into the bun-built server bundle.
 *
 * Git Bash `head`/`perl -pi` on Windows return Permission denied if bun (or
 * Defender) still holds the outfile. Read/write through bun with retries.
 */
import { copyFileSync, unlinkSync } from "fs";

const HEADER = [
  "// ── Windows Node.js compatibility (auto-generated) ──",
  'import { fileURLToPath as _ftp } from "node:url";',
  'import { dirname as _dn } from "node:path";',
  'const __browseNodeSrcDir = _dn(_dn(_ftp(import.meta.url))) + "/src";',
  '{ const _r = createRequire(import.meta.url); _r("./bun-polyfill.cjs"); }',
  "// ── end compatibility ──",
  "",
].join("\n");

export async function readWithRetry(path: string, attempts = 30): Promise<string> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await Bun.file(path).text();
    } catch (err) {
      last = err;
      await Bun.sleep(50 * (i + 1));
    }
  }
  throw last;
}

export function splicePolyfill(source: string): string {
  const rewritten = source
    .replaceAll("import.meta.dir", "__browseNodeSrcDir")
    .replace(
      /import \{ Database \} from ["']bun:sqlite["'];/g,
      "const Database = null; // bun:sqlite stubbed on Node",
    );
  const nl = rewritten.indexOf("\n");
  if (nl < 0) throw new Error("server bundle missing newline");
  return rewritten.slice(0, nl + 1) + HEADER + rewritten.slice(nl + 1);
}

async function main(): Promise<void> {
  const raw = Bun.argv[2];
  const dst = Bun.argv[3];
  const polyfillSrc = Bun.argv[4];
  const polyfillDst = Bun.argv[5];
  if (!raw || !dst || !polyfillSrc || !polyfillDst) {
    throw new Error("usage: inject-node-polyfill.ts <raw> <dst> <polyfillSrc> <polyfillDst>");
  }
  const spliced = splicePolyfill(await readWithRetry(raw));
  await Bun.write(dst, spliced);
  copyFileSync(polyfillSrc, polyfillDst);
  try {
    unlinkSync(raw);
  } catch {
    // Antivirus may still hold the raw file; leftover is harmless.
  }
}

if (import.meta.main) {
  await main();
}
