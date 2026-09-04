import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';
import { functionName, getFunctionBody, isExpressHandler, isFunctionLike } from '../../utils/ast';

export const getWithoutReturn: Rule = {
  id: 'naming/get-without-return',
  pack: 'naming',
  severity: 'warning',
  docs: 'A getX function should return a value.',
  create(ctx) {
    const visit = (node: Node): void => {
      if (!isFunctionLike(node)) return;
      const name = functionName(node);
      if (!name || !/^get[A-Z]/.test(name)) return;
      if (isExpressHandler(node)) return;
      if (returnsValue(node)) return;
      ctx.report(node, `"${name}" is named like a getter but it never returns a value.`);
    };

    return {
      [SyntaxKind.FunctionDeclaration]: visit,
      [SyntaxKind.FunctionExpression]: visit,
      [SyntaxKind.ArrowFunction]: visit,
      [SyntaxKind.MethodDeclaration]: visit,
    };
  },
};

function returnsValue(fn: Node): boolean {
  if (Node.isArrowFunction(fn) && !Node.isBlock(fn.getBody())) return true;
  const body = getFunctionBody(fn);
  if (!body) return false;
  let found = false;
  body.forEachDescendant((node, traversal) => {
    if (isFunctionLike(node) && node !== fn) {
      traversal.skip();
      return;
    }
    if (Node.isReturnStatement(node) && node.getExpression() !== undefined) found = true;
  });
  return found;
}
