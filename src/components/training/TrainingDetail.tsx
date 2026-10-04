import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, CalendarDays, CheckCircle2, Clock, ListChecks, MapPin, Package, Rocket, Target, UserRound, Users, Info } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { levelLabel } from '@/components/ui/CourseCard';
import { WaitlistForm } from '@/components/course/WaitlistForm';
import { RegisterPanel } from '@/components/training/RegisterPanel';
import { PresentielBadge, SessionStatusBadge } from '@/components/training/StatusBadges';
import { featuredSession } from '@/lib/training/featured';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { useAnnouncements, useMyRegistrations, useSessions } from '@/lib/training/api';
import { announcementKinds, formatDay, formatPeriod, formatSchedule } from '@/lib/training/format';
import { seedProgramBySlug } from '@/lib/program';
import { safeUrl } from '@/utils';
import type { CourseBundle } from '@/lib/queries';

/** Alerte réservée au staff : explique pourquoi les visiteurs ne voient pas (encore) de session et ne peuvent donc pas s'inscrire. */
function StaffSessionHint({ courseId, courseStatus }: { courseId: string; courseStatus: string }) {
  const { profile } = useAuth();
  const staff = profile?.role === 'ADMIN' || profile?.role === 'INSTRUCTOR';
  const q = useQuery({
    queryKey: ['staff-hidden-sessions', courseId],
    enabled: staff,
    queryFn: async (): Promise<{ id: string; status: string }[]> => {
      const { data, error } = await supabase.from('training_sessions').select('id,status').eq('course_id', courseId);
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: string; status: string }[];
    },
  });
  if (!staff || !q.data) return null;
  const drafts = q.data.filter((s) => s.status === 'BROUILLON').length;
  const unpublished = courseStatus !== 'PUBLIEE';
  if (!unpublished && drafts === 0) return null;
  return (
    <p role="note" className="rounded-xl border border-warning-500/40 bg-warning-500/5 p-4 text-sm">
      <strong>Visible uniquement par l’équipe.</strong>{' '}
      {unpublished
        ? `Cette formation n’est pas publiée : ses ${q.data.length} session(s) sont invisibles des visiteurs, qui voient seulement « Me prévenir ». Publie la formation pour permettre l’inscription.`
        : `${drafts} session(s) sont en brouillon et invisibles des visiteurs. Passe-les en « Inscriptions ouvertes » pour permettre l’inscription.`}{' '}
      <Link to="/studio/sessions" className="font-semibold underline">Ouvrir les sessions dans le Studio</Link>
    </p>
  );
}

