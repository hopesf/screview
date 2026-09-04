import { describe, expect, it } from 'vitest';
import { runRule } from '../helpers/ruleTester';
import { missingEffectCleanup } from '../../src/rules/react/missingEffectCleanup';
import { noStateUpdateInRender } from '../../src/rules/react/noStateUpdateInRender';

describe('react/missingEffectCleanup', () => {
  it('allows effects that return cleanup', () => {
    expect(
      runRule(missingEffectCleanup, {
        filename: 'Box.tsx',
        code: `function Box() {
  useEffect(() => {
    const id = setInterval(() => {}, 1000);
    return () => clearInterval(id);
  }, []);
  return <div />;
}
function useEffect(_fn: () => void | (() => void), _deps: unknown[]) {}
`,
      }),
    ).toHaveLength(0);
  });

  it('allows effects without resources', () => {
    expect(
      runRule(missingEffectCleanup, {
        filename: 'Box.tsx',
        code: `function Box() {
  useEffect(() => { document.title = 'x'; }, []);
  return <div />;
}
function useEffect(_fn: () => void, _deps: unknown[]) {}
`,
      }),
    ).toHaveLength(0);
  });

  it('flags setInterval without cleanup', () => {
    expect(
      runRule(missingEffectCleanup, {
        filename: 'Box.tsx',
        code: `function Box() {
  useEffect(() => { setInterval(() => {}, 1000); }, []);
  return <div />;
}
function useEffect(_fn: () => void, _deps: unknown[]) {}
`,
      }),
    ).toHaveLength(1);
  });

  it('flags AbortController without cleanup', () => {
    expect(
      runRule(missingEffectCleanup, {
        filename: 'Box.tsx',
        code: `function Box() {
  useEffect(() => { new AbortController(); }, []);
  return <div />;
}
function useEffect(_fn: () => void, _deps: unknown[]) {}
`,
      }),
    ).toHaveLength(1);
  });
});

describe('react/noStateUpdateInRender', () => {
  it('allows setters in handlers', () => {
    expect(
      runRule(noStateUpdateInRender, {
        filename: 'Box.tsx',
        code: `function Box() {
  const [open, setOpen] = useState(false);
  const onClick = () => setOpen(true);
  return <button onClick={onClick} />;
}
function useState(v: boolean): [boolean, (n: boolean) => void] { return [v, () => {}]; }
`,
      }),
    ).toHaveLength(0);
  });

  it('allows setters in effects', () => {
    expect(
      runRule(noStateUpdateInRender, {
        filename: 'Box.tsx',
        code: `function Box() {
  const [v, setV] = useState(0);
  useEffect(() => { setV(1); }, []);
  return <div>{v}</div>;
}
function useState(v: number): [number, (n: number) => void] { return [v, () => {}]; }
function useEffect(_fn: () => void, _deps: unknown[]) {}
`,
      }),
    ).toHaveLength(0);
  });

  it('flags setter during render', () => {
    expect(
      runRule(noStateUpdateInRender, {
        filename: 'Box.tsx',
        code: `function Box() {
  const [v, setV] = useState(0);
  setV(1);
  return <div>{v}</div>;
}
function useState(v: number): [number, (n: number) => void] { return [v, () => {}]; }
`,
      }),
    ).toHaveLength(1);
  });

  it('flags setter in a render-time if', () => {
    expect(
      runRule(noStateUpdateInRender, {
        filename: 'Box.tsx',
        code: `function Box() {
  const [v, setV] = useState(0);
  if (v === 0) setV(1);
  return <div>{v}</div>;
}
function useState(v: number): [number, (n: number) => void] { return [v, () => {}]; }
`,
      }),
    ).toHaveLength(1);
  });

  it('does not flag an unrelated setX helper during render', () => {
    expect(
      runRule(noStateUpdateInRender, {
        filename: 'Box.tsx',
        code: `function Box() {
  setTitle('hi');
  return <div />;
}
function setTitle(_t: string) {}
`,
      }),
    ).toHaveLength(0);
  });
});
