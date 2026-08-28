import { Node, SyntaxKind, type CallExpression, type ClassDeclaration } from 'ts-morph';
import type { Rule } from '../../core/types';
import { getCalleeName, hasDecorator } from '../../utils/ast';

const DESTROY_OPS = new Set(['takeUntil', 'takeUntilDestroyed', 'take', 'first', 'takeWhile']);

export const unsubscribedObservable: Rule = {
  id: 'angular/unsubscribed-observable',
  pack: 'angular',
  severity: 'critical',
  docs: 'Observables subscribed in a component or directive must complete or unsubscribe.',
  create(ctx) {
    return {
      [SyntaxKind.CallExpression](node) {
        if (!Node.isCallExpression(node)) return;
        if (getCalleeName(node) !== 'subscribe') return;
        const cls = node.getFirstAncestor(Node.isClassDeclaration);
        if (!cls || !hasDecorator(cls, ['Component', 'Directive'])) return;
        if (hasDestroyOperator(node)) return;
        if (isAssignedAndCleaned(node, cls)) return;
        ctx.report(node, 'Observable subscribe() is never unsubscribed. This leaks after destroy.', {
          seniorNote:
            'The subscription outlives the component. Pipe takeUntilDestroyed or takeUntil(destroy$), or unsubscribe in ngOnDestroy.',
        });
      },
    };
  },
};

function hasDestroyOperator(subscribe: CallExpression): boolean {
  const expr = subscribe.getExpression();
  if (!Node.isPropertyAccessExpression(expr)) return false;
  const target = expr.getExpression();
  if (!Node.isCallExpression(target) || getCalleeName(target) !== 'pipe') return false;
  return target.getArguments().some((arg) => {
    const name = Node.isCallExpression(arg)
      ? getCalleeName(arg)
      : Node.isIdentifier(arg)
        ? arg.getText()
        : undefined;
    return name !== undefined && DESTROY_OPS.has(name);
  });
}

function isAssignedAndCleaned(subscribe: CallExpression, cls: ClassDeclaration): boolean {
  if (!isTracked(subscribe)) return false;
  const destroy = cls.getMethod('ngOnDestroy');
  if (!destroy) return false;
  const text = destroy.getText();
  return /unsubscribe|destroy\$\.(next|complete)|takeUntilDestroyed/.test(text);
}

function isTracked(subscribe: CallExpression): boolean {
  const parent = subscribe.getParent();
  if (!parent) return false;
  if (Node.isBinaryExpression(parent)) return true;
  if (Node.isVariableDeclaration(parent)) return true;
  if (Node.isCallExpression(parent)) {
    const name = getCalleeName(parent);
    return name === 'push' || name === 'add';
  }
  if (Node.isPropertyAccessExpression(parent) && Node.isCallExpression(parent.getParent())) {
    const name = parent.getName();
    return name === 'push' || name === 'add';
  }
  return false;
}
