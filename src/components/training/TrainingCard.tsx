import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, UserRound, Users } from 'lucide-react';
import type { Course } from '@/types';
import type { SessionWithSeats } from '@/lib/training/types';
import { displaySessionStatus, formatPeriodShort } from '@/lib/training/format';
import { levelLabel } from '@/components/ui/CourseCard';
import { featuredSession } from '@/lib/training/featured';
import { PresentielBadge, SessionStatusBadge } from '@/components/training/StatusBadges';
import { Badge } from '@/components/ui/Badge';

/** Carte d'une formation présentielle. Tout provient de Supabase : sans session, on affiche « Bientôt disponible » sans date ni place. */
export function TrainingCard({ course, sessions }: { course: Course; sessions: SessionWithSeats[] }) {
  const s = featuredSession(sessions);
  const status = s ? displaySessionStatus(s, s.taken) : null;
  const left = s ? Math.max(0, s.capacity - s.taken) : null;
  const trainer = s?.trainer_name || course.trainer_name;
  return (
    <Link to={`/formations/${course.slug}`} className="card-hover group flex h-full flex-col p-6" aria-label={`${course.title} — formation présentielle`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <PresentielBadge />
        {s ? <SessionStatusBadge session={s} taken={s.taken} /> : <Badge variant="warning">Bientôt disponible</Badge>}
      </div>
      <h3 className="text-lg font-bold">{course.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{course.short_description}</p>
      <dl className="mt-5 flex-1 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
        {s && <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" /><dt className="sr-only">Date</dt><dd>{formatPeriodShort(s.starts_on, s.ends_on)}</dd></div>}
        {s && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" /><dt className="sr-only">Lieu</dt><dd>{s.location}</dd></div>}
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" /><dt className="sr-only">Niveau et durée</dt><dd>{levelLabel[course.level]}{course.duration ? ` · ${course.duration}` : ''}</dd></div>
        {trainer && <div className="flex items-center gap-2"><UserRound className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" /><dt className="sr-only">Formateur</dt><dd>{trainer}</dd></div>}
        {s && s.status !== 'TERMINEE' && s.status !== 'ANNULEE' && left !== null && (
          <div className="flex items-center gap-2"><Users className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" /><dt className="sr-only">Places disponibles</dt><dd>{left} place{left > 1 ? 's' : ''} disponible{left > 1 ? 's' : ''} sur {s.capacity}</dd></div>
        )}
      </dl>
      <span className="mt-5 inline-flex items-center justify-center rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition group-hover:bg-neutral-800 dark:bg-white dark:text-neutral-950">
        {status?.canRegister ? 'S’inscrire' : 'Voir la formation'}
      </span>
    </Link>
  );
}
