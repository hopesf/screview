import { Node, SyntaxKind, type SourceFile } from 'ts-morph';

export function namedUses(sourceFile: SourceFile, name: string): Node[] {
  const uses: Node[] = [];
  sourceFile.forEachDescendant((node) => {
    if (!Node.isIdentifier(node)) return;
    if (node.getText() !== name) return;
    uses.push(node);
  });
  return uses;
}

export function isImportBinding(node: Node): boolean {
  const parent = node.getParent();
  if (!parent) return false;
  if (Node.isImportSpecifier(parent)) {
    return parent.getNameNode() === node || parent.getAliasNode() === node;
  }
  if (Node.isImportClause(parent)) return parent.getDefaultImport() === node;
  if (Node.isNamespaceImport(parent)) return parent.getNameNode() === node;
  return false;
}

export function isBindingName(node: Node): boolean {
  if (isImportBinding(node)) return true;
  const parent = node.getParent();
  if (!parent) return false;
  if (Node.isVariableDeclaration(parent) && parent.getNameNode() === node) return true;
  if (Node.isParameterDeclaration(parent) && parent.getNameNode() === node) return true;
  return false;
}

export function isTypePosition(node: Node): boolean {
  let current: Node | undefined = node;
  while (current) {
    if (Node.isImportSpecifier(current) || Node.isImportClause(current)) return false;
    if (Node.isDecorator(current)) return false;
    if (Node.isTypeNode(current)) return true;
    if (Node.isHeritageClause(current)) {
      return current.getToken() === SyntaxKind.ImplementsKeyword;
    }
    current = current.getParent();
  }
  return false;
}
