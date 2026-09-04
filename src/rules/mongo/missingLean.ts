import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';
import { isMongooseListFind, queryChainMethods } from './listQuery';

export const missingLean: Rule = {
  id: 'mongo/missing-lean',
  pack: 'mongo',
  severity: 'warning',
  docs: 'List queries should call .lean() so Mongoose does not hydrate documents you never write back.',
  create(ctx) {
    return {
      [SyntaxKind.CallExpression](node) {
        if (!Node.isCallExpression(node)) return;
        if (!isMongooseListFind(node)) return;
        const chain = queryChainMethods(node);
        if (chain.has('lean') || chain.has('cursor')) return;
        ctx.report(node, 'Mongoose find() list is not .lean(). Hydrating documents burns CPU on read-only lists.', {
          seniorNote:
            'If you are not calling .save() on these rows, chain .lean() (and a projection). Document instances are several times heavier than plain objects.',
        });
      },
    };
  },
};
