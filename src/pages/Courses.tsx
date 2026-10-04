import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { QueryState } from '@/components/ui/QueryState';
import { CourseCard, levelLabel } from '@/components/ui/CourseCard';
import { useCourses, useLessonCounts } from '@/lib/queries';
import { useSessions } from '@/lib/training/api';
import { TrainingCard } from '@/components/training/TrainingCard';
import { featuredSession } from '@/lib/training/featured';
import { displaySessionStatus } from '@/lib/training/format';
import { cn } from '@/utils';

export default function Courses() {
  const query = useCourses();
  const counts = useLessonCounts();
  const sessionsQ = useSessions();
  const sessions = useMemo(() => sessionsQ.data ?? [], [sessionsQ.data]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Tous');
  const [level, setLevel] = useState('Tous');
  const [state, setState] = useState('Tous');

  const cats = useMemo(() => ['Tous', ...Array.from(new Set((query.data ?? []).map((c) => c.category)))], [query.data]);
  const filtered = useMemo(
    () => (query.data ?? []).filter((c) =>
      (cat === 'Tous' || c.category === cat) &&
      (level === 'Tous' || c.level === level) &&
      (state === 'Tous' || (() => {
        const f = featuredSession(sessions.filter((x) => x.course_id === c.id));
        return (f ? displaySessionStatus(f, f.taken).key : 'bientot') === state;
      })()) &&
      (q.trim() === '' || (c.title + ' ' + c.short_description).toLowerCase().includes(q.trim().toLowerCase()))),
    [query.data, q, cat, level, state, sessions],
  );

  return (
    <>
      <Seo title="Formations" description="Formations présentielles : dates, lieu, places disponibles et statut des inscriptions. Chaque formation indique clairement si elle est ouverte." />
      <PageHero eyebrow="Formations présentielles" title="Des formations en présentiel, avec un formateur" description="Chaque formation se déroule sur place : dates, lieu, places disponibles et statut des inscriptions sont indiqués en toute transparence." />
      <section className="section-container py-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative lg:w-80">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une formation" aria-label="Rechercher une formation" className="input-field pl-10" />
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {cats.map((c) => (
              <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={cn('whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition', cat === c ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400')}>{c}</button>
            ))}
          </div>
          <select value={state} onChange={(e) => setState(e.target.value)} aria-label="Statut" className="input-field lg:ml-auto lg:w-52">
            <option value="Tous">Tous les statuts</option>
            <option value="ouvert">Inscriptions ouvertes</option>
            <option value="bientot">Bientôt disponible</option>
            <option value="complet">Complet</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminée</option>
            <option value="annulee">Annulée</option>
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Niveau" className="input-field lg:w-44">
            <option value="Tous">Tous niveaux</option>
            {Object.entries(levelLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="mt-8">
          <QueryState query={{ ...query, data: filtered.length === 0 && query.data && query.data.length > 0 ? [] : query.data }} isEmpty={(d) => d.length === 0} emptyTitle="Aucune formation trouvée" emptyText="Essaie d’autres filtres, ou reviens bientôt.">
            {() => <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((c) => c.delivery_mode === 'EN_LIGNE'
              ? <CourseCard key={c.id} course={c} lessonCount={counts.data ? (counts.data[c.id] ?? 0) : undefined} />
              : <TrainingCard key={c.id} course={c} sessions={sessions.filter((x) => x.course_id === c.id)} />)}</div>}
          </QueryState>
        </div>
      </section>

    </>
  );
}
