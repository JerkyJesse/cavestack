/**
 * cavestack-uninstall: real-directory installs are removed, gated on provenance
 * (#2563, F8, ENG-OV10).
 *
 * On Windows, setup installs skills as REAL directory copies (no symlinks).
 * cavestack-uninstall's per-skill loop filtered on `[ -L ]`, so every copy was
 * skipped: the tool exited 0, printed "cavestack uninstalled.", and left ~52
 * cavestack-* directories behind. The same filter also missed the standard Unix
 * shape (real dir + symlinked SKILL.md).
 *
 * Deletion gate for real-file installs (F8): the directory name must be in
 * cavestack's skill inventory AND its SKILL.md must carry the existing generated
 * banner `<!-- AUTO-GENERATED from` (ENG-OV10 — every pre-v1.67 copy already
 * carries it; a NEW marker would refuse legitimate old installs). Anything
 * that fails a gate is listed to stderr and NEVER deleted.
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');
const UNINSTALL = path.join(ROOT, 'bin', 'cavestack-uninstall');

const BANNER = '<!-- AUTO-GENERATED from SKILL.md.tmpl - DO NOT EDIT DIRECTLY -->\n';

function skillMd(name: string, withBanner = true): string {
  return `---\nname: ${name}\ndescription: test\n---\n${withBanner ? BANNER : ''}# ${name}\n`;
}

let tmpDir: string;
let mockHome: string;
let skillsDir: string;
let installRoot: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cavestack-uninstall-copies-'));
  mockHome = path.join(tmpDir, 'home');
  skillsDir = path.join(mockHome, '.claude', 'skills');
  installRoot = path.join(skillsDir, 'cavestack');

  // Mock install root: the source-of-truth skill dirs the inventory reads.
  for (const skill of ['review', 'ship', 'qa']) {
    fs.mkdirSync(path.join(installRoot, skill), { recursive: true });
    fs.writeFileSync(path.join(installRoot, skill, 'SKILL.md'), skillMd(skill));
  }
  fs.writeFileSync(path.join(installRoot, 'SKILL.md'), skillMd('cavestack'));
  fs.mkdirSync(path.join(mockHome, '.cavestack'), { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function runUninstall(): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync('bash', [UNINSTALL, '--force'], {
    stdio: 'pipe',
    encoding: 'utf-8',
    env: {
      ...process.env,
      HOME: mockHome,
      CAVESTACK_DIR: installRoot,
      CAVESTACK_STATE_DIR: path.join(mockHome, '.cavestack'),
    },
    cwd: tmpDir, // not a git repo — per-project paths inert
    timeout: 20_000,
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

/** Create a Windows-shape install entry: real dir + real-file SKILL.md. */
function realDirEntry(name: string, content: string): string {
  const dir = path.join(skillsDir, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), content);
  return dir;
}

