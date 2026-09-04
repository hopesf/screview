import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';

export const leftoverDebugger: Rule = {
  id: 'generic/debugger',
  pack: 'generic',
  severity: 'critical',
  docs: 'debugger statements are leftover agent or local-debug junk.',
  create(ctx) {
    return {
      [SyntaxKind.DebuggerStatement](node) {
        if (!Node.isDebuggerStatement(node)) return;
        ctx.report(node, 'Remove leftover debugger.', {
          seniorNote: 'A debugger statement will freeze the process in production. Delete it before merge.',
        });
      },
    };
  },
};
