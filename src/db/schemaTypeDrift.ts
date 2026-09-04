import { Node, type NewExpression, type ObjectLiteralExpression, type SourceFile } from 'ts-morph';
import type { Finding, ProgramRule } from '../core/types';
import { displayPath } from '../utils/ast';

const SKIP = new Set([
  'id',
  '_id',
  '__v',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'created_at',
  'updated_at',
  'version',
]);

const OPTION_KEYS = new Set([
  'type',
  'ref',
  'default',
  'required',
  'unique',
  'index',
  'enum',
  'of',
  'get',
  'set',
  'validate',
  'alias',
  'immutable',
  'select',
  'sparse',
  'lowercase',
  'uppercase',
  'trim',
  'min',
  'max',
  'minlength',
  'maxlength',
  'match',
]);

interface NamedFields {
  stem: string;
  label: string;
  fields: Map<string, { line: number; column: number }>;
}

export const schemaTypeDrift: ProgramRule = {
  id: 'db/schema-type-drift',
  pack: 'db',
  severity: 'warning',
  docs: 'Mongoose schema fields should match the nearby document interface in the same file.',
  run(ctx) {
    const findings: Finding[] = [];
    for (const sourceFile of ctx.sourceFiles) {
      const file = displayPath(sourceFile.getFilePath(), ctx.cwd);
      const schemas = collectSchemas(sourceFile);
      const types = collectDocumentTypes(sourceFile);
      if (schemas.length === 0 || types.length === 0) continue;

      for (const schema of schemas) {
        const match = types.find((type) => type.stem === schema.stem);
        if (!match) continue;
        findings.push(...diffFields(file, schema, match, true));
        findings.push(...diffFields(file, match, schema, false));
      }
    }
    return findings;
  },
};

function diffFields(
  file: string,
  from: NamedFields,
  into: NamedFields,
  schemaMissingFromType: boolean,
): Finding[] {
  const findings: Finding[] = [];
  for (const [name, loc] of from.fields) {
    if (SKIP.has(name) || into.fields.has(name)) continue;
    findings.push({
      ruleId: 'db/schema-type-drift',
      severity: 'warning',
      file,
      line: loc.line,
      column: loc.column,
      message: schemaMissingFromType
        ? `Schema field "${name}" is missing from ${into.label}.`
        : `Field "${name}" on ${from.label} is missing from the Mongoose schema.`,
      seniorNote:
        'A schema field the TypeScript type does not know about is a runtime value callers cannot see. Align them or stop maintaining a hand-written type.',
      snippet: name,
    });
  }
  return findings;
}

function collectSchemas(sourceFile: SourceFile): NamedFields[] {
  const schemas: NamedFields[] = [];
  sourceFile.forEachDescendant((node) => {
    if (!Node.isNewExpression(node) && !Node.isCallExpression(node)) return;
    if (ctorName(node) !== 'Schema') return;
    const arg = node.getArguments()[0];
    if (!arg || !Node.isObjectLiteralExpression(arg)) return;
    const fields = new Map<string, { line: number; column: number }>();
    collectSchemaFields(arg, fields);
    const varName = assignedName(node);
    const stem = varName ? typeStem(varName.replace(/(Schema|Model)$/, '')) : '';
    if (!stem || fields.size === 0) return;
    schemas.push({ stem, label: 'the Mongoose schema', fields });
  });
  return schemas;
}

function collectDocumentTypes(sourceFile: SourceFile): NamedFields[] {
  const types: NamedFields[] = [];

  for (const iface of sourceFile.getInterfaces()) {
    const name = iface.getName();
    if (!name) continue;
    const fields = new Map<string, { line: number; column: number }>();
    addMembers(iface.getMembers(), fields);
    if (fields.size === 0) continue;
    types.push({ stem: typeStem(name), label: `interface ${name}`, fields });
  }

  for (const alias of sourceFile.getTypeAliases()) {
    const name = alias.getName();
    const node = alias.getTypeNode();
    if (!name || !node || isDerivedType(node.getText())) continue;
    if (!Node.isTypeLiteral(node)) continue;
    const fields = new Map<string, { line: number; column: number }>();
    addMembers(node.getMembers(), fields);
    if (fields.size === 0) continue;
    types.push({ stem: typeStem(name), label: `type ${name}`, fields });
  }

  return types;
}

function addMembers(
  members: Node[],
  fields: Map<string, { line: number; column: number }>,
): void {
  for (const member of members) {
    if (!Node.isPropertySignature(member) && !Node.isMethodSignature(member)) continue;
    const name = member.getName();
    if (!name) continue;
    const pos = member.getStart(false);
    const { line, column } = member.getSourceFile().getLineAndColumnAtPos(pos);
    fields.set(name, { line, column });
  }
}

function collectSchemaFields(
  obj: ObjectLiteralExpression,
  fields: Map<string, { line: number; column: number }>,
): void {
  for (const prop of obj.getProperties()) {
    if (!Node.isPropertyAssignment(prop) && !Node.isShorthandPropertyAssignment(prop)) continue;
    const name = prop.getName();
    if (!name || OPTION_KEYS.has(name)) continue;
    const init = Node.isPropertyAssignment(prop) ? prop.getInitializer() : undefined;
    if (init && Node.isObjectLiteralExpression(init) && !init.getProperty('type')) {
      collectSchemaFields(init, fields);
      continue;
    }
    const pos = prop.getStart(false);
    const { line, column } = prop.getSourceFile().getLineAndColumnAtPos(pos);
    fields.set(name, { line, column });
  }
}

function assignedName(node: Node): string | undefined {
  const parent = node.getParent();
  if (parent && Node.isVariableDeclaration(parent) && Node.isIdentifier(parent.getNameNode())) {
    return parent.getName();
  }
  return undefined;
}

function ctorName(node: NewExpression | { getExpression: () => Node }): string | undefined {
  const expr = node.getExpression();
  if (Node.isIdentifier(expr)) return expr.getText();
  if (Node.isPropertyAccessExpression(expr)) return expr.getName();
  return undefined;
}

function typeStem(name: string): string {
  let stem = name;
  if (/^I[A-Z]/.test(stem)) stem = stem.slice(1);
  stem = stem.replace(/(Document|Model|Attrs|DTO|Entity|Schema)$/, '');
  return stem.toLowerCase();
}

function isDerivedType(text: string): boolean {
  return /InferSchemaType|HydratedDocument|ReturnType\s*</.test(text);
}
