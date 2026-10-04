import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/services/supabase';
import { rpc } from '@/lib/training/api';
import { formatPeriod, trainingError } from '@/lib/training/format';
import { useRefreshTraining, useStudioCourses, useStudioRegistrations, useStudioSessions } from './hooks';

export interface ManualCertDefaults { userId?: string; courseId?: string; sessionId?: string }
interface LearnerRow { id: string; full_name: string | null; email: string }

const f = 'input-field';
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Création MANUELLE d'un certificat par l'administrateur (en plus de la génération automatique).
 * Tout passe par la fonction serveur admin_issue_certificate : numéro unique, droits ADMIN et absence de doublon sont garantis côté base.
 * Les champs laissés vides sont complétés par la session / la formation.
 */
export function ManualCertificateModal({ open, onClose, defaults }: { open: boolean; onClose: () => void; defaults?: ManualCertDefaults }) {
  const toast = useToast();
  const refresh = useRefreshTraining();
  const courses = useStudioCourses();
  const sessions = useStudioSessions();
  const regs = useStudioRegistrations();
  const learners = useQuery({
    queryKey: ['studio-training', 'learners-for-certificate'],
    enabled: open,
    queryFn: async (): Promise<LearnerRow[]> => {
      const { data, error } = await supabase.from('profiles').select('id,full_name,email').order('full_name', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as LearnerRow[];
    },
  });

  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [holder, setHolder] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [duration, setDuration] = useState('');
  const [location, setLocation] = useState('');
  const [trainer, setTrainer] = useState('');
  const [issuedOn, setIssuedOn] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSearch(''); setUserId(defaults?.userId ?? ''); setCourseId(defaults?.courseId ?? ''); setSessionId(defaults?.sessionId ?? '');
    setHolder(''); setStart(''); setEnd(''); setDuration(''); setLocation(''); setTrainer(''); setIssuedOn(''); setReason(''); setErr(null);
  }, [open, defaults?.userId, defaults?.courseId, defaults?.sessionId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = learners.data ?? [];
    const base = q ? list.filter((p) => (p.full_name ?? '').toLowerCase().includes(q) || p.email.toLowerCase().includes(q)) : list;
    const picked = list.find((p) => p.id === userId);
    return picked && !base.some((p) => p.id === picked.id) ? [picked, ...base] : base;
  }, [learners.data, search, userId]);

  const courseSessions = (sessions.data ?? []).filter((s) => s.course_id === courseId);
  const course = (courses.data ?? []).find((c) => c.id === courseId);
  const session = courseSessions.find((s) => s.id === sessionId);
  const learner = (learners.data ?? []).find((p) => p.id === userId);
  const reg = (regs.data ?? []).find((r) => r.user_id === userId && r.session_id === sessionId);
  const suggestedName = reg ? `${reg.first_name} ${reg.last_name.toUpperCase()}` : learner?.full_name ?? '';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!userId) return setErr('Choisis l’apprenant.');
    if (!courseId) return setErr('Choisis la formation.');
    if (!holder.trim() && !suggestedName.trim()) return setErr('Renseigne le nom à inscrire sur le certificat (le profil n’a pas de nom).');
    if (start && end && end < start) return setErr('La date de fin ne peut pas précéder la date de début.');
    if (issuedOn && issuedOn > today()) return setErr('La date de délivrance ne peut pas être dans le futur.');
    setBusy(true);
    try {
      await rpc('admin_issue_certificate', {
        p_user_id: userId, p_course_id: courseId, p_session_id: sessionId || null, p_holder_name: holder.trim() || null,
        p_period_start: start || null, p_period_end: end || null, p_duration_label: duration.trim() || null,
        p_location: location.trim() || null, p_trainer_name: trainer.trim() || null, p_issued_on: issuedOn || null, p_reason: reason.trim() || null,
      });
      await refresh();
      toast('success', 'Certificat créé. L’apprenant est notifié.');
      onClose();
    } catch (e2) { setErr(trainingError(e2, 'Création impossible. Vérifie les champs puis réessaie.')); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Créer un certificat manuellement" wide>
      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4" aria-label="Création manuelle d’un certificat">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Le certificat reçoit un numéro unique <span className="font-mono">JDC-AAAA-XXXXXX</span>, est vérifiable publiquement et apparaît dans l’espace de l’apprenant. Aucun critère d’éligibilité n’est exigé : c’est ta décision d’administrateur.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="mc-search" className="label">Apprenant</label>
            <input id="mc-search" className={f} placeholder="Rechercher par nom ou email…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <label htmlFor="mc-user" className="sr-only">Choisir l’apprenant</label>
            <select id="mc-user" className={`${f} mt-2`} value={userId} onChange={(e) => setUserId(e.target.value)} size={filtered.length > 1 ? Math.min(5, filtered.length + 1) : undefined}>
              <option value="">— Choisir —</option>
              {filtered.map((p) => <option key={p.id} value={p.id}>{p.full_name || '(sans nom)'} — {p.email}</option>)}
            </select>
            {learners.isError && <p className="mt-1 text-xs text-error-600">Impossible de charger les comptes (réservé à l’administrateur).</p>}
          </div>
          <div>
            <label htmlFor="mc-course" className="label">Formation</label>
            <select id="mc-course" className={f} value={courseId} onChange={(e) => { setCourseId(e.target.value); setSessionId(''); }}>
              <option value="">— Choisir —</option>
              {(courses.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="mc-session" className="label">Session <span className="font-normal normal-case text-neutral-500">(facultatif)</span></label>
            <select id="mc-session" className={f} value={sessionId} onChange={(e) => setSessionId(e.target.value)} disabled={!courseId}>
              <option value="">Aucune session</option>
              {courseSessions.map((s) => <option key={s.id} value={s.id}>{formatPeriod(s.starts_on, s.ends_on)} · {s.location}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="mc-name" className="label">Nom sur le certificat</label>
            <input id="mc-name" className={f} value={holder} maxLength={150} placeholder={suggestedName || 'Prénom NOM'} onChange={(e) => setHolder(e.target.value)} />
            <p className="mt-1 text-xs text-neutral-500">Laisse vide pour utiliser {suggestedName ? <strong>{suggestedName}</strong> : 'le nom du profil'}.</p>
          </div>
          <div><label htmlFor="mc-start" className="label">Début de la formation</label><input id="mc-start" type="date" className={f} value={start} onChange={(e) => setStart(e.target.value)} /><p className="mt-1 text-xs text-neutral-500">{session ? `Vide = ${formatPeriod(session.starts_on, session.ends_on)}` : 'Facultatif'}</p></div>
          <div><label htmlFor="mc-end" className="label">Fin de la formation</label><input id="mc-end" type="date" className={f} value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          <div><label htmlFor="mc-duration" className="label">Durée</label><input id="mc-duration" className={f} value={duration} maxLength={100} placeholder={course?.duration ?? 'Ex. 6 semaines'} onChange={(e) => setDuration(e.target.value)} /></div>
          <div><label htmlFor="mc-loc" className="label">Lieu</label><input id="mc-loc" className={f} value={location} maxLength={300} placeholder={session?.location ?? 'Ville, salle…'} onChange={(e) => setLocation(e.target.value)} /></div>
          <div><label htmlFor="mc-trainer" className="label">Formateur</label><input id="mc-trainer" className={f} value={trainer} maxLength={150} placeholder={session?.trainer_name ?? course?.trainer_name ?? ''} onChange={(e) => setTrainer(e.target.value)} /></div>
          <div><label htmlFor="mc-date" className="label">Date de délivrance</label><input id="mc-date" type="date" max={today()} className={f} value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} /><p className="mt-1 text-xs text-neutral-500">Vide = aujourd’hui.</p></div>
          <div className="sm:col-span-2"><label htmlFor="mc-reason" className="label">Motif (interne, jamais affiché)</label><textarea id="mc-reason" rows={2} maxLength={500} className={f} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. formation suivie hors plateforme, régularisation…" /></div>
        </div>
        {err && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{err}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Annuler</Button><Button type="submit" disabled={busy}>{busy ? 'Création…' : 'Créer le certificat'}</Button></div>
      </form>
    </Modal>
  );
}
