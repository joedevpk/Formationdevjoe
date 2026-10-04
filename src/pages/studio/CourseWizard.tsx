import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, Trash2 } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { categoriesCourses } from '@/data/catalog';
import { slugify, cn } from '@/utils';
import type { Course, CourseModule, Lesson } from '@/types';

const STEPS = ['Informations', 'Programme', 'Programme et supports', 'Image', 'Publication'] as const;
const KINDS = ['TEXTE', 'VIDEO', 'CODE', 'QUIZ', 'EXERCICE', 'PROJET'] as const;
const lines = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean);

interface Draft {
  title: string; slug: string; category: string; level: Course['level']; duration: string;
  short_description: string; long_description: string; objectivesText: string; prerequisitesText: string;
  final_project: string; has_certificate: boolean; image_url: string; show_in_cv: boolean;
  delivery_mode: 'PRESENTIEL' | 'EN_LIGNE'; trainer_name: string; materialsText: string; practical_info: string;
}
const empty: Draft = { title: '', slug: '', category: 'Web', level: 'DEBUTANT', duration: '', short_description: '', long_description: '', objectivesText: '', prerequisitesText: '', final_project: '', has_certificate: true, image_url: '', show_in_cv: false, delivery_mode: 'PRESENTIEL', trainer_name: '', materialsText: '', practical_info: '' };

const toDraft = (c: Course): Draft => ({
  title: c.title, slug: c.slug, category: c.category, level: c.level, duration: c.duration ?? '',
  short_description: c.short_description, long_description: c.long_description ?? '',
  objectivesText: c.objectives.join('\n'), prerequisitesText: c.prerequisites.join('\n'),
  final_project: c.final_project ?? '', has_certificate: c.has_certificate, image_url: c.image_url ?? '', show_in_cv: Boolean(c.show_in_cv),
  delivery_mode: c.delivery_mode === 'EN_LIGNE' ? 'EN_LIGNE' : 'PRESENTIEL', trainer_name: c.trainer_name ?? '',
  materialsText: (c.materials ?? []).join('\n'), practical_info: c.practical_info ?? '',
});

const fieldCls = 'input-field';

