#!/usr/bin/env node
import process from 'node:process';
import { parseArgs } from 'node:util';
import { audit } from './audit';
import { resolveExitCode } from './core/exitCode';
import { renderPretty } from './reporters/pretty';
import { renderJson } from './reporters/json';

const HELP = `screview - catch junk AI agents leave in TypeScript/JavaScript

Usage:
  screview [paths...]

Options:
  --json           JSON report
  --ignore <glob>  skip files (repeatable)
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
    process.stdout.write('1.0.0\n');
    return;
  }

  const paths = positionals[0] === 'check' ? positionals.slice(1) : positionals;
  const color = !values['no-color'] && Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
  const result = await audit(paths, { ignore: values.ignore, color });
  const output = values.json ? renderJson(result) : renderPretty(result, color);
  process.stdout.write(`${output}\n`);
  process.exitCode = resolveExitCode(result.findings);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 2;
});
