import { describe, expect, it } from 'vitest';
import { runRule } from '../helpers/ruleTester';
import { noSwallowedError } from '../../src/rules/express/noSwallowedError';
import { missingAsyncErrorHandling } from '../../src/rules/express/missingAsyncErrorHandling';
import { noResponseMissing } from '../../src/rules/express/noResponseMissing';

describe('express/noSwallowedError', () => {
  it('allows next(err)', () => {
    expect(
      runRule(noSwallowedError, {
        filename: 'user.controller.ts',
        code: `function getUser(req, res, next) { try { res.json(1); } catch (err) { next(err); } }`,
      }),
    ).toHaveLength(0);
  });

  it('allows rethrow', () => {
    expect(
      runRule(noSwallowedError, {
        code: `function getUser(req, res, next) { try { res.json(1); } catch (err) { throw err; } }`,
      }),
    ).toHaveLength(0);
  });

  it('flags empty catch in handler', () => {
    expect(
      runRule(noSwallowedError, {
        code: `function getUser(req, res, next) { try { res.json(1); } catch (err) {} }`,
      }),
    ).toHaveLength(1);
  });

  it('flags catch that only logs', () => {
    expect(
      runRule(noSwallowedError, {
        code: `function getUser(req, res) { try { res.json(1); } catch (err) { console.log(err); } }`,
      }),
    ).toHaveLength(1);
  });
});

describe('express/missingAsyncErrorHandling', () => {
  it('allows awaited work in try/catch', () => {
    expect(
      runRule(missingAsyncErrorHandling, {
        code: `async function getUser(req, res, next) { try { await load(); res.json(1); } catch (err) { next(err); } }\nasync function load() {}`,
      }),
    ).toHaveLength(0);
  });

  it('ignores non-handlers', () => {
    expect(
      runRule(missingAsyncErrorHandling, {
        code: `async function load() { await fetch('/'); }`,
      }),
    ).toHaveLength(0);
  });

  it('flags await without try', () => {
    expect(
      runRule(missingAsyncErrorHandling, {
        code: `async function getUser(req, res) { const user = await load(); res.json(user); }\nasync function load() { return 1; }`,
      }),
    ).toHaveLength(1);
  });

  it('flags multiple uncovered awaits', () => {
    expect(
      runRule(missingAsyncErrorHandling, {
        code: `async function getUser(req, res) { await a(); await b(); res.end(); }\nasync function a() {}\nasync function b() {}`,
      }).length,
    ).toBeGreaterThan(0);
  });
});

describe('express/noResponseMissing', () => {
  it('allows res.json', () => {
    expect(
      runRule(noResponseMissing, {
        code: `function getUser(req, res) { res.json({ ok: true }); }`,
      }),
    ).toHaveLength(0);
  });

  it('allows next()', () => {
    expect(
      runRule(noResponseMissing, {
        code: `function getUser(req, res, next) { next(); }`,
      }),
    ).toHaveLength(0);
  });

  it('flags handler with no response', () => {
    expect(
      runRule(noResponseMissing, {
        code: `function getUser(req, res) { const id = req.params.id; }`,
      }),
    ).toHaveLength(1);
  });

  it('ignores helpers that are not handlers', () => {
    expect(
      runRule(noResponseMissing, {
        code: `function add(a: number, b: number) { return a + b; }`,
      }),
    ).toHaveLength(0);
  });
});
