const VERBS = new Set(['run', 'check']);

export function resolveScanPaths(positionals: string[]): string[] {
  if (positionals.length === 0) return [];
  if (VERBS.has(positionals[0])) return positionals.slice(1);
  return positionals;
}
