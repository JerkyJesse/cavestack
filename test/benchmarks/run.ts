// test/benchmarks/run.ts — CaveStack benchmark harness
//
// Runs the 10 fixed tasks from tasks.md through {raw Claude Code, CaveStack}
// and (if SUPERCLAUDE_DIR is set) SuperClaude. Writes results to
// docs/benchmarks/v<VERSION>.json.
//
// CRITICAL: This runs only on the maintainer's machine, never on user installs.
// It burns real API tokens and takes ~1 hour wall time.

import fs from "node:fs";
import path from "node:path";

interface TaskResult {
  taskId: number;
  taskName: string;
  category: string;
  framework: "claude-code-raw" | "cavestack" | "superclaude";
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  wallSeconds: number;
  passed: boolean;
  error?: string;
}

interface BenchmarkReport {
  version: string;
  runDate: string;
  hardware: string;
  claudeModel: string;
  tasks: TaskResult[];
  summary: {
    totalTasks: number;
    byFramework: Record<string, { totalTokens: number; passed: number; failed: number }>;
    savings: {
      cavestackVsRaw: number | null;
      cavestackVsSuperclaude: number | null;
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

async function runTaskOnFramework(
  task: typeof TASKS[0],
  framework: TaskResult["framework"],
  workDir: string
): Promise<TaskResult> {
  const start = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;
  let stdout = "";
  let error: string | undefined;

  try {
    // Placeholder for the actual invocation. Implementation notes:
    //   - "claude-code-raw": spawn `claude -p <prompt>` with CaveStack hooks disabled
    //     (env var CAVESTACK_DISABLED=1, or point CLAUDE_CONFIG to clean dir).
    //   - "cavestack": spawn `claude -p <prompt>` with CaveStack installed normally.
    //   - "superclaude": spawn SuperClaude's equivalent (`superclaude run <prompt>`
    //     or `claude -p` with SuperClaude's CLAUDE.md) if $SUPERCLAUDE_DIR set.
    // In both cases, capture the Anthropic API usage from the response metadata.
    //
    // For v1.0.0.0 ship, this harness is a scaffold. Wire up actual invocation
    // when maintainer runs `bun run bench` for the first time. Results will
    // populate docs/benchmarks/v1.0.0.0.json at that point.
    throw new Error("HARNESS_NOT_WIRED — see README.md for setup");
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : String(e);
  }

  return {
    taskId: task.id,
    taskName: task.name,
    category: task.category,
    framework,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
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
  const byFramework: Record<string, { totalTokens: number; passed: number; failed: number }> = {};
  for (const r of results) {
    byFramework[r.framework] ??= { totalTokens: 0, passed: 0, failed: 0 };
    byFramework[r.framework].totalTokens += r.totalTokens;
    if (r.passed) byFramework[r.framework].passed += 1;
    else byFramework[r.framework].failed += 1;
  }

  const raw = byFramework["claude-code-raw"]?.totalTokens ?? null;
  const cs = byFramework["cavestack"]?.totalTokens ?? null;
  const sc = byFramework["superclaude"]?.totalTokens ?? null;

  const report: BenchmarkReport = {
    version,
    runDate: new Date().toISOString(),
    hardware: `${process.platform}-${process.arch}`,
    claudeModel: "claude-opus-4-7", // Update when model revisions ship
    tasks: results,
    summary: {
      totalTasks: TASKS.length,
      byFramework,
      savings: {
        cavestackVsRaw: raw && cs ? raw - cs : null,
        cavestackVsSuperclaude: sc && cs ? sc - cs : null,
      },
    },
  };

  const outPath = path.join(rootDir, "docs", "benchmarks", `v${version}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error("Benchmark failed:", e);
  process.exit(1);
});
