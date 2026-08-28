import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';
import { isExpressHandler, isFunctionLike, isNextCall, isResponseCall, getFunctionBody } from '../../utils/ast';

export const noResponseMissing: Rule = {
  id: 'express/no-response-missing',
  pack: 'express',
  severity: 'warning',
  docs: 'Route handlers must send a response or call next().',
  create(ctx) {
    const visit = (node: Node): void => {
      if (!isFunctionLike(node) || !isExpressHandler(node)) return;
      const body = getFunctionBody(node);
      if (!body) return;
      let sends = false;
      body.forEachDescendant((child, traversal) => {
        if (isFunctionLike(child) && child !== node) {
          traversal.skip();
          return;
        }
        if (!Node.isCallExpression(child)) return;
        if (isResponseCall(child) || isNextCall(child)) sends = true;
      });
      if (!sends) {
        ctx.report(node, 'Express handler never sends a response or calls next(). The request will hang.', {
          seniorNote:
            'A handler that returns without res or next leaves the socket open until the client times out. Every path needs an exit.',
        });
      }
    };

    return {
      [SyntaxKind.FunctionDeclaration]: visit,
      [SyntaxKind.FunctionExpression]: visit,
      [SyntaxKind.ArrowFunction]: visit,
      [SyntaxKind.MethodDeclaration]: visit,
    };
  },
};
