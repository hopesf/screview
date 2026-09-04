import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { Node, type NewExpression, type ObjectLiteralExpression, type SourceFile } from 'ts-morph';
import type { Finding, ProgramRule } from '../core/types';
import { displayPath, getCalleeName, hasDecorator } from '../utils/ast';

const RULE_ID = 'db/unused-field';

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

const MODEL_DECORATORS = ['Schema', 'Entity'];
const FIELD_DECORATORS = [
  'Prop',
  'Column',
  'PrimaryColumn',
  'PrimaryGeneratedColumn',
  'ObjectIdColumn',
  'Property',
  'ManyToOne',
  'OneToMany',
  'ManyToMany',
  'OneToOne',
];

interface ModelField {
  name: string;
  file: string;
  pos: number;
  line: number;
  column: number;
}

export async function analyzeModels(sourceFiles: SourceFile[], cwd: string): Promise<Finding[]> {
  const fields = collectFields(sourceFiles, cwd);
  const prismaRoot = findRoot(cwd);
  fields.push(...(await collectPrismaFields(prismaRoot, cwd)));
  if (fields.length === 0) return [];

  const used = collectUsages(sourceFiles);
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const field of fields) {
    if (SKIP.has(field.name)) continue;
    const key = `${field.file}:${field.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (isUsed(field, used)) continue;
    findings.push({
      ruleId: RULE_ID,
      severity: 'warning',
      file: field.file,
      line: field.line,
      column: field.column,
      message: `Model field "${field.name}" is declared but never read or written in the scanned code.`,
      seniorNote:
        'Dead schema fields rot migrations and confuse every reader. Delete it or start using it.',
      snippet: field.name,
    });
  }
  return findings;
}

export const unusedField: ProgramRule = {
  id: RULE_ID,
  pack: 'db',
  severity: 'warning',
  docs: 'Model fields that are never read or written in the scanned code are leftover schema.',
  run(ctx) {
    return analyzeModels(ctx.sourceFiles, ctx.cwd);
  },
};

function collectFields(sourceFiles: SourceFile[], cwd: string): ModelField[] {
  const fields: ModelField[] = [];
  for (const sourceFile of sourceFiles) {
    const file = displayPath(sourceFile.getFilePath(), cwd);
    sourceFile.forEachDescendant((node) => {
      if (Node.isNewExpression(node) || Node.isCallExpression(node)) {
        if (ctorName(node) === 'Schema') {
          const arg = node.getArguments()[0];
          if (arg && Node.isObjectLiteralExpression(arg)) {
            collectSchemaFields(arg, file, fields);
          }
        }
        if (Node.isCallExpression(node) && getCalleeName(node) === 'init') {
          const arg = node.getArguments()[0];
          if (arg && Node.isObjectLiteralExpression(arg) && looksLikeSequelize(arg)) {
            collectSchemaFields(arg, file, fields);
          }
        }
      }
      if (Node.isClassDeclaration(node) && hasDecorator(node, MODEL_DECORATORS)) {
        for (const prop of node.getProperties()) {
          if (!prop.getDecorators().some((d) => FIELD_DECORATORS.includes(d.getName()))) continue;
          const name = prop.getName();
          if (!name) continue;
          pushField(fields, name, file, prop);
        }
      }
    });
  }
  return fields;
}

function collectSchemaFields(
  obj: ObjectLiteralExpression,
  file: string,
  fields: ModelField[],
): void {
  for (const prop of obj.getProperties()) {
    if (!Node.isPropertyAssignment(prop) && !Node.isShorthandPropertyAssignment(prop)) continue;
    const name = prop.getName();
    if (!name || OPTION_KEYS.has(name)) continue;
    const init = Node.isPropertyAssignment(prop) ? prop.getInitializer() : undefined;
    if (init && Node.isObjectLiteralExpression(init) && !init.getProperty('type')) {
      collectSchemaFields(init, file, fields);
      continue;
    }
    pushField(fields, name, file, prop);
  }
}

function collectUsages(sourceFiles: SourceFile[]): Map<string, number[]> {
  const used = new Map<string, number[]>();
  const add = (name: string, pos: number): void => {
    const list = used.get(name) ?? [];
    list.push(pos);
    used.set(name, list);
  };

  for (const sourceFile of sourceFiles) {
    sourceFile.forEachDescendant((node) => {
      if (Node.isPropertyAccessExpression(node)) add(node.getName(), node.getStart(false));
      if (Node.isElementAccessExpression(node)) {
        const arg = node.getArgumentExpression();
        if (arg && Node.isStringLiteral(arg)) add(arg.getLiteralValue(), arg.getStart(false));
      }
      if (Node.isPropertyAssignment(node) || Node.isShorthandPropertyAssignment(node)) {
        add(node.getName(), node.getStart(false));
      }
    });
  }
  return used;
}

function isUsed(field: ModelField, used: Map<string, number[]>): boolean {
  const positions = used.get(field.name);
  if (!positions) return false;
  return positions.some((pos) => pos !== field.pos);
}

function pushField(
  fields: ModelField[],
  name: string,
  file: string,
  node: { getStart: (trim?: boolean) => number; getSourceFile: () => SourceFile },
): void {
  const pos = node.getStart(false);
  const { line, column } = node.getSourceFile().getLineAndColumnAtPos(pos);
  fields.push({ name, file, pos, line, column });
}

function ctorName(node: NewExpression | { getExpression: () => Node }): string | undefined {
  const expr = node.getExpression();
  if (Node.isIdentifier(expr)) return expr.getText();
  if (Node.isPropertyAccessExpression(expr)) return expr.getName();
  return undefined;
}

function looksLikeSequelize(obj: ObjectLiteralExpression): boolean {
  return obj.getProperties().some((prop) => {
    if (!Node.isPropertyAssignment(prop)) return false;
    const text = prop.getInitializer()?.getText() ?? '';
    return /DataTypes|Sequelize|DataType/.test(text);
  });
}

async function collectPrismaFields(root: string, cwd: string): Promise<ModelField[]> {
  const files = await fg(['**/*.prisma'], {
    cwd: root,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**'],
    onlyFiles: true,
  });
  const fields: ModelField[] = [];
  const modelBlock = /model\s+\w+\s*\{([^}]+)\}/g;
  const fieldLine = /^\s+([A-Za-z_][A-Za-z0-9_]*)\s+\S+/;

  for (const abs of files) {
    const text = existsSync(abs) ? readFileSync(abs, 'utf8') : '';
    const file = displayPath(abs, cwd);
    const lines = text.split(/\r?\n/);
    for (const match of text.matchAll(modelBlock)) {
      const body = match[1] ?? '';
      for (const line of body.split(/\r?\n/)) {
        if (line.trim().startsWith('@@') || line.trim().startsWith('//')) continue;
        const field = fieldLine.exec(line);
        if (!field?.[1] || SKIP.has(field[1])) continue;
        const lineNo = findLine(lines, line.trim());
        fields.push({
          name: field[1],
          file,
          pos: -1,
          line: lineNo,
          column: 1,
        });
      }
    }
  }
  return fields;
}

function findLine(lines: string[], snippet: string): number {
  const index = lines.findIndex((line) => line.includes(snippet));
  return index >= 0 ? index + 1 : 1;
}

function findRoot(startDir: string): string {
  let dir = path.resolve(startDir);
  while (true) {
    if (existsSync(path.join(dir, 'package.json')) || existsSync(path.join(dir, 'prisma'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(startDir);
    dir = parent;
  }
}
