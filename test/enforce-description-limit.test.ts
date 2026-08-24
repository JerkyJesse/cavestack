import { describe, expect, test } from "bun:test";
import { enforceDescriptionLimit } from "../scripts/gen-skill-docs";

describe("enforceDescriptionLimit", () => {
  test("passes through when under the cap", () => {
    expect(enforceDescriptionLimit("short", 1024, "truncate", "qa")).toBe("short");
  });

  test("error behavior throws", () => {
    expect(() => enforceDescriptionLimit("abcdefghij", 4, "error", "qa")).toThrow(/max 4/);
  });

  test("warn behavior keeps the original string", () => {
    expect(enforceDescriptionLimit("abcdefghij", 4, "warn", "qa")).toBe("abcdefghij");
  });

  test("truncate actually shortens (word boundary + ellipsis)", () => {
    const long = "one two three four five six seven eight nine ten";
    const out = enforceDescriptionLimit(long, 20, "truncate", "qa");
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toBe(long);
  });

  test("truncate alias shortens the same way", () => {
    const long = "one two three four five six seven eight nine ten";
    const a = enforceDescriptionLimit(long, 20, "truncate", "qa");
    const b = enforceDescriptionLimit(long, 20, "truncate", "qa");
    expect(a).toBe(b);
  });
});
