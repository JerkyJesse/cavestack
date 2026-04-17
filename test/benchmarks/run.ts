// test/benchmarks/run.ts — CaveStack benchmark harness
//
// Runs the 10 fixed tasks from tasks.md through {raw Claude Code, CaveStack}
// and (if SUPERCLAUDE_DIR is set) SuperClaude. Writes results to
// docs/benchmarks/v<VERSION>.json.
//
// UNIT: output characters (bytes in UTF-8). Not tokens.
//   Tokens vary by model — GPT, Claude, Gemini all count differently.
//   Characters are model-agnostic. Every terminal can count them.
//   No API key required to measure.
//
// CRITICAL: This runs only on the maintainer's machine, never on user installs.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

interface TaskResult {
  taskId: number;
  taskName: string;
  category: string;
  framework: "claude-code-raw" | "cavestack" | "superclaude";
  inputChars: number;
  outputChars: number;
  totalChars: number;
  wallSeconds: number;
  passed: boolean;
  error?: string;
}

interface BenchmarkReport {
  version: string;
  runDate: string;
  hardware: string;
  claudeModel: string;
  unit: "characters";
  note: string;
  tasks: TaskResult[];
  summary: {
    totalTasks: number;
    byFramework: Record<string, { totalChars: number; passed: number; failed: number }>;
    savings: {
      cavestackVsRaw: { chars: number; pct: number } | null;
      cavestackVsSuperclaude: { chars: number; pct: number } | null;
    };
  };
}

const TASKS = [
  { id: 1, name: "Add dark-mode toggle", category: "feature", prompt: "Add a dark-mode toggle to the settings page in this repo. Persist the choice to localStorage. Keep the existing styling system.", success: (s: string) => /localStorage/i.test(s) && /dark/i.test(s) },
  { id: 2, name: "Investigate 500 error", category: "debug", prompt: "The /api/users endpoint returns 500 in production. Find the root cause and propose a fix.", success: (s: string) => /line\s+\d+|:\d+/.test(s) },
  { id: 3, name: "Rename function across files", category: "refactor", prompt: "Rename getCwd() to getCurrentWorkingDirectory() across the entire codebase. Preserve all call sites.", success: (s: string) => /getCurrentWorkingDirectory/.test(s) },
  { id: 4, name: "SQL injection review", category: "review", prompt: "Review the provided diff for SQL injection risks. Flag any unsafe concatenation patterns.", success: (s: string) => /injection|prepared|parameterized/i.test(s) },
  { id: 5, name: "Ship feature branch", category: "deploy", prompt: "Ship the current branch. Run tests, write a commit message, create a PR, summarize changes.", success: (s: string) => /commit|PR|pull request/i.test(s) },
  { id: 6, name: "Add migration for new column", category: "feature", prompt: "Add a Postgres migration that adds a `deleted_at` timestamp column to the users table with an index. Include the down migration.", success: (s: string) => /CREATE INDEX/i.test(s) && /ALTER TABLE/i.test(s) && /DROP/i.test(s) },
  { id: 7, name: "Debug flaky test", category: "debug", prompt: "The test 'should handle race condition' fails intermittently in CI but passes locally. Find the root cause.", success: (s: string) => /race|timing|async|await/i.test(s) },
  { id: 8, name: "OWASP Top 10 audit", category: "security", prompt: "Audit the authentication middleware for OWASP Top 10 vulnerabilities. Report findings with severity.", success: (s: string) => (s.match(/injection|broken auth|sensitive data|XXE|broken access|misconfiguration|XSS|deserialization|known vulnerable|logging/gi) || []).length >= 5 },
  { id: 9, name: "Design review: pricing page", category: "design", prompt: "Review the pricing page layout in this repo. Flag visual hierarchy issues, AI-slop patterns, accessibility gaps.", success: (s: string) => /hierarchy|accessibility|contrast|slop/i.test(s) },
  { id: 10, name: "Test coverage for billing", category: "tests", prompt: "Add test coverage for the billing module. Include edge cases: refunds, partial refunds, currency mismatch, network failure.", success: (s: string) => /refund/i.test(s) && /currency/i.test(s) && /network/i.test(s) },
];

/**
 * Count characters in a string as UTF-16 code units (matches JS .length).
 * We use code units instead of grapheme clusters because "saved X chars"
 * should reflect what users see in terminals and JSON payloads, not
 * linguistic units.
 */
function charCount(s: string): number {
  return s.length;
}

async function runTaskOnFramework(
  task: typeof TASKS[0],
  framework: TaskResult["framework"],
  workDir: string
): Promise<TaskResult> {
  const start = Date.now();
  const inputChars = charCount(task.prompt);
  let outputChars = 0;
  let stdout = "";
  let error: string | undefined;

  try {
    // Spawn `claude -p "<prompt>"` and capture stdout char count.
    // No API key needed — Claude Code handles its own auth. We measure
    // what the user actually sees, not what Anthropic bills.
    //
    // Framework distinction:
    //   - "claude-code-raw": set CAVESTACK_DISABLED=1. Hooks that check this
    //     env var will bow out. Until all hooks respect it, raw runs may
    //     still include CaveStack voice — document as known limitation.
    //   - "cavestack": normal invocation, all hooks active.
    //   - "superclaude": CLAUDE_CONFIG_DIR points at SuperClaude's install.
    const env = { ...process.env };
    if (framework === "claude-code-raw") env.CAVESTACK_DISABLED = "1";
    if (framework === "superclaude") env.CLAUDE_CONFIG_DIR = process.env.SUPERCLAUDE_DIR || "";

    const result = spawnSync("claude", ["-p", task.prompt], {
      env,
      cwd: workDir,
      encoding: "utf-8",
      timeout: 300_000, // 5 min per task hard cap
      maxBuffer: 10 * 1024 * 1024, // 10 MB stdout cap
    });

    if (result.error) throw result.error;
    if (result.status !== 0 && !result.stdout) {
      throw new Error(`claude exited with status ${result.status}: ${result.stderr || "no stderr"}`);
    }

    stdout = result.stdout || "";
    outputChars = charCount(stdout);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : String(e);
  }

  return {
    taskId: task.id,
    taskName: task.name,
    category: task.category,
    framework,
    inputChars,
    outputChars,
    totalChars: inputChars + outputChars,
    wallSeconds: Math.round((Date.now() - start) / 1000),
    passed: stdout ? task.success(stdout) : false,
    error,
  };
}

