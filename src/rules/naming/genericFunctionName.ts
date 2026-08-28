import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';
import { functionName, isFunctionLike, isReactComponent } from '../../utils/ast';

const GENERIC = new Set([
  'foo',
  'bar',
  'baz',
  'temp',
  'tmp',
  'data',
  'fn',
  'func',
  'callback',
  'handler',
  'helper',
  'stuff',
  'thing',
  'doStuff',
  'handleData',
  'processData',
]);

export const genericFunctionName: Rule = {
  id: 'naming/generic-function',
  pack: 'naming',
  severity: 'warning',
  docs: 'Function names should describe the work they do.',
  create(ctx) {
    const visit = (node: Node): void => {
      if (!isFunctionLike(node)) return;
      if (isReactComponent(node)) return;
      const name = functionName(node);
      if (!name || name === 'constructor') return;
      if (/^(ngOn|use)[A-Z]/.test(name)) return;
      if (name.includes('_')) {
        ctx.report(node, `Use camelCase for "${name}".`);
        return;
      }
      if (GENERIC.has(name)) {
        ctx.report(node, `Rename "${name}" to what the function actually does.`);
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
