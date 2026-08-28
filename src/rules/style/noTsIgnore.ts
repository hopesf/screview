import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';

const BAN = /^\s*(?:\/\/|\*|\/\*)\s*@ts-(ignore|nocheck|expect-error)\b/;

export const noTsIgnore: Rule = {
  id: 'style/no-ts-ignore',
  pack: 'style',
  severity: 'warning',
  docs: 'TypeScript: @ts-ignore hides errors instead of fixing them.',
  create(ctx) {
    return {
      [SyntaxKind.SourceFile](node) {
        if (!Node.isSourceFile(node)) return;
        const lines = node.getFullText().split(/\r?\n/);
        for (const [index, line] of lines.entries()) {
          if (!BAN.test(line)) continue;
          const pos = node.compilerNode.getPositionOfLineAndCharacter(index, 0);
          const target = node.getDescendantAtPos(pos) ?? node;
          ctx.report(target, 'Remove @ts-ignore / @ts-nocheck. Fix the type error instead.');
        }
      },
    };
  },
};
