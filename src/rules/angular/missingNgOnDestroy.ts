import { Node, SyntaxKind, type ClassDeclaration } from 'ts-morph';
import type { Rule } from '../../core/types';
import { getCalleeName, hasDecorator } from '../../utils/ast';

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
  const text = cls.getText();
  if (/\bSubscription\b/.test(text) && /subscribe\s*\(/.test(text)) return true;
  for (const call of cls.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const name = getCalleeName(call);
    if (name === 'setInterval' || name === 'addEventListener') return true;
  }
  return false;
}