export default function CourseWizard() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [id, setId] = useState<string | null>(routeId && routeId !== 'nouvelle' ? routeId : null);
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(empty);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [emailNote, setEmailNote] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const loadContent = useCallback(async (courseId: string) => {
    const [m, l] = await Promise.all([
      supabase.from('course_modules').select('*').eq('course_id', courseId).order('position'),
      supabase.from('lessons').select('*').eq('course_id', courseId).order('position'),
    ]);
    setModules((m.data ?? []) as CourseModule[]);
    setLessons((l.data ?? []) as Lesson[]);
  }, []);

  useEffect(() => {
    if (!id || !isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.from('courses').select('*').eq('id', id).maybeSingle();
        if (error || !data) throw error ?? new Error('introuvable');
        if (cancelled) return;
        setCourse(data as Course);
        setD(toDraft(data as Course));
        await loadContent(id);
      } catch {
        if (!cancelled) toast('error', 'Formation introuvable.');
        if (!cancelled) navigate('/studio/formations', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const invalidate = async () => {
    await Promise.all(['courses', 'course', 'lesson-counts', 'studio-courses'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
  };

  const payload = () => ({
    title: d.title.trim(), slug: d.slug.trim() || slugify(d.title), category: d.category, level: d.level,
    duration: d.duration.trim() || null, short_description: d.short_description.trim(),
    long_description: d.long_description.trim() || null, objectives: lines(d.objectivesText), prerequisites: lines(d.prerequisitesText),
    final_project: d.final_project.trim() || null, has_certificate: d.has_certificate, image_url: d.image_url.trim() || null,
    show_in_cv: d.show_in_cv, delivery_mode: d.delivery_mode, trainer_name: d.trainer_name.trim() || null,
    materials: lines(d.materialsText), practical_info: d.practical_info.trim() || null,
  });

  const validateInfo = () => {
    const e: Record<string, string> = {};
    if (d.title.trim().length < 3) e.title = 'Titre requis (3 caractères minimum).';
    if (d.short_description.trim().length < 10) e.short_description = 'Description courte requise (10 caractères minimum).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /** Enregistre le brouillon (crée la formation à la première sauvegarde). Ne touche jamais au statut. */
  const saveDraft = async (): Promise<string | null> => {
    if (!validateInfo()) { setStep(0); return null; }
    setSaving(true);
    try {
      if (id) {
        const { error } = await supabase.from('courses').update(payload()).eq('id', id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase.from('courses').insert({ ...payload(), status: 'BROUILLON', position: 0 }).select('*').single();
      if (error) throw error;
      setId((data as Course).id);
      setCourse(data as Course);
      navigate(`/studio/formations/${(data as Course).id}`, { replace: true });
      return (data as Course).id;
    } catch (e) {
      const code = (e as { code?: string }).code;
      toast('error', code === '23505' ? 'Ce lien (slug) est déjà utilisé par une autre formation.' : 'Enregistrement impossible. Réessaie dans un instant.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    if (step <= 1) { const ok = await saveDraft(); if (!ok) return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  // ── Modules / leçons ──
  const [modTitle, setModTitle] = useState('');
  const addModule = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !modTitle.trim()) return;
    const { error } = await supabase.from('course_modules').insert({ course_id: id, title: modTitle.trim(), position: modules.length });
    if (error) { toast('error', 'Ajout impossible.'); return; }
    setModTitle('');
    await loadContent(id);
  };
  const delModule = async (m: CourseModule) => {
    if (!id || !window.confirm(`Supprimer le module « ${m.title} » et ses leçons ?`)) return;
    const { error } = await supabase.from('course_modules').delete().eq('id', m.id);
    if (error) { toast('error', 'Suppression impossible.'); return; }
    await loadContent(id);
  };

  const [lessonFor, setLessonFor] = useState<string | null>(null);
  const [lf, setLf] = useState({ title: '', kind: 'TEXTE' as (typeof KINDS)[number], duration: '', content: '' });
  const addLesson = async (e: FormEvent, moduleId: string) => {
    e.preventDefault();
    if (!id || !lf.title.trim()) return;
    const pos = lessons.filter((l) => l.module_id === moduleId).length;
    const { error } = await supabase.from('lessons').insert({
      module_id: moduleId, course_id: id, title: lf.title.trim(), kind: lf.kind, content: lf.content.trim() || null,
      duration_minutes: lf.duration ? Number(lf.duration) : null, position: pos, is_published: true,
    });
    if (error) { toast('error', 'Ajout impossible.'); return; }
    setLf({ title: '', kind: 'TEXTE', duration: '', content: '' });
    setLessonFor(null);
    await loadContent(id);
  };
  const delLesson = async (l: Lesson) => {
    if (!id) return;
    const { error } = await supabase.from('lessons').delete().eq('id', l.id);
    if (error) { toast('error', 'Suppression impossible.'); return; }
    await loadContent(id);
  };

  // ── Image ──
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { toast('error', 'Image requise, 5 Mo maximum.'); return; }
    setUploading(true);
    const ext = file.name.split('.').pop() ?? 'png';
    const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ''))}.${ext}`;
    const { error } = await supabase.storage.from('course-images').upload(path, file);
    setUploading(false);
    if (error) { toast('error', 'Téléversement impossible.'); return; }
    set('image_url', supabase.storage.from('course-images').getPublicUrl(path).data.publicUrl);
  };

  // ── Publication ──
  const publishedLessons = lessons.filter((l) => l.is_published);
  const checks = [
    { ok: d.title.trim().length >= 3, label: 'Titre renseigné' },
    { ok: d.short_description.trim().length >= 10, label: 'Description courte renseignée' },
    // Une formation présentielle n'a pas besoin de leçons : ses sessions sont gérées dans Studio → Sessions.
    ...(d.delivery_mode === 'PRESENTIEL' ? [] : [
      { ok: modules.length > 0, label: 'Au moins un module' },
      { ok: publishedLessons.length > 0, label: 'Au moins une leçon publiée' },
    ]),
  ];
  const ready = checks.every((c) => c.ok);

  const setStatus = async (status: 'BROUILLON' | 'PUBLIEE' | 'ARCHIVEE', comingSoon = false) => {
    const cid = await saveDraft();
    if (!cid) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('courses').update({ status, coming_soon: comingSoon }).eq('id', cid);
      if (error) throw error;
      const { data } = await supabase.from('courses').select('*').eq('id', cid).single();
      setCourse(data as Course);
      await invalidate();
      if (status === 'PUBLIEE') {
        // Les notifications in-app sont créées par un trigger SQL (une seule fois). Les emails partent d'une Edge Function sécurisée.
        let note = 'Notifications email non configurées.';
        try {
          const { data: res, error: fnErr } = await supabase.functions.invoke('notify-course-published', { body: { course_id: cid } });
          if (!fnErr && res && (res as { configured?: boolean }).configured) {
            const r = res as { sent: number; failed: number };
            note = r.sent === 0 && r.failed === 0 ? 'Aucun inscrit à prévenir par email.' : `Emails envoyés : ${r.sent}${r.failed ? ` (échecs : ${r.failed})` : ''}.`;
          }
        } catch { /* la fonction n'est pas déployée : on affiche le message honnête par défaut */ }
        setEmailNote(note);
        toast('success', 'Formation publiée.');
      } else {
        toast('success', status === 'ARCHIVEE' ? 'Formation archivée.' : comingSoon ? 'Formation annoncée « Bientôt disponible ».' : 'Brouillon enregistré.');
      }
      setConfirmPublish(false);
    } catch {
      toast('error', 'Action impossible pour le moment. Réessaie dans un instant.');
    } finally {
      setSaving(false);
    }
  };

  if (!isSupabaseConfigured) return <p className="text-sm text-neutral-500">Le Studio nécessite une connexion Supabase configurée.</p>;
  if (loading) return <LoadingState />;

  const status = course?.status ?? 'BROUILLON';
  const label = status === 'PUBLIEE' ? 'Publiée' : status === 'ARCHIVEE' ? 'Archivée' : course?.coming_soon ? 'Brouillon · annoncée' : 'Brouillon';

  return (
    <div className="space-y-8">
      <Seo title="Formation" noindex />
      <div>
        <Link to="/studio/formations" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Formations</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-extrabold">{id ? (d.title || 'Formation') : 'Nouvelle formation'}</h1>{id && <Badge variant={status === 'PUBLIEE' ? 'success' : 'neutral'}>{label}</Badge>}</div>
      </div>

      <ol className="flex flex-wrap gap-2" aria-label="Étapes">
        {STEPS.map((s, i) => {
          const locked = i > 1 && !id;
          return (
            <li key={s}>
              <button type="button" disabled={locked} aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)}
                className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  i === step ? 'border-primary-600 bg-primary-600 text-white' : 'border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800')}>
                <span className="font-mono text-xs">{i + 1}</span>{s}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="card space-y-5 p-6">
        {step === 0 && (
          <>
            <div><label htmlFor="w-title" className="label">Titre</label><input id="w-title" className={fieldCls} value={d.title} onChange={(e) => set('title', e.target.value)} />{errors.title && <p role="alert" className="mt-1 text-xs text-error-600">{errors.title}</p>}</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="w-slug" className="label">Lien (slug)</label><input id="w-slug" className={fieldCls} value={d.slug} placeholder={slugify(d.title) || 'généré à partir du titre'} onChange={(e) => set('slug', slugify(e.target.value))} /></div>
              <div><label htmlFor="w-cat" className="label">Catégorie</label><select id="w-cat" className={fieldCls} value={d.category} onChange={(e) => set('category', e.target.value)}>{categoriesCourses.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div><label htmlFor="w-level" className="label">Niveau</label><select id="w-level" className={fieldCls} value={d.level} onChange={(e) => set('level', e.target.value as Course['level'])}><option value="DEBUTANT">Débutant</option><option value="INTERMEDIAIRE">Intermédiaire</option><option value="AVANCE">Avancé</option></select></div>
              <div><label htmlFor="w-mode" className="label">Mode</label><select id="w-mode" className={fieldCls} value={d.delivery_mode} onChange={(e) => set('delivery_mode', e.target.value as Draft['delivery_mode'])}><option value="PRESENTIEL">Formation présentielle</option><option value="EN_LIGNE">En ligne (supports et leçons)</option></select></div>
              <div><label htmlFor="w-trainer" className="label">Formateur</label><input id="w-trainer" className={fieldCls} value={d.trainer_name} placeholder="Nom affiché sur la fiche et le certificat" onChange={(e) => set('trainer_name', e.target.value)} /></div>
              <div><label htmlFor="w-dur" className="label">Durée</label><input id="w-dur" className={fieldCls} value={d.duration} placeholder="Ex. 6 semaines" onChange={(e) => set('duration', e.target.value)} /></div>
            </div>
            <div><label htmlFor="w-short" className="label">Description courte</label><textarea id="w-short" rows={2} className={fieldCls} value={d.short_description} onChange={(e) => set('short_description', e.target.value)} />{errors.short_description && <p role="alert" className="mt-1 text-xs text-error-600">{errors.short_description}</p>}</div>
          </>
        )}

        {step === 1 && (
          <>
            <div><label htmlFor="w-long" className="label">Présentation détaillée</label><textarea id="w-long" rows={4} className={fieldCls} value={d.long_description} onChange={(e) => set('long_description', e.target.value)} /></div>
            <div><label htmlFor="w-obj" className="label">Objectifs <span className="font-normal text-neutral-500">(un par ligne)</span></label><textarea id="w-obj" rows={4} className={fieldCls} value={d.objectivesText} onChange={(e) => set('objectivesText', e.target.value)} /></div>
            <div><label htmlFor="w-pre" className="label">Prérequis <span className="font-normal text-neutral-500">(un par ligne)</span></label><textarea id="w-pre" rows={3} className={fieldCls} value={d.prerequisitesText} onChange={(e) => set('prerequisitesText', e.target.value)} /></div>
            <div><label htmlFor="w-mat" className="label">Matériel nécessaire <span className="font-normal text-neutral-500">(un par ligne)</span></label><textarea id="w-mat" rows={3} className={fieldCls} value={d.materialsText} onChange={(e) => set('materialsText', e.target.value)} /></div>
            <div><label htmlFor="w-info" className="label">Informations pratiques</label><textarea id="w-info" rows={3} className={fieldCls} value={d.practical_info} placeholder="Accès, repas, horaires d’accueil…" onChange={(e) => set('practical_info', e.target.value)} /></div>
            <div><label htmlFor="w-fp" className="label">Projet final</label><textarea id="w-fp" rows={2} className={fieldCls} value={d.final_project} onChange={(e) => set('final_project', e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.has_certificate} onChange={(e) => set('has_certificate', e.target.checked)} />Délivrer un certificat à la fin</label>
            <fieldset className="space-y-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <legend className="px-1 text-sm font-semibold">Visibilité</legend>
              <p className="text-xs text-neutral-500">Afficher sur le portfolio = publier la formation (étape Publication).</p>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.show_in_cv} onChange={(e) => set('show_in_cv', e.target.checked)} />Afficher comme activité de formateur dans mon CV</label>
            </fieldset>
          </>
        )}

        {step === 2 && id && (
          <div className="space-y-5">
            {d.delivery_mode === 'PRESENTIEL' && <p className="rounded-xl border border-neutral-200 p-3 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">Cette formation est présentielle : les modules forment le programme affiché sur la fiche publique (un module = une journée ou un thème) ; les leçons sont des supports facultatifs. Les dates, le lieu et les places se règlent dans <Link to="/studio/sessions" className="underline">Studio → Sessions</Link>.</p>}
            {modules.length === 0 && <p className="text-sm text-neutral-500">Aucun module pour le moment. Ajoute le premier ci-dessous.</p>}
            {modules.map((m, mi) => (
              <section key={m.id} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800" aria-label={`Module ${m.title}`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold"><span className="mr-2 font-mono text-xs text-neutral-500">{String(mi + 1).padStart(2, '0')}</span>{m.title}</h3>
                  <button type="button" onClick={() => void delModule(m)} aria-label={`Supprimer le module ${m.title}`} className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-error-600 dark:hover:bg-neutral-800"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                </div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {lessons.filter((l) => l.module_id === m.id).map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900"><span>{l.title} <span className="text-xs text-neutral-500">· {l.kind.toLowerCase()}{l.duration_minutes ? ` · ${l.duration_minutes} min` : ''}</span></span>
                      <button type="button" onClick={() => void delLesson(l)} aria-label={`Supprimer la leçon ${l.title}`} className="text-neutral-500 hover:text-error-600"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button></li>
                  ))}
                </ul>
                {lessonFor === m.id ? (
                  <form onSubmit={(e) => void addLesson(e, m.id)} className="mt-3 space-y-3 rounded-xl border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
                    <div className="grid gap-3 sm:grid-cols-[1fr_8rem_6rem]">
                      <div><label htmlFor={`lt-${m.id}`} className="label">Titre de la leçon</label><input id={`lt-${m.id}`} className={fieldCls} value={lf.title} onChange={(e) => setLf({ ...lf, title: e.target.value })} required /></div>
                      <div><label htmlFor={`lk-${m.id}`} className="label">Type</label><select id={`lk-${m.id}`} className={fieldCls} value={lf.kind} onChange={(e) => setLf({ ...lf, kind: e.target.value as (typeof KINDS)[number] })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
                      <div><label htmlFor={`ld-${m.id}`} className="label">Minutes</label><input id={`ld-${m.id}`} type="number" min={0} className={fieldCls} value={lf.duration} onChange={(e) => setLf({ ...lf, duration: e.target.value })} /></div>
                    </div>
                    <div><label htmlFor={`lc-${m.id}`} className="label">Contenu</label><textarea id={`lc-${m.id}`} rows={4} className={fieldCls} value={lf.content} onChange={(e) => setLf({ ...lf, content: e.target.value })} /></div>
                    <div className="flex gap-2"><Button type="submit" size="sm">Ajouter la leçon</Button><Button variant="ghost" size="sm" onClick={() => setLessonFor(null)}>Annuler</Button></div>
                  </form>
                ) : (
                  <button type="button" onClick={() => { setLessonFor(m.id); setLf({ title: '', kind: 'TEXTE', duration: '', content: '' }); }} className="mt-3 text-sm font-semibold text-primary-600 dark:text-primary-300">+ Ajouter une leçon</button>
                )}
              </section>
            ))}
            <form onSubmit={(e) => void addModule(e)} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1"><label htmlFor="w-mod" className="label">Nouveau module</label><input id="w-mod" className={fieldCls} value={modTitle} placeholder="Ex. Les bases" onChange={(e) => setModTitle(e.target.value)} /></div>
              <Button type="submit" variant="outline">Ajouter le module</Button>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {d.image_url ? <img src={d.image_url} alt="Aperçu de l’image de la formation" width={1280} height={720} className="aspect-video w-full max-w-md rounded-2xl border border-neutral-200 object-cover dark:border-neutral-800" /> : <p className="text-sm text-neutral-500">Aucune image. Elle est facultative.</p>}
            <div><label htmlFor="w-img" className="label">Téléverser une image <span className="font-normal text-neutral-500">(5 Mo max)</span></label><input id="w-img" type="file" accept="image/*" disabled={uploading} onChange={(e) => void upload(e.target.files?.[0])} className="block text-sm" /></div>
            <div><label htmlFor="w-imgurl" className="label">ou URL de l’image</label><input id="w-imgurl" type="url" className={fieldCls} value={d.image_url} onChange={(e) => set('image_url', e.target.value)} /></div>
          </div>
        )}

        {step === 4 && id && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold">Résumé</h2>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div><dt className="text-neutral-500">Titre</dt><dd className="font-semibold">{d.title}</dd></div>
              <div><dt className="text-neutral-500">Catégorie · niveau</dt><dd className="font-semibold">{d.category} · {d.level.toLowerCase()}</dd></div>
              <div><dt className="text-neutral-500">Contenu</dt><dd className="font-semibold">{modules.length} module{modules.length > 1 ? 's' : ''}, {publishedLessons.length} leçon{publishedLessons.length > 1 ? 's' : ''}</dd></div>
              <div><dt className="text-neutral-500">Statut actuel</dt><dd className="font-semibold">{label}</dd></div>
            </dl>
            <ul className="space-y-1.5 text-sm">{checks.map((c) => <li key={c.label} className="flex items-center gap-2"><span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-white', c.ok ? 'bg-success-600' : 'bg-neutral-400')} aria-hidden="true">{c.ok ? <Check className="h-3 w-3" /> : '·'}</span><span>{c.label}<span className="sr-only">{c.ok ? ' : OK' : ' : manquant'}</span></span></li>)}</ul>

            {emailNote && <p role="status" className="rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">{emailNote}</p>}

            {confirmPublish ? (
              <div role="alertdialog" aria-label="Confirmer la publication" className="rounded-2xl border border-primary-500/40 bg-primary-500/5 p-5">
                <p className="font-semibold">Vous êtes sur le point de publier cette formation.</p>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Elle sera visible publiquement et les inscrits à la liste d’attente seront prévenus. {d.delivery_mode === 'PRESENTIEL' ? 'Pense à ouvrir une session pour permettre les inscriptions.' : ''}</p>
                <div className="mt-4 flex gap-2"><Button disabled={saving} onClick={() => void setStatus('PUBLIEE')}>{saving ? 'Publication…' : 'Publier'}</Button><Button variant="ghost" onClick={() => setConfirmPublish(false)}>Annuler</Button></div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {status !== 'PUBLIEE' && <Button disabled={!ready || saving} onClick={() => setConfirmPublish(true)}>Publier</Button>}
                {status !== 'PUBLIEE' && <Button variant="outline" disabled={saving} onClick={() => void setStatus('BROUILLON', true)}>Annoncer « Bientôt disponible »</Button>}
                {status !== 'PUBLIEE' && <Button variant="outline" disabled={saving} onClick={() => void setStatus('BROUILLON', false)}>Enregistrer en brouillon</Button>}
                {status === 'PUBLIEE' && <Button variant="outline" disabled={saving} onClick={() => void setStatus('BROUILLON', false)}>Repasser en brouillon</Button>}
                {status !== 'ARCHIVEE' && <Button variant="ghost" disabled={saving} onClick={() => void setStatus('ARCHIVEE')}>Archiver</Button>}
              </div>
            )}
            {!ready && status !== 'PUBLIEE' && <p className="text-xs text-neutral-500">La publication demande un contenu minimum (voir les points ci-dessus).</p>}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Précédent</Button>
        {step < STEPS.length - 1 && <Button disabled={saving} onClick={() => void next()}>{saving ? 'Enregistrement…' : step <= 1 ? 'Enregistrer et continuer' : 'Suivant'}</Button>}
      </div>
    </div>
  );
}
