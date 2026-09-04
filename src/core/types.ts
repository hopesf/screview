import type { Node, SourceFile } from 'ts-morph';
import type { SyntaxKind } from 'ts-morph';

export type Severity = 'critical' | 'warning' | 'info';
export type RuleLevel = 'off' | Severity;
export type FailOn = 'critical' | 'warning' | 'all';
export type Framework =
  | 'generic'
  | 'express'
  | 'angular'
  | 'react'
  | 'mongo'
  | 'db'
  | 'style'
  | 'naming'
  | 'structure';

export interface Finding {
  ruleId: string;
  severity: Severity;
  file: string;
  line: number;
  column: number;
  message: string;
  seniorNote?: string;
  snippet?: string;
}

export interface RuleContext {
  sourceFile: SourceFile;
  filePath: string;
  wrappedHandlers: Set<string>;
  report(
    node: Node,
    message: string,
    extra?: Pick<Finding, 'seniorNote' | 'snippet'>,
  ): void;
}

export type Visitors = Partial<Record<SyntaxKind, (node: Node) => void>>;

export interface Rule {
  id: string;
  pack: Framework;
  severity: Severity;
  docs: string;
  create(ctx: RuleContext): Visitors;
}

export interface ProgramContext {
  sourceFiles: SourceFile[];
  filePaths: string[];
  cwd: string;
  config: ScreviewConfig;
  profile: {
    language: 'typescript' | 'javascript';
    frameworks: Array<'express' | 'angular' | 'react' | 'mongo' | 'db'>;
  };
}

export interface ProgramRule {
  id: string;
  pack: Framework;
  severity: Severity;
  docs: string;
  run(ctx: ProgramContext): Finding[] | Promise<Finding[]>;
}

export interface ScreviewConfig {
  include: string[];
  ignore: string[];
  rules: Record<string, RuleLevel>;
}

export interface AuditOptions {
  cwd?: string;
  ignore?: string[];
  rules?: Record<string, RuleLevel>;
  color?: boolean;
  baseline?: boolean;
  writeBaseline?: boolean;
  baselineFile?: string;
}

export interface AuditResult {
  findings: Finding[];
  filesScanned: number;
  durationMs: number;
  cwd: string;
  language: 'typescript' | 'javascript';
  frameworks: Array<'express' | 'angular' | 'react' | 'mongo' | 'db'>;
}
