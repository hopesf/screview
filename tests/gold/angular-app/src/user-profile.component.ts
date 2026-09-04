declare function Component(c: object): ClassDecorator;
declare function takeUntilDestroyed(): unknown;

@Component({ selector: 'app-user-profile', template: '' })
export class UserProfileComponent {
  constructor(private users$: { pipe(...args: unknown[]): { subscribe(): void } }) {
    this.users$.pipe(takeUntilDestroyed()).subscribe();
  }
}
