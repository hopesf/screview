import { Node, SyntaxKind, type CatchClause } from 'ts-morph';
import type { Rule } from '../../core/types';
import {
  getEnclosingFunction,
  isExpressHandler,
  isFunctionLike,
  isNextCall,
  isResponseCall,
} from '../../utils/ast';

export const noSwallowedError: Rule = {
  id: 'express/no-swallowed-error',
  pack: 'express',
  severity: 'critical',
  docs: 'Express handlers must forward errors with next(err), rethrow, or send an error response.',
  create(ctx) {
    return {
      [SyntaxKind.CatchClause](node) {
        if (!Node.isCatchClause(node)) return;
        const fn = getEnclosingFunction(node);
        if (!fn || !isExpressHandler(fn)) return;
        if (handlesError(node)) return;
        ctx.report(node, "Express route handler did not call next(err). The error is swallowed.", {
          seniorNote:
            'Express will hang or send a false 200 if you catch and continue. Pass the error to next or write an error response and return.',
        });
      },
    };
  },
};

function handlesError(clause: CatchClause): boolean {
  const block = clause.getBlock();
  if (block.getDescendantsOfKind(SyntaxKind.ThrowStatement).length > 0) return true;
  for (const call of block.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (!Node.isCallExpression(call)) continue;
    if (isNextCall(call, true)) return true;
    if (isResponseCall(call)) return true;
    if (isNestedFunction(call, clause)) continue;
  }
  return false;
}

function isNestedFunction(node: Node, clause: CatchClause): boolean {
  const fn = node.getFirstAncestor(isFunctionLike);
  const catchFn = clause.getFirstAncestor(isFunctionLike);
  return fn !== undefined && catchFn !== undefined && fn !== catchFn;
}
