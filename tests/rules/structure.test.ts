import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { audit } from '../../src/audit';

describe('structure', () => {
  it('flags junk filenames', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-struct-'));
    const src = path.join(dir, 'src');
    mkdirSync(src);
    writeFileSync(path.join(src, 'temp.ts'), 'export const n = 1;\n');
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId === 'structure/junk-filename')).toBe(true);
  });

  it('allows kebab-case when that is the project convention', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-case-'));
    const src = path.join(dir, 'src');
    mkdirSync(src);
    writeFileSync(path.join(src, 'user-service.ts'), 'export const n = 1;\n');
    writeFileSync(path.join(src, 'user-card.ts'), 'export const n = 1;\n');
    writeFileSync(path.join(src, 'user-list.ts'), 'export const n = 1;\n');
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId === 'structure/file-case')).toBe(false);
  });

  it('allows camelCase and Angular dotted names', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-ok-'));
    const src = path.join(dir, 'src');
    mkdirSync(src);
    writeFileSync(path.join(src, 'userService.ts'), 'export const n = 1;\n');
    writeFileSync(path.join(src, 'user.component.ts'), 'export const n = 1;\n');
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId.startsWith('structure/'))).toBe(false);
  });

  it('flags snake_case filenames', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-out-'));
    const src = path.join(dir, 'src');
    mkdirSync(src);
    writeFileSync(path.join(src, 'user-service.ts'), 'export const n = 1;\n');
    writeFileSync(path.join(src, 'user_profile.ts'), 'export const n = 1;\n');
    const result = await audit(['src'], { cwd: dir });
    expect(
      result.findings.some((f) => f.ruleId === 'structure/file-case' && f.file.includes('user_profile')),
    ).toBe(true);
  });

  it('allows PascalCase models next to kebab controllers', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-mix-'));
    const src = path.join(dir, 'src');
    mkdirSync(src);
    writeFileSync(path.join(src, 'auth.controller.ts'), 'export const n = 1;\n');
    writeFileSync(path.join(src, 'Catalog.ts'), 'export const n = 1;\n');
    writeFileSync(path.join(src, 'static-page.controller.ts'), 'export const n = 1;\n');
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId === 'structure/file-case')).toBe(false);
  });

  it('honors file-level screview-disable for junk filenames', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-sup-'));
    const src = path.join(dir, 'src');
    mkdirSync(src);
    writeFileSync(
      path.join(src, 'temp.ts'),
      '// screview-disable structure/junk-filename\nexport const n = 1;\n',
    );
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId === 'structure/junk-filename')).toBe(false);
  });
});
