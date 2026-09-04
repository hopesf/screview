import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';
import {
  getCalleeName,
  getEnclosingFunction,
  getFunctionBody,
  isFunctionLike,
  isReactComponent,
} from '../../utils/ast';

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
        const fn = getEnclosingFunction(node);
        if (!name || !fn || !isReactComponent(fn)) return;
        if (insideNestedFunction(node, fn)) return;
        if (!stateSetters(fn).has(name)) return;
        ctx.report(node, `State updater ${name}() is called during render.`, {
          seniorNote:
            'This re-renders, which calls the setter again. Move it into an event handler or an effect.',
        });
      },
    };
  },
};

function stateSetters(component: Node): Set<string> {
  const names = new Set<string>();
  const body = getFunctionBody(component);
  if (!body) return names;
  body.forEachDescendant((node, traversal) => {
    if (isFunctionLike(node) && node !== component) {
      traversal.skip();
      return;
    }
    if (!Node.isVariableDeclaration(node)) return;
    const init = node.getInitializer();
    if (!init || !Node.isCallExpression(init)) return;
    const callee = getCalleeName(init);
    if (callee !== 'useState' && callee !== 'useReducer') return;
    const nameNode = node.getNameNode();
    if (!Node.isArrayBindingPattern(nameNode)) return;
    const setter = nameNode.getElements()[1];
    if (setter && Node.isBindingElement(setter)) {
      const name = setter.getName();
      if (typeof name === 'string') names.add(name);
    }
  });
  return names;
}

function insideNestedFunction(node: Node, component: Node): boolean {
  const inner = node.getFirstAncestor((n) => isFunctionLike(n) && n !== component);
  return inner !== undefined;
}
