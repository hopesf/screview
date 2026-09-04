import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { audit } from '../../src/audit';

const gold = (name: string): string => path.join(process.cwd(), 'tests/gold', name);

describe('gold corpus', () => {
  it('keeps a healthy Angular app free of critical findings', async () => {
    const result = await audit([], { cwd: gold('angular-app') });
    expect(critical(result.findings)).toEqual([]);
    expect(result.findings.map(brief)).toEqual([]);
  });

  it('keeps a healthy Next app router tree free of critical findings', async () => {
    const result = await audit([], { cwd: gold('next-app') });
    expect(critical(result.findings)).toEqual([]);
    expect(result.findings.map(brief)).toEqual([]);
  });

  it('keeps a healthy Express + Mongoose app free of critical findings', async () => {
    const result = await audit([], { cwd: gold('express-app') });
    expect(critical(result.findings)).toEqual([]);
    expect(result.findings.map(brief)).toEqual([]);
  });

  it('reports no critical findings when scanning this repo', async () => {
    const result = await audit([], { cwd: process.cwd() });
    expect(critical(result.findings)).toEqual([]);
  });
});

function critical(findings: Array<{ severity: string; ruleId: string; file: string }>): string[] {
  return findings.filter((f) => f.severity === 'critical').map(brief);
}

function brief(finding: { ruleId: string; file: string }): string {
  return `${finding.ruleId} ${finding.file}`;
}
