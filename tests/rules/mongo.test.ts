import { describe, expect, it } from 'vitest';
import { runRule } from '../helpers/ruleTester';
import { queryInLoop } from '../../src/rules/mongo/queryInLoop';

describe('mongo/queryInLoop', () => {
  it('allows a single query', () => {
    expect(
      runRule(queryInLoop, {
        code: `async function load() { return User.find({ active: true }); }\nconst User = { find(_q: object) { return []; } };`,
      }),
    ).toHaveLength(0);
  });

  it('allows array.find', () => {
    expect(
      runRule(queryInLoop, {
        code: `function pick(items: { id: string }[], id: string) { return items.find((x) => x.id === id); }`,
      }),
    ).toHaveLength(0);
  });

  it('flags Model.find in a for-of', () => {
    expect(
      runRule(queryInLoop, {
        code: `async function load(ids: string[]) { for (const id of ids) { await User.findOne({ id }); } }`,
      }),
    ).toHaveLength(1);
  });

  it('flags Model.find in forEach', () => {
    expect(
      runRule(queryInLoop, {
        code: `function load(ids: string[]) { ids.forEach((id) => { User.findOne({ id }); }); }`,
      }),
    ).toHaveLength(1);
  });
});
