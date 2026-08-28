import type { Node, SourceFile } from 'ts-morph';

const DISABLE_NEXT =
  /^\s*\/\/\s*screview-disable-next-line(?:\s+(.+))?\s*$/;

export function isSuppressed(sourceFile: SourceFile, node: Node, ruleId: string): boolean {
  const { line } = sourceFile.getLineAndColumnAtPos(node.getStart(false));
  if (line <= 1) return false;
  const prev = sourceFile.getFullText().split(/\r?\n/)[line - 2];
  if (!prev) return false;
  const match = DISABLE_NEXT.exec(prev);
  if (!match) return false;
  const listed = match[1];
  if (!listed) return true;
  return listed
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(ruleId);
}
