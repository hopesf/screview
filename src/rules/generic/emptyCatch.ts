import { Node, SyntaxKind, type CallExpression, type Statement } from 'ts-morph';
import type { Rule } from '../../core/types';

export const emptyCatch: Rule = {
  id: 'generic/empty-catch',
  pack: 'generic',
  severity: 'critical',
  docs: 'Empty catch blocks swallow failures and hide production incidents.',
  create(ctx) {
    return {
      [SyntaxKind.CatchClause](node) {
        if (!Node.isCatchClause(node)) return;
        const statements = node.getBlock().getStatements();
        if (statements.length === 0 || statements.every(isInertCatchStatement)) {
          ctx.report(node, 'Catch block swallows the error. Re-throw, handle, or report it.', {
            seniorNote:
              'A silent catch is a production outage you will debug without a stack. Log with context or let it fail.',
          });
        }
      },
    };
  },
};

function isInertCatchStatement(stmt: Statement): boolean {
  if (Node.isEmptyStatement(stmt)) return true;
  if (!Node.isExpressionStatement(stmt)) return false;
  const expr = stmt.getExpression();
  if (!Node.isCallExpression(expr)) return false;
  return isConsoleCall(expr);
}

function isConsoleCall(call: CallExpression): boolean {
  const expr = call.getExpression();
  if (!Node.isPropertyAccessExpression(expr)) return false;
  if (expr.getExpression().getText() !== 'console') return false;
  return ['log', 'warn', 'error', 'info', 'debug'].includes(expr.getName());
}
