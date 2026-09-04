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
        code: `import type { Request, Response, NextFunction } from 'express';
function getUser(req: Request, res: Response, next: NextFunction) { try { res.json(1); } catch (err) { next(err); } }`,
      }),
    ).toHaveLength(0);
  });

  it('allows rethrow', () => {
    expect(
      runRule(noSwallowedError, {
        code: `import type { Request, Response, NextFunction } from 'express';
function getUser(req: Request, res: Response, next: NextFunction) { try { res.json(1); } catch (err) { throw err; } }`,
      }),
    ).toHaveLength(0);
  });

  it('flags empty catch in handler', () => {
    expect(
      runRule(noSwallowedError, {
        code: `import type { Request, Response, NextFunction } from 'express';
function getUser(req: Request, res: Response, next: NextFunction) { try { res.json(1); } catch (err) {} }`,
      }),
    ).toHaveLength(1);
  });

  it('flags catch that only logs', () => {
    expect(
      runRule(noSwallowedError, {
        code: `import type { Request, Response } from 'express';
function getUser(req: Request, res: Response) { try { res.json(1); } catch (err) { console.log(err); } }`,
      }),
    ).toHaveLength(1);
  });
});

describe('express/missingAsyncErrorHandling', () => {
  it('allows awaited work in try/catch', () => {
    expect(
      runRule(missingAsyncErrorHandling, {
        code: `import type { Request, Response, NextFunction } from 'express';
async function getUser(req: Request, res: Response, next: NextFunction) { try { await load(); res.json(1); } catch (err) { next(err); } }
async function load() {}`,
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
        code: `import type { Request, Response } from 'express';
async function getUser(req: Request, res: Response) { const user = await load(); res.json(user); }
async function load() { return 1; }`,
      }),
    ).toHaveLength(1);
  });

  it('allows await without try when the handler is passed to asyncHandler', () => {
    expect(
      runRule(missingAsyncErrorHandling, {
        code: `import type { Request, Response } from 'express';
async function login(req: Request, res: Response) { const user = await load(); res.json(user); }
asyncHandler(login);
asyncHandler(authController.refresh);
async function load() { return 1; }
function asyncHandler(_fn: unknown) { return _fn; }
const authController = { refresh() {} };
`,
      }),
    ).toHaveLength(0);
  });

  it('flags multiple uncovered awaits', () => {
    expect(
      runRule(missingAsyncErrorHandling, {
        code: `import type { Request, Response } from 'express';
async function getUser(req: Request, res: Response) { await a(); await b(); res.end(); }
async function a() {}
async function b() {}`,
      }).length,
    ).toBeGreaterThan(0);
  });
});

describe('express/noResponseMissing', () => {
  it('allows res.json', () => {
    expect(
      runRule(noResponseMissing, {
        code: `import type { Request, Response } from 'express';
function getUser(req: Request, res: Response) { res.json({ ok: true }); }`,
      }),
    ).toHaveLength(0);
  });

  it('allows next()', () => {
    expect(
      runRule(noResponseMissing, {
        code: `import type { Request, Response, NextFunction } from 'express';
function getUser(req: Request, res: Response, next: NextFunction) { next(); }`,
      }),
    ).toHaveLength(0);
  });

  it('flags handler with no response', () => {
    expect(
      runRule(noResponseMissing, {
        code: `import type { Request, Response } from 'express';
function getUser(req: Request, res: Response) { const id = req.params.id; }`,
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

  it('ignores req/res helpers in files that do not import express', () => {
    expect(
      runRule(noResponseMissing, {
        code: `function copy(req, res) { const id = req.id; return id; }`,
      }),
    ).toHaveLength(0);
  });

  it('allows an asyncHandler wrapper that forwards to next via catch', () => {
    expect(
      runRule(noResponseMissing, {
        filename: 'asyncHandler.ts',
        code: `import type { NextFunction, Request, Response } from 'express';
export function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res, next).catch(next);
  };
}
`,
      }),
    ).toHaveLength(0);
  });
});
