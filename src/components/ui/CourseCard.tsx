import { Link } from 'react-router-dom';
import { Clock, Layers } from 'lucide-react';
import type { Course } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Icon, categoryIcon } from '@/components/ui/Icon';
import { isComingSoon } from '@/lib/courseStatus';

export const levelLabel: Record<Course['level'], string> = { DEBUTANT: 'Débutant', INTERMEDIAIRE: 'Intermédiaire', AVANCE: 'Avancé' };

/** `lessonCount` : leçons publiées connues ; 0 → « Bientôt disponible » (jamais de faux accès). */
export function CourseCard({ course, to, lessonCount }: { course: Course; to?: string; lessonCount?: number }) {
  const soon = isComingSoon(course, lessonCount);
  return (
    <Link to={to ?? `/formations/${course.slug}`} className="card-hover group flex h-full flex-col p-6">
      <div className="mb-5 flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" aria-hidden="true">
          <Icon name={categoryIcon(course.category)} className="h-5 w-5" />
        </span>
        {soon ? <Badge variant="warning">Bientôt disponible</Badge> : <Badge variant="neutral">{levelLabel[course.level]}</Badge>}
      </div>
      <h3 className="text-lg font-bold">{course.title}</h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{course.short_description}</p>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
        {soon && <span>{levelLabel[course.level]}</span>}
        {course.duration && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{course.duration}</span>}
        {lessonCount !== undefined && lessonCount > 0 && <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" aria-hidden="true" />{lessonCount} leçons</span>}
      </div>
    </Link>
  );
}
