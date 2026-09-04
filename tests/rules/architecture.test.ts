import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { audit } from '../../src/audit';

function app(deps: Record<string, string> = {}): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-arch-'));
  mkdirSync(path.join(dir, 'src'));
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app', dependencies: deps }));
  writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
  return dir;
}

describe('structure/import-cycle', () => {
  it('allows a one-way import', async () => {
    const dir = app();
    writeFileSync(path.join(dir, 'src/a.ts'), `import { b } from './b.js';\nexport const a = b;\n`);
    writeFileSync(path.join(dir, 'src/b.ts'), `export const b = 1;\n`);
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId === 'structure/import-cycle')).toBe(false);
  });

  it('flags a two-file import cycle', async () => {
    const dir = app();
    writeFileSync(path.join(dir, 'src/a.ts'), `import { b } from './b.js';\nexport const a = b;\n`);
    writeFileSync(path.join(dir, 'src/b.ts'), `import { a } from './a.js';\nexport const b = a;\n`);
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId === 'structure/import-cycle')).toBe(true);
  });

  it('ignores type-only import cycles', async () => {
    const dir = app();
    writeFileSync(path.join(dir, 'src/a.ts'), `import type { B } from './b.js';\nexport type A = B;\n`);
    writeFileSync(path.join(dir, 'src/b.ts'), `import type { A } from './a.js';\nexport type B = A;\n`);
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId === 'structure/import-cycle')).toBe(false);
  });
});

describe('structure/duplicate-type', () => {
  it('allows the same shape declared once', async () => {
    const dir = app();
    writeFileSync(path.join(dir, 'src/a.ts'), `export interface User { name: string }\n`);
    writeFileSync(path.join(dir, 'src/b.ts'), `export interface Order { id: string }\n`);
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId === 'structure/duplicate-type')).toBe(false);
  });

  it('flags two User types with different fields', async () => {
    const dir = app();
    writeFileSync(path.join(dir, 'src/a.ts'), `export interface User { name: string }\n`);
    writeFileSync(path.join(dir, 'src/b.ts'), `export interface User { email: string }\n`);
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId === 'structure/duplicate-type')).toBe(true);
  });

  it('allows the same User shape in two files', async () => {
    const dir = app();
    writeFileSync(path.join(dir, 'src/a.ts'), `export interface User { name: string }\n`);
    writeFileSync(path.join(dir, 'src/b.ts'), `export interface User { name: string }\n`);
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId === 'structure/duplicate-type')).toBe(false);
  });
});

describe('structure/orphan-file', () => {
  it('flags a source file that nothing imports', async () => {
    const dir = app();
    writeFileSync(path.join(dir, 'src/index.ts'), `import { a } from './a.js';\nexport const n = a;\n`);
    writeFileSync(path.join(dir, 'src/a.ts'), `export const a = 1;\n`);
    writeFileSync(path.join(dir, 'src/leftover.ts'), `export const leftover = 1;\n`);
    const result = await audit(['src'], { cwd: dir });
    expect(
      result.findings.some((f) => f.ruleId === 'structure/orphan-file' && f.file.includes('leftover')),
    ).toBe(true);
  });

  it('keeps a file reached through export-from', async () => {
    const dir = app();
    writeFileSync(path.join(dir, 'src/public-api.ts'), `export * from './lib.js';\n`);
    writeFileSync(path.join(dir, 'src/lib.ts'), `export const lib = 1;\n`);
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId === 'structure/orphan-file')).toBe(false);
  });

  it('keeps a file loaded with dynamic import', async () => {
    const dir = app();
    writeFileSync(
      path.join(dir, 'src/index.ts'),
      `export async function load() { return import('./lazy.js'); }\n`,
    );
    writeFileSync(path.join(dir, 'src/lazy.ts'), `export const lazy = 1;\n`);
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId === 'structure/orphan-file')).toBe(false);
  });
});
