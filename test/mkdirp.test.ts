import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { mkdirpSync } from "../lib/mkdirp";

describe("mkdirpSync", () => {
  test("creates a nested directory", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cavestack-mkdirp-"));
    const nested = path.join(root, "a", "b", "c");
    try {
      mkdirpSync(nested);
      expect(fs.statSync(nested).isDirectory()).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("second call on an existing directory does not throw (Windows bun EEXIST)", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cavestack-mkdirp-"));
    try {
      mkdirpSync(root);
      mkdirpSync(root);
      expect(fs.statSync(root).isDirectory()).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("rethrows when a regular file occupies the path", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cavestack-mkdirp-"));
    const file = path.join(root, "not-a-dir");
    fs.writeFileSync(file, "nope");
    try {
      expect(() => mkdirpSync(file)).toThrow();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
