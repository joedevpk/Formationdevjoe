import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/services/supabase';
import { sessionStatusLabels, trainingError } from '@/lib/training/format';
import type { SessionStatus, TrainingSession } from '@/lib/training/types';
import { useRefreshTraining, useStaffProfiles, useStudioCourses } from './hooks';

const f = 'input-field';
interface Draft {
  course_id: string; title: string; starts_on: string; ends_on: string; daily_start: string; daily_end: string; schedule_note: string;
  location: string; address: string; trainer_id: string; trainer_name: string; capacity: string; status: SessionStatus;
  min_attendance_pct: string; requires_final_validation: boolean; requires_final_project: boolean; requires_evaluation: boolean;
}
const empty: Draft = {
  course_id: '', title: '', starts_on: '', ends_on: '', daily_start: '', daily_end: '', schedule_note: '', location: '', address: '', trainer_id: '', trainer_name: '',
  capacity: '', status: 'OUVERT', min_attendance_pct: '', requires_final_validation: true, requires_final_project: false, requires_evaluation: false,
};
const toDraft = (s: TrainingSession): Draft => ({
  course_id: s.course_id, title: s.title ?? '', starts_on: s.starts_on, ends_on: s.ends_on, daily_start: s.daily_start?.slice(0, 5) ?? '', daily_end: s.daily_end?.slice(0, 5) ?? '',
  schedule_note: s.schedule_note ?? '', location: s.location, address: s.address ?? '', trainer_id: s.trainer_id ?? '', trainer_name: s.trainer_name ?? '', capacity: String(s.capacity),
  status: s.status, min_attendance_pct: s.min_attendance_pct ? String(s.min_attendance_pct) : '', requires_final_validation: s.requires_final_validation,
  requires_final_project: s.requires_final_project, requires_evaluation: s.requires_evaluation,
});

