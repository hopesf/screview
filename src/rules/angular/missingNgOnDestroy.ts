import { Node, SyntaxKind, type CallExpression, type ClassDeclaration } from 'ts-morph';
import type { Rule } from '../../core/types';
import { getCalleeName, hasDecorator } from '../../utils/ast';

const DESTROY_OPS = new Set(['takeUntil', 'takeUntilDestroyed', 'take', 'first', 'takeWhile']);

export const missingNgOnDestroy: Rule = {
  id: 'angular/missing-ngondestroy',
  pack: 'angular',
  severity: 'critical',
  docs: 'Components that store subscriptions, intervals, or listeners need ngOnDestroy.',
  create(ctx) {
    return {
      [SyntaxKind.ClassDeclaration](node) {
        if (!Node.isClassDeclaration(node)) return;
        if (!hasDecorator(node, ['Component', 'Directive'])) return;
        if (node.getMethod('ngOnDestroy')) return;
        if (!needsDestroy(node)) return;
        ctx.report(node, 'Component holds subscriptions or timers but has no ngOnDestroy.', {
          seniorNote:
            'Whatever you opened in ngOnInit is still running after the user left. Implement ngOnDestroy and tear it down.',
        });
      },
    };
  },
};

function needsDestroy(cls: ClassDeclaration): boolean {
  for (const call of cls.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (!Node.isCallExpression(call)) continue;
    const name = getCalleeName(call);
    if (name === 'setInterval' || name === 'addEventListener') return true;
    if (name === 'subscribe' && !hasDestroyOperator(call)) return true;
  }
  return false;
}

function hasDestroyOperator(subscribe: CallExpression): boolean {
  const expr = subscribe.getExpression();
  if (!Node.isPropertyAccessExpression(expr)) return false;
  const target = expr.getExpression();
  if (!Node.isCallExpression(target) || getCalleeName(target) !== 'pipe') return false;
  return target.getArguments().some((arg) => {
    const op = Node.isCallExpression(arg)
      ? getCalleeName(arg)
      : Node.isIdentifier(arg)
        ? arg.getText()
        : undefined;
    return op !== undefined && DESTROY_OPS.has(op);
  });
}
