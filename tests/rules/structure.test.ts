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

  it('flags kebab-case filenames', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-case-'));
    const src = path.join(dir, 'src');
    mkdirSync(src);
    writeFileSync(path.join(src, 'user-service.ts'), 'export const n = 1;\n');
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId === 'structure/file-case')).toBe(true);
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
});
