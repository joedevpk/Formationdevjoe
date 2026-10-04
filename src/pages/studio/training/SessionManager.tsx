import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Check, Circle } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/services/supabase';
import { rpc } from '@/lib/training/api';
import { announcementKinds, formatPeriod, formatSchedule, sessionStatusLabels, trainingError, visibilityLabels } from '@/lib/training/format';
import type { SessionStatus, TrainingSession } from '@/lib/training/types';
import { formatDate } from '@/utils';
import { AnnouncementForm } from './AnnouncementForm';
import { AttendancePanel } from './AttendancePanel';
import { RegistrationsPanel } from './RegistrationsPanel';
import { SessionForm } from './SessionForm';
import { courseTitle, useRefreshTraining, useStudioAnnouncements, useStudioAttendance, useStudioCertificates, useStudioCourses, useStudioRegistrations, useStudioSessions } from './hooks';

const TABS = [['resume', 'Résumé'], ['participants', 'Participants'], ['liste', 'Liste'], ['presences', 'Présences'], ['annonces', 'Annonces'], ['cloture', 'Clôture et certificats']] as const;
type Tab = (typeof TABS)[number][0];

const TRANSITIONS: Record<SessionStatus, { to: SessionStatus; label: string; primary?: boolean }[]> = {
  BROUILLON: [{ to: 'OUVERT', label: 'Ouvrir les inscriptions', primary: true }, { to: 'BIENTOT', label: 'Annoncer « Bientôt disponible »' }],
  BIENTOT: [{ to: 'OUVERT', label: 'Ouvrir les inscriptions', primary: true }],
  OUVERT: [{ to: 'FERME', label: 'Fermer les inscriptions' }, { to: 'EN_COURS', label: 'Démarrer la session', primary: true }],
  FERME: [{ to: 'OUVERT', label: 'Rouvrir les inscriptions' }, { to: 'EN_COURS', label: 'Démarrer la session', primary: true }],
  EN_COURS: [{ to: 'TERMINEE', label: 'Terminer la formation', primary: true }, { to: 'OUVERT', label: 'Rouvrir les inscriptions' }, { to: 'FERME', label: 'Revenir à « Inscriptions fermées »' }],
  TERMINEE: [], ANNULEE: [],
};

