import { describe, expect, it } from 'vitest';
import { runRule } from '../helpers/ruleTester';
import { queryInLoop } from '../../src/rules/mongo/queryInLoop';
import { missingLean } from '../../src/rules/mongo/missingLean';
import { unboundedFind } from '../../src/rules/mongo/unboundedFind';

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

  it('does not flag document.save in a loop', () => {
    expect(
      runRule(queryInLoop, {
        code: `async function persist(users: { save(): Promise<void> }[]) { for (const user of users) { await user.save(); } }`,
      }),
    ).toHaveLength(0);
  });

  it('still flags findOne in a loop that collects hits', () => {
    expect(
      runRule(queryInLoop, {
        code: `async function load(ids: string[]) {
  const out = [];
  for (const id of ids) {
    const user = await User.findOne({ id });
    if (user) out.push(user);
  }
  return out;
}`,
      }),
    ).toHaveLength(1);
  });

  it('allows sequential alias lookup that returns on the first hit', () => {
    expect(
      runRule(queryInLoop, {
        code: `async function byAlias(ids: string[]) {
  for (const id of ids) {
    const user = await User.findOne({ id });
    if (user) return user;
  }
  return null;
}`,
      }),
    ).toHaveLength(0);
  });

  it('flags this.repo.findOne over a result set', () => {
    expect(
      runRule(queryInLoop, {
        code: `async function load(this: { users: { findOne(q: object): Promise<unknown> } }, ids: string[]) {
  for (const id of ids) {
    await this.users.findOne({ id });
  }
}`,
      }),
    ).toHaveLength(1);
  });

  it('flags camelCase repository.findOne in a for-of', () => {
    expect(
      runRule(queryInLoop, {
        code: `async function load(ids: string[], userRepository: { findOne(q: object): Promise<unknown> }) {
  for (const id of ids) {
    await userRepository.findOne({ id });
  }
}`,
      }),
    ).toHaveLength(1);
  });

  it('flags deviceService.getX over a result set', () => {
    expect(
      runRule(queryInLoop, {
        code: `async function load(ids: string[], deviceService: { getDeviceByDeviceId(id: string): Promise<unknown> }) {
  for (const id of ids) {
    await deviceService.getDeviceByDeviceId(id);
  }
}`,
      }),
    ).toHaveLength(1);
  });

  it('allows sequential service alias lookup that returns on the first hit', () => {
    expect(
      runRule(queryInLoop, {
        code: `async function byAlias(ids: string[], deviceService: { getDeviceByDeviceId(id: string): Promise<unknown> }) {
  for (const id of ids) {
    const device = await deviceService.getDeviceByDeviceId(id);
    if (device) return device;
  }
  return null;
}`,
      }),
    ).toHaveLength(0);
  });
});

describe('mongo/missingLean', () => {
  it('allows find().limit().lean()', () => {
    expect(
      runRule(missingLean, {
        code: `async function load() { return User.find({ active: true }).limit(50).lean(); }`,
      }),
    ).toHaveLength(0);
  });

  it('allows array.find', () => {
    expect(
      runRule(missingLean, {
        code: `function pick(items: { id: string }[], id: string) { return items.find((x) => x.id === id); }`,
      }),
    ).toHaveLength(0);
  });

  it('allows findOne without lean', () => {
    expect(
      runRule(missingLean, {
        code: `async function load() { return User.findOne({ id: '1' }); }`,
      }),
    ).toHaveLength(0);
  });

  it('flags User.find without lean', () => {
    expect(
      runRule(missingLean, {
        code: `async function load() { return User.find({ active: true }).limit(50); }`,
      }),
    ).toHaveLength(1);
  });

  it('flags this.model.find without lean', () => {
    expect(
      runRule(missingLean, {
        code: `async function load(this: { model: { find(q: object): { lean(): Promise<unknown[]> } } }) {
  return this.model.find({ active: true });
}`,
      }),
    ).toHaveLength(1);
  });
});

describe('mongo/unboundedFind', () => {
  it('allows find().limit()', () => {
    expect(
      runRule(unboundedFind, {
        code: `async function load() { return User.find({ active: true }).limit(50).lean(); }`,
      }),
    ).toHaveLength(0);
  });

  it('allows find().cursor()', () => {
    expect(
      runRule(unboundedFind, {
        code: `function load() { return User.find({ active: true }).cursor(); }`,
      }),
    ).toHaveLength(0);
  });

  it('allows find with a limit option', () => {
    expect(
      runRule(unboundedFind, {
        code: `async function load() { return User.find({ active: true }, null, { limit: 50 }); }`,
      }),
    ).toHaveLength(0);
  });

  it('allows findOne', () => {
    expect(
      runRule(unboundedFind, {
        code: `async function load() { return User.findOne({ id: '1' }); }`,
      }),
    ).toHaveLength(0);
  });

  it('flags User.find with no limit', () => {
    expect(
      runRule(unboundedFind, {
        code: `async function load() { return User.find({ active: true }).lean(); }`,
      }),
    ).toHaveLength(1);
  });
});
