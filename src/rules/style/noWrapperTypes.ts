import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';

const WRAPPERS = new Set(['Boolean', 'Number', 'String', 'Object', 'Symbol']);

export const noWrapperTypes: Rule = {
  id: 'style/no-wrapper-types',
  pack: 'style',
  severity: 'warning',
  docs: 'Use boolean, number, string, object, and symbol in type positions, not the wrapper objects.',
  create(ctx) {
    return {
      [SyntaxKind.TypeReference](node) {
        if (!Node.isTypeReference(node)) return;
        const name = node.getTypeName();
        if (!Node.isIdentifier(name) || !WRAPPERS.has(name.getText())) return;
        ctx.report(name, `Use the primitive type instead of ${name.getText()}.`, {
          seniorNote: 'Boolean and String as types mean the wrapper objects, not the primitives. That is almost never what you wanted.',
        });
      },
    };
  },
};
