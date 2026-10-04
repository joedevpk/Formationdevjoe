import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { QueryState } from '@/components/ui/QueryState';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/services/supabase';
import { rpc } from '@/lib/training/api';
import { formatDay, sessionDays, todayDay, trainingError } from '@/lib/training/format';
import type { AttendanceStatus, TrainingAttendance, TrainingSession } from '@/lib/training/types';
import { useRefreshTraining } from './hooks';

interface RosterRow { registration_id: string; first_name: string; last_name: string; status: string }
const ACTIONS: { s: AttendanceStatus; label: string }[] = [{ s: 'PRESENT', label: 'Présent' }, { s: 'RETARD', label: 'Retard' }, { s: 'ABSENT', label: 'Absent' }];

/** Pointage du jour. Écriture UNIQUEMENT via les fonctions serveur set_attendance / training_check_in (droits vérifiés côté base). */
export function AttendancePanel({ session }: { session: TrainingSession }) {
  const toast = useToast();
  const refresh = useRefreshTraining();
  const days = useMemo(() => sessionDays(session), [session]);
  const [day, setDay] = useState(() => (days.includes(todayDay()) ? todayDay() : days[0] ?? ''));
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { if (!days.includes(day)) setDay(days.includes(todayDay()) ? todayDay() : days[0] ?? ''); }, [days, day]);

  const roster = useQuery({ queryKey: ['studio-training', 'roster', session.id], queryFn: () => rpc<RosterRow[]>('get_session_roster', { p_session_id: session.id }) });
  const att = useQuery({
    queryKey: ['studio-training', 'attendance-day', session.id, day], enabled: Boolean(day),
    queryFn: async (): Promise<TrainingAttendance[]> => {
      const { data, error } = await supabase.from('training_attendance').select('*').eq('session_id', session.id).eq('attendance_date', day);
      if (error) throw new Error(error.message);
      return (data ?? []) as TrainingAttendance[];
    },
  });

  const mark = async (r: RosterRow, status: AttendanceStatus | null) => {
    setBusy(r.registration_id);
    try {
      await rpc('set_attendance', { p_registration_id: r.registration_id, p_date: day, p_status: status });
      await Promise.all([att.refetch(), roster.refetch(), refresh()]);
    } catch (e) { toast('error', trainingError(e)); }
    finally { setBusy(null); }
  };

  const byReg = new Map((att.data ?? []).map((a) => [a.registration_id, a]));
  const rows = roster.data ?? [];
  const tally = (s: AttendanceStatus) => rows.filter((r) => byReg.get(r.registration_id)?.status === s).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div><label htmlFor="att-day" className="label">Jour de la session</label>
          <select id="att-day" className="input-field w-64" value={day} onChange={(e) => setDay(e.target.value)}>{days.map((d) => <option key={d} value={d}>{formatDay(d)}{d === todayDay() ? ' (aujourd’hui)' : ''}</option>)}</select></div>
        <div className="flex flex-wrap gap-2 text-xs"><Badge variant="success">Présents : {tally('PRESENT')}</Badge><Badge variant="warning">Retards : {tally('RETARD')}</Badge><Badge variant="error">Absents : {tally('ABSENT')}</Badge><Badge variant="neutral">Non pointés : {rows.length - tally('PRESENT') - tally('RETARD') - tally('ABSENT')}</Badge></div>
      </div>
      <p className="text-xs text-neutral-500">Pointage par QR code : scanne le QR du participant (affiché dans son espace) avec l’appareil photo de ton téléphone, connecté au Studio. La présence est enregistrée côté serveur.</p>
      <QueryState query={roster} isEmpty={(d) => d.length === 0} emptyTitle="Aucun participant confirmé" emptyText="Confirme des inscriptions pour pouvoir pointer les présences.">
        {() => (
          <ul className="card divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map((r) => {
              const a = byReg.get(r.registration_id);
              return (
                <li key={r.registration_id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div><p className="font-semibold">{r.first_name} {r.last_name}</p><p className="text-xs text-neutral-500">{a ? `${a.status === 'PRESENT' ? 'Présent' : a.status === 'RETARD' ? 'En retard' : 'Absent'}${a.method === 'QR' ? ' (QR code)' : ''}` : 'Non pointé'}</p></div>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Pointage de ${r.first_name} ${r.last_name}`}>
                    {ACTIONS.map((x) => <Button key={x.s} size="sm" variant={a?.status === x.s ? 'primary' : 'outline'} disabled={busy === r.registration_id} onClick={() => void mark(r, x.s)}>{x.label}</Button>)}
                    {a && <Button size="sm" variant="ghost" disabled={busy === r.registration_id} onClick={() => void mark(r, null)}>Effacer</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
