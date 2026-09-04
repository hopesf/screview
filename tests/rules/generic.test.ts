import { describe, expect, it } from 'vitest';
import { runRule } from '../helpers/ruleTester';
import { awaitInLoop } from '../../src/rules/generic/awaitInLoop';
import { emptyCatch } from '../../src/rules/generic/emptyCatch';
import { floatingPromise } from '../../src/rules/generic/floatingPromise';
import { syncFsInHandler } from '../../src/rules/generic/syncFsInHandler';
import { unusedImport } from '../../src/rules/generic/unusedImport';
import { unusedLocal } from '../../src/rules/generic/unusedLocal';
import { leftoverDebugger } from '../../src/rules/generic/debugger';

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

  it('allows sequential await that depends on the previous result', () => {
    expect(
      runRule(awaitInLoop, {
        code: `async function walk(start: string) {
  let cursor = start;
  while (cursor) {
    const page = await fetchPage(cursor);
    cursor = page.next;
  }
}
async function fetchPage(_id: string): Promise<{ next: string }> { return { next: '' }; }
`,
      }),
    ).toHaveLength(0);
  });

  it('allows a retry loop with backoff', () => {
    expect(
      runRule(awaitInLoop, {
        code: `async function connect(retries = 10) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri);
      return;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
const mongoose = { connect(_u: string) { return Promise.resolve(); } };
const uri = '';
`,
      }),
    ).toHaveLength(0);
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

describe('generic/sync-fs-in-handler', () => {
  it('flags existsSync in a controller file', () => {
    expect(
      runRule(syncFsInHandler, {
        filename: 'catalog.controller.ts',
        code: `import fs from 'node:fs';
function removeFile(filePath: string) {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}
`,
      }),
    ).not.toHaveLength(0);
  });

  it('flags readFileSync inside an Express handler', () => {
    expect(
      runRule(syncFsInHandler, {
        filename: 'userService.ts',
        code: `import fs from 'node:fs';
import type { Request, Response } from 'express';
function getUser(req: Request, res: Response) {
  const raw = fs.readFileSync('user.json', 'utf8');
  res.json(raw);
}
`,
      }),
    ).toHaveLength(1);
  });

  it('allows sync fs outside request handlers', () => {
    expect(
      runRule(syncFsInHandler, {
        filename: 'db.ts',
        code: `import fs from 'node:fs';
export function loadEnv() {
  if (fs.existsSync('.env')) return fs.readFileSync('.env', 'utf8');
  return '';
}
`,
      }),
    ).toHaveLength(0);
  });

  it('allows sync fs in seed scripts', () => {
    expect(
      runRule(syncFsInHandler, {
        filename: 'scripts/seed-content.ts',
        code: `import fs from 'node:fs';
if (!fs.existsSync('./data')) fs.mkdirSync('./data');
`,
      }),
    ).toHaveLength(0);
  });
});

describe('generic/unused-import', () => {
  it('allows a used named import', () => {
    expect(
      runRule(unusedImport, {
        code: `import { join } from 'node:path';
export const p = join('a', 'b');
`,
      }),
    ).toHaveLength(0);
  });

  it('flags a named import that is never referenced', () => {
    expect(
      runRule(unusedImport, {
        code: `import { join } from 'node:path';
export const p = 'a';
`,
      }),
    ).toHaveLength(1);
  });

  it('keeps side-effect imports', () => {
    expect(
      runRule(unusedImport, {
        code: `import './polyfill';
export const n = 1;
`,
      }),
    ).toHaveLength(0);
  });
});

describe('generic/unused-local', () => {
  it('allows a used variable', () => {
    expect(
      runRule(unusedLocal, {
        code: `export function add(a: number, b: number) { return a + b; }`,
      }),
    ).toHaveLength(0);
  });

  it('flags a catch parameter that is never used', () => {
    expect(
      runRule(unusedLocal, {
        code: `export function load() {
  try { return 1; } catch (error) { return 0; }
}
`,
      }),
    ).toHaveLength(1);
  });

  it('ignores params named req/res/next and underscore names', () => {
    expect(
      runRule(unusedLocal, {
        code: `export function getHome(req: unknown, res: unknown, next: unknown, _skip: number) {
  return 1;
}
`,
      }),
    ).toHaveLength(0);
  });

  it('flags an unused param even if another function uses the same name', () => {
    expect(
      runRule(unusedLocal, {
        code: `class Modal {
  first(config: object) { return 1; }
  second(config: object) { return config; }
}
`,
      }),
    ).toHaveLength(1);
  });

  it('ignores TypeScript parameter properties', () => {
    expect(
      runRule(unusedLocal, {
        code: `class ModalService {
  constructor(private appRef: object, private injector: object) {}
  ping() { return 1; }
}
`,
      }),
    ).toHaveLength(0);
  });
});

describe('generic/debugger', () => {
  it('allows code without debugger', () => {
    expect(runRule(leftoverDebugger, { code: `export const n = 1;` })).toHaveLength(0);
  });

  it('flags debugger leftover', () => {
    expect(runRule(leftoverDebugger, { code: `export function f() { debugger; }` })).toHaveLength(1);
  });
});
