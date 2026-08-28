import { SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';

export const noExplicitAny: Rule = {
  id: 'style/no-explicit-any',
  pack: 'style',
  severity: 'warning',
  docs: 'TypeScript: explicit any disables checking.',
  create(ctx) {
    return {
      [SyntaxKind.AnyKeyword](node) {
        ctx.report(node, 'Replace any with a real type or unknown.');
      },
    };
  },
};