describe('cavestack-uninstall removes Windows real-dir copies (#2563)', () => {
  test('inventory name + banner → removed (flat, prefixed, and alias forms)', () => {
    const review = realDirEntry('review', skillMd('review'));
    const prefixedShip = realDirEntry('cavestack-ship', skillMd('cavestack-ship'));
    const alias = realDirEntry('_cavestack-command', skillMd('_cavestack-command'));
    const ogbAlias = realDirEntry('connect-chrome', skillMd('connect-chrome'));

    const r = runUninstall();
    expect(r.status).toBe(0);
    expect(fs.existsSync(review)).toBe(false);
    expect(fs.existsSync(prefixedShip)).toBe(false);
    expect(fs.existsSync(alias)).toBe(false);
    expect(fs.existsSync(ogbAlias)).toBe(false);
    expect(fs.existsSync(installRoot)).toBe(false);
  });

  test('name NOT in inventory → kept and listed to stderr, even with a banner', () => {
    const foreign = realDirEntry('my-notes', skillMd('my-notes'));

    const r = runUninstall();
    expect(r.status).toBe(0);
    expect(fs.existsSync(foreign)).toBe(true);
    expect(r.stderr).toContain('my-notes');
    expect(r.stderr).toContain('left in place');
  });

  test('no banner → kept and listed, even when the name collides with a cavestack skill', () => {
    // F8's name-collision row: a user's own hand-written ~/.claude/skills/ship.
    const usersOwn = realDirEntry('ship', skillMd('ship', false));

    const r = runUninstall();
    expect(r.status).toBe(0);
    expect(fs.existsSync(usersOwn)).toBe(true);
    expect(fs.readFileSync(path.join(usersOwn, 'SKILL.md'), 'utf-8')).toContain('name: ship');
    // Separator-insensitive: the bash uninstall prints POSIX paths even on
    // Windows (Git Bash), where path.join would demand a backslash.
    expect(r.stderr.replace(/\\/g, '/')).toContain('skills/ship');
  });

  test('real dir without any SKILL.md is untouched and unlisted', () => {
    const plain = path.join(skillsDir, 'other-tool');
    fs.mkdirSync(plain, { recursive: true });

    const r = runUninstall();
    expect(r.status).toBe(0);
    expect(fs.existsSync(plain)).toBe(true);
    expect(r.stderr).not.toContain('other-tool');
  });

  test('a clean sweep reports the removed entries', () => {
    realDirEntry('review', skillMd('review'));
    const r = runUninstall();
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('claude/review');
    expect(r.stdout).toContain('cavestack uninstalled.');
  });
});

