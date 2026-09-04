import type { Node, SourceFile } from 'ts-morph';
import type { Finding, Rule } from './types';
import { isSuppressed } from './suppress';
import { displayPath, snippetOf } from '../utils/ast';
import { collectWrappedHandlers } from './wrappedHandlers';

export function runEngine(
  sourceFiles: SourceFile[],
  rules: Rule[],
  cwd: string,
): Finding[] {
  const findings: Finding[] = [];
  const wrappedHandlers = collectWrappedHandlers(sourceFiles);

  for (const sourceFile of sourceFiles) {
    const filePath = displayPath(sourceFile.getFilePath(), cwd);
    const listeners = new Map<number, Array<(node: Node) => void>>();

    for (const rule of rules) {
      const visitors = rule.create({
        sourceFile,
        filePath,
        wrappedHandlers,
        report(node, message, extra) {
          if (isSuppressed(sourceFile, node, rule.id)) return;
          const pos = node.getStart(false);
          const { line, column } = sourceFile.getLineAndColumnAtPos(pos);
          findings.push({
            ruleId: rule.id,
            severity: rule.severity,
            file: filePath,
            line,
            column,
            message,
            seniorNote: extra?.seniorNote,
            snippet: extra?.snippet ?? snippetOf(node),
          });
        },
      });

      for (const [key, visitor] of Object.entries(visitors)) {
        const kind = Number(key);
        if (Number.isNaN(kind) || !visitor) continue;
        const list = listeners.get(kind) ?? [];
        list.push(visitor);
        listeners.set(kind, list);
      }
    }

    const sourceListeners = listeners.get(sourceFile.getKind());
    if (sourceListeners) {
      for (const visitor of sourceListeners) visitor(sourceFile);
    }

    sourceFile.forEachDescendant((node) => {
      const kindListeners = listeners.get(node.getKind());
      if (!kindListeners) return;
      for (const visitor of kindListeners) visitor(node);
    });
  }

  return findings;
}
