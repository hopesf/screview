import { Node, SyntaxKind, type AwaitExpression } from 'ts-morph';
import type { Rule } from '../../core/types';
import {
  getCalleeName,
  getFunctionBody,
  isFunctionLike,
  isInLoopContext,
  isIterationCallback,
  isLoop,
} from '../../utils/ast';

export const awaitInLoop: Rule = {
  id: 'generic/await-in-loop',
  pack: 'generic',
  severity: 'warning',
  docs: 'Await inside a loop or array iterator runs sequentially and often hides an N+1.',
  create(ctx) {
    return {
      [SyntaxKind.AwaitExpression](node) {
        if (!Node.isAwaitExpression(node)) return;
        if (!isInLoopContext(node)) return;
        if (dependsOnLoopState(node)) return;
        if (isDelayAwait(node) || isRetryLoop(node)) return;
        ctx.report(node, 'Await inside a loop. Prefer Promise.all or a bulk operation.', {
          seniorNote:
            'Each iteration waits for the previous one. If this list grows, latency grows with it. Collect the work and await it once.',
        });
      },
    };
  },
};

function dependsOnLoopState(awaitExpr: AwaitExpression): boolean {
  const assigned = namesAssignedInEnclosingLoopBody(awaitExpr);
  if (assigned.size === 0) return false;
  const used = identifiersIn(awaitExpr.getExpression());
  for (const name of used) {
    if (assigned.has(name)) return true;
  }
  return false;
}

function namesAssignedInEnclosingLoopBody(node: Node): Set<string> {
  let current = node.getParent();
  while (current) {
    if (isLoop(current)) {
      return assignmentsIn(loopBody(current) ?? current);
    }
    if (isFunctionLike(current) && isIterationCallback(current)) {
      return assignmentsIn(getFunctionBody(current) ?? current);
    }
    if (isFunctionLike(current)) return new Set();
    current = current.getParent();
  }
  return new Set();
}

function loopBody(loop: Node): Node | undefined {
  if (
    Node.isForStatement(loop) ||
    Node.isForOfStatement(loop) ||
    Node.isForInStatement(loop) ||
    Node.isWhileStatement(loop) ||
    Node.isDoStatement(loop)
  ) {
    return loop.getStatement();
  }
  return undefined;
}

function assignmentsIn(root: Node): Set<string> {
  const names = new Set<string>();
  root.forEachDescendant((child, traversal) => {
    if (isFunctionLike(child) && child !== root) {
      traversal.skip();
      return;
    }
    if (!Node.isBinaryExpression(child)) return;
    if (child.getOperatorToken().getKind() !== SyntaxKind.EqualsToken) return;
    const left = child.getLeft();
    if (Node.isIdentifier(left)) names.add(left.getText());
  });
  return names;
}

function identifiersIn(root: Node): Set<string> {
  const names = new Set<string>();
  if (Node.isIdentifier(root)) names.add(root.getText());
  root.forEachDescendant((child) => {
    if (Node.isIdentifier(child)) names.add(child.getText());
  });
  return names;
}

function isDelayAwait(awaitExpr: AwaitExpression): boolean {
  const expr = awaitExpr.getExpression();
  const text = expr.getText();
  if (/setTimeout|setImmediate/.test(text)) return true;
  if (!Node.isCallExpression(expr)) return false;
  const name = getCalleeName(expr);
  return name === 'sleep' || name === 'delay' || name === 'wait';
}

function isRetryLoop(awaitExpr: AwaitExpression): boolean {
  let current: Node | undefined = awaitExpr.getParent();
  while (current) {
    if (isLoop(current)) {
      const body = loopBody(current) ?? current;
      const hasCatch = body.getDescendantsOfKind(SyntaxKind.CatchClause).length > 0;
      const text = current.getText();
      const looksLikeRetry = /\battempt\b|\bretries\b|\bretry\b|\btries\b/.test(text);
      return hasCatch && looksLikeRetry;
    }
    if (isFunctionLike(current)) return false;
    current = current.getParent();
  }
  return false;
}