// symlinkSync needs Developer Mode on Windows runners; the Unix install shape
// can't be constructed there. The shape is Unix-only in practice anyway.
describe.skipIf(process.platform === 'win32')(
  'cavestack-uninstall removes the Unix real-dir + symlinked-SKILL.md shape',
  () => {
    test('SKILL.md symlink pointing into cavestack → removed', () => {
      const dir = path.join(skillsDir, 'qa');
      fs.mkdirSync(dir, { recursive: true });
      fs.symlinkSync(path.join(installRoot, 'qa', 'SKILL.md'), path.join(dir, 'SKILL.md'));

      const r = runUninstall();
      expect(r.status).toBe(0);
      expect(fs.existsSync(dir)).toBe(false);
    });

    test('SKILL.md symlink into a cavestack-SUBSTRING path (cavestack-fork) → kept and listed', () => {
      // DM5: the shape-2 gate must match "cavestack" as an anchored path
      // segment, not a substring — a user's own skill whose SKILL.md links
      // into ~/tools/cavestack-fork/ is NOT ours, even when the dir name
      // collides with a real cavestack skill (here: review, in the inventory).
      // The anchored gate only matches a literal /cavestack/ path segment, so
      // the tmpdir must not carry one (shared-process shard runs can leave
      // $TMPDIR pointing into a cavestack worktree — same hazard as the
      // "pointing elsewhere" test below). Fall back to a fixed neutral root
      // and ASSERT the precondition.
      let neutralRoot = os.tmpdir();
      if (neutralRoot.split(path.sep).includes('cavestack')) neutralRoot = '/private' + path.sep + 'tmp';
      const forkRoot = fs.mkdtempSync(path.join(neutralRoot, 'tools-'));
      expect(forkRoot.split(path.sep).includes('cavestack')).toBe(false);
      const forkSrc = path.join(forkRoot, 'cavestack-fork', 'review');
      fs.mkdirSync(forkSrc, { recursive: true });
      fs.writeFileSync(path.join(forkSrc, 'SKILL.md'), skillMd('review'));
      const dir = path.join(skillsDir, 'review');
      fs.mkdirSync(dir, { recursive: true });
      fs.symlinkSync(path.join(forkSrc, 'SKILL.md'), path.join(dir, 'SKILL.md'));

      try {
        const r = runUninstall();
        expect(r.status).toBe(0);
        expect(fs.existsSync(dir)).toBe(true);
        expect(r.stderr).toContain('left in place');
        expect(r.stderr).toContain(path.join('skills', 'review'));
      } finally {
        fs.rmSync(forkRoot, { recursive: true, force: true });
      }
    });

    test('SKILL.md symlink into cavestack but name NOT in inventory → kept and listed', () => {
      // Shape 2 now carries the same inventory gate as shape 3: a dir whose
      // name setup could never have created is skipped even when its
      // SKILL.md target resolves into the install root.
      const dir = path.join(skillsDir, 'my-custom-wrapper');
      fs.mkdirSync(dir, { recursive: true });
      fs.symlinkSync(path.join(installRoot, 'qa', 'SKILL.md'), path.join(dir, 'SKILL.md'));

      const r = runUninstall();
      expect(r.status).toBe(0);
      expect(fs.existsSync(dir)).toBe(true);
      expect(r.stderr).toContain('my-custom-wrapper');
    });

    test('SKILL.md symlink pointing elsewhere → kept and listed', () => {
      // Target path must not contain a cavestack path segment (the provenance
      // match is anchored: cavestack/*|*/cavestack/*; keeping the stricter
      // no-substring precondition costs nothing) — the suite
      // tmpdir prefix does, so use a separate neutral tmpdir. os.tmpdir()
      // reads $TMPDIR at CALL time, and in shared-process shard runs a
      // neighboring test can leave it pointing at a cavestack-containing path —
      // observed once in a full-suite shard (the "neutral" target then
      // matched the provenance substring and the dir was wrongly deleted by
      // the test's own expectations). Fall back to a fixed neutral root and
      // ASSERT neutrality so the precondition can never silently rot.
      let neutralRoot = os.tmpdir();
      // realpath'd literal /tmp: /private/tmp on macOS, /tmp on Linux. The
      // hardcoded '/private/tmp' fallback ENOENT'd on Linux CI, where the
      // shard runner's TMPDIR is the cavestack-containing path that forces this
      // branch. (Never taken on Windows — its TMPDIR carries no 'cavestack'.)
      if (neutralRoot.includes('cavestack')) neutralRoot = fs.realpathSync('/tmp');
      const neutral = fs.mkdtempSync(path.join(neutralRoot, 'other-skill-src-'));
      expect(neutral.includes('cavestack')).toBe(false);
      const elsewhere = path.join(neutral, 'elsewhere.md');
      fs.writeFileSync(elsewhere, '# not ours\n');
      const dir = path.join(skillsDir, 'someone-elses');
      fs.mkdirSync(dir, { recursive: true });
      fs.symlinkSync(elsewhere, path.join(dir, 'SKILL.md'));

      try {
        const r = runUninstall();
        expect(r.status).toBe(0);
        expect(fs.existsSync(dir)).toBe(true);
        expect(r.stderr).toContain('someone-elses');
      } finally {
        fs.rmSync(neutral, { recursive: true, force: true });
      }
    });
  },
);

describe('every installable skill SKILL.md carries the generated banner (ENG-OV10)', () => {
  // The uninstall provenance gate is only sound if the banner is universal:
  // a bannerless generated skill would be stranded on Windows forever.
  test('all top-level skill SKILL.md files contain the AUTO-GENERATED banner', () => {
    const missing: string[] = [];
    for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const md = path.join(ROOT, entry.name, 'SKILL.md');
      if (!fs.existsSync(md)) continue;
      if (!fs.readFileSync(md, 'utf-8').includes('<!-- AUTO-GENERATED from')) {
        missing.push(entry.name);
      }
    }
    expect(missing).toEqual([]);
  });

  test('the root router SKILL.md carries the banner too (alias copies inherit it)', () => {
    expect(fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8')).toContain(
      '<!-- AUTO-GENERATED from',
    );
  });
});
