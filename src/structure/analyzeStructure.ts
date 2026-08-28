import path from 'node:path';
import type { Finding, ScreviewConfig } from '../core/types';
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

const FRAMEWORK_SUFFIX =
  /\.(component|service|module|directive|pipe|guard|interceptor|resolver|controller|routes|router|model|schema|entity)$/;

const CROWD_LIMIT = 20;

export function analyzeStructure(
  filePaths: string[],
  cwd: string,
  config: ScreviewConfig,
): Finding[] {
  const findings: Finding[] = [];
  const enabled = (id: string): boolean => config.rules[id] !== 'off';
  const relative = filePaths.map((file) => displayPath(file, cwd));
  const byDir = new Map<string, string[]>();

  for (const file of relative) {
    const stem = path.basename(file, path.extname(file));
    const dir = path.posix.dirname(file);
    const list = byDir.get(dir) ?? [];
    list.push(file);
    byDir.set(dir, list);

    if (enabled('structure/junk-filename') && isJunkStem(stem)) {
      findings.push(
        finding('structure/junk-filename', file, `Filename "${stem}" looks like leftover junk.`),
      );
    }

    if (enabled('structure/file-case') && !isAllowedStem(stem)) {
      findings.push(
        finding(
          'structure/file-case',
          file,
          `Use camelCase or PascalCase for "${stem}". Example: userService.ts or UserCard.tsx.`,
        ),
      );
    }
  }

  if (enabled('structure/crowded-folder')) {
    for (const [dir, files] of byDir) {
      if (files.length < CROWD_LIMIT) continue;
      findings.push(
        finding(
          'structure/crowded-folder',
          files[0] ?? dir,
          `${files.length} source files in ${dir}/. Split by feature before this becomes unsearchable.`,
        ),
      );
    }
  }

  return findings;
}

function isJunkStem(stem: string): boolean {
  const base = stem.split('.')[0] ?? stem;
  return JUNK_STEMS.has(base) || JUNK_STEMS.has(base.toLowerCase());
}

function isAllowedStem(stem: string): boolean {
  if (stem === 'index' || stem === 'cli') return true;
  if (FRAMEWORK_SUFFIX.test(stem)) {
    const head = stem.split('.')[0] ?? stem;
    return isCamelOrPascal(head);
  }
  if (stem.includes('-') || stem.includes('_') || stem.includes(' ')) return false;
  return isCamelOrPascal(stem);
}

function isCamelOrPascal(name: string): boolean {
  return /^[a-z][a-zA-Z0-9]*$/.test(name) || /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

function finding(ruleId: string, file: string, message: string): Finding {
  return {
    ruleId,
    severity: ruleId === 'structure/junk-filename' ? 'critical' : 'warning',
    file,
    line: 1,
    column: 1,
    message,
  };
}
