import { courses } from '@/data/catalog';

/** Liste « Au programme » (thèmes) définie dans le catalogue ; vide pour une formation créée depuis le Studio. */
export function seedProgramBySlug(slug: string): string[] {
  return courses.find((c) => c.slug === slug)?.program ?? [];
}
