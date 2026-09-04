import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { RuleLevel, ScreviewConfig } from './types';

export const DEFAULT_CONFIG: ScreviewConfig = {
  include: ['.'],
  ignore: [
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/*.test.tsx',
    '**/*.spec.tsx',
    '**/tests/**',
    '**/__tests__/**',
  ],
  rules: {},
};

const LEVELS = new Set<RuleLevel>(['off', 'info', 'warning', 'critical']);

export function loadConfig(cwd: string): ScreviewConfig {
  const file = path.join(cwd, 'screview.config.json');
  if (!existsSync(file)) {
    return {
      include: [...DEFAULT_CONFIG.include],
      ignore: [...DEFAULT_CONFIG.ignore],
      rules: {},
    };
  }
  let raw: Partial<ScreviewConfig>;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8')) as Partial<ScreviewConfig>;
  } catch {
    throw new Error('screview.config.json is not valid JSON');
  }
  return {
    include: raw.include ?? [...DEFAULT_CONFIG.include],
    ignore: [...DEFAULT_CONFIG.ignore, ...(raw.ignore ?? [])],
    rules: parseRules(raw.rules),
  };
}

function parseRules(raw: Partial<ScreviewConfig>['rules']): Record<string, RuleLevel> {
  if (!raw) return {};
  const rules: Record<string, RuleLevel> = {};
  for (const [id, level] of Object.entries(raw)) {
    if (!LEVELS.has(level)) {
      throw new Error(`screview.config.json: invalid level for ${id}`);
    }
    rules[id] = level;
  }
  return rules;
}
