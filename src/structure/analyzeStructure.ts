import path from 'node:path';
import type { Finding, ProgramRule } from '../core/types';
import { inferFileNameStyle, isAllowedStem } from '../core/conventions';
import { displayPath } from '../utils/ast';

const JUNK_STEMS = new Set([
  'untitled',
  'temp',
  'tmp',
  'foo',
  'bar',
  'baz',
  'asdf',
  'new',
  'copy',
  'file',
  'stuff',
  'misc',
  'wip',
  'backup',
  'old',
  'newfile',
  'newFile',
]);

const CROWD_LIMIT = 20;

export function analyzeStructure(filePaths: string[], cwd: string): Finding[] {
  const findings: Finding[] = [];
  const relative = filePaths.map((file) => displayPath(file, cwd));
  const byDir = new Map<string, string[]>();
  const style = inferFileNameStyle(relative.map((file) => path.basename(file, path.extname(file))));

  for (const file of relative) {
    const stem = path.basename(file, path.extname(file));
    const dir = path.posix.dirname(file);
    const list = byDir.get(dir) ?? [];
    list.push(file);
    byDir.set(dir, list);

    if (isJunkStem(stem)) {
      findings.push(
        finding(
          'structure/junk-filename',
          'critical',
          file,
          `Filename "${stem}" looks like leftover junk.`,
          stem,
        ),
      );
      continue;
    }

    if (!isAllowedStem(stem, style)) {
      findings.push(
        finding(
          'structure/file-case',
          'warning',
          file,
          style === 'mixed'
            ? `Use camelCase, PascalCase, or kebab-case for "${stem}".`
            : `This project uses ${style}-case. Rename "${stem}" to match.`,
          stem,
        ),
      );
    }
  }

  for (const [dir, files] of byDir) {
    if (files.length < CROWD_LIMIT) continue;
    findings.push(
      finding(
        'structure/crowded-folder',
        'warning',
        files[0] ?? dir,
        `${files.length} source files in ${dir}/. Split by feature before this becomes unsearchable.`,
        dir,
      ),
    );
  }

  return findings;
}

function isJunkStem(stem: string): boolean {
  const base = stem.split('.')[0] ?? stem;
  return JUNK_STEMS.has(base) || JUNK_STEMS.has(base.toLowerCase());
}

function finding(
  ruleId: string,
  severity: Finding['severity'],
  file: string,
  message: string,
  snippet: string,
): Finding {
  return {
    ruleId,
    severity,
    file,
    line: 1,
    column: 1,
    message,
    snippet,
  };
}

function structureRule(
  id: ProgramRule['id'],
  severity: ProgramRule['severity'],
  docs: string,
): ProgramRule {
  return {
    id,
    pack: 'structure',
    severity,
    docs,
    run(ctx) {
      return analyzeStructure(ctx.filePaths, ctx.cwd).filter((item) => item.ruleId === id);
    },
  };
}

export const junkFilename: ProgramRule = structureRule(
  'structure/junk-filename',
  'critical',
  'Placeholder filenames like temp.ts and foo.ts are leftover junk.',
);

export const fileCase: ProgramRule = structureRule(
  'structure/file-case',
  'warning',
  'File names should follow the naming style the rest of this project already uses.',
);

export const crowdedFolder: ProgramRule = structureRule(
  'structure/crowded-folder',
  'warning',
  'Folders with too many source files become unsearchable. Split by feature.',
);

export const structureRules: ProgramRule[] = [junkFilename, fileCase, crowdedFolder];
