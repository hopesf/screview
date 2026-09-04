import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';
import { isImportBinding, namedUses } from '../../utils/bindings';

export const unusedImport: Rule = {
  id: 'generic/unused-import',
  pack: 'generic',
  severity: 'warning',
  docs: 'Imported names that are never referenced are leftover agent output.',
  create(ctx) {
    return {
      [SyntaxKind.ImportDeclaration](node) {
        if (!Node.isImportDeclaration(node)) return;
        const clause = node.getImportClause();
        if (!clause) return;

        const defaultImport = clause.getDefaultImport();
        if (defaultImport && namedUses(ctx.sourceFile, defaultImport.getText()).every(isImportBinding)) {
          ctx.report(defaultImport, `Import "${defaultImport.getText()}" is never used.`, {
            seniorNote: 'Dead imports rot diffs and hide the real dependencies. Delete it.',
          });
        }

        const ns = clause.getNamedBindings();
        if (ns && Node.isNamespaceImport(ns)) {
          const name = ns.getName();
          if (namedUses(ctx.sourceFile, name).every(isImportBinding)) {
            ctx.report(ns, `Import "${name}" is never used.`, {
              seniorNote: 'Dead imports rot diffs and hide the real dependencies. Delete it.',
            });
          }
          return;
        }

        for (const spec of node.getNamedImports()) {
          const name = spec.getAliasNode()?.getText() ?? spec.getName();
          if (namedUses(ctx.sourceFile, name).every(isImportBinding)) {
            ctx.report(spec, `Import "${name}" is never used.`, {
              seniorNote: 'Dead imports rot diffs and hide the real dependencies. Delete it.',
            });
          }
        }
      },
    };
  },
};
