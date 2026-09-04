import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { audit } from '../src/audit';
import { isSuppressed } from '../src/core/suppress';
import { resolveExitCode } from '../src/core/exitCode';
import { selectProgramRules, selectRules } from '../src/core/registry';
import { DEFAULT_CONFIG } from '../src/core/config';
import { createFile } from './helpers/ruleTester';
import { emptyCatch } from '../src/rules/generic/emptyCatch';
import { runRule } from './helpers/ruleTester';
import type { Finding } from '../src/core/types';

describe('suppress', () => {
  it('honors screview-disable-next-line for one rule', () => {
    expect(
      runRule(emptyCatch, {
        code: `try { run(); }
// screview-disable-next-line generic/empty-catch
catch { }
function run() {}`,
      }),
    ).toHaveLength(0);
  });

  it('does not suppress other rules', () => {
    const file = createFile(
      'a.ts',
      `try { run(); }
// screview-disable-next-line generic/await-in-loop
catch { }
function run() {}`,
    );
    const node = file.getDescendants().find((n) => n.getKindName() === 'CatchClause');
    expect(node && isSuppressed(file, node, 'generic/empty-catch')).toBe(false);
  });
});

describe('exit code', () => {
  const finding = (): Finding => ({
    ruleId: 'generic/empty-catch',
    severity: 'critical',
    file: 'a.ts',
    line: 1,
    column: 1,
    message: 'x',
  });

  it('passes when clean', () => {
    expect(resolveExitCode([])).toBe(0);
  });

  it('fails on critical findings by default', () => {
    expect(resolveExitCode([finding()])).toBe(1);
  });

  it('ignores warnings unless failOn is warning or all', () => {
    const warning: Finding = { ...finding(), severity: 'warning' };
    expect(resolveExitCode([warning])).toBe(0);
    expect(resolveExitCode([warning], 'warning')).toBe(1);
    expect(resolveExitCode([warning], 'all')).toBe(1);
  });

  it('fails on any finding when failOn is all', () => {
    const info: Finding = { ...finding(), severity: 'info' };
    expect(resolveExitCode([info], 'all')).toBe(1);
    expect(resolveExitCode([info])).toBe(0);
  });
});

describe('registry', () => {
  const tsOnly = { language: 'typescript' as const, frameworks: [] };

  it('uses language rules when no framework is present', () => {
    const rules = selectRules(DEFAULT_CONFIG, tsOnly);
    expect(rules.every((r) => ['generic', 'style', 'naming'].includes(r.pack))).toBe(true);
    expect(rules.some((r) => r.id.startsWith('express/'))).toBe(false);
    expect(rules).toHaveLength(16);
  });

  it('adds express rules when express is detected', () => {
    const rules = selectRules(DEFAULT_CONFIG, {
      language: 'typescript',
      frameworks: ['express'],
    });
    expect(rules.some((r) => r.id.startsWith('express/'))).toBe(true);
    expect(rules.some((r) => r.id.startsWith('angular/'))).toBe(false);
  });

  it('skips TypeScript-only rules for JavaScript', () => {
    const rules = selectRules(DEFAULT_CONFIG, { language: 'javascript', frameworks: [] });
    expect(rules.some((r) => r.id === 'style/no-explicit-any')).toBe(false);
    expect(rules.some((r) => r.id === 'style/no-var')).toBe(true);
  });

  it('can turn a rule off', () => {
    const rules = selectRules(
      { ...DEFAULT_CONFIG, rules: { 'generic/empty-catch': 'off' } },
      tsOnly,
    );
    expect(rules.some((r) => r.id === 'generic/empty-catch')).toBe(false);
    expect(rules).toHaveLength(15);
  });

  it('overrides visitor severity from config', () => {
    const rules = selectRules(
      { ...DEFAULT_CONFIG, rules: { 'generic/empty-catch': 'warning' } },
      tsOnly,
    );
    expect(rules.find((r) => r.id === 'generic/empty-catch')?.severity).toBe('warning');
  });

  it('always includes structure program rules', () => {
    const rules = selectProgramRules(DEFAULT_CONFIG, tsOnly);
    expect(rules.some((r) => r.id === 'structure/junk-filename')).toBe(true);
    expect(rules.some((r) => r.id === 'structure/file-case')).toBe(true);
    expect(rules.some((r) => r.id === 'db/unused-field')).toBe(false);
  });

  it('adds db program rules when mongo is present', () => {
    const rules = selectProgramRules(DEFAULT_CONFIG, {
      language: 'typescript',
      frameworks: ['mongo'],
    });
    expect(rules.some((r) => r.id === 'db/unused-field')).toBe(true);
  });

  it('can turn a program rule off', () => {
    const rules = selectProgramRules(
      { ...DEFAULT_CONFIG, rules: { 'structure/crowded-folder': 'off' } },
      tsOnly,
    );
    expect(rules.some((r) => r.id === 'structure/crowded-folder')).toBe(false);
  });
});

describe('perf', () => {
  it('scans 50 files in under 2s', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-perf-'));
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'perf' }));
    const src = path.join(dir, 'src');
    mkdirSync(src);
    for (let i = 0; i < 50; i += 1) {
      writeFileSync(
        path.join(src, `f${i}.ts`),
        `export function add${i}(a: number, b: number) { return a + b; }\n`,
      );
    }
    const result = await audit(['src'], { cwd: dir });
    expect(result.filesScanned).toBe(50);
    expect(result.durationMs).toBeLessThan(2000);
  });
});

describe('default scan', () => {
  it('scans the whole project when no path is given', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-nopath-'));
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app' }));
    mkdirSync(path.join(dir, 'src'));
    mkdirSync(path.join(dir, 'lib'));
    mkdirSync(path.join(dir, 'tests'));
    writeFileSync(path.join(dir, 'src/main.ts'), 'export const n = 1;\n');
    writeFileSync(path.join(dir, 'lib/util.ts'), 'export const n = 2;\n');
    writeFileSync(path.join(dir, 'tests/helper.ts'), 'export const n = 3;\n');
    const result = await audit([], { cwd: dir });
    expect(result.filesScanned).toBe(2);
  });
});
