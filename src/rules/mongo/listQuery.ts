import { Node, type CallExpression } from 'ts-morph';
import { getCalleeName, isFunctionLike } from '../../utils/ast';

export function isMongooseListFind(call: CallExpression): boolean {
  if (getCalleeName(call) !== 'find') return false;
  const expr = call.getExpression();
  if (!Node.isPropertyAccessExpression(expr)) return false;
  const first = call.getArguments()[0];
  if (first && isFunctionLike(first)) return false;
  return isQueryObject(expr.getExpression());
}

export function queryChainMethods(start: CallExpression): Set<string> {
  const names = new Set<string>();
  const startName = getCalleeName(start);
  if (startName) names.add(startName);
  let current: Node = start;
  while (true) {
    const parent = current.getParent();
    if (!parent || !Node.isPropertyAccessExpression(parent)) break;
    const next = parent.getParent();
    if (!next || !Node.isCallExpression(next)) break;
    names.add(parent.getName());
    current = next;
  }
  return names;
}

export function findHasLimitOption(call: CallExpression): boolean {
  const opts = call.getArguments()[2];
  if (!opts || !Node.isObjectLiteralExpression(opts)) return false;
  return opts.getProperties().some((prop) => {
    if (Node.isPropertyAssignment(prop) || Node.isShorthandPropertyAssignment(prop)) {
      return prop.getName() === 'limit';
    }
    return false;
  });
}

function isQueryObject(obj: Node): boolean {
  if (Node.isIdentifier(obj)) {
    const name = obj.getText();
    return /^[A-Z]/.test(name) || /(Model|Repository|Repo)$/.test(name);
  }
  if (Node.isPropertyAccessExpression(obj) && obj.getExpression().getText() === 'mongoose') return true;
  return Node.isPropertyAccessExpression(obj);
}
