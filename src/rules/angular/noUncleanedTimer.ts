import { Node, SyntaxKind, type MethodDeclaration } from 'ts-morph';
import type { Rule } from '../../core/types';
import { getCalleeName, hasDecorator } from '../../utils/ast';

const CLOSERS: Record<string, string> = {
  setInterval: 'clearInterval',
  addEventListener: 'removeEventListener',
};

export const noUncleanedTimer: Rule = {
  id: 'angular/no-uncleaned-timer',
  pack: 'angular',
  severity: 'critical',
  docs: 'setInterval and addEventListener in ngOnInit must be cleared in ngOnDestroy.',
  create(ctx) {
    return {
      [SyntaxKind.CallExpression](node) {
        if (!Node.isCallExpression(node)) return;
        const name = getCalleeName(node);
        const closer = name ? CLOSERS[name] : undefined;
        if (!name || !closer) return;
        const method = node.getFirstAncestor(Node.isMethodDeclaration);
        if (!method || (method.getName() !== 'ngOnInit' && method.getName() !== 'constructor')) return;
        const cls = node.getFirstAncestor(Node.isClassDeclaration);
        if (!cls || !hasDecorator(cls, ['Component', 'Directive'])) return;
        if (hasCloser(cls.getMethod('ngOnDestroy'), closer)) return;
        ctx.report(node, `${name}() in ${method.getName()} is never cleared. This leaks after destroy.`, {
          seniorNote:
            'The interval or listener keeps firing on a dead view. Store the handle and clear it in ngOnDestroy.',
        });
      },
    };
  },
};

function hasCloser(destroy: MethodDeclaration | undefined, closer: string): boolean {
  if (!destroy) return false;
  for (const call of destroy.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (getCalleeName(call) === closer) return true;
  }
  return false;
}
