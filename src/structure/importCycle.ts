import type { Finding, ProgramRule } from '../core/types';
import { displayPath } from '../utils/ast';
import { collectRelativeTargets } from './relativeModules';

export const importCycle: ProgramRule = {
  id: 'structure/import-cycle',
  pack: 'structure',
  severity: 'warning',
  docs: 'Relative value imports that form a cycle make load order undefined and edits contagious.',
  run(ctx) {
    const files = new Set(ctx.sourceFiles.map((sf) => sf.getFilePath()));
    const graph = new Map<string, string[]>();
    for (const sourceFile of ctx.sourceFiles) {
      graph.set(
        sourceFile.getFilePath(),
        collectRelativeTargets(sourceFile, files, { typeOnly: false, dynamic: false }),
      );
    }

    const findings: Finding[] = [];
    for (const component of stronglyConnected(graph)) {
      if (!isCycle(component, graph)) continue;
      const ordered = [...component].sort((a, b) => a.localeCompare(b));
      const rel = ordered.map((file) => displayPath(file, ctx.cwd));
      const file = rel[0] ?? displayPath(ordered[0] ?? '', ctx.cwd);
      findings.push({
        ruleId: 'structure/import-cycle',
        severity: 'warning',
        file,
        line: 1,
        column: 1,
        message: `Import cycle: ${rel.join(' → ')} → ${rel[0]}.`,
        seniorNote:
          'A cycle means neither module can be understood alone. Extract the shared type or helper into a third file.',
        snippet: rel.join(' → '),
      });
    }
    return findings;
  },
};

function stronglyConnected(graph: Map<string, string[]>): string[][] {
  let index = 0;
  const indices = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];

  const connect = (v: string): void => {
    indices.set(v, index);
    low.set(v, index);
    index += 1;
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!indices.has(w)) {
        connect(w);
        low.set(v, Math.min(low.get(v) ?? 0, low.get(w) ?? 0));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v) ?? 0, indices.get(w) ?? 0));
      }
    }
    if (low.get(v) === indices.get(v)) {
      const component: string[] = [];
      let w: string;
      do {
        w = stack.pop() ?? v;
        onStack.delete(w);
        component.push(w);
      } while (w !== v);
      components.push(component);
    }
  };

  for (const v of graph.keys()) {
    if (!indices.has(v)) connect(v);
  }
  return components;
}

function isCycle(component: string[], graph: Map<string, string[]>): boolean {
  if (component.length > 1) return true;
  const only = component[0];
  return only !== undefined && (graph.get(only) ?? []).includes(only);
}
