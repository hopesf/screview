import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';
import { isImportBinding, isTypePosition, namedUses } from '../../utils/bindings';

export const importType: Rule = {
  id: 'style/import-type',
  pack: 'style',
  severity: 'warning',
  docs: 'Imports used only as types should be import type so they erase at runtime.',
  create(ctx) {
    return {
      [SyntaxKind.ImportDeclaration](node) {
        if (!Node.isImportDeclaration(node) || node.isTypeOnly()) return;
        for (const spec of node.getNamedImports()) {
          if (spec.isTypeOnly()) continue;
          const name = spec.getAliasNode()?.getText() ?? spec.getName();
          const uses = namedUses(ctx.sourceFile, name).filter((id) => !isImportBinding(id));
          if (uses.length === 0) continue;
          if (!uses.every(isTypePosition)) continue;
          ctx.report(spec, `Import "${name}" is only used as a type. Use import type.`, {
            seniorNote:
              'A value import of a type-only name is a runtime dependency that does not exist. Switch it to import type.',
          });
        }
      },
    };
  },
};
