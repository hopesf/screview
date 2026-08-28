import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';
import { getCalleeName, hasDecorator } from '../../utils/ast';

const OPENERS = new Set(['setInterval', 'addEventListener']);
const CLOSERS = ['clearInterval', 'removeEventListener', 'clearTimeout'];

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
        if (!name || !OPENERS.has(name)) return;
        const method = node.getFirstAncestor(Node.isMethodDeclaration);
        if (!method || (method.getName() !== 'ngOnInit' && method.getName() !== 'constructor')) return;
        const cls = node.getFirstAncestor(Node.isClassDeclaration);
        if (!cls || !hasDecorator(cls, ['Component', 'Directive'])) return;
        const destroy = cls.getMethod('ngOnDestroy');
        const destroyText = destroy?.getText() ?? '';
        const cleaned = CLOSERS.some((closer) => destroyText.includes(closer));
        if (cleaned) return;
        ctx.report(node, `${name}() in ${method.getName()} is never cleared. This leaks after destroy.`, {
          seniorNote:
            'The interval or listener keeps firing on a dead view. Store the handle and clear it in ngOnDestroy.',
        });
      },
    };
  },
};
