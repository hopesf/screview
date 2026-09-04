import type { Finding, ProgramContext, ProgramRule } from './types';
import { isFindingSuppressed } from './suppress';
import { displayPath } from '../utils/ast';

export async function runProgramRules(
  rules: ProgramRule[],
  ctx: ProgramContext,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const byPath = new Map(
    ctx.sourceFiles.map((sf) => [displayPath(sf.getFilePath(), ctx.cwd), sf]),
  );

  for (const rule of rules) {
    const produced = await rule.run(ctx);
    for (const finding of produced) {
      const sourceFile = byPath.get(finding.file);
      if (sourceFile && isFindingSuppressed(sourceFile, finding.line, rule.id)) continue;
      findings.push({
        ...finding,
        ruleId: rule.id,
        severity: rule.severity,
      });
    }
  }

  return findings;
}
