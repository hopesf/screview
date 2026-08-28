import { Node, SyntaxKind, type ArrowFunction, type FunctionExpression } from 'ts-morph';
import type { Rule } from '../../core/types';
import { getCalleeName, isFunctionLike } from '../../utils/ast';

const RESOURCES = new Set([
  'addEventListener',
  'setInterval',
  'subscribe',
  'AbortController',
  'WebSocket',
  'EventSource',
]);

export const missingEffectCleanup: Rule = {
  id: 'react/missing-effect-cleanup',
  pack: 'react',
  severity: 'critical',
  docs: 'useEffect that opens a subscription, interval, or listener must return a cleanup function.',
  create(ctx) {
    return {
      [SyntaxKind.CallExpression](node) {
        if (!Node.isCallExpression(node)) return;
        if (getCalleeName(node) !== 'useEffect') return;
        const callback = node.getArguments()[0];
        if (!callback || !isFunctionLike(callback)) return;
        if (!Node.isArrowFunction(callback) && !Node.isFunctionExpression(callback)) return;
        if (!opensResource(callback)) return;
        if (returnsCleanup(callback)) return;
        ctx.report(node, 'useEffect opens a resource but does not return a cleanup function.', {
          seniorNote:
            'The listener or interval survives unmount and updates state on a dead component. Return a function that undoes the setup.',
        });
      },
    };
  },
};

function opensResource(fn: ArrowFunction | FunctionExpression): boolean {
  let found = false;
  fn.forEachDescendant((node, traversal) => {
    if (isFunctionLike(node) && node !== fn) {
      traversal.skip();
      return;
    }
    if (Node.isNewExpression(node)) {
      const expr = node.getExpression().getText();
      if (RESOURCES.has(expr)) found = true;
    }
    if (Node.isCallExpression(node)) {
      const name = getCalleeName(node);
      if (name && RESOURCES.has(name)) found = true;
    }
  });
  return found;
}

function returnsCleanup(fn: ArrowFunction | FunctionExpression): boolean {
  const body = fn.getBody();
  if (Node.isArrowFunction(fn) && !Node.isBlock(body)) {
    return isFunctionLike(body);
  }
  if (!Node.isBlock(body)) return false;
  return body.getStatements().some((stmt) => {
    if (!Node.isReturnStatement(stmt)) return false;
    const expr = stmt.getExpression();
    return expr !== undefined && isFunctionLike(expr);
  });
}
