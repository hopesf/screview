import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';

export const noRequire: Rule = {
  id: 'style/no-require',
  pack: 'style',
  severity: 'warning',
  docs: 'ESM/TypeScript: use import instead of require().',
  create(ctx) {
    return {
      [SyntaxKind.CallExpression](node) {
        if (!Node.isCallExpression(node)) return;
        const expr = node.getExpression();
        if (!Node.isIdentifier(expr) || expr.getText() !== 'require') return;
        ctx.report(node, 'Use import instead of require().');
      },
    };
  },
};
