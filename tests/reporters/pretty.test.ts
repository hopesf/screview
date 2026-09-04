import { describe, expect, it } from 'vitest';
import { renderPretty } from '../../src/reporters/pretty';
import type { AuditResult, Finding } from '../../src/core/types';

function result(findings: Finding[]): AuditResult {
  return {
    findings,
    filesScanned: 2,
    durationMs: 12,
    cwd: '/tmp',
    language: 'typescript',
    frameworks: ['express'],
  };
}

describe('renderPretty', () => {
  it('shows a clean summary when there are no findings', () => {
    const out = renderPretty(result([]), false);
    expect(out).toContain('Detected: TypeScript · Express');
    expect(out).toContain('2 files, no junk');
  });

  it('prints snippet, senior note, severity, and counts', () => {
    const out = renderPretty(
      result([
        {
          ruleId: 'generic/empty-catch',
          severity: 'critical',
          file: 'src/user.ts',
          line: 12,
          column: 3,
          message: 'Catch block swallows the error.',
          seniorNote: 'A silent catch hides production incidents.',
          snippet: 'catch { }',
        },
        {
          ruleId: 'style/eqeqeq',
          severity: 'warning',
          file: 'src/user.ts',
          line: 4,
          column: 1,
          message: 'Use ===.',
        },
      ]),
      false,
    );
    expect(out).toContain('src/user.ts:12');
    expect(out).toContain('generic/empty-catch');
    expect(out).toContain('critical');
    expect(out).toContain('Catch block swallows the error.');
    expect(out).toContain('catch { }');
    expect(out).toContain('A silent catch hides production incidents.');
    expect(out).toContain('1 critical, 1 warning');
    expect(out).toContain('12ms');
  });
});
