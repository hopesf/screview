import { Node, type SourceFile } from 'ts-morph';
import type { Finding, ProgramRule } from '../core/types';
import { displayPath } from '../utils/ast';

interface TypeShape {
  name: string;
  file: string;
  line: number;
  column: number;
  signature: string;
}

export const duplicateType: ProgramRule = {
  id: 'structure/duplicate-type',
  pack: 'structure',
  severity: 'warning',
  docs: 'The same type name with different fields means two authors drifted. Pick one.',
  run(ctx) {
    const byName = new Map<string, TypeShape[]>();
    for (const sourceFile of ctx.sourceFiles) {
      for (const shape of collectShapes(sourceFile, ctx.cwd)) {
        const list = byName.get(shape.name) ?? [];
        list.push(shape);
        byName.set(shape.name, list);
      }
    }

    const findings: Finding[] = [];
    for (const [name, shapes] of byName) {
      if (shapes.length < 2) continue;
      const signatures = new Set(shapes.map((shape) => shape.signature));
      if (signatures.size < 2) continue;
      const first = shapes[0];
      if (!first) continue;
      const files = [...new Set(shapes.map((shape) => shape.file))].sort();
      findings.push({
        ruleId: 'structure/duplicate-type',
        severity: 'warning',
        file: first.file,
        line: first.line,
        column: first.column,
        message: `Type "${name}" is declared with different fields in ${files.join(' and ')}.`,
        seniorNote:
          'Two User types that disagree is a merge conflict the compiler cannot see. Keep one definition and import it.',
        snippet: name,
      });
    }
    return findings;
  },
};

function collectShapes(sourceFile: SourceFile, cwd: string): TypeShape[] {
  const file = displayPath(sourceFile.getFilePath(), cwd);
  const shapes: TypeShape[] = [];

  for (const iface of sourceFile.getInterfaces()) {
    const name = iface.getName();
    if (!name) continue;
    const fields = memberNames(iface.getMembers());
    if (fields.length === 0) continue;
    pushShape(shapes, name, file, iface, fields);
  }

  for (const alias of sourceFile.getTypeAliases()) {
    const name = alias.getName();
    const node = alias.getTypeNode();
    if (!name || !node || !Node.isTypeLiteral(node)) continue;
    const fields = memberNames(node.getMembers());
    if (fields.length === 0) continue;
    pushShape(shapes, name, file, alias, fields);
  }

  return shapes;
}

function memberNames(members: Node[]): string[] {
  const names = new Set<string>();
  for (const member of members) {
    if (Node.isPropertySignature(member) || Node.isMethodSignature(member)) {
      const name = member.getName();
      if (name) names.add(name);
    }
  }
  return [...names].sort();
}

function pushShape(
  shapes: TypeShape[],
  name: string,
  file: string,
  node: { getStart: (trim?: boolean) => number; getSourceFile: () => SourceFile },
  fields: string[],
): void {
  const pos = node.getStart(false);
  const { line, column } = node.getSourceFile().getLineAndColumnAtPos(pos);
  shapes.push({ name, file, line, column, signature: fields.join(',') });
}
