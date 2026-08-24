import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(import.meta.dir, "..");
const SETUP = fs.readFileSync(path.join(ROOT, "setup"), "utf-8");

describe("setup host dispatch (gstack 1.69 silent-success)", () => {
  test("usage() lists cursor and the --prefix Cursor example", () => {
    const usage = SETUP.match(/usage\(\)\s*\{[\s\S]*?\n\}/)![0];
    expect(usage).toContain("cursor");
    expect(usage).toContain("./setup --host cursor --prefix");
  });

  test("slate / openclaw / hermes / gbrain are informational exits, not silent no-ops", () => {
    expect(SETUP).toMatch(/slate\)\s*\n\s*echo/);
    expect(SETUP).toContain("There is no separate Slate skill install");
    expect(SETUP).toContain("exit 0 ;;");
    expect(SETUP).toContain("OpenClaw integration uses a different model");
    expect(SETUP).toContain("Hermes integration uses the same model as OpenClaw");
    expect(SETUP).toContain("GBrain is a mod for cavestack");
  });

  test("accepted --host values are a subset of dispatch or informational arms", () => {
    const unknownLine = SETUP.split("\n").find((l) => l.includes("Unknown --host value"));
    expect(unknownLine).toBeTruthy();
    const listed = [
      "claude",
      "codex",
      "kiro",
      "factory",
      "opencode",
      "cursor",
      "slate",
      "openclaw",
      "hermes",
      "gbrain",
      "auto",
    ];
    for (const host of listed) {
      expect(unknownLine).toContain(host);
    }
    const informational = new Set(["slate", "openclaw", "hermes", "gbrain"]);
    const installFlags = ["INSTALL_CLAUDE", "INSTALL_CODEX", "INSTALL_KIRO", "INSTALL_FACTORY", "INSTALL_OPENCODE", "INSTALL_CURSOR"];
    for (const host of listed) {
      if (host === "auto" || informational.has(host)) continue;
      const flag = `INSTALL_${host.toUpperCase()}`;
      expect(installFlags).toContain(flag);
      expect(SETUP).toContain(`${flag}=1`);
    }
  });

  test("fail-closed when an accepted host has no install arm", () => {
    expect(SETUP).toContain("is accepted but has no install arm");
    expect(SETUP).toContain("Valid install targets:");
  });

  test("external YAML name is passed into transformFrontmatter (Cursor name===folder)", () => {
    const src = fs.readFileSync(path.join(ROOT, "scripts/gen-skill-docs.ts"), "utf-8");
    expect(src).toContain('host === \'cursor\' ? name');
    expect(src).toContain("transformFrontmatter(content, host, nameForYaml)");
  });
});
