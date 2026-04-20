import { describe, test, expect } from 'bun:test';
import * as path from 'path';
import { TEMP_DIR, isPathWithin, IS_WINDOWS } from '../src/platform';

describe('platform constants', () => {
  test('TEMP_DIR is /tmp on non-Windows', () => {
    if (!IS_WINDOWS) {
      expect(TEMP_DIR).toBe('/tmp');
    }
  });

  test('IS_WINDOWS reflects process.platform', () => {
    expect(IS_WINDOWS).toBe(process.platform === 'win32');
  });
});

// isPathWithin compares strings using path.sep; tests use platform-correct separators.
const ROOT = IS_WINDOWS ? 'C:\\tmp' : '/tmp';
const j = (...parts: string[]) => parts.join(path.sep);

describe('isPathWithin', () => {
  test('path inside directory returns true', () => {
    expect(isPathWithin(j(ROOT, 'foo'), ROOT)).toBe(true);
  });

  test('path outside directory returns false', () => {
    const other = IS_WINDOWS ? 'D:\\etc\\foo' : '/etc/foo';
    expect(isPathWithin(other, ROOT)).toBe(false);
  });

  test('exact match returns true', () => {
    expect(isPathWithin(ROOT, ROOT)).toBe(true);
  });

  test('partial prefix does not match (path traversal)', () => {
    // /tmp-evil should NOT match /tmp
    const evil = IS_WINDOWS ? 'C:\\tmp-evil\\foo' : '/tmp-evil/foo';
    expect(isPathWithin(evil, ROOT)).toBe(false);
  });

  test('nested path returns true', () => {
    expect(isPathWithin(j(ROOT, 'a', 'b', 'c'), ROOT)).toBe(true);
  });
});
