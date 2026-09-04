import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';
import { isBindingName } from '../../utils/bindings';

const SKIP = new Set(['req', 'res', 'next', 'request', 'response']);

export const unusedLocal: Rule = {
  id: 'generic/unused-local',
  pack: 'generic',
  severity: 'warning',
  docs: 'Locals and catch bindings that are never read are leftover agent output.',
  create(ctx) {
    const visitBinding = (nameNode: Node, scope: Node, label: string): void => {
      if (!Node.isIdentifier(nameNode)) return;
      const name = nameNode.getText();
      if (name.startsWith('_') || SKIP.has(name)) return;
      if (isReadInScope(scope, name, nameNode)) return;
      ctx.report(nameNode, `${label} "${name}" is never used.`, {
        seniorNote:
          'Unused bindings are copy-paste leftovers. Prefix with _ if the signature requires it, or delete it.',
      });
    };

    return {
      [SyntaxKind.VariableDeclaration](node) {
        if (!Node.isVariableDeclaration(node)) return;
        if (node.getFirstAncestorByKind(SyntaxKind.CatchClause)) return;
        if (node.isExported()) return;
        const stmt = node.getFirstAncestorByKind(SyntaxKind.VariableStatement);
        if (stmt?.isExported()) return;
        const scope = node.getFirstAncestor(functionHasBody) ?? ctx.sourceFile;
        visitBinding(node.getNameNode(), scope, 'Variable');
      },
      [SyntaxKind.Parameter](node) {
        if (!Node.isParameterDeclaration(node)) return;
        if (node.isParameterProperty()) return;
        const owner = node.getParent();
        if (!owner || !functionHasBody(owner)) return;
        visitBinding(node.getNameNode(), owner, 'Parameter');
      },
      [SyntaxKind.CatchClause](node) {
        if (!Node.isCatchClause(node)) return;
        const decl = node.getVariableDeclaration();
        if (!decl) return;
        visitBinding(decl.getNameNode(), node.getBlock(), 'Catch binding');
      },
    };
  },
};

function isReadInScope(scope: Node, name: string, skip: Node): boolean {
  let used = false;
  scope.forEachDescendant((node) => {
    if (used || node === skip) return;
    if (!Node.isIdentifier(node) || node.getText() !== name) return;
    if (isBindingName(node)) return;
    used = true;
  });
  return used;
}

function functionHasBody(node: Node): boolean {
  if (
    Node.isFunctionDeclaration(node) ||
    Node.isFunctionExpression(node) ||
    Node.isArrowFunction(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isConstructorDeclaration(node) ||
    Node.isGetAccessorDeclaration(node) ||
    Node.isSetAccessorDeclaration(node)
  ) {
    return node.getBody() !== undefined;
  }
  return false;
}
