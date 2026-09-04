import { Node, SyntaxKind, type CallExpression } from 'ts-morph';
import type { Rule } from '../../core/types';
import { getCalleeName, isFunctionLike, isInLoopContext, isLoop } from '../../utils/ast';

const QUERY_METHODS = new Set([
  'find',
  'findOne',
  'findById',
  'findOneAndUpdate',
  'findByIdAndUpdate',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'replaceOne',
  'countDocuments',
  'aggregate',
  'create',
  'save',
  'exists',
]);

const MONGOOSE_ONLY = new Set([
  'findOne',
  'findById',
  'findOneAndUpdate',
  'findByIdAndUpdate',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'replaceOne',
  'countDocuments',
  'aggregate',
  'exists',
]);

const LOOKUP_ONE = new Set(['findOne', 'findById', 'exists']);
const SERVICE_LOOKUP = /^(get|find|load|fetch).*(By|Id|One|From|Info)/;

function isMongooseQuery(call: Node): boolean {
  if (!Node.isCallExpression(call)) return false;
  const expr = call.getExpression();
  if (!Node.isPropertyAccessExpression(expr)) return false;
  const name = expr.getName();
  if (!QUERY_METHODS.has(name)) return false;
  if (MONGOOSE_ONLY.has(name)) return true;
  const obj = expr.getExpression();
  if (Node.isIdentifier(obj) && /^[A-Z]/.test(obj.getText())) return true;
  if (Node.isPropertyAccessExpression(obj) && obj.getExpression().getText() === 'mongoose') return true;
  return false;
}

function isServiceLookup(call: CallExpression): boolean {
  const expr = call.getExpression();
  if (!Node.isPropertyAccessExpression(expr)) return false;
  if (!SERVICE_LOOKUP.test(expr.getName())) return false;
  return /service|repository|repo|\bdao\b/i.test(expr.getExpression().getText());
}

function isFallbackLookup(call: CallExpression): boolean {
  const name = getCalleeName(call);
  const lookup = name !== undefined && LOOKUP_ONE.has(name);
  if (!lookup && !isServiceLookup(call)) return false;
  if (callExitsOnHit(call)) return true;
  const binding = assignedName(call);
  if (!binding) return false;
  const stmt = owningStatement(call);
  if (!stmt) return false;
  const parent = stmt.getParent();
  if (!parent || !Node.isBlock(parent)) return false;
  const statements = parent.getStatements();
  const idx = statements.findIndex((item) => item.getStart() === stmt.getStart());
  if (idx < 0) return false;
  for (let i = idx + 1; i < statements.length; i++) {
    const next = statements[i];
    if (!Node.isIfStatement(next)) continue;
    if (!Node.isIdentifier(next.getExpression()) || next.getExpression().getText() !== binding) continue;
    if (statementExitsLoop(next.getThenStatement())) return true;
  }
  return false;
}

function callExitsOnHit(call: CallExpression): boolean {
  const ifStmt = call.getFirstAncestor(Node.isIfStatement);
  if (!ifStmt) return false;
  let current: Node | undefined = call;
  while (current) {
    if (current === ifStmt.getExpression()) return statementExitsLoop(ifStmt.getThenStatement());
    if (current === ifStmt || isLoop(current) || isFunctionLike(current)) return false;
    current = current.getParent();
  }
  return false;
}

function assignedName(call: CallExpression): string | undefined {
  let node: Node = call;
  const parent = call.getParent();
  if (parent && Node.isAwaitExpression(parent)) node = parent;
  const dest = node.getParent();
  if (!dest) return undefined;
  if (Node.isVariableDeclaration(dest)) return dest.getNameNode().getText();
  if (Node.isBinaryExpression(dest) && dest.getOperatorToken().getKind() === SyntaxKind.EqualsToken) {
    const left = dest.getLeft();
    if (Node.isIdentifier(left)) return left.getText();
  }
  return undefined;
}

function owningStatement(call: CallExpression): Node | undefined {
  let current: Node | undefined = call.getParent();
  while (current) {
    if (Node.isVariableStatement(current) || Node.isExpressionStatement(current)) return current;
    if (isLoop(current) || isFunctionLike(current)) return undefined;
    current = current.getParent();
  }
  return undefined;
}

function statementExitsLoop(stmt: Node): boolean {
  if (Node.isReturnStatement(stmt) || Node.isBreakStatement(stmt)) return true;
  if (!Node.isBlock(stmt)) return false;
  return stmt.getStatements().some((inner) => Node.isReturnStatement(inner) || Node.isBreakStatement(inner));
}

export const queryInLoop: Rule = {
  id: 'mongo/query-in-loop',
  pack: 'mongo',
  severity: 'critical',
  docs: 'Database queries inside loops create N+1 load and lock up under volume.',
  create(ctx) {
    return {
      [SyntaxKind.CallExpression](node) {
        if (!Node.isCallExpression(node)) return;
        if (!isMongooseQuery(node) && !isServiceLookup(node)) return;
        if (!isInLoopContext(node)) return;
        if (isFallbackLookup(node)) return;
        const name = getCalleeName(node) ?? 'query';
        ctx.report(node, `${name}() inside a loop. This is an N+1 query.`, {
          seniorNote:
            'At 1000 rows this becomes 1000 round trips. Load with $in, a join, or an aggregation and map in memory.',
        });
      },
    };
  },
};
