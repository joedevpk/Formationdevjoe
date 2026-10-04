import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { QueryState } from '@/components/ui/QueryState';
import { useToast } from '@/components/ui/Toast';
import { RegistrationBadge } from '@/components/training/StatusBadges';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { rpc } from '@/lib/training/api';
import { formatPeriod, trainingError } from '@/lib/training/format';
import type { RegistrationStatus, TrainingRegistration, TrainingSession, ValidationStatus } from '@/lib/training/types';
import { formatDate } from '@/utils';
import { ManualCertificateModal } from './ManualCertificateModal';
import { courseTitle, useRefreshTraining, useStudioAttendance, useStudioCourses, useStudioRegistrations, useStudioSessions } from './hooks';

const REASONS: Record<string, string> = {
  NOT_CONFIRMED: 'Non confirmé', SESSION_NOT_COMPLETED: 'Session non terminée', REJECTED: 'Non validé', NOT_VALIDATED: 'Validation finale manquante',
  ATTENDANCE_BELOW_MIN: 'Présence insuffisante', FINAL_PROJECT_MISSING: 'Projet final manquant', EVALUATION_MISSING: 'Évaluation manquante',
};
interface Eligibility { eligible: boolean; reasons: string[]; attendance_pct: number | null }

const STATUSES: RegistrationStatus[] = ['EN_ATTENTE', 'CONFIRMEE', 'REFUSEE', 'ANNULEE', 'PRESENT'];

