import { describe, expect, it } from 'vitest';
import { resolveScanPaths } from '../../src/core/scanPaths';

describe('resolveScanPaths', () => {
  it('treats run and check as verbs, not folders', () => {
    expect(resolveScanPaths(['run'])).toEqual([]);
    expect(resolveScanPaths(['check'])).toEqual([]);
  });

  it('lets run take an optional path', () => {
    expect(resolveScanPaths(['run', 'lib'])).toEqual(['lib']);
  });

  it('keeps a real path as a path', () => {
    expect(resolveScanPaths(['src'])).toEqual(['src']);
  });
});
