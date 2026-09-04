# screview

Catch junk AI agents leave in TypeScript and JavaScript. Local AST, no network.

```bash
npx screview
```

Same command: `npx screview run`. No path. It reads the project you are standing in. Node 20+.

Critical findings exit `1`. Warnings do not, unless you pass `--strict`. Clean scans exit `0`.

screview detects the stack from `package.json`, `angular.json`, `next.config.*`. No framework: TypeScript vs JavaScript from `tsconfig.json` and file extensions. Express, Angular, React, and MongoDB packs only run when that stack is present. Language rules (`var`, `==`, names, structure) always run. `any` and `@ts-ignore` only on TypeScript. File names follow the style the rest of the project already uses.

## What it flags

- Swallowed errors, floating promises, independent await-in-loop, sync fs on a request path
- Unused imports and locals, leftover `debugger`, value imports that should be `import type`
- Express handlers that hang or drop `next(err)`
- Angular subscriptions, timers, or socket `.on()` listeners that leak
- React effects without cleanup, useState setters during render
- Mongo queries inside loops, list `find()` without `.lean()` or `.limit()`
- DB model fields that are never read (Mongoose, TypeORM, Prisma), schema vs nearby interface drift
- Folder dumps, junk filenames, orphan files nobody imports, import cycles, duplicate type names
- Generic function names (`foo`, `data`, `handleData`) and `getX` that never returns
- `var`, `==`, `require()`, `any`, `@ts-ignore`, wrapper types (`Boolean` instead of `boolean`)

## Options

```bash
npx screview --json
npx screview --strict
npx screview --fail-on warning
npx screview --ignore '**/*.generated.ts'
npx screview --write-baseline
npx screview --baseline
npx screview explain generic/empty-catch
```

`--baseline` hides findings already listed in `.screview-baseline.json`. `--write-baseline` saves the current set so you can adopt screview on an existing tree.

Optional `screview.config.json`:

```json
{
  "include": ["."],
  "ignore": ["**/*.generated.ts"],
  "rules": { "style/no-explicit-any": "off", "style/eqeqeq": "warning" }
}
```

`ignore` is merged with the default test globs. Rule levels: `off`, `info`, `warning`, `critical`.

```ts
// screview-disable structure/junk-filename
// screview-disable-next-line generic/empty-catch
```

## CI

```yaml
- run: npx screview
```

Use `--strict` if you want warnings to fail the job too.

## API

```ts
import { audit } from 'screview';

const result = await audit();
```

MIT
