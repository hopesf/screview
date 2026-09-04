import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { Framework } from './types';

export type Language = 'typescript' | 'javascript';
export type AppFramework = Extract<Framework, 'express' | 'angular' | 'react' | 'mongo' | 'db'>;

export interface ProjectProfile {
  language: Language;
  frameworks: AppFramework[];
}

const FRAMEWORK_PACKAGES: Record<AppFramework, string[]> = {
  express: ['express', 'express-serve-static-core'],
  angular: ['@angular/core'],
  react: ['react', 'next', 'react-native', 'preact', '@remix-run/react', 'gatsby', 'expo'],
  mongo: ['mongoose', 'mongodb', '@nestjs/mongoose'],
  db: ['typeorm', 'prisma', '@prisma/client', 'sequelize', 'mikro-orm', '@mikro-orm/core', 'drizzle-orm'],
};

const CONFIG_HINTS: Array<{ file: string; framework?: AppFramework; language?: Language }> = [
  { file: 'angular.json', framework: 'angular' },
  { file: 'next.config.ts', framework: 'react' },
  { file: 'next.config.js', framework: 'react' },
  { file: 'next.config.mjs', framework: 'react' },
  { file: 'prisma/schema.prisma', framework: 'db' },
  { file: 'jsconfig.json', language: 'javascript' },
];

export function detectProject(cwd: string, filePaths: string[] = []): ProjectProfile {
  const root = findProjectRoot(cwd);
  const pkg = readPackage(root);
  const names = depNames(pkg);
  const frameworks = new Set<AppFramework>();

  for (const [framework, packages] of Object.entries(FRAMEWORK_PACKAGES) as Array<
    [AppFramework, string[]]
  >) {
    if (packages.some((name) => names.has(name))) frameworks.add(framework);
  }

  for (const hint of CONFIG_HINTS) {
    if (!existsSync(path.join(root, hint.file))) continue;
    if (hint.framework) frameworks.add(hint.framework);
  }

  const language = resolveLanguage(root, pkg, filePaths);
  return {
    language,
    frameworks: [...frameworks].sort(),
  };
}

function resolveLanguage(
  root: string,
  pkg: PackageJson | undefined,
  filePaths: string[],
): Language {
  if (existsSync(path.join(root, 'tsconfig.json'))) return 'typescript';
  const names = depNames(pkg);
  if (names.has('typescript') || names.has('ts-node') || names.has('tsx')) return 'typescript';
  if (filePaths.some((file) => /\.tsx?$/.test(file))) return 'typescript';
  if (filePaths.some((file) => /\.jsx?$/.test(file))) return 'javascript';
  if (existsSync(path.join(root, 'jsconfig.json'))) return 'javascript';
  if (hasSourceExt(root, ['.ts', '.tsx'])) return 'typescript';
  return 'javascript';
}

function findProjectRoot(startDir: string): string {
  let dir = path.resolve(startDir);
  while (true) {
    if (existsSync(path.join(dir, 'package.json')) || existsSync(path.join(dir, 'tsconfig.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(startDir);
    dir = parent;
  }
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function readPackage(root: string): PackageJson | undefined {
  const file = path.join(root, 'package.json');
  if (!existsSync(file)) return undefined;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as PackageJson;
  } catch {
    return undefined;
  }
}

function depNames(pkg: PackageJson | undefined): Set<string> {
  if (!pkg) return new Set();
  return new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ]);
}

function hasSourceExt(root: string, exts: string[]): boolean {
  const src = path.join(root, 'src');
  const dir = existsSync(src) ? src : root;
  try {
    return readdirSync(dir).some((name) => exts.some((ext) => name.endsWith(ext)));
  } catch {
    return false;
  }
}
