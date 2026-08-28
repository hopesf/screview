import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';
import { getCalleeName, getEnclosingFunction, isFunctionLike, isReactComponent } from '../../utils/ast';

export const noStateUpdateInRender: Rule = {
  id: 'react/no-state-update-in-render',
  pack: 'react',
  severity: 'critical',
  docs: 'Calling a state setter during render causes an infinite update loop.',
  create(ctx) {
    return {
      [SyntaxKind.CallExpression](node) {
        if (!Node.isCallExpression(node)) return;
        const name = getCalleeName(node);
        if (!name || !/^set[A-Z]/.test(name)) return;
        const fn = getEnclosingFunction(node);
        if (!fn || !isReactComponent(fn)) return;
        if (insideNestedFunction(node, fn)) return;
        ctx.report(node, `State updater ${name}() is called during render.`, {
          seniorNote:
            'This re-renders, which calls the setter again. Move it into an event handler or an effect.',
        });
      },
    };
  },
};

function insideNestedFunction(node: Node, component: Node): boolean {
  const inner = node.getFirstAncestor((n) => isFunctionLike(n) && n !== component);
  return inner !== undefined;
}
