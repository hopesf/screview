import type { FailOn, Finding, Severity } from './types';

const RANK: Record<Severity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
};

export function resolveExitCode(findings: Finding[], failOn: FailOn = 'critical'): 0 | 1 {
  if (findings.length === 0) return 0;
  if (failOn === 'all') return 1;
  const min = failOn === 'warning' ? 1 : 2;
  return findings.some((finding) => RANK[finding.severity] >= min) ? 1 : 0;
}
