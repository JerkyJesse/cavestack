import { describe, expect, test } from 'bun:test';
import { getHostConfig } from '../hosts/index';
import { isPrimaryHostSkippedOutput } from '../scripts/skill-check';

describe('skill-check skipSkills', () => {
  test('claude/SKILL.md is skipped on the primary host, not treated as missing', () => {
    const skipped = new Set(getHostConfig('claude').generation.skipSkills ?? []);
    expect(skipped.has('claude')).toBe(true);
    expect(isPrimaryHostSkippedOutput('claude/SKILL.md')).toBe(true);
    expect(isPrimaryHostSkippedOutput('qa/SKILL.md')).toBe(false);
    expect(isPrimaryHostSkippedOutput('SKILL.md')).toBe(false);
  });
});
