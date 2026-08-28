import type { AuditResult } from '../core/types';

export function renderJson(result: AuditResult): string {
  return JSON.stringify(
    {
      filesScanned: result.filesScanned,
      durationMs: result.durationMs,
      findings: result.findings,
    },
    null,
    2,
  );
}
