import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ScreviewConfig } from './types';

export const DEFAULT_CONFIG: ScreviewConfig = {
  include: ['src'],
  ignore: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', '**/*.spec.tsx'],
  rules: {},
};

export function loadConfig(cwd: string): ScreviewConfig {
  const file = path.join(cwd, 'screview.config.json');
  if (!existsSync(file)) {
    return { ...DEFAULT_CONFIG, ignore: [...DEFAULT_CONFIG.ignore], rules: {} };
  }
  const raw = JSON.parse(readFileSync(file, 'utf8')) as Partial<ScreviewConfig>;
  return {
    include: raw.include ?? [...DEFAULT_CONFIG.include],
    ignore: raw.ignore ?? [...DEFAULT_CONFIG.ignore],
    rules: raw.rules ?? {},
  };
}
