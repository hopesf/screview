import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { audit } from '../../src/audit';

function appDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'screview-db-'));
  mkdirSync(path.join(dir, 'src'));
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { mongoose: '8.0.0' } }));
  writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
  return dir;
}

describe('db/unused-field', () => {
  it('flags a schema field that is never referenced', async () => {
    const dir = appDir();
    writeFileSync(
      path.join(dir, 'src/userModel.ts'),
      `declare class Schema { constructor(doc: object); }
export const userSchema = new Schema({
  name: String,
  unusedNote: String,
});
`,
    );
    writeFileSync(
      path.join(dir, 'src/userService.ts'),
      `export function label(user: { name: string }) { return user.name; }
`,
    );
    const result = await audit(['src'], { cwd: dir });
    const unused = result.findings.filter((f) => f.ruleId === 'db/unused-field');
    expect(unused.some((f) => f.message.includes('unusedNote'))).toBe(true);
    expect(unused.some((f) => f.message.includes('"name"'))).toBe(false);
  });

  it('keeps a field that is read on the document', async () => {
    const dir = appDir();
    writeFileSync(
      path.join(dir, 'src/userModel.ts'),
      `declare class Schema { constructor(doc: object); }
export const userSchema = new Schema({
  email: String,
});
`,
    );
    writeFileSync(
      path.join(dir, 'src/userService.ts'),
      `export function inbox(user: { email: string }) { return user.email; }
`,
    );
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId === 'db/unused-field')).toBe(false);
  });

  it('flags an unused @Prop field', async () => {
    const dir = appDir();
    writeFileSync(
      path.join(dir, 'src/userEntity.ts'),
      `declare function Schema(): ClassDecorator;
declare function Prop(): PropertyDecorator;
@Schema()
export class User {
  @Prop() email: string;
  @Prop() leftoverFlag: boolean;
}
`,
    );
    writeFileSync(
      path.join(dir, 'src/userService.ts'),
      `export function inbox(user: { email: string; leftoverFlag?: boolean }) { return user.email; }
`,
    );
    const result = await audit(['src'], { cwd: dir });
    const unused = result.findings.filter((f) => f.ruleId === 'db/unused-field');
    expect(unused.some((f) => f.message.includes('leftoverFlag'))).toBe(true);
  });

  it('does not treat a string that mentions the field name as usage', async () => {
    const dir = appDir();
    writeFileSync(
      path.join(dir, 'src/userModel.ts'),
      `declare class Schema { constructor(doc: object); }
export const userSchema = new Schema({
  email: String,
});
`,
    );
    writeFileSync(
      path.join(dir, 'src/userService.ts'),
      `export function hint() { return 'please confirm email'; }
`,
    );
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId === 'db/unused-field' && f.message.includes('email'))).toBe(
      true,
    );
  });

  it('flags unused Prisma fields', async () => {
    const dir = appDir();
    mkdirSync(path.join(dir, 'prisma'));
    writeFileSync(
      path.join(dir, 'prisma/schema.prisma'),
      `model User {
  id          String @id
  email       String
  unusedToken String
}
`,
    );
    writeFileSync(
      path.join(dir, 'src/userService.ts'),
      `export function inbox(user: { email: string }) { return user.email; }
`,
    );
    const result = await audit(['src'], { cwd: dir });
    const unused = result.findings.filter((f) => f.ruleId === 'db/unused-field');
    expect(unused.some((f) => f.message.includes('unusedToken'))).toBe(true);
    expect(unused.some((f) => f.message.includes('"email"'))).toBe(false);
  });
});

describe('db/schema-type-drift', () => {
  it('flags a schema field missing from the nearby interface', async () => {
    const dir = appDir();
    writeFileSync(
      path.join(dir, 'src/userModel.ts'),
      `declare class Schema { constructor(doc: object); }
export interface User { name: string }
export const userSchema = new Schema({
  name: String,
  leftover: String,
});
`,
    );
    writeFileSync(
      path.join(dir, 'src/userService.ts'),
      `export function label(user: { name: string; leftover: string }) { return user.name + user.leftover; }
`,
    );
    const result = await audit(['src'], { cwd: dir });
    expect(
      result.findings.some((f) => f.ruleId === 'db/schema-type-drift' && f.message.includes('leftover')),
    ).toBe(true);
  });

  it('allows InferSchemaType-only models', async () => {
    const dir = appDir();
    writeFileSync(
      path.join(dir, 'src/userModel.ts'),
      `declare class Schema { constructor(doc: object); }
declare type InferSchemaType<T> = T;
export const userSchema = new Schema({ name: String, leftover: String });
export type User = InferSchemaType<typeof userSchema>;
`,
    );
    writeFileSync(
      path.join(dir, 'src/userService.ts'),
      `export function label(user: { name: string }) { return user.name; }
`,
    );
    const result = await audit(['src'], { cwd: dir });
    expect(result.findings.some((f) => f.ruleId === 'db/schema-type-drift')).toBe(false);
  });
});
