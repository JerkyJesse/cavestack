import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');

const OPENCLAW_NATIVE_SKILLS = [
  'openclaw/skills/cavestack-openclaw-investigate/SKILL.md',
  'openclaw/skills/cavestack-openclaw-office-hours/SKILL.md',
  'openclaw/skills/cavestack-openclaw-ceo-review/SKILL.md',
  'openclaw/skills/cavestack-openclaw-retro/SKILL.md',
];

function extractFrontmatter(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  expect(normalized.startsWith('---\n')).toBe(true);
  const fmEnd = normalized.indexOf('\n---', 4);
  expect(fmEnd).toBeGreaterThan(0);
  return normalized.slice(4, fmEnd);
}

describe('OpenClaw native skills', () => {
  test('frontmatter parses as YAML and keeps only name + description', () => {
    for (const skill of OPENCLAW_NATIVE_SKILLS) {
      const content = fs.readFileSync(path.join(ROOT, skill), 'utf-8');
      const frontmatter = extractFrontmatter(content);
      const parsed = Bun.YAML.parse(frontmatter) as Record<string, unknown>;

      expect(Object.keys(parsed).sort()).toEqual(['description', 'name']);
      expect(typeof parsed.name).toBe('string');
      expect(typeof parsed.description).toBe('string');
      expect((parsed.name as string).length).toBeGreaterThan(0);
      expect((parsed.description as string).length).toBeGreaterThan(0);
    }
  });
});
