import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';
import { isHandledPromise, resolveAsyncCallee } from '../../utils/ast';

export const floatingPromise: Rule = {
  id: 'generic/floating-promise',
  pack: 'generic',
  severity: 'critical',
  docs: 'Async calls used as statements without await, catch, or void drop rejections.',
  create(ctx) {
    return {
      [SyntaxKind.CallExpression](node) {
        if (!Node.isCallExpression(node)) return;
        const parent = node.getParent();
        if (!parent || !Node.isExpressionStatement(parent)) return;
        if (isHandledPromise(node)) return;
        if (!resolveAsyncCallee(node, ctx.sourceFile)) return;
        ctx.report(node, 'Async function is called without await, .catch, or void.', {
          seniorNote:
            'Unhandled rejections crash Node or vanish in the browser. Await it, return it, or mark it void on purpose.',
        });
      },
    };
  },
};
