import path from 'node:path';
import { Node, SyntaxKind } from 'ts-morph';
import type { Rule } from '../../core/types';
import { getCalleeName, isExpressHandler, isFunctionLike } from '../../utils/ast';

const SYNC = new Set([
  'existsSync',
  'readFileSync',
  'writeFileSync',
  'unlinkSync',
  'readdirSync',
  'execSync',
  'spawnSync',
]);

const HOT_FILE = /\.(controller|routes|router|middleware)\./i;

export const syncFsInHandler: Rule = {
  id: 'generic/sync-fs-in-handler',
  pack: 'generic',
  severity: 'warning',
  docs: 'Sync fs and child_process calls on a request path block the event loop.',
  create(ctx) {
    const hotFile = HOT_FILE.test(ctx.filePath);
    return {
      [SyntaxKind.CallExpression](node) {
        if (!Node.isCallExpression(node)) return;
        const name = getCalleeName(node);
        if (!name || !SYNC.has(name)) return;
        if (isSeedFile(ctx.filePath)) return;
        if (!hotFile && !inExpressHandler(node)) return;
        ctx.report(node, `Sync ${name} on a request path blocks the event loop.`, {
          seniorNote:
            'existsSync and readFileSync freeze every in-flight request. Use the promise fs APIs or do this work at startup.',
        });
      },
    };
  },
};

function isSeedFile(filePath: string): boolean {
  const base = path.posix.basename(filePath.replaceAll('\\', '/')).toLowerCase();
  if (base.startsWith('seed')) return true;
  return /(^|\/)seeds?\//i.test(filePath);
}

function inExpressHandler(node: Node): boolean {
  let current: Node | undefined = node.getParent();
  while (current) {
    if (isFunctionLike(current) && isExpressHandler(current)) return true;
    current = current.getParent();
  }
  return false;
}
