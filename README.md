# screview

Catch junk AI agents leave in TypeScript and JavaScript. Local AST, no network.

```bash
npx screview ./src
```

Any finding exits `1`. Clean scan exits `0`.

## What it flags

- Swallowed errors, floating promises, await-in-loop
- Express handlers that hang or drop `next(err)`
- Angular subscriptions/timers that leak
- React effects without cleanup, setState during render
- Mongo queries inside loops
- Folder dumps, junk filenames, kebab/snake file names (camelCase / PascalCase)
- Generic function names (`foo`, `data`, `handleData`) and `getX` that never returns
- `var`, `==`, `require()`, `any`, `@ts-ignore`

## Options

```bash
screview ./src --json
screview ./src --ignore '**/*.generated.ts'
```

Optional `screview.config.json`:

```json
{
  "include": ["src"],
  "ignore": ["**/*.test.ts"],
  "rules": { "style/no-explicit-any": "off" }
}
```

```ts
// screview-disable-next-line generic/empty-catch
```

## CI

```yaml
- run: npx screview ./src
```

## API

```ts
import { audit } from 'screview';

const result = await audit(['./src']);
```

MIT
