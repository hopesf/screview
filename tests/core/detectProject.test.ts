import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectProject } from '../../src/core/detectProject';

describe('detectProject', () => {
  it('detects TypeScript from tsconfig when no framework is installed', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-ts-'));
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app' }));
    writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
    const profile = detectProject(dir, [path.join(dir, 'src/main.ts')]);
    expect(profile.language).toBe('typescript');
    expect(profile.frameworks).toEqual([]);
  });

  it('detects JavaScript when there is no TypeScript signal', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-js-'));
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app' }));
    const profile = detectProject(dir, [path.join(dir, 'src/index.js')]);
    expect(profile.language).toBe('javascript');
    expect(profile.frameworks).toEqual([]);
  });

  it('detects Express and MongoDB from package.json', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-ex-'));
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        dependencies: { express: '4.0.0', mongoose: '8.0.0' },
      }),
    );
    writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
    const profile = detectProject(dir);
    expect(profile.frameworks).toEqual(['express', 'mongo']);
  });

  it('detects React from next', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-next-'));
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ dependencies: { next: '15.0.0', react: '19.0.0' } }),
    );
    const profile = detectProject(dir);
    expect(profile.frameworks).toEqual(['react']);
  });

  it('detects Angular from angular.json', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-ng-'));
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app' }));
    writeFileSync(path.join(dir, 'angular.json'), '{}');
    mkdirSync(path.join(dir, 'src'));
    const profile = detectProject(dir);
    expect(profile.frameworks).toEqual(['angular']);
  });

  it('detects Prisma as DB', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-prisma-'));
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ dependencies: { prisma: '6.0.0' } }),
    );
    mkdirSync(path.join(dir, 'prisma'));
    writeFileSync(path.join(dir, 'prisma/schema.prisma'), 'model User { id String @id }\n');
    const profile = detectProject(dir);
    expect(profile.frameworks).toEqual(['db']);
  });
});