async function main() {
  // Prefer cwd (matches `bun run bench` invoked from repo root). Fall back
  // to import.meta.url resolution if cwd doesn't look like the repo.
  let rootDir = process.cwd();
  if (!fs.existsSync(path.join(rootDir, "VERSION"))) {
    // Windows: file:///C:/... → strip the leading slash before URL → path conversion
    const url = new URL(import.meta.url);
    const rawPath = decodeURIComponent(url.pathname);
    const filePath = process.platform === "win32" && rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
    rootDir = path.resolve(path.dirname(filePath), "..", "..");
  }
  const versionPath = path.join(rootDir, "VERSION");
  const version = fs.existsSync(versionPath) ? fs.readFileSync(versionPath, "utf-8").trim() : "0.0.0.0";
  const superclaudeEnabled = !!process.env.SUPERCLAUDE_DIR;

  // Use an EMPTY temp directory as the claude working dir so tasks that say
  // "rename X across the repo" have nothing to scan — claude responds from
  // the prompt text alone. This makes char-count measurement reproducible
  // without needing a fixture repo, and prevents accidental repo mutations.
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "cavestack-bench-"));
  console.log(`CaveStack benchmark — v${version}`);
  console.log(`Unit: characters (model-agnostic, no API key required)`);
  console.log(`Sandbox: ${sandbox}`);
  console.log(`SuperClaude: ${superclaudeEnabled ? "ENABLED (" + process.env.SUPERCLAUDE_DIR + ")" : "DISABLED (set SUPERCLAUDE_DIR to include)"}`);
  console.log(`Tasks: ${TASKS.length}`);
  console.log("");

  // Determine which frameworks to run. Default: both raw + cavestack.
  // BENCH_FRAMEWORKS=cavestack skips raw (useful when hooks can't be cleanly
  // disabled in the current shell).
  const frameworks: TaskResult["framework"][] = (() => {
    const env = process.env.BENCH_FRAMEWORKS;
    if (!env) return ["claude-code-raw", "cavestack"];
    return env.split(",").map((s) => s.trim()) as TaskResult["framework"][];
  })();
  console.log(`Frameworks: ${frameworks.join(", ")}`);
  console.log("");

  const results: TaskResult[] = [];
  for (const task of TASKS) {
    console.log(`[${task.id}/${TASKS.length}] ${task.name}`);
    for (const fw of frameworks) {
      process.stdout.write(`  ${fw}... `);
      const r = await runTaskOnFramework(task, fw, sandbox);
      results.push(r);
      if (r.error) {
        console.log(`ERROR (${r.wallSeconds}s): ${r.error.slice(0, 80)}`);
      } else {
        console.log(`${r.outputChars} chars (${r.wallSeconds}s) ${r.passed ? "[PASS]" : "[FAIL]"}`);
      }
    }
    if (superclaudeEnabled && !frameworks.includes("superclaude")) {
      process.stdout.write(`  superclaude... `);
      const r = await runTaskOnFramework(task, "superclaude", sandbox);
      results.push(r);
      console.log(`${r.outputChars} chars (${r.wallSeconds}s)`);
    }
  }

  // Clean up sandbox
  try { fs.rmSync(sandbox, { recursive: true, force: true }); } catch { /* ignore */ }

  // Summarize
  const byFramework: Record<string, { totalChars: number; passed: number; failed: number }> = {};
  for (const r of results) {
    byFramework[r.framework] ??= { totalChars: 0, passed: 0, failed: 0 };
    byFramework[r.framework].totalChars += r.totalChars;
    if (r.passed) byFramework[r.framework].passed += 1;
    else byFramework[r.framework].failed += 1;
  }

  const raw = byFramework["claude-code-raw"]?.totalChars ?? null;
  const cs = byFramework["cavestack"]?.totalChars ?? null;
  const sc = byFramework["superclaude"]?.totalChars ?? null;

  const pct = (baseline: number, actual: number): number =>
    baseline > 0 ? Math.round(((baseline - actual) / baseline) * 1000) / 10 : 0;

  const report: BenchmarkReport = {
    version,
    runDate: new Date().toISOString(),
    hardware: `${process.platform}-${process.arch}`,
    claudeModel: "claude-opus-4-7", // Update when model revisions ship
    unit: "characters",
    note: "All counts are UTF-16 code units (JS .length). Chars, not tokens — model-agnostic, reproducible without an API key.",
    tasks: results,
    summary: {
      totalTasks: TASKS.length,
      byFramework,
      savings: {
        cavestackVsRaw: raw && cs ? { chars: raw - cs, pct: pct(raw, cs) } : null,
        cavestackVsSuperclaude: sc && cs ? { chars: sc - cs, pct: pct(sc, cs) } : null,
      },
    },
  };

  const outPath = path.join(rootDir, "docs", "benchmarks", `v${version}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
  if (raw && cs) {
    console.log(`CaveStack vs raw Claude Code: ${raw - cs} chars saved (${pct(raw, cs)}%)`);
  }
}

main().catch((e) => {
  console.error("Benchmark failed:", e);
  process.exit(1);
});
