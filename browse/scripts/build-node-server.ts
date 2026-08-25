/**
 * Build the Node.js server bundle for Windows.
 *
 * Bun's CLI `--outfile` leaves the file locked on Windows (Git Bash `head`
 * and even `Bun.file().text()` get EUNKNOWN / Permission denied). Build in
 * memory, splice the polyfill header, write once.
 */
import { copyFileSync, existsSync, renameSync, unlinkSync } from "fs";
import path from "path";
import { mkdirpSync } from "../../lib/mkdirp";
import { splicePolyfill } from "./inject-node-polyfill";

const ROOT = path.resolve(import.meta.dir, "../..");
const SRC = path.join(ROOT, "browse", "src");
const DIST = path.join(ROOT, "browse", "dist");
const ENTRY = path.join(SRC, "server.ts");
const DST = path.join(DIST, "server-node.mjs");
const POLYFILL_SRC = path.join(SRC, "bun-polyfill.cjs");
const POLYFILL_DST = path.join(DIST, "bun-polyfill.cjs");

export async function writeWithRetry(file: string, contents: string, attempts = 20): Promise<void> {
  const tmp = `${file}.${process.pid}.tmp`;
  await Bun.write(tmp, contents);
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      if (existsSync(file)) unlinkSync(file);
      renameSync(tmp, file);
      return;
    } catch (err) {
      last = err;
      await Bun.sleep(50 * (i + 1));
    }
  }
  // Last resort: copy over the dest, leave tmp for the next run to clean.
  try {
    copyFileSync(tmp, file);
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    return;
  } catch {
    throw last;
  }
}

/** Defender's Trojan:NPM/Stealer!AMTB heuristic deletes the bundle seconds after write. */
export async function assertBundleNotQuarantined(file: string, settleMs = 1500): Promise<void> {
  if (process.platform !== "win32") return;
  await Bun.sleep(settleMs);
  try {
    const text = await Bun.file(file).text();
    if (text.length < 100) {
      throw new Error("bundle too small");
    }
  } catch {
    throw new Error(
      `CS403: Windows Defender quarantined ${file} as Trojan:NPM/Stealer!AMTB ` +
        `(false positive on the CaveStack Node browse bundle). Allow it, then rebuild:\n` +
        `  Add-MpPreference -ExclusionPath '${DIST}'\n` +
        `  bash browse/scripts/build-node-server.sh`,
    );
  }
}

export async function buildNodeServer(): Promise<void> {
  mkdirpSync(DIST);
  const result = await Bun.build({
    entrypoints: [ENTRY],
    target: "node",
    format: "esm",
    minify: false,
    external: ["playwright", "playwright-core", "diff", "bun:sqlite", "@ngrok/ngrok"],
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error("Bun.build failed for browse/src/server.ts");
  }
  const artifact = result.outputs[0];
  if (!artifact) throw new Error("Bun.build produced no output");
  const source = await artifact.text();
  await writeWithRetry(DST, splicePolyfill(source));
  copyFileSync(POLYFILL_SRC, POLYFILL_DST);
  await assertBundleNotQuarantined(DST);
}

if (import.meta.main) {
  console.log("Building Node-compatible server bundle...");
  await buildNodeServer();
  console.log(`Node server bundle ready: ${DST}`);
}
