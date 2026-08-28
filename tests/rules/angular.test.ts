import { describe, expect, it } from 'vitest';
import { runRule } from '../helpers/ruleTester';
import { unsubscribedObservable } from '../../src/rules/angular/unsubscribedObservable';
import { missingNgOnDestroy } from '../../src/rules/angular/missingNgOnDestroy';
import { noUncleanedTimer } from '../../src/rules/angular/noUncleanedTimer';

const DECORATORS = `
declare function Component(c: object): ClassDecorator;
declare function Directive(c: object): ClassDecorator;
const ChangeDetectionStrategy = { OnPush: 1 };
`;

describe('angular/unsubscribedObservable', () => {
  it('allows takeUntilDestroyed', () => {
    expect(
      runRule(unsubscribedObservable, {
        filename: 'user.component.ts',
        code: `${DECORATORS}
@Component({ selector: 'app-user', template: '' })
class UserComponent {
  constructor(private user$: { pipe(..._a: unknown[]): { subscribe(): void } }) {
    this.user$.pipe(takeUntilDestroyed()).subscribe();
  }
}
function takeUntilDestroyed() { return 1; }
`,
      }),
    ).toHaveLength(0);
  });

  it('allows assigned subscribe cleaned in ngOnDestroy', () => {
    expect(
      runRule(unsubscribedObservable, {
        filename: 'user.component.ts',
        code: `${DECORATORS}
@Component({ selector: 'app-user', template: '' })
class UserComponent {
  sub: { unsubscribe(): void } | undefined;
  constructor(private user$: { subscribe(): { unsubscribe(): void } }) {
    this.sub = this.user$.subscribe();
  }
  ngOnDestroy() { this.sub?.unsubscribe(); }
}
`,
      }),
    ).toHaveLength(0);
  });

  it('flags bare subscribe', () => {
    expect(
      runRule(unsubscribedObservable, {
        filename: 'user.component.ts',
        code: `${DECORATORS}
@Component({ selector: 'app-user', template: '' })
class UserComponent {
  constructor(private user$: { subscribe(): void }) {
    this.user$.subscribe();
  }
}
`,
      }),
    ).toHaveLength(1);
  });

  it('flags subscribe without destroy', () => {
    expect(
      runRule(unsubscribedObservable, {
        filename: 'user.component.ts',
        code: `${DECORATORS}
@Component({ selector: 'app-user', template: '' })
class UserComponent {
  ngOnInit() { this.user$.pipe(map((x: number) => x)).subscribe(); }
  constructor(private user$: { pipe(..._a: unknown[]): { subscribe(): void } }) {}
}
function map(_fn: unknown) { return 1; }
`,
      }),
    ).toHaveLength(1);
  });
});

describe('angular/missingNgOnDestroy', () => {
  it('allows a component with ngOnDestroy', () => {
    expect(
      runRule(missingNgOnDestroy, {
        filename: 'user.component.ts',
        code: `${DECORATORS}
@Component({ selector: 'app-user', template: '' })
class UserComponent {
  sub: Subscription | undefined;
  ngOnInit() { this.sub = this.user$.subscribe(); }
  ngOnDestroy() { this.sub?.unsubscribe(); }
  constructor(private user$: { subscribe(): Subscription }) {}
}
class Subscription { unsubscribe() {} }
`,
      }),
    ).toHaveLength(0);
  });

  it('allows a component without resources', () => {
    expect(
      runRule(missingNgOnDestroy, {
        filename: 'user.component.ts',
        code: `${DECORATORS}
@Component({ selector: 'app-user', template: '' })
class UserComponent { name = 'a'; }
`,
      }),
    ).toHaveLength(0);
  });

  it('flags subscription without ngOnDestroy', () => {
    expect(
      runRule(missingNgOnDestroy, {
        filename: 'user.component.ts',
        code: `${DECORATORS}
@Component({ selector: 'app-user', template: '' })
class UserComponent {
  sub: Subscription | undefined;
  ngOnInit() { this.sub = this.user$.subscribe(); }
  constructor(private user$: { subscribe(): Subscription }) {}
}
class Subscription { unsubscribe() {} }
`,
      }),
    ).toHaveLength(1);
  });

  it('flags setInterval without ngOnDestroy', () => {
    expect(
      runRule(missingNgOnDestroy, {
        filename: 'user.component.ts',
        code: `${DECORATORS}
@Component({ selector: 'app-user', template: '' })
class UserComponent {
  ngOnInit() { setInterval(() => {}, 1000); }
}
`,
      }),
    ).toHaveLength(1);
  });
});

describe('angular/noUncleanedTimer', () => {
  it('allows interval cleared in ngOnDestroy', () => {
    expect(
      runRule(noUncleanedTimer, {
        filename: 'user.component.ts',
        code: `${DECORATORS}
@Component({ selector: 'app-user', template: '' })
class UserComponent {
  id = 0;
  ngOnInit() { this.id = setInterval(() => {}, 1000); }
  ngOnDestroy() { clearInterval(this.id); }
}
`,
      }),
    ).toHaveLength(0);
  });

  it('ignores timers outside ngOnInit/constructor', () => {
    expect(
      runRule(noUncleanedTimer, {
        filename: 'user.component.ts',
        code: `${DECORATORS}
@Component({ selector: 'app-user', template: '' })
class UserComponent {
  tick() { setInterval(() => {}, 1000); }
}
`,
      }),
    ).toHaveLength(0);
  });

  it('flags uncleared setInterval', () => {
    expect(
      runRule(noUncleanedTimer, {
        filename: 'user.component.ts',
        code: `${DECORATORS}
@Component({ selector: 'app-user', template: '' })
class UserComponent {
  ngOnInit() { setInterval(() => {}, 1000); }
  ngOnDestroy() {}
}
`,
      }),
    ).toHaveLength(1);
  });

  it('flags addEventListener without remove', () => {
    expect(
      runRule(noUncleanedTimer, {
        filename: 'user.component.ts',
        code: `${DECORATORS}
@Component({ selector: 'app-user', template: '' })
class UserComponent {
  ngOnInit() { window.addEventListener('resize', () => {}); }
}
`,
      }),
    ).toHaveLength(1);
  });
});
