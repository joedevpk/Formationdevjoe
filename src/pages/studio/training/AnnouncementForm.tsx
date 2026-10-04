import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/services/supabase';
import { announcementKinds, trainingError, visibilityLabels } from '@/lib/training/format';
import type { AnnouncementKind, AnnouncementStatus, AnnouncementVisibility, TrainingAnnouncement } from '@/lib/training/types';
import { slugify } from '@/utils';
import { useRefreshTraining, useStudioCourses, useStudioSessions } from './hooks';
import { formatPeriod } from '@/lib/training/format';

const f = 'input-field';
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

/** Création / modification d'une annonce de formation. Publier crée automatiquement les notifications in-app (jamais d'email ici). */
export function AnnouncementForm({ announcement, presetCourseId, presetSessionId, onSaved, onCancel }: {
  announcement?: TrainingAnnouncement; presetCourseId?: string; presetSessionId?: string; onSaved: () => void; onCancel?: () => void;
}) {
  const toast = useToast();
  const refresh = useRefreshTraining();
  const courses = useStudioCourses();
  const sessions = useStudioSessions();
  const [kind, setKind] = useState<AnnouncementKind>(announcement?.kind ?? 'INFORMATION');
  const [title, setTitle] = useState(announcement?.title ?? '');
  const [content, setContent] = useState(announcement?.content ?? '');
  const [courseId, setCourseId] = useState(announcement?.course_id ?? presetCourseId ?? '');
  const [sessionId, setSessionId] = useState(announcement?.session_id ?? presetSessionId ?? '');
  const [visibility, setVisibility] = useState<AnnouncementVisibility>(announcement?.visibility ?? 'PARTICIPANTS');
  const [imageUrl, setImageUrl] = useState(announcement?.image_url ?? '');
  const [expires, setExpires] = useState(toLocal(announcement?.expires_at ?? null));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const courseSessions = (sessions.data ?? []).filter((s) => s.course_id === courseId);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { toast('error', 'Image requise, 5 Mo maximum.'); return; }
    setUploading(true);
    const path = `announcements/${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ''))}.${file.name.split('.').pop() ?? 'png'}`;
    const { error } = await supabase.storage.from('course-images').upload(path, file);
    setUploading(false);
    if (error) { toast('error', 'Téléversement impossible.'); return; }
    setImageUrl(supabase.storage.from('course-images').getPublicUrl(path).data.publicUrl);
  };

  const save = async (e: FormEvent, status: AnnouncementStatus) => {
    e.preventDefault();
    setErr(null);
    if (!title.trim() || !content.trim()) return setErr('Le titre et le contenu sont obligatoires.');
    if (visibility === 'PARTICIPANTS' && !courseId) return setErr('Une annonce pour les participants doit être rattachée à une formation.');
    if (imageUrl.trim() && !/^https?:\/\//i.test(imageUrl.trim())) return setErr('L’image doit être une adresse http(s).');
    setBusy(true);
    const row = {
      kind, title: title.trim(), content: content.trim(), course_id: courseId || null, session_id: sessionId || null, visibility, status,
      image_url: imageUrl.trim() || null, expires_at: expires ? new Date(expires).toISOString() : null,
    };
    try {
      const q = announcement ? supabase.from('training_announcements').update(row).eq('id', announcement.id) : supabase.from('training_announcements').insert(row);
      const { error } = await q;
      if (error) throw error;
      await refresh();
      toast('success', status === 'PUBLIEE' ? 'Annonce publiée. Les participants concernés sont notifiés dans leur espace.' : 'Brouillon enregistré.');
      onSaved();
    } catch (e2) { setErr(trainingError(e2, 'Enregistrement impossible. Vérifie les champs puis réessaie.')); }
    finally { setBusy(false); }
  };

  return (
    <form noValidate className="card space-y-4 p-6" aria-label={announcement ? 'Modifier l’annonce' : 'Nouvelle annonce'} onSubmit={(e) => e.preventDefault()}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="an-kind" className="label">Type d’annonce</label><select id="an-kind" className={f} value={kind} onChange={(e) => setKind(e.target.value as AnnouncementKind)}>{Object.entries(announcementKinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label htmlFor="an-vis" className="label">Visibilité</label><select id="an-vis" className={f} value={visibility} onChange={(e) => setVisibility(e.target.value as AnnouncementVisibility)}>{Object.entries(visibilityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label htmlFor="an-course" className="label">Formation concernée</label><select id="an-course" className={f} value={courseId} onChange={(e) => { setCourseId(e.target.value); setSessionId(''); }}><option value="">— Aucune (générale) —</option>{(courses.data ?? []).filter((c) => c.delivery_mode !== 'EN_LIGNE').map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
        <div><label htmlFor="an-session" className="label">Session <span className="font-normal normal-case text-neutral-500">(facultatif)</span></label><select id="an-session" className={f} value={sessionId} onChange={(e) => setSessionId(e.target.value)} disabled={!courseId}><option value="">Toutes les sessions</option>{courseSessions.map((s) => <option key={s.id} value={s.id}>{formatPeriod(s.starts_on, s.ends_on)} — {s.location}</option>)}</select></div>
        <div className="sm:col-span-2"><label htmlFor="an-title" className="label">Titre</label><input id="an-title" className={f} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></div>
        <div className="sm:col-span-2"><label htmlFor="an-content" className="label">Contenu</label><textarea id="an-content" rows={5} className={f} value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} /></div>
        <div><label htmlFor="an-img" className="label">Image <span className="font-normal normal-case text-neutral-500">(facultatif)</span></label><input id="an-img" type="file" accept="image/*" disabled={uploading} onChange={(e) => void upload(e.target.files?.[0])} className="block text-sm" />{imageUrl && <p className="mt-1 truncate text-xs text-neutral-500">{imageUrl}</p>}</div>
        <div><label htmlFor="an-exp" className="label">Date d’expiration <span className="font-normal normal-case text-neutral-500">(facultatif)</span></label><input id="an-exp" type="datetime-local" className={f} value={expires} onChange={(e) => setExpires(e.target.value)} /></div>
      </div>
      <p className="text-xs text-neutral-500">À la publication, une notification est créée dans l’espace de chaque participant inscrit. Aucun email n’est envoyé par cette fonction.</p>
      {err && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void save({ preventDefault() {} } as FormEvent, 'PUBLIEE')}>{busy ? 'Enregistrement…' : announcement?.status === 'PUBLIEE' ? 'Enregistrer' : 'Publier l’annonce'}</Button>
        {announcement?.status !== 'PUBLIEE' && <Button variant="outline" disabled={busy} onClick={() => void save({ preventDefault() {} } as FormEvent, 'BROUILLON')}>Enregistrer en brouillon</Button>}
        {onCancel && <Button variant="ghost" onClick={onCancel}>Annuler</Button>}
      </div>
    </form>
  );
}
