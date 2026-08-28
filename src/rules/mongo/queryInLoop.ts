import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';
import { getCalleeName, isInLoopContext } from '../../utils/ast';

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

function isMongooseQuery(call: Node): boolean {
  if (!Node.isCallExpression(call)) return false;
  const expr = call.getExpression();
  if (!Node.isPropertyAccessExpression(expr)) return false;
  if (!QUERY_METHODS.has(expr.getName())) return false;
  const obj = expr.getExpression();
  const text = obj.getText();
  if (Node.isIdentifier(obj) && /^[A-Z]/.test(obj.getText())) return true;
  if (/Model|model/.test(text)) return true;
  return false;
}

export const queryInLoop: Rule = {
  id: 'mongo/query-in-loop',
  pack: 'mongo',
  severity: 'critical',
  docs: 'Database queries inside loops create N+1 load and lock up under volume.',
  create(ctx) {
    return {
      [SyntaxKind.CallExpression](node) {
        if (!isMongooseQuery(node)) return;
        if (!Node.isCallExpression(node)) return;
        if (!isInLoopContext(node)) return;
        const name = getCalleeName(node) ?? 'query';
        ctx.report(node, `Mongoose ${name}() inside a loop. This is an N+1 query.`, {
          seniorNote:
            'At 1000 rows this becomes 1000 round trips. Load with $in, a join, or an aggregation and map in memory.',
        });
      },
    };
  },
};