/** Création / modification d'une session présentielle (étape 2 du parcours) et de ses conditions de certificat. */
export function SessionForm({ session, onSaved, onCancel }: { session?: TrainingSession; onSaved: (s: TrainingSession) => void; onCancel?: () => void }) {
  const toast = useToast();
  const refresh = useRefreshTraining();
  const courses = useStudioCourses();
  const staff = useStaffProfiles();
  const [d, setD] = useState<Draft>(session ? toDraft(session) : empty);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const selCourse = (courses.data ?? []).find((c) => c.id === d.course_id);
  const presentielCourses = (courses.data ?? []).filter((c) => c.delivery_mode !== 'EN_LIGNE' && c.status !== 'ARCHIVEE');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const cap = Number(d.capacity);
    if (!d.course_id) return setErr('Choisis la formation.');
    if (!d.starts_on || !d.ends_on) return setErr('Renseigne la date de début et la date de fin.');
    if (d.ends_on < d.starts_on) return setErr('La date de fin ne peut pas précéder la date de début.');
    if (d.daily_start && d.daily_end && d.daily_end <= d.daily_start) return setErr('L’heure de fin doit suivre l’heure de début.');
    if (!d.location.trim()) return setErr('Renseigne le lieu.');
    if (!Number.isInteger(cap) || cap < 1) return setErr('La capacité maximale doit être un nombre entier positif.');
    const pct = d.min_attendance_pct ? Number(d.min_attendance_pct) : null;
    if (pct !== null && (!Number.isInteger(pct) || pct < 1 || pct > 100)) return setErr('La présence minimale doit être comprise entre 1 et 100 %.');
    setBusy(true);
    const row = {
      course_id: d.course_id, title: d.title.trim() || null, starts_on: d.starts_on, ends_on: d.ends_on, daily_start: d.daily_start || null, daily_end: d.daily_end || null,
      schedule_note: d.schedule_note.trim() || null, location: d.location.trim(), address: d.address.trim() || null, trainer_id: d.trainer_id || null,
      trainer_name: d.trainer_name.trim() || null, capacity: cap, status: d.status, min_attendance_pct: pct,
      requires_final_validation: d.requires_final_validation, requires_final_project: d.requires_final_project, requires_evaluation: d.requires_evaluation,
    };
    try {
      const q = session ? supabase.from('training_sessions').update(row).eq('id', session.id) : supabase.from('training_sessions').insert(row);
      const { data, error } = await q.select('*').single();
      if (error) throw error;
      await refresh();
      toast('success', session ? 'Session enregistrée.' : 'Session créée.');
      onSaved(data as TrainingSession);
    } catch (e2) { setErr(trainingError(e2, 'Enregistrement impossible. Vérifie les champs puis réessaie.')); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="card space-y-5 p-6" aria-label={session ? 'Modifier la session' : 'Nouvelle session'}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label htmlFor="sf-course" className="label">Formation</label>
          <select id="sf-course" className={f} value={d.course_id} onChange={(e) => { set('course_id', e.target.value); const c = courses.data?.find((x) => x.id === e.target.value); if (c && !d.trainer_name) set('trainer_name', c.trainer_name ?? ''); }} disabled={Boolean(session)}>
            <option value="">— Choisir —</option>{presentielCourses.map((c) => <option key={c.id} value={c.id}>{c.title}{c.status !== 'PUBLIEE' ? ' (non publiée)' : ''}</option>)}
          </select>
          {presentielCourses.length === 0 && courses.data && <p className="mt-1 text-xs text-neutral-500">Aucune formation présentielle. Crée d’abord la formation (étape 1).</p>}
          {selCourse && selCourse.status !== 'PUBLIEE' && <p role="note" className="mt-2 rounded-xl border border-warning-500/40 bg-warning-500/5 p-3 text-xs">La formation « {selCourse.title} » n’est pas publiée : cette session restera invisible du public, et personne ne pourra s’y inscrire, tant que la formation n’est pas publiée (Studio → Formations → Publier).</p>}
        </div>
        <div className="sm:col-span-2"><label htmlFor="sf-title" className="label">Nom de la session <span className="font-normal normal-case text-neutral-500">(facultatif)</span></label><input id="sf-title" className={f} value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex. Promotion de novembre" /></div>
        <div><label htmlFor="sf-start" className="label">Date de début</label><input id="sf-start" type="date" className={f} value={d.starts_on} onChange={(e) => set('starts_on', e.target.value)} /></div>
        <div><label htmlFor="sf-end" className="label">Date de fin</label><input id="sf-end" type="date" className={f} value={d.ends_on} onChange={(e) => set('ends_on', e.target.value)} /></div>
        <div><label htmlFor="sf-ds" className="label">Heure de début (chaque jour)</label><input id="sf-ds" type="time" className={f} value={d.daily_start} onChange={(e) => set('daily_start', e.target.value)} /></div>
        <div><label htmlFor="sf-de" className="label">Heure de fin (chaque jour)</label><input id="sf-de" type="time" className={f} value={d.daily_end} onChange={(e) => set('daily_end', e.target.value)} /></div>
        <div className="sm:col-span-2"><label htmlFor="sf-note" className="label">Précision sur les horaires</label><input id="sf-note" className={f} value={d.schedule_note} onChange={(e) => set('schedule_note', e.target.value)} placeholder="Ex. pause déjeuner de 12h30 à 13h30" /></div>
        <div><label htmlFor="sf-loc" className="label">Lieu</label><input id="sf-loc" className={f} value={d.location} onChange={(e) => set('location', e.target.value)} placeholder="Ville, salle…" /></div>
        <div><label htmlFor="sf-addr" className="label">Adresse précise</label><input id="sf-addr" className={f} value={d.address} onChange={(e) => set('address', e.target.value)} /></div>
        <div><label htmlFor="sf-cap" className="label">Capacité maximale</label><input id="sf-cap" type="number" min={1} className={f} value={d.capacity} onChange={(e) => set('capacity', e.target.value)} /></div>
        <div><label htmlFor="sf-status" className="label">Statut</label><select id="sf-status" className={f} value={d.status} onChange={(e) => set('status', e.target.value as SessionStatus)}>{Object.entries(sessionStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><p className="mt-1 text-xs text-neutral-500">« Inscriptions ouvertes » rend la session visible et ouvre l’inscription. « Brouillon » la cache au public.</p></div>
        <div><label htmlFor="sf-trainer" className="label">Compte du formateur <span className="font-normal normal-case text-neutral-500">(pointage)</span></label>
          <select id="sf-trainer" className={f} value={d.trainer_id} onChange={(e) => set('trainer_id', e.target.value)}><option value="">— Aucun —</option>{(staff.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email} ({p.role === 'ADMIN' ? 'admin' : 'instructeur'})</option>)}</select></div>
        <div><label htmlFor="sf-tname" className="label">Nom affiché du formateur</label><input id="sf-tname" className={f} value={d.trainer_name} onChange={(e) => set('trainer_name', e.target.value)} /></div>
      </div>

      <fieldset className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <legend className="px-1 text-sm font-semibold">Conditions d’obtention du certificat</legend>
        <p className="text-xs text-neutral-500">Définies par toi : aucune règle n’est imposée. Le certificat n’est délivré qu’aux participants confirmés qui remplissent tous les critères cochés, une fois la formation terminée.</p>
        <div className="grid gap-3 sm:grid-cols-[14rem_1fr] sm:items-center"><div><label htmlFor="sf-pct" className="label">Présence minimale (%)</label><input id="sf-pct" type="number" min={1} max={100} className={f} value={d.min_attendance_pct} placeholder="Aucune" onChange={(e) => set('min_attendance_pct', e.target.value)} /></div><p className="text-xs text-neutral-500">Calculée sur les jours effectivement pointés (un retard compte comme présent).</p></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.requires_final_validation} onChange={(e) => set('requires_final_validation', e.target.checked)} />Validation finale de chaque participant par l’administrateur</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.requires_final_project} onChange={(e) => set('requires_final_project', e.target.checked)} />Projet final requis</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.requires_evaluation} onChange={(e) => set('requires_evaluation', e.target.checked)} />Évaluation requise</label>
      </fieldset>

      {err && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{err}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : session ? 'Enregistrer la session' : 'Créer la session'}</Button>{onCancel && <Button variant="ghost" onClick={onCancel}>Annuler</Button>}</div>
    </form>
  );
}
