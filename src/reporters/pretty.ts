import { createColors } from 'picocolors';
import type { AuditResult, Finding, Severity } from '../core/types';

export function renderPretty(result: AuditResult, color: boolean): string {
  const c = createColors(color);
  const detected = formatDetected(result);
  if (result.findings.length === 0) {
    return `${c.dim(detected)}\n${c.green(`${result.filesScanned} files, no junk.`)}`;
  }

  const sorted = [...result.findings].sort((a, b) => {
    const file = a.file.localeCompare(b.file);
    if (file !== 0) return file;
    return a.line - b.line;
  });

  const lines: string[] = [c.dim(detected), ''];
  for (const finding of sorted) {
    const loc = `${finding.file}:${finding.line}`;
    const label = colorSeverity(c, finding.severity, loc);
    lines.push(`${label}  ${c.cyan(finding.ruleId)}  ${c.dim(finding.severity)}`);
    lines.push(`  ${finding.message}`);
    if (finding.snippet) lines.push(`  ${c.dim(finding.snippet)}`);
    if (finding.seniorNote) lines.push(`  ${finding.seniorNote}`);
    lines.push('');
  }
  lines.push(c.red(summarize(result)));
  return lines.join('\n');
}

function summarize(result: AuditResult): string {
  const counts = { critical: 0, warning: 0, info: 0 };
  for (const finding of result.findings) counts[finding.severity] += 1;
  const parts = (Object.entries(counts) as Array<[Severity, number]>)
    .filter(([, n]) => n > 0)
    .map(([severity, n]) => `${n} ${severity}${n === 1 ? '' : 's'}`);
  return `${parts.join(', ')} in ${result.filesScanned} files · ${result.durationMs}ms`;
}

function colorSeverity(
  c: ReturnType<typeof createColors>,
  severity: Severity,
  text: string,
): string {
  if (severity === 'critical') return c.red(c.bold(text));
  if (severity === 'warning') return c.yellow(c.bold(text));
  return c.dim(c.bold(text));
}

function formatDetected(result: AuditResult): string {
  const language = result.language === 'typescript' ? 'TypeScript' : 'JavaScript';
  if (result.frameworks.length === 0) return `Detected: ${language}`;
  const names = result.frameworks.map(title).join(', ');
  return `Detected: ${language} · ${names}`;
}

function title(name: string): string {
  if (name === 'mongo') return 'MongoDB';
  if (name === 'db') return 'DB';
  return name.charAt(0).toUpperCase() + name.slice(1);
}
