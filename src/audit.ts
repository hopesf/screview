import { existsSync } from 'node:fs';
import path from 'node:path';
import type { AuditOptions, AuditResult, ScreviewConfig } from './core/types';
import { loadConfig } from './core/config';
import { createAuditProject } from './core/project';
import { runEngine } from './core/engine';
import { selectRules } from './core/registry';
import { analyzeStructure } from './structure/analyzeStructure';

export async function audit(paths: string[], options: AuditOptions = {}): Promise<AuditResult> {
  const cwd = options.cwd ?? process.cwd();
  const started = performance.now();
  const config = mergeOptions(loadConfig(cwd), options);
  const scanPaths = paths.length > 0 ? paths : defaultPaths(config.include, cwd);
  const { project, filePaths } = await createAuditProject({
    paths: scanPaths,
    ignore: config.ignore,
    cwd,
  });
  const findings = [
    ...runEngine(project.getSourceFiles(), selectRules(config), cwd),
    ...analyzeStructure(filePaths, cwd, config),
  ];
  return {
    findings,
    filesScanned: project.getSourceFiles().length,
    durationMs: Math.round(performance.now() - started),
    cwd,
  };
}

function mergeOptions(config: ScreviewConfig, options: AuditOptions): ScreviewConfig {
  return {
    include: config.include,
    ignore: [...config.ignore, ...(options.ignore ?? [])],
    rules: { ...config.rules, ...options.rules },
  };
}

function defaultPaths(include: string[], cwd: string): string[] {
  const existing = include.filter((p) => existsSync(path.resolve(cwd, p)));
  return existing.length > 0 ? existing : ['.'];
}
