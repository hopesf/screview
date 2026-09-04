import { describe, expect, it } from 'vitest';
import { explainRule } from '../../src/core/explain';

describe('explainRule', () => {
  it('returns docs for a known visitor rule', () => {
    const text = explainRule('generic/empty-catch');
    expect(text).toContain('generic/empty-catch');
    expect(text).toContain('Empty catch');
  });

  it('returns docs for a program rule', () => {
    const text = explainRule('db/unused-field');
    expect(text).toContain('db/unused-field');
  });

  it('returns undefined for an unknown id', () => {
    expect(explainRule('nope/missing')).toBeUndefined();
  });
});
