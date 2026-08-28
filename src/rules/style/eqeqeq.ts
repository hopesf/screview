import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';

export const eqeqeq: Rule = {
  id: 'style/eqeqeq',
  pack: 'style',
  severity: 'warning',
  docs: 'ES6: use === and !== instead of == and !=.',
  create(ctx) {
    return {
      [SyntaxKind.BinaryExpression](node) {
        if (!Node.isBinaryExpression(node)) return;
        const op = node.getOperatorToken().getKind();
        if (op !== SyntaxKind.EqualsEqualsToken && op !== SyntaxKind.ExclamationEqualsToken) return;
        ctx.report(node, 'Use === or !== instead of == or !=.');
      },
    };
  },
};
