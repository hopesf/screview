export function inbox(user: { email: string; active: boolean }): string {
  return user.active ? user.email : '';
}
