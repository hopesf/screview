import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';
import {
  functionName,
  getEnclosingFunction,
  isAsyncFunction,
  isExpressHandler,
  isInsideTry,
  isFunctionLike,
} from '../../utils/ast';

export const missingAsyncErrorHandling: Rule = {
  id: 'express/missing-async-error-handling',
  pack: 'express',
  severity: 'critical',
  docs: 'Async Express handlers must wrap awaited work in try/catch or an async wrapper.',
  create(ctx) {
    return {
      [SyntaxKind.AwaitExpression](node) {
        if (!Node.isAwaitExpression(node)) return;
        const fn = getEnclosingFunction(node);
        if (!fn || !isAsyncFunction(fn) || !isExpressHandler(fn)) return;
        if (isInsideTry(node)) return;
        const nested = node.getFirstAncestor(isFunctionLike);
        if (nested && nested !== fn) return;
        const name = functionName(fn);
        if (name && ctx.wrappedHandlers.has(name)) return;
        ctx.report(node, 'Async Express handler awaits without try/catch. Rejections will crash or hang.', {
          seniorNote:
            'Unhandled async errors in Express never hit your error middleware. Wrap the await or use a wrapper that calls next(err).',
        });
      },
    };
  },
};
