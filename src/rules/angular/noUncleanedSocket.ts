import { Node, SyntaxKind, type CallExpression, type ClassDeclaration } from 'ts-morph';
import type { Rule } from '../../core/types';
import { getCalleeName, hasDecorator } from '../../utils/ast';

const CLOSERS = new Set(['off', 'removeListener', 'removeAllListeners']);

export const noUncleanedSocket: Rule = {
  id: 'angular/no-uncleaned-socket',
  pack: 'angular',
  severity: 'critical',
  docs: 'Socket or WebSocket .on() in a component must be removed with .off() before destroy.',
  create(ctx) {
    return {
      [SyntaxKind.CallExpression](node) {
        if (!Node.isCallExpression(node)) return;
        if (!isSocketCall(node, 'on')) return;
        const cls = node.getFirstAncestor(Node.isClassDeclaration);
        if (!cls || !hasDecorator(cls, ['Component', 'Directive'])) return;
        if (hasSocketCloser(cls)) return;
        ctx.report(node, 'Socket .on() is never removed. This leaks after destroy.', {
          seniorNote:
            'The listener keeps firing on a destroyed view. Call .off() in ngOnDestroy or destroyRef.onDestroy.',
        });
      },
    };
  },
};

function isSocketCall(call: CallExpression, method: string): boolean {
  if (getCalleeName(call) !== method) return false;
  const expr = call.getExpression();
  if (!Node.isPropertyAccessExpression(expr)) return false;
  return isSocketName(expr.getExpression().getText());
}

function isSocketName(text: string): boolean {
  if (/socket|websocket/i.test(text)) return true;
  const last = text.split('.').pop() ?? '';
  return last === 'ws' || last === 'io';
}

function hasSocketCloser(cls: ClassDeclaration): boolean {
  for (const call of cls.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (!Node.isCallExpression(call)) continue;
    const name = getCalleeName(call);
    if (!name || !CLOSERS.has(name)) continue;
    if (isSocketCall(call, name)) return true;
  }
  return false;
}
