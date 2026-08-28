import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';
import { isInLoopContext } from '../../utils/ast';

export const awaitInLoop: Rule = {
  id: 'generic/await-in-loop',
  pack: 'generic',
  severity: 'warning',
  docs: 'Await inside a loop or array iterator runs sequentially and often hides an N+1.',
  create(ctx) {
    return {
      [SyntaxKind.AwaitExpression](node) {
        if (!Node.isAwaitExpression(node)) return;
        if (!isInLoopContext(node)) return;
        ctx.report(node, 'Await inside a loop. Prefer Promise.all or a bulk operation.', {
          seniorNote:
            'Each iteration waits for the previous one. If this list grows, latency grows with it. Collect the work and await it once.',
        });
      },
    };
  },
};
