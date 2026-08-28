import { createColors } from 'picocolors';
import type { AuditResult } from '../core/types';

export function renderPretty(result: AuditResult, color: boolean): string {
  const c = createColors(color);
  if (result.findings.length === 0) {
    return c.green(`${result.filesScanned} files, no junk.`);
  }

  const sorted = [...result.findings].sort((a, b) => {
    const file = a.file.localeCompare(b.file);
    if (file !== 0) return file;
    return a.line - b.line;
  });

  const lines: string[] = [];
  for (const finding of sorted) {
    const loc = `${finding.file}:${finding.line}`;
    const label = finding.severity === 'critical' ? c.red(c.bold(loc)) : c.yellow(c.bold(loc));
    lines.push(`${label}  ${c.cyan(finding.ruleId)}`);
    lines.push(`  ${finding.message}`);
    lines.push('');
  }
  lines.push(
    c.red(`${result.findings.length} issue(s) in ${result.filesScanned} files.`),
  );
  return lines.join('\n');
}
