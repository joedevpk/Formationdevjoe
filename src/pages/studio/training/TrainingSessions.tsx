import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { QueryState } from '@/components/ui/QueryState';
import { supabase } from '@/services/supabase';
import { formatPeriod, sessionStatusLabels } from '@/lib/training/format';
import { SessionForm } from './SessionForm';
import { courseTitle, useStudioAttendance, useStudioCertificates, useStudioCourses, useStudioRegistrations, useStudioSessions } from './hooks';

const variant = (s: string) => (s === 'OUVERT' ? 'success' : s === 'ANNULEE' ? 'error' : s === 'EN_COURS' ? 'primary' : s === 'BIENTOT' ? 'warning' : 'neutral') as 'success' | 'error' | 'primary' | 'warning' | 'neutral';

interface WaitRow { id: string; course_id: string; email: string; created_at: string }

/** Personnes ayant cliqué « Me prévenir » : ce ne sont PAS des inscrits ; elles sont notifiées à l'ouverture d'une session. */
function WaitlistPanel({ titleOf }: { titleOf: (id: string) => string }) {
  const q = useQuery({
    queryKey: ['studio-training', 'waitlist'],
    queryFn: async (): Promise<WaitRow[]> => {
      const { data, error } = await supabase.from('course_waitlist').select('id,course_id,email,created_at').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as WaitRow[];
    },
  });
  const rows = q.data ?? [];
  if (q.isError || rows.length === 0) return null;
  const byCourse = new Map<string, WaitRow[]>();
  for (const r of rows) byCourse.set(r.course_id, [...(byCourse.get(r.course_id) ?? []), r]);
  return (
    <details className="card p-5">
      <summary className="cursor-pointer font-semibold">Liste d’attente « Me prévenir » ({rows.length})</summary>
      <p className="mt-2 text-xs text-neutral-500">Ces personnes ne sont pas inscrites à une session. Dès qu’une session passe à « Inscriptions ouvertes », celles qui ont un compte reçoivent une notification.</p>
      <div className="mt-3 space-y-3">
        {[...byCourse.entries()].map(([cid, list]) => (
          <div key={cid}><p className="text-sm font-bold">{titleOf(cid)} <span className="font-normal text-neutral-500">({list.length})</span></p><ul className="mt-1 space-y-0.5 text-xs text-neutral-600 dark:text-neutral-400">{list.map((r) => <li key={r.id}>{r.email}</li>)}</ul></div>
        ))}
      </div>
    </details>
  );
}

/** Toutes les sessions présentielles, avec un résumé calculé sur les données réelles (aucun chiffre fictif). */
export default function TrainingSessions() {
  const navigate = useNavigate();
  const sessions = useStudioSessions();
  const courses = useStudioCourses();
  const regs = useStudioRegistrations();
  const att = useStudioAttendance();
  const certs = useStudioCertificates();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <Seo title="Studio — Sessions" noindex />
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-extrabold">Sessions de formation</h1><p className="mt-1 text-sm text-neutral-500">Formations présentielles : dates, lieu, capacité, inscriptions, présences et certificats.</p></div>
        {!creating && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden="true" />Nouvelle session</Button>}</div>
      <WaitlistPanel titleOf={(id) => courseTitle(courses.data, id)} />
      {creating && <SessionForm onSaved={(s) => { setCreating(false); navigate(`/studio/sessions/${s.id}`); }} onCancel={() => setCreating(false)} />}
      <QueryState query={sessions} isEmpty={(d) => d.length === 0} emptyTitle="Aucune session" emptyText="Crée une formation présentielle, puis sa première session.">
        {(list) => (
          <ul className="grid gap-4 md:grid-cols-2">
            {list.map((s) => {
              const r = (regs.data ?? []).filter((x) => x.session_id === s.id);
              const a = (att.data ?? []).filter((x) => x.session_id === s.id);
              const c = (certs.data ?? []).filter((x) => x.session_id === s.id);
              const confirmed = r.filter((x) => x.status === 'CONFIRMEE' || x.status === 'PRESENT').length;
              const stats: [string, number | string][] = [
                ['Inscriptions', r.length], ['Confirmées', `${confirmed} / ${s.capacity}`], ['Présents', a.filter((x) => x.status !== 'ABSENT').length], ['Absents', a.filter((x) => x.status === 'ABSENT').length], ['Certificats', c.length],
              ];
              return (
                <li key={s.id} className="card flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-lg font-bold">{courseTitle(courses.data, s.course_id)}</p><p className="text-sm text-neutral-500">{formatPeriod(s.starts_on, s.ends_on)} · {s.location}</p></div><Badge variant={variant(s.status)}>{sessionStatusLabels[s.status]}</Badge></div>
                  <dl className="grid grid-cols-5 gap-2 text-center">{stats.map(([l, v]) => <div key={l}><dd className="text-lg font-extrabold">{v}</dd><dt className="text-[11px] text-neutral-500">{l}</dt></div>)}</dl>
                  {s.status === 'TERMINEE' && <p className="text-xs text-neutral-500">Formation terminée.</p>}
                  <Link to={`/studio/sessions/${s.id}`} className="btn-outline px-4 py-2 text-sm">Gérer la session</Link>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
