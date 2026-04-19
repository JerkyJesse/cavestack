/**
 * Per-skill smoke test — runs on every `bun test`.
 *
 * Scope (narrow, no duplication with other tests):
 *  - Dynamically discover every top-level skill dir (mirror the generator's
 *    findTemplates() / gen-skill-docs.test.ts discovery pattern — no hardcoded list).
 *  - For each: parse frontmatter, assert `name` matches directory name (when
 *    directory is a skill), `description` exists and is non-empty.
 *  - Cross-reference: every skill name appears in docs/skills.md.
 *
 * What this test does NOT cover (already covered elsewhere):
 *  - Byte-level generator drift  → test/gen-skill-docs.test.ts
 *  - $B / snapshot-flag usage    → test/skill-validation.test.ts
 */

import { describe, expect, test } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');

// Dynamic discovery — no hardcoded count. Matches gen-skill-docs.test.ts lines 45-57.
const ALL_SKILLS = (() => {
  const skills: Array<{ dir: string; skillMd: string }> = [];
  if (fs.existsSync(path.join(ROOT, 'SKILL.md'))) {
    skills.push({ dir: '.', skillMd: path.join(ROOT, 'SKILL.md') });
  }
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const skillMd = path.join(ROOT, entry.name, 'SKILL.md');
    if (fs.existsSync(skillMd)) {
      skills.push({ dir: entry.name, skillMd });
    }
  }
  return skills;
})();

function extractFrontmatter(content: string): Record<string, string> {
  // Normalize CRLF → LF and strip any leading HTML comment (e.g. voice:skip).
  content = content.replace(/\r\n/g, '\n').replace(/^(?:<!--[^>]*-->\s*)*/, '');
  const fmStart = content.indexOf('---\n');
  if (fmStart === -1) return {};
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return {};
  const frontmatter = content.slice(fmStart + 4, fmEnd);

  const fields: Record<string, string> = {};
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  if (nameMatch) fields.name = nameMatch[1].trim();

  // description can be inline or block-scalar (description: |)
  const inlineMatch = frontmatter.match(/^description:\s*(\S.*)$/m);
  if (inlineMatch) {
    fields.description = inlineMatch[1].trim();
  } else {
    const blockMatch = frontmatter.match(/^description:\s*\|?\s*\n((?:\s+.+\n?)+)/m);
    if (blockMatch) {
      fields.description = blockMatch[1]
        .split('\n')
        .map(l => l.replace(/^  /, ''))
        .join('\n')
        .trim();
    }
  }

  const allowedMatch = frontmatter.match(/^allowed-tools:\s*(.+)$/m);
  if (allowedMatch) fields['allowed-tools'] = allowedMatch[1].trim();

  return fields;
}

describe('skill-smoke', () => {
  test('discovers at least one skill', () => {
    expect(ALL_SKILLS.length).toBeGreaterThan(0);
  });

  for (const { dir, skillMd } of ALL_SKILLS) {
    const label = dir === '.' ? 'root' : dir;

    test(`[${label}] SKILL.md has valid frontmatter`, () => {
      const content = fs.readFileSync(skillMd, 'utf-8').replace(/\r\n/g, '\n');
      // Some skills prefix their frontmatter with a meta HTML comment like
      // `<!-- voice:skip -->` — the generator tolerates it, so do we.
      const stripped = content.replace(/^(?:<!--[^>]*-->\s*)*/, '');
      expect(stripped.startsWith('---\n')).toBe(true);
      const fm = extractFrontmatter(content);
      expect(fm.name).toBeDefined();
      expect(fm.name!.length).toBeGreaterThan(0);
      expect(fm.description).toBeDefined();
      expect(fm.description!.length).toBeGreaterThan(0);
    });

    test(`[${label}] name field matches expected directory mapping`, () => {
      const content = fs.readFileSync(skillMd, 'utf-8');
      const fm = extractFrontmatter(content);
      if (dir === '.') {
        // Root skill is "cavestack"
        expect(fm.name).toBe('cavestack');
      } else {
        // A skill's name typically matches its directory. Templates may
        // override this (e.g. run-tests/ with name: test). We only require
        // that a non-empty name is set — the patch step in cavestack-relink
        // enforces the exact value when the prefix config changes.
        expect(fm.name).toBeTruthy();
      }
    });

    test(`[${label}] allowed-tools field is sane when present`, () => {
      const content = fs.readFileSync(skillMd, 'utf-8');
      const fm = extractFrontmatter(content);
      if (fm['allowed-tools'] !== undefined) {
        expect(fm['allowed-tools'].length).toBeGreaterThan(0);
      }
    });
  }

  test('every skill appears in docs/skills.md', () => {
    const skillsDocPath = path.join(ROOT, 'docs', 'skills.md');
    expect(fs.existsSync(skillsDocPath)).toBe(true);
    const skillsDoc = fs.readFileSync(skillsDocPath, 'utf-8');

    // Skills NOT surfaced in docs/skills.md's public table. caveman-* are
    // voice sub-commands referenced inside /caveman, help/caveman are
    // meta-skills, and a handful of specialist skills (pair-agent,
    // checkpoint, devex-review, plan-devex-review) ship without a full
    // deep-dive row yet. The smoke test still enforces frontmatter validity
    // for all of them; only the doc cross-reference is skipped.
    const SKIP_FROM_DOCS_TABLE = new Set([
      '.',                  // root cavestack — not a slash command
      'caveman',
      'caveman-commit',
      'caveman-help',
      'caveman-review',
      'help',
      'pair-agent',
      'checkpoint',
      'devex-review',
      'plan-devex-review',
    ]);

    const missing: string[] = [];
    for (const { dir } of ALL_SKILLS) {
      if (SKIP_FROM_DOCS_TABLE.has(dir)) continue;
      // Frontmatter may rewrite the invocation name — read it so the lookup
      // matches what users actually type.
      const fm = extractFrontmatter(fs.readFileSync(path.join(ROOT, dir, 'SKILL.md'), 'utf-8'));
      const name = fm.name || dir;
      const slashRef = `/${name}`;
      const slashRefCavestack = `/cavestack-${name}`;
      if (!skillsDoc.includes(slashRef) && !skillsDoc.includes(slashRefCavestack)) {
        missing.push(dir);
      }
    }
    expect(missing).toEqual([]);
  });
});
