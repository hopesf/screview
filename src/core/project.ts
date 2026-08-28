import { statSync } from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { Project, ts } from 'ts-morph';

const EXTENSIONS = '{ts,tsx,js,jsx}';

const ALWAYS_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.git/**',
  '**/*.d.ts',
];

export async function createAuditProject(options: {
  paths: string[];
  ignore: string[];
  cwd: string;
}): Promise<{ project: Project; filePaths: string[] }> {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
    compilerOptions: {
      allowJs: true,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      esModuleInterop: true,
      experimentalDecorators: true,
    },
  });

  const globs = toGlobs(options.paths, options.cwd);
  const filePaths = await fg(globs, {
    cwd: options.cwd,
    absolute: true,
    ignore: [...ALWAYS_IGNORE, ...options.ignore],
    onlyFiles: true,
    unique: true,
  });

  for (const filePath of filePaths) {
    project.addSourceFileAtPath(filePath);
  }

  return { project, filePaths };
}

function toGlobs(paths: string[], cwd: string): string[] {
  return paths.map((input) => {
    const abs = path.resolve(cwd, input);
    try {
      if (statSync(abs).isDirectory()) {
        return toPosix(path.join(input, `**/*.${EXTENSIONS}`));
      }
    } catch {
      return toPosix(input);
    }
    return toPosix(input);
  });
}

function toPosix(value: string): string {
  return value.split(path.sep).join('/');
}
