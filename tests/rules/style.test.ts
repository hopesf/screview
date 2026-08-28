import { describe, expect, it } from 'vitest';
import { runRule } from '../helpers/ruleTester';
import { noVar } from '../../src/rules/style/noVar';
import { eqeqeq } from '../../src/rules/style/eqeqeq';
import { noRequire } from '../../src/rules/style/noRequire';
import { noExplicitAny } from '../../src/rules/style/noExplicitAny';
import { noTsIgnore } from '../../src/rules/style/noTsIgnore';
import { genericFunctionName } from '../../src/rules/naming/genericFunctionName';
import { getWithoutReturn } from '../../src/rules/naming/getWithoutReturn';

describe('style/no-var', () => {
  it('allows let and const', () => {
    expect(runRule(noVar, { code: `let a = 1; const b = 2;` })).toHaveLength(0);
  });

  it('flags var', () => {
    expect(runRule(noVar, { code: `var a = 1;` })).toHaveLength(1);
  });
});

describe('style/eqeqeq', () => {
  it('allows ===', () => {
    expect(runRule(eqeqeq, { code: `const ok = a === 1; const a = 1;` })).toHaveLength(0);
  });

  it('flags ==', () => {
    expect(runRule(eqeqeq, { code: `const a = 1; const ok = a == 1;` })).toHaveLength(1);
  });
});

describe('style/no-require', () => {
  it('allows import', () => {
    expect(runRule(noRequire, { code: `import fs from 'node:fs';` })).toHaveLength(0);
  });

  it('flags require', () => {
    expect(runRule(noRequire, { code: `const fs = require('fs');` })).toHaveLength(1);
  });
});

describe('style/no-explicit-any', () => {
  it('allows unknown', () => {
    expect(runRule(noExplicitAny, { code: `function f(x: unknown) { return x; }` })).toHaveLength(0);
  });

  it('flags any', () => {
    expect(runRule(noExplicitAny, { code: `function f(x: any) { return x; }` })).toHaveLength(1);
  });
});

describe('style/no-ts-ignore', () => {
  it('allows clean code', () => {
    expect(runRule(noTsIgnore, { code: `const n = 1;` })).toHaveLength(0);
  });

  it('flags @ts-ignore', () => {
    expect(
      runRule(noTsIgnore, {
        code: `// @ts-ignore
const n = 1;`,
      }),
    ).toHaveLength(1);
  });
});

describe('naming/generic-function', () => {
  it('allows a descriptive name', () => {
    expect(runRule(genericFunctionName, { code: `function loadUser() { return 1; }` })).toHaveLength(0);
  });

  it('flags foo', () => {
    expect(runRule(genericFunctionName, { code: `function foo() { return 1; }` })).toHaveLength(1);
  });

  it('flags snake_case names', () => {
    expect(runRule(genericFunctionName, { code: `function load_user() { return 1; }` })).toHaveLength(1);
  });
});

describe('naming/get-without-return', () => {
  it('allows a real getter', () => {
    expect(runRule(getWithoutReturn, { code: `function getUser() { return 1; }` })).toHaveLength(0);
  });

  it('flags getX with no return', () => {
    expect(runRule(getWithoutReturn, { code: `function getUser() { console.log(1); }` })).toHaveLength(1);
  });
});
