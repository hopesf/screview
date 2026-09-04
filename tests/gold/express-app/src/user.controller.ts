export async function listUsers(
  req: { params: { id?: string } },
  res: { json(body: unknown): void },
  next: (err?: unknown) => void,
): Promise<void> {
  try {
    const users = await User.find({ active: true }).limit(50).lean();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

declare const User: {
  find(query: object): { limit(n: number): { lean(): Promise<unknown[]> } };
};
