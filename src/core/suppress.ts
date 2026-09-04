import type { Node, SourceFile } from 'ts-morph';

const DISABLE_NEXT = /^\s*\/\/\s*screview-disable-next-line(?:\s+(.+))?\s*$/;
const FILE_DISABLE = /^\s*\/\/\s*screview-disable(?!-next-line)(?:\s+(.+))?\s*$/;

export function isSuppressed(sourceFile: SourceFile, node: Node, ruleId: string): boolean {
  const { line } = sourceFile.getLineAndColumnAtPos(node.getStart(false));
  return isFindingSuppressed(sourceFile, line, ruleId);
}

export function isFindingSuppressed(sourceFile: SourceFile, line: number, ruleId: string): boolean {
  if (isFileSuppressed(sourceFile, ruleId)) return true;
  return isLineSuppressed(sourceFile, line, ruleId);
}

export function isFileSuppressed(sourceFile: SourceFile, ruleId: string): boolean {
  const lines = sourceFile.getFullText().split(/\r?\n/);
  for (const line of lines.slice(0, 12)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = FILE_DISABLE.exec(line);
    if (match) return listsRule(match[1], ruleId);
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
    break;
  }
  return false;
}

function isLineSuppressed(sourceFile: SourceFile, line: number, ruleId: string): boolean {
  if (line <= 1) return false;
  const prev = sourceFile.getFullText().split(/\r?\n/)[line - 2];
  if (!prev) return false;
  const match = DISABLE_NEXT.exec(prev);
  if (!match) return false;
  return listsRule(match[1], ruleId);
}

function listsRule(listed: string | undefined, ruleId: string): boolean {
  if (!listed) return true;
  return listed
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(ruleId);
}
