import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';
import { findHasLimitOption, isMongooseListFind, queryChainMethods } from './listQuery';

export const unboundedFind: Rule = {
  id: 'mongo/unbounded-find',
  pack: 'mongo',
  severity: 'critical',
  docs: 'Model.find() without .limit() or .cursor() loads the whole collection as it grows.',
  create(ctx) {
    return {
      [SyntaxKind.CallExpression](node) {
        if (!Node.isCallExpression(node)) return;
        if (!isMongooseListFind(node)) return;
        if (findHasLimitOption(node)) return;
        const chain = queryChainMethods(node);
        if (chain.has('limit') || chain.has('cursor')) return;
        ctx.report(node, 'Mongoose find() has no .limit() or .cursor(). The result set grows without bound.', {
          seniorNote:
            'A list endpoint that loads every row dies at 10x traffic. Add .limit() (cursor pagination beats skip/limit on growing collections).',
        });
      },
    };
  },
};