export default function SessionManager() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find(([k]) => k === params.get('tab'))?.[0] ?? 'resume') as Tab;
  const toast = useToast();
  const refresh = useRefreshTraining();
  const sessionsQ = useStudioSessions();
  const coursesQ = useStudioCourses();
  const regsQ = useStudioRegistrations();
  const attQ = useStudioAttendance();
  const certQ = useStudioCertificates();
  const annQ = useStudioAnnouncements();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState<SessionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ issued: number; already_issued: number; ineligible: number } | null>(null);
  const [listVis, setListVis] = useState<'PUBLIC' | 'PARTICIPANTS'>('PARTICIPANTS');
  const [newAnn, setNewAnn] = useState(false);

  const session = (sessionsQ.data ?? []).find((s) => s.id === id) as TrainingSession | undefined;
  const regs = useMemo(() => (regsQ.data ?? []).filter((r) => r.session_id === id), [regsQ.data, id]);
  const att = useMemo(() => (attQ.data ?? []).filter((a) => a.session_id === id), [attQ.data, id]);
  const certs = useMemo(() => (certQ.data ?? []).filter((c) => c.session_id === id), [certQ.data, id]);
  const anns = useMemo(() => (annQ.data ?? []).filter((a) => a.session_id === id || (!a.session_id && session && a.course_id === session.course_id)), [annQ.data, id, session]);

  if (sessionsQ.isLoading || regsQ.isLoading) return <LoadingState />;
  if (!session) return <div className="space-y-4"><Link to="/studio/sessions" className="text-sm underline">Retour aux sessions</Link><p className="font-semibold">Session introuvable.</p></div>;

  const course = coursesQ.data?.find((c) => c.id === session.course_id);
  const confirmed = regs.filter((r) => r.status === 'CONFIRMEE' || r.status === 'PRESENT');
  const listed = regs.filter((r) => r.listed && r.status !== 'ANNULEE' && r.status !== 'REFUSEE');
  const validated = confirmed.filter((r) => r.validation_status === 'VALIDE');
  const tally = (s: string) => att.filter((a) => a.status === s).length;

  const steps: { label: string; done: boolean; optional?: boolean }[] = [
    { label: 'Créer la formation', done: Boolean(course) },
    { label: 'Créer la session présentielle', done: true },
    { label: 'Ouvrir les inscriptions', done: ['OUVERT', 'FERME', 'EN_COURS', 'TERMINEE'].includes(session.status) },
    { label: 'Gérer les participants', done: confirmed.length > 0 },
    { label: 'Publier la liste', done: session.list_status === 'PUBLIEE', optional: true },
    { label: 'Publier les annonces', done: anns.some((a) => a.status === 'PUBLIEE'), optional: true },
    { label: 'Gérer les présences', done: att.length > 0 },
    { label: 'Terminer la formation', done: session.status === 'TERMINEE' },
    { label: 'Valider les participants', done: validated.length > 0 },
    { label: 'Générer les certificats', done: certs.length > 0 },
    { label: 'Notifier les participants (automatique)', done: certs.length > 0 },
  ];

  const go = (t: Tab) => setParams(t === 'resume' ? {} : { tab: t }, { replace: true });

  const changeStatus = async (to: SessionStatus) => {
    setBusy(true);
    try {
      const { error } = await supabase.from('training_sessions').update({ status: to }).eq('id', session.id);
      if (error) throw error;
      await refresh();
      if (to === 'TERMINEE') {
        const r = await rpc<{ issued: number; already_issued: number; ineligible: number }>('issue_session_certificates', { p_session_id: session.id });
        setResult(r);
        await refresh();
        toast('success', 'Formation terminée. Les certificats des participants éligibles sont générés.');
        go('cloture');
      } else toast('success', `Statut : ${sessionStatusLabels[to]}.`);
    } catch (e) { toast('error', trainingError(e)); }
    finally { setBusy(false); setConfirm(null); }
  };

  const issue = async () => {
    setBusy(true);
    try { setResult(await rpc('issue_session_certificates', { p_session_id: session.id })); await refresh(); }
    catch (e) { toast('error', trainingError(e)); }
    finally { setBusy(false); }
  };

  const publish = async () => {
    setBusy(true);
    try { await rpc('publish_session_list', { p_session_id: session.id, p_visibility: listVis }); await refresh(); toast('success', 'Liste publiée.'); }
    catch (e) { toast('error', trainingError(e)); }
    finally { setBusy(false); }
  };
  const unpublish = async () => {
    setBusy(true);
    try { await rpc('unpublish_session_list', { p_session_id: session.id }); await refresh(); toast('success', 'Liste dépubliée : elle redevient privée.'); }
    catch (e) { toast('error', trainingError(e)); }
    finally { setBusy(false); }
  };

  const cards = [
    ['Inscriptions', regs.length], ['Confirmées', `${confirmed.length} / ${session.capacity}`], ['Présents (pointages)', tally('PRESENT') + tally('RETARD')],
    ['Absents (pointages)', tally('ABSENT')], ['Participants validés', validated.length], ['Certificats générés', certs.length],
  ] as const;

  return (
    <div className="space-y-8">
      <Seo title="Session" noindex />
      <div>
        <Link to="/studio/sessions" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Sessions</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-extrabold">{courseTitle(coursesQ.data, session.course_id)}</h1><Badge variant={session.status === 'TERMINEE' ? 'neutral' : session.status === 'ANNULEE' ? 'error' : 'success'}>{sessionStatusLabels[session.status]}</Badge></div>
        <p className="mt-1 text-sm text-neutral-500">{formatPeriod(session.starts_on, session.ends_on)} · {session.location}{formatSchedule(session) ? ` · ${formatSchedule(session)}` : ''}</p>
        {course && course.status !== 'PUBLIEE' && <p role="status" className="mt-3 rounded-xl border border-warning-500/40 bg-warning-500/5 p-3 text-sm">La formation « {course.title} » n’est pas publiée : la session n’est pas visible publiquement. Publie la formation depuis <Link to={`/studio/formations/${course.id}`} className="underline">sa fiche</Link>.</p>}
      </div>

      <div role="tablist" aria-label="Gestion de la session" className="no-scrollbar flex gap-2 overflow-x-auto">
        {TABS.map(([k, l]) => <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => go(k)} className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium ${tab === k ? 'border-primary-600 bg-primary-600 text-white' : 'border-neutral-300 dark:border-neutral-700'}`}>{l}</button>)}
      </div>

      {tab === 'resume' && (
        <div className="space-y-8">
          <section aria-label="Chiffres de la session" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {cards.map(([l, v]) => <div key={l} className="card p-4"><p className="text-2xl font-extrabold">{v}</p><p className="mt-1 text-xs text-neutral-500">{l}</p></div>)}
          </section>
          <section aria-labelledby="wf" className="card p-6"><h2 id="wf" className="mb-4 text-lg font-bold">Parcours de la formation</h2>
            <ol className="grid gap-2 sm:grid-cols-2">{steps.map((s, i) => <li key={s.label} className="flex items-center gap-2 text-sm">{s.done ? <Check className="h-4 w-4 text-success-600" aria-hidden="true" /> : <Circle className="h-4 w-4 text-neutral-300" aria-hidden="true" />}<span className={s.done ? '' : 'text-neutral-500'}><span className="mr-1 font-mono text-xs">{i + 1}.</span>{s.label}{s.optional ? ' (facultatif)' : ''}<span className="sr-only">{s.done ? ' : fait' : ' : à faire'}</span></span></li>)}</ol></section>
          <section aria-labelledby="st" className="space-y-3"><h2 id="st" className="text-lg font-bold">Statut de la session</h2>
            <div className="flex flex-wrap gap-2">
              {session.status === 'EN_COURS' && session.starts_on > new Date().toISOString().slice(0, 10) && (
                <p role="note" className="w-full rounded-xl border border-warning-500/40 bg-warning-500/5 p-3 text-sm">Cette session est marquée « En cours » alors qu’elle ne commence que le {formatDate(session.starts_on)} : <strong>les inscriptions sont fermées</strong> et personne ne peut s’inscrire. Clique « Rouvrir les inscriptions » pour permettre l’inscription.</p>
              )}
              {TRANSITIONS[session.status].map((t) => <Button key={t.to} variant={t.primary ? 'primary' : 'outline'} disabled={busy} onClick={() => (t.to === 'TERMINEE' ? setConfirm('TERMINEE') : void changeStatus(t.to))}>{t.label}</Button>)}
              {session.status !== 'TERMINEE' && session.status !== 'ANNULEE' && <Button variant="ghost" disabled={busy} onClick={() => setConfirm('ANNULEE')}>Annuler la session</Button>}
              {TRANSITIONS[session.status].length === 0 && session.status === 'TERMINEE' && <p className="text-sm text-neutral-500">Formation terminée le {formatDate(session.completed_at)}.</p>}
            </div>
          </section>
          <section aria-labelledby="cfg"><div className="mb-3 flex items-center justify-between"><h2 id="cfg" className="text-lg font-bold">Réglages de la session</h2>{!edit && <Button variant="outline" size="sm" onClick={() => setEdit(true)}>Modifier</Button>}</div>
            {edit ? <SessionForm session={session} onSaved={() => setEdit(false)} onCancel={() => setEdit(false)} /> : (
              <dl className="card grid gap-x-6 gap-y-2 p-5 text-sm sm:grid-cols-2">
                <div><dt className="text-neutral-500">Capacité</dt><dd className="font-semibold">{session.capacity}</dd></div>
                <div><dt className="text-neutral-500">Formateur</dt><dd className="font-semibold">{session.trainer_name || '—'}</dd></div>
                <div><dt className="text-neutral-500">Présence minimale</dt><dd className="font-semibold">{session.min_attendance_pct ? `${session.min_attendance_pct} %` : 'Aucune'}</dd></div>
                <div><dt className="text-neutral-500">Critères du certificat</dt><dd className="font-semibold">{[session.requires_final_validation && 'Validation finale', session.requires_final_project && 'Projet final', session.requires_evaluation && 'Évaluation'].filter(Boolean).join(', ') || 'Aucun critère supplémentaire'}</dd></div>
              </dl>
            )}
          </section>
        </div>
      )}

      {tab === 'participants' && <RegistrationsPanel sessionId={session.id} />}

      {tab === 'liste' && (
        <section className="space-y-5" aria-labelledby="lst">
          <h2 id="lst" className="text-lg font-bold">Liste des participants</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Sélectionne les participants dans l’onglet « Participants » (case « Dans la liste »). Avant publication, la liste reste privée dans le Studio. Après publication, seuls le numéro, le prénom et le nom sont affichés : jamais d’email, de téléphone ni d’autre donnée privée.</p>
          <div className="flex flex-wrap items-center gap-3"><Badge variant={session.list_status === 'PUBLIEE' ? 'success' : 'neutral'}>{session.list_status === 'PUBLIEE' ? `Liste publiée (${session.list_visibility === 'PUBLIC' ? 'publique' : 'participants connectés'})` : 'Liste privée'}</Badge><span className="text-sm text-neutral-500">{listed.length} participant{listed.length > 1 ? 's' : ''} sélectionné{listed.length > 1 ? 's' : ''}</span></div>
          <div className="card space-y-2 p-4 text-sm"><p className="font-semibold">Aperçu (numéro · prénom · nom)</p>{listed.length === 0 ? <p className="text-neutral-500">Aucun participant sélectionné.</p> : <ol className="space-y-1">{[...listed].sort((a, b) => (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name)).map((r, i) => <li key={r.id}><span className="mr-2 font-mono text-xs text-neutral-500">{i + 1}</span>{r.first_name} <strong>{r.last_name}</strong></li>)}</ol>}</div>
          <fieldset className="space-y-2 text-sm"><legend className="mb-1 font-semibold">Visibilité</legend>
            <label className="flex items-center gap-2"><input type="radio" name="vis" checked={listVis === 'PUBLIC'} onChange={() => setListVis('PUBLIC')} />Publier la liste publiquement</label>
            <label className="flex items-center gap-2"><input type="radio" name="vis" checked={listVis === 'PARTICIPANTS'} onChange={() => setListVis('PARTICIPANTS')} />Réserver la liste aux participants connectés</label></fieldset>
          <div className="flex flex-wrap gap-2"><Button disabled={busy || listed.length === 0} onClick={() => void publish()}>{session.list_status === 'PUBLIEE' ? 'Mettre à jour la visibilité' : 'Publier la liste'}</Button>{session.list_status === 'PUBLIEE' && <Button variant="outline" disabled={busy} onClick={() => void unpublish()}>Dépublier</Button>}</div>
        </section>
      )}

      {tab === 'presences' && <AttendancePanel session={session} />}

      {tab === 'annonces' && (
        <section className="space-y-4" aria-labelledby="ann"><div className="flex items-center justify-between"><h2 id="ann" className="text-lg font-bold">Annonces de la session</h2>{!newAnn && <Button onClick={() => setNewAnn(true)}>Nouvelle annonce</Button>}</div>
          {newAnn && <AnnouncementForm presetCourseId={session.course_id} presetSessionId={session.id} onSaved={() => setNewAnn(false)} onCancel={() => setNewAnn(false)} />}
          {anns.length === 0 ? <p className="text-sm text-neutral-500">Aucune annonce pour cette session.</p> : <ul className="space-y-2">{anns.map((a) => <li key={a.id} className="card flex flex-wrap items-center justify-between gap-2 p-4"><div><p className="font-semibold">{a.title}</p><p className="text-xs text-neutral-500">{announcementKinds[a.kind]} · {visibilityLabels[a.visibility]}</p></div><Badge variant={a.status === 'PUBLIEE' ? 'success' : 'neutral'}>{a.status === 'PUBLIEE' ? 'Publiée' : a.status === 'ARCHIVEE' ? 'Archivée' : 'Brouillon'}</Badge></li>)}</ul>}
          <p className="text-xs text-neutral-500">Gestion complète (modifier, archiver) dans <Link to="/studio/annonces" className="underline">Studio → Annonces</Link>.</p>
        </section>
      )}

      {tab === 'cloture' && (
        <section className="space-y-5" aria-labelledby="clo"><h2 id="clo" className="text-lg font-bold">Clôture et certificats</h2>
          <dl className="card grid gap-3 p-5 text-sm sm:grid-cols-3"><div><dt className="text-neutral-500">Participants confirmés</dt><dd className="text-xl font-extrabold">{confirmed.length}</dd></div><div><dt className="text-neutral-500">Validés</dt><dd className="text-xl font-extrabold">{validated.length}</dd></div><div><dt className="text-neutral-500">Certificats générés</dt><dd className="text-xl font-extrabold">{certs.length}</dd></div></dl>
          {session.status !== 'TERMINEE' ? (
            <div className="space-y-3"><p className="text-sm text-neutral-600 dark:text-neutral-400">Quand la formation est terminée, valide les participants dans l’onglet « Participants » : les certificats sont générés automatiquement pour ceux qui remplissent les conditions de la session.</p>
              {session.status === 'EN_COURS' || session.status === 'OUVERT' || session.status === 'FERME' ? <Button disabled={busy} onClick={() => setConfirm('TERMINEE')}>Terminer la formation</Button> : null}</div>
          ) : (
            <div className="space-y-3"><p className="text-sm text-neutral-600 dark:text-neutral-400">Formation terminée. Les certificats se génèrent automatiquement dès qu’un participant est validé. Tu peux relancer l’émission : aucun doublon n’est jamais créé.</p>
              <Button disabled={busy} onClick={() => void issue()}>{busy ? 'Émission…' : 'Générer les certificats des participants éligibles'}</Button>
              {result && <p role="status" className="rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">{result.issued} certificat{result.issued > 1 ? 's' : ''} généré{result.issued > 1 ? 's' : ''} · {result.already_issued} déjà délivré{result.already_issued > 1 ? 's' : ''} · {result.ineligible} participant{result.ineligible > 1 ? 's' : ''} non éligible{result.ineligible > 1 ? 's' : ''} (voir l’onglet Participants).</p>}
              <p className="text-xs text-neutral-500">Les participants éligibles reçoivent une notification dans leur espace. Aucun email n’est envoyé.</p>
              <Link to="/studio/certificats" className="inline-block text-sm font-semibold underline">Gérer les certificats (révocation, PDF)</Link></div>
          )}
        </section>
      )}

      <ConfirmDialog open={confirm !== null} title={confirm === 'ANNULEE' ? 'Annuler la session' : 'Terminer la formation'} confirmLabel={confirm === 'ANNULEE' ? 'Annuler la session' : 'Terminer la formation'} busy={busy}
        message={confirm === 'ANNULEE' ? 'La session sera marquée « Annulée » et ne sera plus ouverte aux inscriptions.' : `La formation sera marquée « Terminée ». ${validated.length} participant${validated.length > 1 ? 's' : ''} validé${validated.length > 1 ? 's' : ''} sur ${confirmed.length} confirmé${confirmed.length > 1 ? 's' : ''} : les certificats seront générés uniquement pour ceux qui remplissent les conditions de la session.`}
        onConfirm={() => confirm && void changeStatus(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  );
}
