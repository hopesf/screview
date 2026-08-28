import { describe, expect, it } from 'vitest';
import { runRule } from '../helpers/ruleTester';
import { awaitInLoop } from '../../src/rules/generic/awaitInLoop';
import { emptyCatch } from '../../src/rules/generic/emptyCatch';
import { floatingPromise } from '../../src/rules/generic/floatingPromise';

describe('generic/awaitInLoop', () => {
  it('allows await outside loops', () => {
    expect(
      runRule(awaitInLoop, {
        code: `async function load() { await fetch('/a'); }`,
      }),
    ).toHaveLength(0);
  });

  it('allows for-await-of', () => {
    expect(
      runRule(awaitInLoop, {
        code: `async function load(items: AsyncIterable<number>) { for await (const x of items) { use(x); } }\nfunction use(_x: number) {}`,
      }),
    ).toHaveLength(0);
  });

  it('flags await in for-of', () => {
    const findings = runRule(awaitInLoop, {
      code: `async function load(ids: string[]) { for (const id of ids) { await fetch(id); } }`,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe('generic/await-in-loop');
  });

  it('flags await in forEach', () => {
    expect(
      runRule(awaitInLoop, {
        code: `async function load(ids: string[]) { ids.forEach(async (id) => { await fetch(id); }); }`,
      }),
    ).toHaveLength(1);
  });
});

describe('generic/emptyCatch', () => {
  it('allows catch that rethrows', () => {
    expect(
      runRule(emptyCatch, {
        code: `try { run(); } catch (err) { throw err; }\nfunction run() {}`,
      }),
    ).toHaveLength(0);
  });

  it('allows catch that handles', () => {
    expect(
      runRule(emptyCatch, {
        code: `try { run(); } catch (err) { report(err); }\nfunction run() {}\nfunction report(_e: unknown) {}`,
      }),
    ).toHaveLength(0);
  });

  it('flags empty catch', () => {
    expect(
      runRule(emptyCatch, {
        code: `try { run(); } catch { }\nfunction run() {}`,
      }),
    ).toHaveLength(1);
  });

  it('flags console-only catch', () => {
    expect(
      runRule(emptyCatch, {
        code: `try { run(); } catch (err) { console.log(err); }\nfunction run() {}`,
      }),
    ).toHaveLength(1);
  });
});

describe('generic/floatingPromise', () => {
  it('allows awaited calls', () => {
    expect(
      runRule(floatingPromise, {
        code: `async function save() {}\nasync function run() { await save(); }`,
      }),
    ).toHaveLength(0);
  });

  it('allows voided calls', () => {
    expect(
      runRule(floatingPromise, {
        code: `async function save() {}\nfunction run() { void save(); }`,
      }),
    ).toHaveLength(0);
  });

  it('flags floating async call', () => {
    expect(
      runRule(floatingPromise, {
        code: `async function save() {}\nfunction run() { save(); }`,
      }),
    ).toHaveLength(1);
  });

  it('flags floating async method', () => {
    expect(
      runRule(floatingPromise, {
        code: `class Store { async save() {} run() { this.save(); } }`,
      }),
    ).toHaveLength(1);
  });
});
