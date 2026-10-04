import type { Course } from '@/types';

/**
 * Une formation est « bientôt disponible » quand elle est annoncée (coming_soon) sans être publiée,
 * ou quand elle est publiée mais ne contient encore aucune leçon publiée (jamais de faux bouton d'inscription).
 * `lessonCount` : nombre de leçons publiées si on le connaît (liste : useLessonCounts, fiche : curriculum).
 */
export function isComingSoon(course: Pick<Course, 'status' | 'coming_soon'>, lessonCount?: number): boolean {
  if (course.status !== 'PUBLIEE') return true;
  if (course.coming_soon) return true;
  return lessonCount !== undefined && lessonCount === 0;
}

export type ProjectState = 'Disponible' | 'En développement' | 'Projet privé';

/** Normalise le statut libre saisi dans le Studio (anciennes valeurs comprises) vers 3 états affichables. */
export function projectState(status: string | null | undefined): ProjectState {
  const s = (status ?? '').toLowerCase();
  if (/priv/.test(s)) return 'Projet privé';
  if (/(dispon|termin|live|en ligne|publi|lanc)/.test(s)) return 'Disponible';
  return 'En développement';
}
