import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import type { Finding, ProgramRule } from '../core/types';
import { displayPath } from '../utils/ast';
import { collectRelativeTargets } from './relativeModules';

const ENTRY_BASENAMES = new Set([
  'index.ts',
  'index.tsx',
  'index.js',
  'index.jsx',
  'main.ts',
  'main.tsx',
  'main.js',
  'app.ts',
  'app.tsx',
  'app.js',
  'server.ts',
  'server.js',
  'cli.ts',
  'cli.js',
]);

const SKIP_FILE = /\.(config|setup)\.[cm]?[jt]sx?$/i;

export const orphanFile: ProgramRule = {
  id: 'structure/orphan-file',
  pack: 'structure',
  severity: 'warning',
  docs: 'A source file that no entry module imports is leftover agent output.',
  run(ctx) {
    const files = new Set(ctx.sourceFiles.map((sf) => String(sf.getFilePath())));
    const pathSet = new Set(ctx.sourceFiles.map((sf) => sf.getFilePath()));
    const entries = collectEntries(ctx.cwd, [...files]);
    if (entries.size === 0) return [];

    const graph = new Map<string, string[]>();
    for (const sourceFile of ctx.sourceFiles) {
      graph.set(
        String(sourceFile.getFilePath()),
        collectRelativeTargets(sourceFile, pathSet, { typeOnly: true, dynamic: true }).map(String),
      );
    }

    const reachable = new Set<string>();
    const stack = [...entries].filter((file) => files.has(file));
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || reachable.has(current)) continue;
      reachable.add(current);
      for (const next of graph.get(current) ?? []) stack.push(next);
    }

    const findings: Finding[] = [];
    for (const abs of files) {
      if (reachable.has(abs)) continue;
      if (SKIP_FILE.test(abs)) continue;
      const file = displayPath(abs, ctx.cwd);
      findings.push({
        ruleId: 'structure/orphan-file',
        severity: 'warning',
        file,
        line: 1,
        column: 1,
        message: `File is never imported from an entry module. Delete it or wire it in.`,
        seniorNote:
          'Orphan files are how generated helpers and abandoned models stay in the tree. Import it from a real path or remove it.',
        snippet: path.posix.basename(file),
      });
    }
    return findings;
  },
};

function collectEntries(cwd: string, files: string[]): Set<string> {
  const entries = new Set<string>();
  const byRel = new Map(files.map((abs) => [displayPath(abs, cwd), abs]));

  for (const [rel, abs] of byRel) {
    if (isWellKnownEntry(rel)) entries.add(abs);
  }
  for (const hinted of hintsFromManifests(cwd)) {
    const abs = byRel.get(hinted) ?? resolveHint(cwd, hinted, files);
    if (abs) entries.add(abs);
  }
  return entries;
}

function isWellKnownEntry(rel: string): boolean {
  const posix = rel.replaceAll('\\', '/');
  const base = path.posix.basename(posix);
  if (base === 'public-api.ts') return true;
  if (/(^|\/)app\/(?:.*\/)?(page|layout|route)\.[cm]?[jt]sx?$/.test(posix)) return true;
  const dir = path.posix.dirname(posix);
  return ENTRY_BASENAMES.has(base) && (dir === 'src' || dir === '.' || dir === 'src/app');
}

function hintsFromManifests(cwd: string): string[] {
  const hints: string[] = [];
  const pkg = readJson(path.join(cwd, 'package.json'));
  if (pkg) {
    for (const key of ['main', 'module', 'types']) {
      if (typeof pkg[key] === 'string') hints.push(stripDist(pkg[key]));
    }
    collectStringLeaves(pkg.exports, hints);
    collectStringLeaves(pkg.bin, hints);
    if (pkg.scripts && typeof pkg.scripts === 'object') {
      for (const value of Object.values(pkg.scripts)) {
        if (typeof value !== 'string') continue;
        for (const match of value.matchAll(/(?:^|[\s"'=])((?:\.\.?\/)?(?:src|lib)\/[^\s"'\\]+\.[cm]?[jt]sx?)/g)) {
          if (match[1]) hints.push(match[1]);
        }
      }
    }
  }
  const ngPkg = readJson(path.join(cwd, 'ng-package.json'));
  if (typeof ngPkg?.entryFile === 'string') hints.push(ngPkg.entryFile);
  return hints;
}

function collectStringLeaves(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    out.push(stripDist(value));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const nested of Object.values(value as Record<string, unknown>)) {
    collectStringLeaves(nested, out);
  }
}

function stripDist(value: string): string {
  return value.replace(/^\.\//, '').replace(/^dist\//, 'src/').replace(/^build\//, 'src/');
}

function resolveHint(cwd: string, hint: string, files: string[]): string | undefined {
  const cleaned = hint.replace(/^\.\//, '');
  const abs = path.resolve(cwd, cleaned);
  if (files.includes(abs)) return abs;
  const noExt = abs.replace(/\.[cm]?[jt]sx?$/, '');
  return files.find((file) => file.startsWith(noExt));
}

function readJson(file: string): Record<string, unknown> | undefined {
  if (!existsSync(file)) return undefined;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}
