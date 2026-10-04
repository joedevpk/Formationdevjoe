import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, PlayCircle } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RichText } from '@/components/ui/RichText';
import { QueryState } from '@/components/ui/QueryState';
import { AiAssistant } from '@/components/ui/AiAssistant';
import { useToast } from '@/components/ui/Toast';
import { useCourse, useMyEnrollments, useMyProgress } from '@/lib/queries';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { safeUrl, cn } from '@/utils';
import type { Lesson, LessonResource } from '@/types';

export default function CoursePlayer() {
  const { slug } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const course = useCourse(slug);
  const enrollments = useMyEnrollments(profile?.id);
  const progress = useMyProgress(profile?.id);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resources, setResources] = useState<LessonResource[]>([]);

  const bundle = course.data;
  const ordered: Lesson[] = useMemo(() => {
    if (!bundle) return [];
    const mpos = new Map(bundle.modules.map((m) => [m.id, m.position]));
    return bundle.lessons.filter((l) => l.is_published).sort((a, b) => (mpos.get(a.module_id) ?? 0) - (mpos.get(b.module_id) ?? 0) || a.position - b.position);
  }, [bundle]);

  const done = useMemo(() => new Set((progress.data ?? []).filter((p) => p.course_id === bundle?.course.id).map((p) => p.lesson_id)), [progress.data, bundle]);
  const enrolled = Boolean(enrollments.data?.some((e) => e.course_id === bundle?.course.id && e.status !== 'ANNULEE'));

  // Première leçon non terminée par défaut
  useEffect(() => {
    if (lessonId || ordered.length === 0) return;
    setLessonId((ordered.find((l) => !done.has(l.id)) ?? ordered[0]).id);
  }, [ordered, done, lessonId]);

  const current = ordered.find((l) => l.id === lessonId) ?? null;
  const idx = current ? ordered.findIndex((l) => l.id === current.id) : -1;

  useEffect(() => {
    if (!current) return;
    let alive = true;
    void supabase.from('lesson_resources').select('*').eq('lesson_id', current.id).then(({ data }) => { if (alive) setResources((data ?? []) as LessonResource[]); });
    return () => { alive = false; };
  }, [current]);

  const toggleDone = async () => {
    if (!profile || !current || !bundle) return;
    setBusy(true);
    const isDone = done.has(current.id);
    const { error } = isDone
      ? await supabase.from('lesson_progress').delete().eq('user_id', profile.id).eq('lesson_id', current.id)
      : await supabase.from('lesson_progress').insert({ user_id: profile.id, lesson_id: current.id, course_id: bundle.course.id });
    setBusy(false);
    if (error) { toast('error', 'Impossible d’enregistrer la progression.'); return; }
    await Promise.all([qc.invalidateQueries({ queryKey: ['my-progress'] }), qc.invalidateQueries({ queryKey: ['my-enrollments'] }), qc.invalidateQueries({ queryKey: ['certificates'] }), qc.invalidateQueries({ queryKey: ['notifications'] })]);
    if (!isDone) { toast('success', 'Leçon terminée.'); if (idx < ordered.length - 1) setLessonId(ordered[idx + 1].id); }
  };

  const enroll = async () => {
    if (!profile || !bundle) return;
    const { error } = await supabase.from('enrollments').upsert({ user_id: profile.id, course_id: bundle.course.id }, { onConflict: 'user_id,course_id', ignoreDuplicates: true });
    if (error) { toast('error', error.message); return; }
    await qc.invalidateQueries({ queryKey: ['my-enrollments'] });
  };

  return (
    <QueryState query={course} isEmpty={(d) => d === null} emptyTitle="Formation introuvable" emptyAction={<Button to="/app/formations" variant="outline">Mes formations</Button>}>
      {(b) => {
        if (!b) return null;
        const pct = ordered.length ? Math.round((done.size / ordered.length) * 100) : 0;
        if (enrollments.isSuccess && !enrolled) {
          return (
            <div className="card mx-auto max-w-lg p-8 text-center"><Seo title={b.course.title} />
              <h1 className="text-xl font-bold">{b.course.title}</h1><p className="mt-2 text-sm text-neutral-500">Tu n'es pas encore inscrit à cette formation.</p>
              <div className="mt-5 flex justify-center gap-2"><Button onClick={() => void enroll()}>M'inscrire</Button><Button to={`/formations/${b.course.slug}`} variant="outline">Voir la fiche</Button></div></div>
          );
        }
        const vid = safeUrl(current?.video_url);
        return (
          <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
            <Seo title={b.course.title} />
            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <div><Link to="/app/formations" className="text-xs text-neutral-500 hover:text-primary-500">← Mes formations</Link><h1 className="mt-1 text-lg font-bold">{b.course.title}</h1></div>
              <ProgressBar value={pct} label="Progression" />
              <div className="card max-h-[60vh] overflow-y-auto p-2">
                {b.modules.map((m) => (
                  <div key={m.id} className="mb-2"><p className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-neutral-500">{m.title}</p>
                    {ordered.filter((l) => l.module_id === m.id).map((l) => (
                      <button key={l.id} onClick={() => setLessonId(l.id)} className={cn('flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition', l.id === lessonId ? 'bg-primary-500/10 text-primary-600 dark:text-primary-300' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800')}>
                        {done.has(l.id) ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-500" /> : l.id === lessonId ? <PlayCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />}{l.title}</button>
                    ))}</div>
                ))}
              </div>
            </aside>

            <div>
              {!current ? <div className="card p-8 text-center text-sm text-neutral-500">Les leçons de cette formation seront publiées prochainement.</div> : (
                <article className="card p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2"><Badge variant="primary">{current.kind.toLowerCase()}</Badge>{current.duration_minutes ? <span className="text-xs text-neutral-500">{current.duration_minutes} min</span> : null}{done.has(current.id) && <Badge variant="success">Terminée</Badge>}</div>
                  <h2 className="mt-3 text-2xl font-extrabold">{current.title}</h2>
                  {vid && <p className="mt-4"><Button href={vid} variant="outline" size="sm">Ouvrir la vidéo</Button></p>}
                  <div className="mt-6"><RichText text={current.content} /></div>
                  {resources.length > 0 && (
                    <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800"><h3 className="mb-2 text-sm font-bold">Ressources</h3>
                      <ul className="space-y-1 text-sm">{resources.map((r) => { const u = safeUrl(r.url); return <li key={r.id}>{u ? <a className="text-primary-500 hover:underline" href={u} target="_blank" rel="noopener noreferrer">{r.title}</a> : r.title}</li>; })}</ul></div>
                  )}
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-5 dark:border-neutral-800">
                    <Button variant="ghost" disabled={idx <= 0} onClick={() => setLessonId(ordered[idx - 1].id)}><ChevronLeft className="h-4 w-4" />Précédent</Button>
                    <Button variant={done.has(current.id) ? 'outline' : 'secondary'} disabled={busy} onClick={() => void toggleDone()}>{done.has(current.id) ? 'Marquer comme non terminé' : 'Marquer comme terminé'}</Button>
                    <Button variant="ghost" disabled={idx >= ordered.length - 1} onClick={() => setLessonId(ordered[idx + 1].id)}>Cours suivant<ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </article>
              )}
              {current && <AiAssistant context={`${b.course.title} — ${current.title}`} />}
              {pct === 100 && <div className="card mt-4 border-success-500/40 bg-success-500/5 p-5 text-sm">Formation terminée. <button className="font-semibold text-primary-500 underline" onClick={() => navigate('/app/certificats')}>Voir mon certificat</button></div>}
            </div>
          </div>
        );
      }}
    </QueryState>
  );
}
