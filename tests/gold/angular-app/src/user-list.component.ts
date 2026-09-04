declare function Component(c: object): ClassDecorator;

@Component({ selector: 'app-user-list', template: '' })
export class UserListComponent {
  names: string[] = [];
}
