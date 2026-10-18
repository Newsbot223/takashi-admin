import { DISH_NAMES } from '@/lib/menu/dish-names';

/** Bei Sushi gehört die Art zum Namen ("Salmon" → "Salmon Sashimi"), sonst ist "Sake" in Maki und Nigiri nicht zu unterscheiden. */
const SUSHI_WORD: Record<string, string> = {
  maki: 'Maki',
  nigiri: 'Nigiri',
  sashimi: 'Sashimi',
  insideout: 'Inside Out',
  specialroll: 'Special Roll',
  bigroll: 'Big Roll',
};

/** Vollständiger Name wie auf dem Bon, z. B. "S30 Salmon Sashimi" oder "12 Hokkaido Curry". */
export function fullDishName(category: string | null | undefined, name: string, fallbackNo?: string | null): string {
  const cat = category ?? '';
  const hit = DISH_NAMES[`${cat}|${name.trim()}`];
  const code = hit ? hit[0] : (fallbackNo ?? '');
  let full = hit ? hit[1] : name.trim();
  const word = SUSHI_WORD[cat];
  const hasWord = full.toLowerCase().includes(word?.toLowerCase() ?? '') || (cat === 'insideout' && /\bI\.O\b/.test(full));
  if (word && !hasWord) full = `${full} ${word}`;
  return code ? `${code} ${full}` : full;
}
