import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, loadConfig } from '../../src/core/config';

describe('loadConfig', () => {
  it('returns defaults when no file exists', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-cfg-'));
    expect(loadConfig(dir)).toEqual(DEFAULT_CONFIG);
  });

  it('merges ignore globs with the defaults', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-cfg-'));
    writeFileSync(
      path.join(dir, 'screview.config.json'),
      JSON.stringify({ ignore: ['**/*.generated.ts'] }),
    );
    const config = loadConfig(dir);
    expect(config.ignore).toContain('**/*.test.ts');
    expect(config.ignore).toContain('**/tests/**');
    expect(config.ignore).toContain('**/*.generated.ts');
  });

  it('throws a short error for invalid JSON', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-cfg-'));
    writeFileSync(path.join(dir, 'screview.config.json'), '{ nope');
    expect(() => loadConfig(dir)).toThrow(/not valid JSON/);
  });
});
