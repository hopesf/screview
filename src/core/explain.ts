import { allProgramRules, allRules } from './registry';

export function explainRule(ruleId: string): string | undefined {
  const rule = [...allRules, ...allProgramRules].find((item) => item.id === ruleId);
  if (!rule) return undefined;
  return `${rule.id}  (${rule.pack}, ${rule.severity})\n${rule.docs}`;
}
