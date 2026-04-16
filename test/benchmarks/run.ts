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
    // Invocation strategy (wire up on first maintainer run):
    //   - "claude-code-raw": CAVESTACK_DISABLED=1 claude -p "<prompt>"
    //   - "cavestack": claude -p "<prompt>" (CaveStack hooks active)
    //   - "superclaude": claude -p under a SUPERCLAUDE_DIR install
    //
    // Capture stdout character count. No API key needed — we are measuring
    // what the user actually sees, not what Anthropic bills.
    const env = { ...process.env };
    if (framework === "claude-code-raw") env.CAVESTACK_DISABLED = "1";
    if (framework === "superclaude") env.CLAUDE_CONFIG_DIR = process.env.SUPERCLAUDE_DIR || "";

    // Actual invocation TODO — scaffold returns an error marker that the
    // summary logic tolerates. Maintainer wires this up for v1.0.0.0's
    // first run.
    // const result = spawnSync("claude", ["-p", task.prompt], { env, cwd: workDir, encoding: "utf-8" });
    // if (result.error) throw result.error;
    // stdout = result.stdout || "";
    // outputChars = charCount(stdout);
    throw new Error("HARNESS_NOT_WIRED — see test/benchmarks/README.md");
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
  const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
  const versionPath = path.join(rootDir, "VERSION");
  const version = fs.existsSync(versionPath) ? fs.readFileSync(versionPath, "utf-8").trim() : "0.0.0.0";
  const superclaudeEnabled = !!process.env.SUPERCLAUDE_DIR;

  console.log(`CaveStack benchmark — v${version}`);
  console.log(`Unit: characters (model-agnostic, no API key required)`);
  console.log(`SuperClaude: ${superclaudeEnabled ? "ENABLED (" + process.env.SUPERCLAUDE_DIR + ")" : "DISABLED (set SUPERCLAUDE_DIR to include)"}`);
  console.log(`Tasks: ${TASKS.length}`);
  console.log("");

  const results: TaskResult[] = [];
  for (const task of TASKS) {
    console.log(`[${task.id}/${TASKS.length}] ${task.name}`);
    results.push(await runTaskOnFramework(task, "claude-code-raw", rootDir));
    results.push(await runTaskOnFramework(task, "cavestack", rootDir));
    if (superclaudeEnabled) {
      results.push(await runTaskOnFramework(task, "superclaude", rootDir));
    }
  }

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
