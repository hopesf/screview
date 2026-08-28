import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';

export const noVar: Rule = {
  id: 'style/no-var',
  pack: 'style',
  severity: 'warning',
  docs: 'ES6: use let or const instead of var.',
  create(ctx) {
    return {
      [SyntaxKind.VariableStatement](node) {
        if (!Node.isVariableStatement(node)) return;
        if (node.getDeclarationKind() !== 'var') return;
        ctx.report(node, 'Use let or const instead of var.');
      },
    };
  },
};
