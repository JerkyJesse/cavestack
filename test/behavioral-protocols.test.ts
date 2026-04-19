import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateCaveProtocol,
  generateZeroTestDrift,
  generateMuskAlgorithmDirective,
  generateResumeProtocol,
  generateZeroShortcutsDirective,
  generateTryFirstDirective,
  CAVE_FULL,
  CAVE_COMPACT,
  ZTD_FULL,
  ZTD_COMPACT,
} from '../scripts/resolvers/behavioral-protocols';
import { computeDensity, checkThresholds } from '../scripts/lib/voice-density';

const ROOT = path.resolve(import.meta.dir, '..');

// Caveman-full floor — must match voices/caveman-full.json density_thresholds.
const CAVEMAN_FLOOR = {
  articlesPerHundred: 2.0,
  fillersPerHundred: 1.0,
  hedgesPerHundred: 0.5,
  verbosePhraseMax: 3,
};

describe('generateCaveProtocol', () => {
  test('returns CAVE_FULL for tier 2', () => {
    expect(generateCaveProtocol(2)).toBe(CAVE_FULL);
  });
  test('returns CAVE_FULL for tier 3', () => {
    expect(generateCaveProtocol(3)).toBe(CAVE_FULL);
  });
  test('returns CAVE_COMPACT for tier 4', () => {
    expect(generateCaveProtocol(4)).toBe(CAVE_COMPACT);
  });
  test('contains three non-negotiable rules heading', () => {
    const text = generateCaveProtocol(3);
    expect(text).toMatch(/## Cave Protocol/);
    expect(text).toMatch(/Three rules/);
  });
  test('names rule 1 as internet adversarial', () => {
    expect(generateCaveProtocol(3)).toMatch(/Question internet, not user/);
  });
  test('names rule 2 as simplest first', () => {
    expect(generateCaveProtocol(3)).toMatch(/Simplest solution first/);
  });
  test('names rule 3 as think inside cave', () => {
    expect(generateCaveProtocol(3)).toMatch(/Think inside cave/);
  });
});

describe('generateZeroTestDrift', () => {
  test('returns ZTD_FULL for tier 2', () => {
    expect(generateZeroTestDrift(2)).toBe(ZTD_FULL);
  });
  test('returns ZTD_FULL for tier 3', () => {
    expect(generateZeroTestDrift(3)).toBe(ZTD_FULL);
  });
  test('returns ZTD_COMPACT for tier 4', () => {
    expect(generateZeroTestDrift(4)).toBe(ZTD_COMPACT);
  });
  test('contains test-scaffold-gate hook reference', () => {
    expect(generateZeroTestDrift(3)).toMatch(/test-scaffold-gate\.js/);
  });
  test('lists source file extensions', () => {
    const text = generateZeroTestDrift(3);
    expect(text).toMatch(/\*\.ts/);
    expect(text).toMatch(/\*\.py/);
    expect(text).toMatch(/\*\.go/);
  });
  test('documents config key + default', () => {
    const text = generateZeroTestDrift(3);
    expect(text).toMatch(/test_scaffold_gate soft\|hard\|off/);
    expect(text).toMatch(/[Dd]efault `soft`/);
  });
});

describe('density floor compliance', () => {
  test('CAVE_FULL passes caveman-full floor', () => {
    const m = computeDensity(CAVE_FULL);
    const result = checkThresholds(m, CAVEMAN_FLOOR);
    if (!result.pass) {
      console.error('CAVE_FULL density failures:', result.failedMetrics);
      console.error('Top offenders:', m.flaggedItems.slice(0, 10).map(f => `${f.type}:${f.match}`));
    }
    expect(result.pass).toBe(true);
    expect(m.articlesPerHundred).toBeLessThanOrEqual(2.0);
    expect(m.hedgesPerHundred).toBeLessThanOrEqual(0.5);
  });

  test('CAVE_COMPACT passes caveman-full floor', () => {
    const m = computeDensity(CAVE_COMPACT);
    const result = checkThresholds(m, CAVEMAN_FLOOR);
    expect(result.pass).toBe(true);
  });

  test('ZTD_FULL passes caveman-full floor', () => {
    const m = computeDensity(ZTD_FULL);
    const result = checkThresholds(m, CAVEMAN_FLOOR);
    if (!result.pass) {
      console.error('ZTD_FULL density failures:', result.failedMetrics);
      console.error('Top offenders:', m.flaggedItems.slice(0, 10).map(f => `${f.type}:${f.match}`));
    }
    expect(result.pass).toBe(true);
    expect(m.articlesPerHundred).toBeLessThanOrEqual(2.0);
    expect(m.hedgesPerHundred).toBeLessThanOrEqual(0.5);
  });

  test('ZTD_COMPACT passes caveman-full floor', () => {
    const m = computeDensity(ZTD_COMPACT);
    const result = checkThresholds(m, CAVEMAN_FLOOR);
    expect(result.pass).toBe(true);
  });
});

describe('composition order invariant', () => {
  test('tier 2+ preamble composes 9 behavioral elements in canonical order', () => {
    // Snapshot the canonical sequence. If composition in preamble.ts changes,
    // either this test updates OR the change is wrong. Catches silent reorder.
    const canonical = [
      'generateContextRecovery',
      'generateAskUserFormat',
      'generateZeroShortcutsDirective',
      'generateTryFirstDirective',
      'generateMuskAlgorithmDirective',
      'generateCaveProtocol',
      'generateZeroTestDrift',
      'generateResumeProtocol',
      'generateBuildPhilosophyInjection',
    ];

    const preamblePath = path.join(ROOT, 'scripts', 'resolvers', 'preamble.ts');
    const src = fs.readFileSync(preamblePath, 'utf-8');
    // Find the tier >= 2 composition spread — single-line array literal.
    const match = src.match(/tier >= 2 \? \[([^\]]+)\]/);
    expect(match).not.toBeNull();
    const actualOrder = match![1]
      .split(',')
      .map(s => s.trim().replace(/\(.*$/, '')) // strip fn args
      .filter(s => s.length > 0);
    expect(actualOrder).toEqual(canonical);
  });
});

describe('idempotent regeneration', () => {
  test('bun run gen:skill-docs produces byte-identical output on consecutive runs', () => {
    // Pick a tier-2+ SKILL.md that touches both new rails.
    const target = path.join(ROOT, 'investigate', 'SKILL.md');
    if (!fs.existsSync(target)) {
      // Skip if target missing — fresh clone pre-build scenario.
      return;
    }

    const run = () => {
      const r = spawnSync('bun', ['run', 'gen:skill-docs'], {
        cwd: ROOT,
        stdio: 'pipe',
        env: { ...process.env, NO_COLOR: '1' },
      });
      if (r.status !== 0) {
        throw new Error(`gen:skill-docs failed: ${r.stderr?.toString()}`);
      }
    };
    const hash = (p: string) =>
      createHash('sha256').update(fs.readFileSync(p)).digest('hex');

    run();
    const first = hash(target);
    run();
    const second = hash(target);
    expect(second).toBe(first);
  }, 60_000);
});
