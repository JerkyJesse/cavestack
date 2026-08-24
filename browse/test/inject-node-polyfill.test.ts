import { describe, expect, test } from "bun:test";
import { splicePolyfill } from "../scripts/inject-node-polyfill";

describe("splicePolyfill", () => {
  test("injects header after the first line and rewrites import.meta.dir", () => {
    const src = 'import { createRequire } from "node:module";\nconst x = import.meta.dir;\n';
    const out = splicePolyfill(src);
    expect(out.startsWith('import { createRequire } from "node:module";\n')).toBe(true);
    expect(out).toContain("bun-polyfill.cjs");
    expect(out).toContain("__browseNodeSrcDir");
    expect(out).not.toContain("import.meta.dir");
    expect(out).toContain("const x = __browseNodeSrcDir;");
  });

  test("stubs bun:sqlite", () => {
    const src = 'import { createRequire } from "node:module";\nimport { Database } from "bun:sqlite";\n';
    const out = splicePolyfill(src);
    expect(out).toContain("const Database = null; // bun:sqlite stubbed on Node");
    expect(out).not.toContain('import { Database } from "bun:sqlite"');
  });
});
