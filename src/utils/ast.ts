import path from 'node:path';
import {
  Node,
  SyntaxKind,
  type BinaryExpression,
  type CallExpression,
  type ClassDeclaration,
  type SourceFile,
} from 'ts-morph';

const ITERATION_METHODS = new Set([
  'forEach',
  'map',
  'filter',
  'reduce',
  'every',
  'some',
  'flatMap',
  'find',
  'findIndex',
]);

const RES_METHODS = new Set([
  'send',
  'json',
  'end',
  'sendFile',
  'redirect',
  'render',
  'sendStatus',
  'jsonp',
  'download',
]);

export function displayPath(filePath: string, cwd: string): string {
  const relative = path.relative(cwd, filePath);
  const value = relative && !relative.startsWith('..') ? relative : filePath;
  return value.split(path.sep).join('/');
}

export function snippetOf(node: Node): string {
  const line = node.getText().split(/\r?\n/)[0] ?? '';
  return line.length > 80 ? `${line.slice(0, 77)}...` : line;
}

export function isFunctionLike(node: Node): boolean {
  return (
    Node.isFunctionDeclaration(node) ||
    Node.isFunctionExpression(node) ||
    Node.isArrowFunction(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isConstructorDeclaration(node) ||
    Node.isGetAccessorDeclaration(node) ||
    Node.isSetAccessorDeclaration(node)
  );
}

export function getCalleeName(call: CallExpression): string | undefined {
  const expr = call.getExpression();
  if (Node.isIdentifier(expr)) return expr.getText();
  if (Node.isPropertyAccessExpression(expr)) return expr.getName();
  return undefined;
}

export function isLoop(node: Node): boolean {
  return (
    Node.isForStatement(node) ||
    Node.isForOfStatement(node) ||
    Node.isForInStatement(node) ||
    Node.isWhileStatement(node) ||
    Node.isDoStatement(node)
  );
}

export function isIterationCallback(fn: Node): boolean {
  const parent = fn.getParent();
  if (!parent || !Node.isCallExpression(parent)) return false;
  const name = getCalleeName(parent);
  return name !== undefined && ITERATION_METHODS.has(name);
}

export function isInLoopContext(node: Node): boolean {
  let current = node.getParent();
  while (current) {
    if (isLoop(current)) {
      if (Node.isForOfStatement(current) && current.isAwaited()) return false;
      return true;
    }
    if (isFunctionLike(current)) {
      if (isIterationCallback(current)) return true;
      return false;
    }
    current = current.getParent();
  }
  return false;
}

export function isInsideTry(node: Node): boolean {
  return node.getFirstAncestor(Node.isTryStatement) !== undefined;
}

export function looksLikeRes(node: Node): boolean {
  if (Node.isIdentifier(node)) {
    const name = node.getText().toLowerCase();
    return name === 'res' || name === 'response';
  }
  if (Node.isCallExpression(node)) {
    const expr = node.getExpression();
    if (Node.isPropertyAccessExpression(expr)) return looksLikeRes(expr.getExpression());
  }
  if (Node.isPropertyAccessExpression(node)) return looksLikeRes(node.getExpression());
  return false;
}

export function isResponseCall(call: CallExpression): boolean {
  const expr = call.getExpression();
  if (!Node.isPropertyAccessExpression(expr)) return false;
  if (!RES_METHODS.has(expr.getName())) return false;
  return looksLikeRes(expr.getExpression());
}

export function isNextCall(call: CallExpression, withArg = false): boolean {
  const expr = call.getExpression();
  if (!Node.isIdentifier(expr) || expr.getText() !== 'next') return false;
  return withArg ? call.getArguments().length > 0 : true;
}

export function isExpressHandler(fn: Node): boolean {
  const params = getParameters(fn);
  if (params.length < 2 || params.length > 4) return false;
  const names = params.map((p) => p.getName().toLowerCase());
  const req = names[0] === 'req' || names[0] === 'request';
  const res = names[1] === 'res' || names[1] === 'response';
  if (req && res) return true;
  const types = params.map((p) => p.getTypeNode()?.getText() ?? '');
  return types[0]?.includes('Request') === true && types[1]?.includes('Response') === true;
}

function getParameters(fn: Node) {
  if (
    Node.isFunctionDeclaration(fn) ||
    Node.isFunctionExpression(fn) ||
    Node.isArrowFunction(fn) ||
    Node.isMethodDeclaration(fn) ||
    Node.isConstructorDeclaration(fn)
  ) {
    return fn.getParameters();
  }
  return [];
}

export function hasDecorator(cls: ClassDeclaration, names: string[]): boolean {
  return cls.getDecorators().some((d) => names.includes(d.getName()));
}

export function getEnclosingFunction(node: Node): Node | undefined {
  return node.getFirstAncestor(isFunctionLike);
}

export function isAsyncFunction(fn: Node): boolean {
  if (
    Node.isFunctionDeclaration(fn) ||
    Node.isFunctionExpression(fn) ||
    Node.isArrowFunction(fn) ||
    Node.isMethodDeclaration(fn)
  ) {
    return fn.isAsync();
  }
  return false;
}

export function resolveAsyncCallee(
  call: CallExpression,
  sourceFile: SourceFile,
): boolean {
  const expr = call.getExpression();
  if (Node.isIdentifier(expr)) {
    return findAsyncFunction(sourceFile, expr.getText());
  }
  if (Node.isPropertyAccessExpression(expr) && expr.getExpression().getText() === 'this') {
    const cls = call.getFirstAncestor(Node.isClassDeclaration);
    const method = cls?.getMethod(expr.getName());
    return method?.isAsync() === true;
  }
  return false;
}

function findAsyncFunction(sourceFile: SourceFile, name: string): boolean {
  const fn = sourceFile.getFunction(name);
  if (fn?.isAsync()) return true;
  for (const stmt of sourceFile.getVariableStatements()) {
    for (const decl of stmt.getDeclarations()) {
      if (decl.getName() !== name) continue;
      const init = decl.getInitializer();
      if (init && isFunctionLike(init) && isAsyncFunction(init)) return true;
    }
  }
  return false;
}

export function isVoided(node: Node): boolean {
  const parent = node.getParent();
  return parent?.getKind() === SyntaxKind.VoidExpression;
}

export function isHandledPromise(call: CallExpression): boolean {
  if (isVoided(call)) return true;
  const parent = call.getParent();
  if (Node.isAwaitExpression(parent)) return true;
  if (Node.isReturnStatement(parent)) return true;
  if (Node.isVariableDeclaration(parent)) return true;
  if (Node.isBinaryExpression(parent) && isAssignment(parent)) return true;
  if (Node.isPropertyAccessExpression(parent)) {
    const name = parent.getName();
    if (name === 'then' || name === 'catch' || name === 'finally') return true;
  }
  return false;
}

function isAssignment(node: BinaryExpression): boolean {
  return node.getOperatorToken().getKind() === SyntaxKind.EqualsToken;
}

export function isPascalCase(name: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/.test(name);
}

export function functionName(fn: Node): string | undefined {
  if (Node.isFunctionDeclaration(fn) || Node.isMethodDeclaration(fn)) return fn.getName();
  const parent = fn.getParent();
  if (parent && Node.isVariableDeclaration(parent) && Node.isIdentifier(parent.getNameNode())) {
    return parent.getName();
  }
  return undefined;
}

export function isReactComponent(fn: Node): boolean {
  const name = functionName(fn);
  if (!name || !isPascalCase(name)) return false;
  return (
    fn.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
    fn.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0 ||
    fn.getDescendantsOfKind(SyntaxKind.JsxFragment).length > 0 ||
    looksLikeComponent(fn)
  );
}

function looksLikeComponent(fn: Node): boolean {
  return /useState|useEffect|useReducer|useRef/.test(fn.getText());
}

export function getFunctionBody(fn: Node): Node | undefined {
  if (
    Node.isFunctionDeclaration(fn) ||
    Node.isFunctionExpression(fn) ||
    Node.isArrowFunction(fn) ||
    Node.isMethodDeclaration(fn)
  ) {
    return fn.getBody();
  }
  return undefined;
}
