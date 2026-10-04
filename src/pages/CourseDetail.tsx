import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Award, CheckCircle2, Clock, Layers, ListChecks, Rocket, Target } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { QueryState } from '@/components/ui/QueryState';
import { levelLabel } from '@/components/ui/CourseCard';
import { WaitlistForm } from '@/components/course/WaitlistForm';
import { authUrl } from '@/lib/redirect';
import { useToast } from '@/components/ui/Toast';
import { useCourse, useMyEnrollments, useMyProgress } from '@/lib/queries';
import { isComingSoon } from '@/lib/courseStatus';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { seedProgramBySlug } from '@/lib/program';
import { TrainingDetail } from '@/components/training/TrainingDetail';

export default function CourseDetail() {
  const { slug } = useParams();
  const query = useCourse(slug);
  const { profile } = useAuth();
  const enrollments = useMyEnrollments(profile?.id);
  const progress = useMyProgress(profile?.id);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const back = authUrl('/register', location.pathname);

  const enroll = async (courseId: string, courseSlug: string) => {
    if (!profile || !isSupabaseConfigured) { navigate(back); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from('enrollments').upsert({ user_id: profile.id, course_id: courseId }, { onConflict: 'user_id,course_id', ignoreDuplicates: true });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['my-enrollments'] });
      toast('success', 'Inscription enregistrée.');
      navigate(`/app/formations/${courseSlug}`);
    } catch {
      toast('error', 'Inscription impossible pour le moment. Réessaie dans un instant.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <QueryState query={query} isEmpty={(d) => d === null} emptyTitle="Cette formation n’est pas disponible." emptyText="Elle n’existe pas ou n’est pas publiée." emptyAction={<Button to="/formations" variant="outline">Retour aux formations</Button>}>
      {(bundle) => {
        if (!bundle) return null;
        const { course, modules, lessons } = bundle;
        // Formation PRÉSENTIELLE (mode par défaut) : fiche dédiée avec sessions, lieu, places et inscription.
        if (course.delivery_mode !== 'EN_LIGNE') return <TrainingDetail bundle={bundle} />;
        const program = seedProgramBySlug(course.slug);
        const publishedLessons = lessons.filter((l) => l.is_published !== false);
        const soon = isComingSoon(course, publishedLessons.length);
        const enrolled = (enrollments.data ?? []).find((e) => e.course_id === course.id && e.status !== 'ANNULEE');
        const done = (progress.data ?? []).filter((p) => p.course_id === course.id).length;
        const total = publishedLessons.length;
        const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

        return (
          <>
            <Seo title={course.title} description={course.short_description} image={course.image_url ?? undefined} />
            <PageHero eyebrow={`Formation • ${course.category}`} title={course.title} description={course.short_description}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                {soon ? <Badge variant="warning">Bientôt disponible</Badge> : <Badge variant="success">Disponible</Badge>}
                <Badge variant="neutral">{levelLabel[course.level]}</Badge>
                {course.duration && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden="true" />{course.duration}</span>}
                {modules.length > 0 && <span className="inline-flex items-center gap-1"><Layers className="h-4 w-4" aria-hidden="true" />{modules.length} module{modules.length > 1 ? 's' : ''}</span>}
                {course.has_certificate && <span className="inline-flex items-center gap-1"><Award className="h-4 w-4" aria-hidden="true" />Certificat</span>}
                {course.price != null && course.price > 0 && <Badge variant="primary">{course.price} {course.currency ?? ''}</Badge>}
              </div>
              {!soon && (
                <div className="mt-6 flex flex-wrap gap-3">
                  {enrolled ? (
                    <Button size="lg" to={`/app/formations/${course.slug}`}>{done > 0 ? 'Continuer le cours' : 'Commencer le cours'}</Button>
                  ) : profile ? (
                    <Button size="lg" disabled={busy} onClick={() => void enroll(course.id, course.slug)}>{busy ? 'Inscription…' : 'M’inscrire à cette formation'}</Button>
                  ) : (
                    <>
                      <Link to={back} className="btn-primary px-7 py-3.5 text-base">Créer un compte pour commencer</Link>
                      <Link to={authUrl('/login', location.pathname)} className="btn-outline px-7 py-3.5 text-base">Se connecter</Link>
                    </>
                  )}
                </div>
              )}
              {enrolled && total > 0 && <div className="mt-6 max-w-sm"><ProgressBar value={pct} label={`${done} / ${total} leçons`} /></div>}
            </PageHero>

            <div className="section-container grid gap-10 py-12 lg:grid-cols-[1fr_20rem]">
              <div className="space-y-12">
                {course.long_description && <p className="text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">{course.long_description}</p>}

                {course.objectives.length > 0 && (
                  <section aria-labelledby="objectifs"><h2 id="objectifs" className="mb-4 flex items-center gap-2 text-2xl font-bold"><Target className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" />Objectifs</h2>
                    <ul className="space-y-2">{course.objectives.map((o) => <li key={o} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden="true" />{o}</li>)}</ul></section>
                )}

                {program.length > 0 && (
                  <section aria-labelledby="programme"><h2 id="programme" className="mb-4 flex items-center gap-2 text-2xl font-bold"><ListChecks className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" />Au programme</h2>
                    <div className="flex flex-wrap gap-2">{program.map((p) => <span key={p} className="badge-neutral">{p}</span>)}</div></section>
                )}

                <section aria-labelledby="modules">
                  <h2 id="modules" className="mb-4 text-2xl font-bold">Modules et leçons</h2>
                  {modules.length === 0 || publishedLessons.length === 0 ? <p className="text-sm text-neutral-500">Le contenu détaillé sera publié au lancement de la formation.</p> : (
                    <div className="space-y-3">
                      {modules.map((m, i) => (
                        <details key={m.id} className="card group p-5" open={i === 0}>
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                            <span><span className="mr-2 font-mono text-xs text-neutral-500">{String(i + 1).padStart(2, '0')}</span>{m.title}</span>
                            <span className="text-xs font-normal text-neutral-500">{publishedLessons.filter((l) => l.module_id === m.id).length} leçons</span>
                          </summary>
                          {m.description && <p className="mt-2 text-sm text-neutral-500">{m.description}</p>}
                          <ul className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 text-sm dark:border-neutral-800">
                            {publishedLessons.filter((l) => l.module_id === m.id).map((l) => <li key={l.id} className="flex items-center justify-between gap-2"><span>{l.title}</span><Badge variant="neutral">{l.kind.toLowerCase()}</Badge></li>)}
                          </ul>
                        </details>
                      ))}
                    </div>
                  )}
                </section>

                {course.final_project && (
                  <section className="card p-6" aria-labelledby="projet-final"><h2 id="projet-final" className="mb-2 flex items-center gap-2 text-xl font-bold"><Rocket className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" />Projet final</h2><p>{course.final_project}</p></section>
                )}
              </div>

              <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                {soon && <WaitlistForm courseId={course.id} courseTitle={course.title} />}
                {course.prerequisites.length > 0 && (
                  <div className="card p-5"><h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">Prérequis</h2><ul className="space-y-1.5 text-sm">{course.prerequisites.map((p) => <li key={p}>• {p}</li>)}</ul></div>
                )}
                <div className="card p-5 text-sm"><p className="font-semibold">Une question avant de te lancer ?</p><Link to="/contact" className="mt-2 inline-block text-primary-600 underline dark:text-primary-300">Écris-moi</Link></div>
              </aside>
            </div>
          </>
        );
      }}
    </QueryState>
  );
}