/** Page publique d'une formation PRÉSENTIELLE : tout provient de Supabase (courses + training_sessions). */
export function TrainingDetail({ bundle }: { bundle: CourseBundle }) {
  const { course, modules } = bundle;
  const { profile } = useAuth();
  const sessionsQ = useSessions();
  const mineQ = useMyRegistrations(profile?.id);
  const annQ = useAnnouncements(profile?.id);
  const sessions = (sessionsQ.data ?? []).filter((s) => s.course_id === course.id);
  const featured = featuredSession(sessions);
  const upcoming = sessions.filter((s) => s.status !== 'TERMINEE' && s.status !== 'ANNULEE');
  const past = sessions.filter((s) => s.status === 'TERMINEE' || s.status === 'ANNULEE');
  const program = modules.length > 0 ? modules.map((m) => m.title) : seedProgramBySlug(course.slug);
  const trainer = featured?.trainer_name || course.trainer_name;
  const publicNews = (annQ.data ?? []).filter((a) => a.course_id === course.id && a.visibility === 'PUBLIC').slice(0, 3);
  const image = safeUrl(course.image_url);
  const materials = course.materials ?? [];

  return (
    <>
      <Seo title={`${course.title} — formation présentielle`} description={course.short_description} image={course.image_url ?? undefined} />
      <PageHero eyebrow={`Formation présentielle • ${course.category}`} title={course.title} description={course.short_description}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-600 dark:text-neutral-400">
          <PresentielBadge />
          {featured ? <SessionStatusBadge session={featured} taken={featured.taken} /> : <Badge variant="warning">Bientôt disponible</Badge>}
          <Badge variant="neutral">{levelLabel[course.level]}</Badge>
          {course.duration && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden="true" />{course.duration}</span>}
          {course.has_certificate && <span className="inline-flex items-center gap-1"><Award className="h-4 w-4" aria-hidden="true" />Certificat de formation</span>}
        </div>
        {upcoming.length > 0 && <div className="mt-6"><a href="#sessions" className="btn-primary px-7 py-3.5 text-base">Voir les sessions et s’inscrire</a></div>}
      </PageHero>

      <div className="section-container grid gap-10 py-12 lg:grid-cols-[1fr_21rem]">
        <div className="space-y-12">
          {image && <img src={image} alt={`Illustration de la formation ${course.title}`} width={1280} height={720} className="aspect-video w-full rounded-3xl border border-neutral-200 object-cover dark:border-neutral-800" />}
          {course.long_description && <p className="text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">{course.long_description}</p>}

          {publicNews.length > 0 && (
            <section aria-labelledby="actualites" className="space-y-3">
              <h2 id="actualites" className="text-2xl font-bold">Actualités de la formation</h2>
              {publicNews.map((a) => (
                <article key={a.id} className="card p-5">
                  <p className="font-mono text-xs uppercase tracking-wide text-neutral-500">{announcementKinds[a.kind]}</p>
                  <h3 className="mt-1 font-bold">{a.title}</h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-neutral-600 dark:text-neutral-400">{a.content}</p>
                </article>
              ))}
            </section>
          )}

          {course.objectives.length > 0 && (
            <section aria-labelledby="objectifs"><h2 id="objectifs" className="mb-4 flex items-center gap-2 text-2xl font-bold"><Target className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" />Objectifs</h2>
              <ul className="space-y-2">{course.objectives.map((o) => <li key={o} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden="true" />{o}</li>)}</ul></section>
          )}

          {program.length > 0 && (
            <section aria-labelledby="programme"><h2 id="programme" className="mb-4 flex items-center gap-2 text-2xl font-bold"><ListChecks className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" />Programme</h2>
              <ol className="space-y-2">{program.map((p, i) => <li key={p} className="card flex items-center gap-3 px-4 py-3 text-sm"><span className="font-mono text-xs text-neutral-500">{String(i + 1).padStart(2, '0')}</span>{p}</li>)}</ol></section>
          )}

          <section aria-labelledby="sessions" id="sessions" className="scroll-mt-24">
            <h2 id="sessions-title" className="mb-4 flex items-center gap-2 text-2xl font-bold"><CalendarDays className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" />Sessions</h2>
            <div className="mb-4"><StaffSessionHint courseId={course.id} courseStatus={course.status} /></div>
            {sessionsQ.isLoading ? <p className="text-sm text-neutral-500">Chargement des sessions…</p> : sessionsQ.isError ? (
              <div role="alert" className="card space-y-3 p-5 text-sm">
                <p>Impossible de charger les sessions pour le moment. Vérifie ta connexion puis réessaie.</p>
                <Button variant="outline" size="sm" onClick={() => void sessionsQ.refetch()}>Réessayer</Button>
              </div>
            ) : upcoming.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Aucune session n’est ouverte aux inscriptions pour le moment. Laisse ton email : tu seras prévenu dès qu’une session ouvrira.</p>
                <WaitlistForm courseId={course.id} courseTitle={course.title} />
              </div>
            ) : (
              <div className="space-y-4">
                {upcoming.map((s) => {
                  const left = Math.max(0, s.capacity - s.taken);
                  const sched = formatSchedule(s);
                  return (
                    <article key={s.id} className="card space-y-4 p-5" aria-label={`Session ${formatPeriod(s.starts_on, s.ends_on)}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><p className="text-lg font-bold">{s.title || formatPeriod(s.starts_on, s.ends_on)}</p>{s.title && <p className="text-sm text-neutral-500">{formatPeriod(s.starts_on, s.ends_on)}</p>}</div>
                        <SessionStatusBadge session={s} taken={s.taken} />
                      </div>
                      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                        <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" /><div><dt className="sr-only">Lieu</dt><dd>{s.location}{s.address ? <span className="block text-neutral-500">{s.address}</span> : null}</dd></div></div>
                        {sched && <div className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" /><div><dt className="sr-only">Horaires</dt><dd>{sched}</dd></div></div>}
                        <div className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" /><div><dt className="sr-only">Places</dt><dd>{left} place{left > 1 ? 's' : ''} disponible{left > 1 ? 's' : ''} sur {s.capacity}</dd></div></div>
                        {(s.trainer_name || course.trainer_name) && <div className="flex items-start gap-2"><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" /><div><dt className="sr-only">Formateur</dt><dd>{s.trainer_name || course.trainer_name}</dd></div></div>}
                      </dl>
                      {s.list_status === 'PUBLIEE' && <Link to={`/formations/${course.slug}/sessions/${s.id}/liste`} className="inline-block text-sm font-semibold text-primary-600 underline dark:text-primary-300">Voir la liste des participants</Link>}
                      <RegisterPanel session={s} mine={(mineQ.data ?? []).find((r) => r.session_id === s.id)} />
                    </article>
                  );
                })}
              </div>
            )}
            {past.length > 0 && (
              <details className="mt-6 text-sm"><summary className="cursor-pointer font-semibold">Sessions passées ou annulées ({past.length})</summary>
                <ul className="mt-3 space-y-2">{past.map((s) => <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-neutral-50 px-4 py-2 dark:bg-neutral-900"><span>{formatPeriod(s.starts_on, s.ends_on)} · {s.location}</span><SessionStatusBadge session={s} taken={s.taken} /></li>)}</ul></details>
            )}
          </section>

          {course.final_project && <section className="card p-6" aria-labelledby="projet-final"><h2 id="projet-final" className="mb-2 flex items-center gap-2 text-xl font-bold"><Rocket className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" />Projet final</h2><p>{course.final_project}</p></section>}

          <section aria-labelledby="pratique" className="card space-y-4 p-6">
            <h2 id="pratique" className="flex items-center gap-2 text-xl font-bold"><Info className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" />Informations pratiques</h2>
            <p className="text-sm font-semibold">Formation présentielle : tu suis la formation sur place, avec le formateur.</p>
            {course.practical_info && <p className="whitespace-pre-line text-sm text-neutral-600 dark:text-neutral-400">{course.practical_info}</p>}
            {featured && <p className="text-sm text-neutral-600 dark:text-neutral-400">Prochaine session : {formatPeriod(featured.starts_on, featured.ends_on)} — {featured.location}{featured.address ? `, ${featured.address}` : ''}.</p>}
            {materials.length > 0 && (
              <div><h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><Package className="h-4 w-4" aria-hidden="true" />Matériel nécessaire</h3><ul className="space-y-1 text-sm">{materials.map((m) => <li key={m}>• {m}</li>)}</ul></div>
            )}
            {course.has_certificate && <p className="text-sm text-neutral-600 dark:text-neutral-400">Un certificat de formation délivré par JOE DEV CODES est remis aux participants qui remplissent les conditions de la session.</p>}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Résumé de la formation">
          <div className="card space-y-3 p-5 text-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">En bref</h2>
            <p className="flex items-center gap-2"><PresentielBadge /></p>
            <p><span className="text-neutral-500">Niveau : </span>{levelLabel[course.level]}</p>
            {course.duration && <p><span className="text-neutral-500">Durée : </span>{course.duration}</p>}
            {trainer && <p><span className="text-neutral-500">Formateur : </span>{trainer}</p>}
            {featured && <>
              <p><span className="text-neutral-500">Dates : </span>{formatPeriod(featured.starts_on, featured.ends_on)}</p>
              <p><span className="text-neutral-500">Lieu : </span>{featured.location}</p>
              {formatSchedule(featured) && <p><span className="text-neutral-500">Horaires : </span>{formatSchedule(featured)}</p>}
              <p><span className="text-neutral-500">Places : </span>{Math.max(0, featured.capacity - featured.taken)} / {featured.capacity}</p>
              <p className="text-xs text-neutral-500">Inscriptions et conditions : {formatDay(featured.starts_on)}</p>
            </>}
          </div>
          {course.prerequisites.length > 0 && (
            <div className="card p-5"><h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">Prérequis</h2><ul className="space-y-1.5 text-sm">{course.prerequisites.map((p) => <li key={p}>• {p}</li>)}</ul></div>
          )}
          <div className="card p-5 text-sm"><p className="font-semibold">Une question avant de t’inscrire ?</p><Button to="/contact" variant="outline" size="sm" className="mt-3">Écris-moi</Button></div>
        </aside>
      </div>
    </>
  );
}
