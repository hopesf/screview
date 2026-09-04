#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { audit } from './audit';
import { resolveExitCode } from './core/exitCode';
import { explainRule } from './core/explain';
import { resolveScanPaths } from './core/scanPaths';
import type { FailOn } from './core/types';
import { renderPretty } from './reporters/pretty';
import { renderJson } from './reporters/json';

const HELP = `screview - catch junk AI agents leave in TypeScript/JavaScript

Usage:
  screview
  screview run
  screview explain <ruleId>

Run it in the project root. No path needed.

Options:
  --json                 JSON report
  --ignore <glob>        skip files (repeatable)
  --fail-on <level>      critical (default) | warning | all
  --strict               fail on any finding (same as --fail-on all)
  --baseline             hide findings listed in the baseline file
  --write-baseline       write current findings to the baseline file
  --baseline-file <path> baseline path (default .screview-baseline.json)
  --no-color
  -h, --help
  -v, --version
`;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      json: { type: 'boolean', default: false },
      ignore: { type: 'string', multiple: true },
      'fail-on': { type: 'string', default: 'critical' },
      strict: { type: 'boolean', default: false },
      baseline: { type: 'boolean', default: false },
      'write-baseline': { type: 'boolean', default: false },
      'baseline-file': { type: 'string' },
      'no-color': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
  });

  if (values.help) {
    process.stdout.write(HELP);
    return;
  }
  if (values.version) {
    process.stdout.write(`${packageVersion()}\n`);
    return;
  }
  if (positionals[0] === 'explain') {
    const id = positionals[1];
    if (!id) {
      process.stderr.write('Usage: screview explain <ruleId>\n');
      process.exitCode = 2;
      return;
    }
    const text = explainRule(id);
    if (!text) {
      process.stderr.write(`Unknown rule: ${id}\n`);
      process.exitCode = 2;
      return;
    }
    process.stdout.write(`${text}\n`);
    return;
  }

  const paths = resolveScanPaths(positionals);
  const color = !values['no-color'] && Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
  if (!values.json && process.stderr.isTTY) {
    process.stderr.write('Scanning…\n');
  }
  const result = await audit(paths, {
    ignore: values.ignore,
    color,
    baseline: values.baseline,
    writeBaseline: values['write-baseline'],
    baselineFile: values['baseline-file'],
  });
  const output = values.json ? renderJson(result) : renderPretty(result, color);
  process.stdout.write(`${output}\n`);
  process.exitCode = resolveExitCode(result.findings, failOn(values.strict, values['fail-on']));
}

function failOn(strict: boolean, raw: string | undefined): FailOn {
  if (strict) return 'all';
  if (raw === 'warning' || raw === 'all' || raw === 'critical') return raw;
  return 'critical';
}

function packageVersion(): string {
  const here = process.argv[1];
  if (!here) return '0.0.0';
  const dir = path.dirname(path.resolve(here));
  for (const candidate of [path.join(dir, '..', 'package.json'), path.join(dir, 'package.json')]) {
    try {
      const pkg = JSON.parse(readFileSync(candidate, 'utf8')) as { version?: string };
      if (pkg.version) return pkg.version;
    } catch {
      continue;
    }
  }
  return '0.0.0';
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 2;
});
