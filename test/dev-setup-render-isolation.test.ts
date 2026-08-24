import { describe, test, expect } from 'bun:test';
import * as path from 'path';
import * as fs from 'fs';

// Static tripwires for the B2 render-isolation wiring. These fail CI if a
// refactor drops a load-bearing line, re-introducing the "dev-setup dirties
// tracked SKILL.md" drift (or worse, leaks the skip-guard into real installs).
const ROOT = path.resolve(import.meta.dir, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('dev-setup: worktree stays canonical', () => {
  const devSetup = read('bin/dev-setup');

  test('passes CAVESTACK_SKIP_GBRAIN_REGEN inline on the nested setup call', () => {
    expect(devSetup).toContain('CAVESTACK_SKIP_GBRAIN_REGEN=1 "$CAVESTACK_LINK/setup"');
  });

  test('never exports CAVESTACK_SKIP_GBRAIN_REGEN (would leak into other setup paths)', () => {
    expect(devSetup).not.toMatch(/export\s+CAVESTACK_SKIP_GBRAIN_REGEN/);
  });

  test('renders the :user variant into an out-dir, not in place', () => {
    expect(devSetup).toContain('--out-dir');
    expect(devSetup).toContain('.claude/cavestack-rendered');
  });

  test('gates the render on cavestack-gbrain-detect --is-ok', () => {
    expect(devSetup).toContain('--is-ok');
  });
});

describe('setup: honors CAVESTACK_SKIP_GBRAIN_REGEN', () => {
  const setup = read('setup');

  test('skips the in-place :user regen when the guard is set', () => {
    expect(setup).toContain('${CAVESTACK_SKIP_GBRAIN_REGEN:-}');
    // The guard must wrap the in-place render, not the detection persist.
    const idx = setup.indexOf('CAVESTACK_SKIP_GBRAIN_REGEN');
    const after = setup.slice(idx, idx + 600);
    expect(after).toContain('leaving tracked SKILL.md canonical');
  });

  test('uses a PID-unique detection tmp (no concurrent clobber)', () => {
    expect(setup).toContain('$DETECTION_FILE.$$.tmp');
  });

  test('gates detection on the shared --is-ok check', () => {
    expect(setup).toContain('"$DETECT_BIN" --is-ok');
  });
});

describe('gen-skill-docs: section rewrite is gated on --out-dir', () => {
  const gen = read('scripts/gen-skill-docs.ts');

  test('rewriteSectionBase is a no-op without --out-dir', () => {
    expect(gen).toContain('function rewriteSectionBase');
    const idx = gen.indexOf('function rewriteSectionBase');
    const body = gen.slice(idx, idx + 400);
    expect(body).toContain('if (!OUT_DIR) return content');
    expect(body).toContain('sections'); // surgical: regex targets only /sections/ paths
  });
});

describe('dev-teardown: removes the untracked render', () => {
  const teardown = read('bin/dev-teardown');

  test('rm -rf the cavestack-rendered dir', () => {
    expect(teardown).toContain('cavestack-rendered');
    expect(teardown).toMatch(/rm -rf .*RENDER_DIR/);
  });
});

describe('.gitignore: render dir is declared untracked', () => {
  test('.claude/cavestack-rendered/ is ignored', () => {
    expect(read('.gitignore')).toContain('.claude/cavestack-rendered/');
  });
});

describe('dev-skill: refreshes the render on template change', () => {
  const devSkill = read('scripts/dev-skill.ts');

  test('re-renders the :user variant into the workspace render dir', () => {
    expect(devSkill).toContain('cavestack-rendered');
    expect(devSkill).toContain('--out-dir');
    expect(devSkill).toContain('--respect-detection');
  });

  test('only refreshes when the render dir already exists (never creates it during plain dev)', () => {
    expect(devSkill).toContain('fs.existsSync(RENDER_DIR)');
  });
});
