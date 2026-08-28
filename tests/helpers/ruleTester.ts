import { Project, ts, type SourceFile } from 'ts-morph';
import { runEngine } from '../../src/core/engine';
import type { Finding, Rule } from '../../src/core/types';

export function runRule(
  rule: Rule,
  options: { code: string; filename?: string },
): Finding[] {
  return runEngine([createFile(options.filename ?? 'file.ts', options.code)], [rule], process.cwd());
}

export function createFile(filename: string, code: string): SourceFile {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
    compilerOptions: {
      allowJs: true,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ESNext,
      experimentalDecorators: true,
    },
  });
  return project.createSourceFile(filename, code);
}
