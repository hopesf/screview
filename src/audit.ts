import { existsSync } from 'node:fs';
import path from 'node:path';
import type { AuditOptions, AuditResult, ScreviewConfig } from './core/types';
import { loadConfig } from './core/config';
import { createAuditProject } from './core/project';
import { runEngine } from './core/engine';
import { selectProgramRules, selectRules } from './core/registry';
import { runProgramRules } from './core/programEngine';
import { detectProject } from './core/detectProject';
import { applyBaseline, writeBaseline } from './core/baseline';

export async function audit(paths: string[] = [], options: AuditOptions = {}): Promise<AuditResult> {
  const cwd = options.cwd ?? process.cwd();
  const started = performance.now();
  const config = mergeOptions(loadConfig(cwd), options);
  const scanPaths = paths.length > 0 ? paths : defaultPaths(config.include, cwd);
  const { project, filePaths } = await createAuditProject({
    paths: scanPaths,
    ignore: config.ignore,
    cwd,
  });
  const profile = detectProject(cwd, filePaths);
  const sourceFiles = project.getSourceFiles();
  let findings = [
    ...runEngine(sourceFiles, selectRules(config, profile), cwd),
    ...(await runProgramRules(selectProgramRules(config, profile), {
      sourceFiles,
      filePaths,
      cwd,
      config,
      profile,
    })),
  ];
  const baselineFile = path.resolve(cwd, options.baselineFile ?? '.screview-baseline.json');
  if (options.writeBaseline) {
    writeBaseline(baselineFile, findings);
  } else if (options.baseline) {
    findings = applyBaseline(findings, baselineFile);
  }
  return {
    findings,
    filesScanned: sourceFiles.length,
    durationMs: Math.round(performance.now() - started),
    cwd,
    language: profile.language,
    frameworks: profile.frameworks,
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