/** Inscriptions : toutes (étape « Inscriptions ») ou celles d'une session (étape « Gérer les participants »). */
export function RegistrationsPanel({ sessionId }: { sessionId?: string }) {
  const toast = useToast();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';
  const [certFor, setCertFor] = useState<TrainingRegistration | null>(null);
  const refresh = useRefreshTraining();
  const regsQ = useStudioRegistrations();
  const sessionsQ = useStudioSessions();
  const coursesQ = useStudioCourses();
  const attQ = useStudioAttendance();
  const [filter, setFilter] = useState<'ALL' | RegistrationStatus>('ALL');
  const [busy, setBusy] = useState<string | null>(null);

  const sessionById = useMemo(() => new Map((sessionsQ.data ?? []).map((s) => [s.id, s])), [sessionsQ.data]);
  const list = (regsQ.data ?? []).filter((r) => (!sessionId || r.session_id === sessionId) && (filter === 'ALL' || r.status === filter));
  const completed = sessionId ? sessionById.get(sessionId)?.status === 'TERMINEE' : false;

  const elig = useQueries({
    queries: list.filter(() => completed).map((r) => ({
      queryKey: ['studio-training', 'eligibility', r.id, r.status, r.validation_status, r.final_project_ok, r.evaluation_ok, (attQ.data ?? []).length],
      queryFn: () => rpc<Eligibility>('training_eligibility', { p_registration_id: r.id }),
    })),
  });
  const eligById = new Map(list.filter(() => completed).map((r, i) => [r.id, elig[i]?.data] as const));

  const patch = async (r: TrainingRegistration, values: Partial<TrainingRegistration>, okMsg?: string) => {
    setBusy(r.id);
    try {
      const { error } = await supabase.from('training_registrations').update(values).eq('id', r.id);
      if (error) throw error;
      await refresh();
      if (okMsg) toast('success', okMsg);
    } catch (e) { toast('error', trainingError(e)); }
    finally { setBusy(null); }
  };

  const counts = STATUSES.map((s) => [s, (regsQ.data ?? []).filter((r) => (!sessionId || r.session_id === sessionId) && r.status === s).length] as const);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer par statut">
        <button type="button" onClick={() => setFilter('ALL')} aria-pressed={filter === 'ALL'} className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === 'ALL' ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950' : 'border-neutral-200 dark:border-neutral-800'}`}>Tous</button>
        {counts.map(([s, n]) => <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === s ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950' : 'border-neutral-200 dark:border-neutral-800'}`}>{s.replace('_', ' ').toLowerCase()} ({n})</button>)}
      </div>
      <QueryState query={regsQ} isEmpty={() => list.length === 0} emptyTitle="Aucune inscription" emptyText="Les inscriptions apparaissent ici dès qu’un participant s’inscrit à une session ouverte.">
        {() => (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <caption className="sr-only">Inscriptions aux sessions présentielles</caption>
              <thead><tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
                <th scope="col" className="px-3 py-3">Participant</th>{!sessionId && <th scope="col" className="px-3 py-3">Session</th>}<th scope="col" className="px-3 py-3">Statut</th><th scope="col" className="px-3 py-3">Actions</th>
                {sessionId && <><th scope="col" className="px-3 py-3">Liste</th><th scope="col" className="px-3 py-3">Validation</th>{completed && <th scope="col" className="px-3 py-3">Éligibilité</th>}</>}
              </tr></thead>
              <tbody>
                {list.map((r) => {
                  const s = sessionById.get(r.session_id) as TrainingSession | undefined;
                  const e = eligById.get(r.id);
                  const active = r.status === 'CONFIRMEE' || r.status === 'PRESENT';
                  return (
                    <tr key={r.id} className="border-b border-neutral-100 align-top last:border-0 dark:border-neutral-900">
                      <td className="px-3 py-3"><p className="font-semibold">{r.first_name} {r.last_name}</p><p className="text-xs text-neutral-500">{r.email}{r.phone ? ` · ${r.phone}` : ''}</p><p className="text-xs text-neutral-400">Inscrit le {formatDate(r.registered_at)}</p></td>
                      {!sessionId && <td className="px-3 py-3 text-xs">{courseTitle(coursesQ.data, r.course_id)}<br /><span className="text-neutral-500">{s ? formatPeriod(s.starts_on, s.ends_on) : ''}</span></td>}
                      <td className="px-3 py-3"><RegistrationBadge status={r.status} /></td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {r.status !== 'CONFIRMEE' && r.status !== 'PRESENT' && <Button size="sm" disabled={busy === r.id} onClick={() => void patch(r, { status: 'CONFIRMEE' }, 'Inscription confirmée.')}>Confirmer</Button>}
                          {r.status === 'EN_ATTENTE' && <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => void patch(r, { status: 'REFUSEE', listed: false }, 'Inscription refusée.')}>Refuser</Button>}
                          {(r.status === 'EN_ATTENTE' || active) && <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => void patch(r, { status: 'ANNULEE', listed: false }, 'Inscription annulée.')}>Annuler</Button>}
                          {isAdmin && active && <Button size="sm" variant="outline" onClick={() => setCertFor(r)}>Certificat manuel</Button>}
                        </div>
                      </td>
                      {sessionId && (
                        <>
                          <td className="px-3 py-3"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={r.listed} disabled={busy === r.id || r.status === 'ANNULEE' || r.status === 'REFUSEE'} onChange={(ev) => void patch(r, { listed: ev.target.checked })} />Dans la liste</label></td>
                          <td className="px-3 py-3 text-xs">
                            <label className="sr-only" htmlFor={`val-${r.id}`}>Validation de {r.first_name} {r.last_name}</label>
                            <select id={`val-${r.id}`} className="input-field !py-1.5 !text-xs" value={r.validation_status} disabled={busy === r.id || !active} onChange={(ev) => void patch(r, { validation_status: ev.target.value as ValidationStatus })}>
                              <option value="A_VALIDER">À valider</option><option value="VALIDE">Validé</option><option value="NON_VALIDE">Non validé</option>
                            </select>
                            {s?.requires_final_project && <label className="mt-2 flex items-center gap-1.5"><input type="checkbox" checked={r.final_project_ok} disabled={busy === r.id} onChange={(ev) => void patch(r, { final_project_ok: ev.target.checked })} />Projet final rendu</label>}
                            {s?.requires_evaluation && <label className="mt-1 flex items-center gap-1.5"><input type="checkbox" checked={r.evaluation_ok} disabled={busy === r.id} onChange={(ev) => void patch(r, { evaluation_ok: ev.target.checked })} />Évaluation réussie</label>}
                          </td>
                          {completed && <td className="px-3 py-3 text-xs">{e ? (e.eligible ? <Badge variant="success">Éligible</Badge> : <div className="space-y-1"><Badge variant="warning">Non éligible</Badge>{e.reasons.map((x) => <p key={x} className="text-neutral-500">{REASONS[x] ?? x}</p>)}</div>) : '…'}{e?.attendance_pct != null && <p className="mt-1 text-neutral-500">Présence : {e.attendance_pct} %</p>}</td>}
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
      <ManualCertificateModal open={Boolean(certFor)} onClose={() => setCertFor(null)} defaults={certFor ? { userId: certFor.user_id, courseId: certFor.course_id, sessionId: certFor.session_id } : undefined} />
    </div>
  );
}
