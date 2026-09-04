import path from 'node:path';
import { Node, SyntaxKind, type SourceFile } from 'ts-morph';

export function collectRelativeTargets(
  sourceFile: SourceFile,
  files: Set<string>,
  options: { typeOnly: boolean; dynamic: boolean },
): string[] {
  const from = sourceFile.getFilePath();
  const targets = new Set<string>();

  for (const imp of sourceFile.getImportDeclarations()) {
    if (!options.typeOnly && imp.isTypeOnly()) continue;
    addTarget(targets, from, imp.getModuleSpecifierValue(), files);
  }
  for (const exp of sourceFile.getExportDeclarations()) {
    if (!options.typeOnly && exp.isTypeOnly()) continue;
    const spec = exp.getModuleSpecifierValue();
    if (!spec) continue;
    addTarget(targets, from, spec, files);
  }
  if (options.dynamic) {
    sourceFile.forEachDescendant((node) => {
      if (!Node.isCallExpression(node)) return;
      if (node.getExpression().getKind() !== SyntaxKind.ImportKeyword) return;
      const arg = node.getArguments()[0];
      if (!arg || !Node.isStringLiteral(arg)) return;
      addTarget(targets, from, arg.getLiteralValue(), files);
    });
  }
  return [...targets];
}

export function resolveRelative(fromFile: string, spec: string, files: Set<string>): string | undefined {
  if (!spec.startsWith('.')) return undefined;
  const dir = path.dirname(fromFile);
  const abs = path.resolve(dir, spec);
  const noJs = spec.replace(/\.(js|mjs|cjs)$/, '');
  const absNoJs = path.resolve(dir, noJs);
  const candidates = [
    abs,
    `${abs}.ts`,
    `${abs}.tsx`,
    `${abs}.js`,
    `${abs}.jsx`,
    path.join(abs, 'index.ts'),
    path.join(abs, 'index.tsx'),
    path.join(abs, 'index.js'),
    absNoJs,
    `${absNoJs}.ts`,
    `${absNoJs}.tsx`,
    `${absNoJs}.js`,
    `${absNoJs}.jsx`,
    path.join(absNoJs, 'index.ts'),
    path.join(absNoJs, 'index.tsx'),
    path.join(absNoJs, 'index.js'),
  ];
  for (const candidate of candidates) {
    if (files.has(candidate)) return candidate;
  }
  return undefined;
}

function addTarget(targets: Set<string>, from: string, spec: string, files: Set<string>): void {
  const resolved = resolveRelative(from, spec, files);
  if (resolved) targets.add(resolved);
}
