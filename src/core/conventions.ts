export type FileNameStyle = 'kebab' | 'camel' | 'pascal' | 'snake' | 'mixed';
export type StemKind = FileNameStyle | 'neutral' | 'other';

const NEUTRAL = new Set([
  'index',
  'cli',
  'page',
  'layout',
  'loading',
  'error',
  'route',
  'template',
  'default',
  'not-found',
  'opengraph-image',
  'twitter-image',
  'favicon',
  'icon',
  'apple-icon',
  'manifest',
  'robots',
  'sitemap',
  'middleware',
]);

const FRAMEWORK_SUFFIX =
  /\.(component|service|module|directive|pipe|guard|interceptor|resolver|controller|routes|router|model|schema|entity)$/;

const COUNTED: Array<Exclude<FileNameStyle, 'mixed'>> = ['kebab', 'camel', 'pascal', 'snake'];

export function headStem(stem: string): string {
  if (FRAMEWORK_SUFFIX.test(stem)) return stem.split('.')[0] ?? stem;
  return stem;
}

export function classifyStem(stem: string): StemKind {
  const head = headStem(stem);
  if (NEUTRAL.has(head) || NEUTRAL.has(stem)) return 'neutral';
  if (head.includes(' ')) return 'other';
  if (head.includes('_')) return 'snake';
  if (head.includes('-')) return 'kebab';
  if (/^[A-Z][a-zA-Z0-9]*$/.test(head)) return 'pascal';
  if (/^[a-z][a-zA-Z0-9]*$/.test(head)) return 'camel';
  return 'other';
}

export function inferFileNameStyle(stems: string[]): FileNameStyle {
  const counts: Record<Exclude<FileNameStyle, 'mixed'>, number> = {
    kebab: 0,
    camel: 0,
    pascal: 0,
    snake: 0,
  };
  for (const stem of stems) {
    const kind = classifyStem(stem);
    if (kind === 'kebab' || kind === 'camel' || kind === 'pascal' || kind === 'snake') {
      counts[kind] += 1;
    }
  }
  const total = COUNTED.reduce((sum, key) => sum + counts[key], 0);
  if (total === 0) return 'mixed';
  let winner: Exclude<FileNameStyle, 'mixed'> = 'camel';
  let best = 0;
  for (const key of COUNTED) {
    if (counts[key] > best) {
      winner = key;
      best = counts[key];
    }
  }
  if (best / total > 0.5) return winner;
  return 'mixed';
}

export function isAllowedStem(stem: string, _style: FileNameStyle): boolean {
  const kind = classifyStem(stem);
  return kind === 'neutral' || kind === 'kebab' || kind === 'camel' || kind === 'pascal';
}
