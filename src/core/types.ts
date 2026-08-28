import type { Node, SourceFile } from 'ts-morph';
import type { SyntaxKind } from 'ts-morph';

export type Severity = 'critical' | 'warning' | 'info';
export type Framework = 'generic' | 'express' | 'angular' | 'react' | 'mongo' | 'style' | 'naming' | 'structure';

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

export interface ScreviewConfig {
  include: string[];
  ignore: string[];
  rules: Record<string, 'off'>;
}

export interface AuditOptions {
  cwd?: string;
  ignore?: string[];
  rules?: Record<string, 'off'>;
  color?: boolean;
}

export interface AuditResult {
  findings: Finding[];
  filesScanned: number;
  durationMs: number;
  cwd: string;
}
