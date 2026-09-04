import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyBaseline, fingerprint, writeBaseline } from '../../src/core/baseline';
import type { Finding } from '../../src/core/types';

const finding = (ruleId: string, file: string, message: string): Finding => ({
  ruleId,
  severity: 'warning',
  file,
  line: 3,
  column: 1,
  message,
  snippet: message,
});

describe('baseline', () => {
  it('fingerprints by rule, file, and snippet without the line number', () => {
    const a = finding('style/eqeqeq', 'a.ts', 'Use ===.');
    const b = { ...a, line: 99 };
    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  it('filters findings that are already in the baseline file', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-base-'));
    const file = path.join(dir, '.screview-baseline.json');
    const known = finding('style/eqeqeq', 'a.ts', 'Use ===.');
    const fresh = finding('generic/empty-catch', 'b.ts', 'swallowed');
    writeBaseline(file, [known]);
    const remaining = applyBaseline([known, fresh], file);
    expect(remaining).toEqual([fresh]);
  });

  it('writes a JSON array of fingerprints', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-base-'));
    const file = path.join(dir, '.screview-baseline.json');
    writeBaseline(file, [finding('style/eqeqeq', 'a.ts', 'Use ===.')]);
    const raw = JSON.parse(readFileSync(file, 'utf8')) as string[];
    expect(raw).toHaveLength(1);
    expect(raw[0]).toContain('style/eqeqeq');
  });
});
