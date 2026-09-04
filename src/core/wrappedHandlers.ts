import { Node, type SourceFile } from 'ts-morph';
import { getCalleeName } from '../utils/ast';

const WRAPPERS = new Set([
  'asyncHandler',
  'catchAsync',
  'wrapAsync',
  'asyncRoute',
  'expressAsyncHandler',
]);

export function collectWrappedHandlers(sourceFiles: SourceFile[]): Set<string> {
  const names = new Set<string>();
  for (const sourceFile of sourceFiles) {
    sourceFile.forEachDescendant((node) => {
      if (!Node.isCallExpression(node)) return;
      const callee = getCalleeName(node);
      if (!callee || !WRAPPERS.has(callee)) return;
      const arg = node.getArguments()[0];
      if (!arg) return;
      if (Node.isIdentifier(arg)) {
        names.add(arg.getText());
        return;
      }
      if (Node.isPropertyAccessExpression(arg)) names.add(arg.getName());
    });
  }
  return names;
}
