import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { Finding } from './types';

export function fingerprint(finding: Finding): string {
  return `${finding.ruleId}|${finding.file}|${finding.snippet ?? finding.message}`;
}

export function writeBaseline(file: string, findings: Finding[]): void {
  const fingerprints = [...new Set(findings.map(fingerprint))].sort();
  writeFileSync(file, `${JSON.stringify(fingerprints, null, 2)}\n`);
}

export function applyBaseline(findings: Finding[], file: string): Finding[] {
  if (!existsSync(file)) return findings;
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    const known = new Set(Array.isArray(raw) ? raw.map(String) : []);
    return findings.filter((finding) => !known.has(fingerprint(finding)));
  } catch {
    throw new Error(`${file} is not a valid screview baseline`);
  }
}
