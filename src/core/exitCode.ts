import type { Finding } from './types';

export function resolveExitCode(findings: Finding[]): 0 | 1 {
  return findings.length > 0 ? 1 : 0;
}
