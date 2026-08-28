import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { audit } from '../src/audit';
import { isSuppressed } from '../src/core/suppress';
import { resolveExitCode } from '../src/core/exitCode';
import { selectRules } from '../src/core/registry';
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

  it('fails on any finding', () => {
    expect(resolveExitCode([finding()])).toBe(1);
  });
});

describe('registry', () => {
  it('runs all rules by default', () => {
    expect(selectRules(DEFAULT_CONFIG)).toHaveLength(19);
  });

  it('can turn a rule off', () => {
    const rules = selectRules({
      ...DEFAULT_CONFIG,
      rules: { 'generic/empty-catch': 'off' },
    });
    expect(rules.some((r) => r.id === 'generic/empty-catch')).toBe(false);
    expect(rules).toHaveLength(18);
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
