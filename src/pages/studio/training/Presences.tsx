import { useState } from 'react';
import { Seo } from '@/components/ui/Seo';
import { QueryState } from '@/components/ui/QueryState';
import { useAuth } from '@/contexts/AuthContext';
import { formatPeriod, sessionStatusLabels } from '@/lib/training/format';
import { AttendancePanel } from './AttendancePanel';
import { courseTitle, useStudioCourses, useStudioSessions } from './hooks';

/** Pointage : l'ADMIN voit toutes les sessions actives ; un instructeur uniquement celles dont il est le formateur désigné. */
export default function Presences() {
  const { profile, isAdmin } = useAuth();
  const sessions = useStudioSessions();
  const courses = useStudioCourses();
  const [sel, setSel] = useState('');
  return (
    <div className="space-y-6">
      <Seo title="Studio — Présences" noindex />
      <div><h1 className="text-3xl font-extrabold">Présences</h1><p className="mt-1 text-sm text-neutral-500">Ouvre la session du jour et marque chaque participant : présent, absent ou en retard.</p></div>
      <QueryState query={sessions} isEmpty={(d) => d.filter((s) => (isAdmin || s.trainer_id === profile?.id) && s.status !== 'BROUILLON' && s.status !== 'ANNULEE').length === 0} emptyTitle="Aucune session à pointer" emptyText={isAdmin ? 'Crée et ouvre une session pour pouvoir pointer les présences.' : 'Aucune session ne t’est attribuée comme formateur.'}>
        {(all) => {
          const list = all.filter((s) => (isAdmin || s.trainer_id === profile?.id) && s.status !== 'BROUILLON' && s.status !== 'ANNULEE');
          const current = list.find((s) => s.id === sel) ?? list.find((s) => s.status === 'EN_COURS') ?? list[0];
          return (
            <div className="space-y-6">
              <div className="max-w-xl"><label htmlFor="pr-session" className="label">Session</label>
                <select id="pr-session" className="input-field" value={current?.id ?? ''} onChange={(e) => setSel(e.target.value)}>{list.map((s) => <option key={s.id} value={s.id}>{courseTitle(courses.data, s.course_id)} — {formatPeriod(s.starts_on, s.ends_on)} ({sessionStatusLabels[s.status]})</option>)}</select></div>
              {current && <AttendancePanel key={current.id} session={current} />}
            </div>
          );
        }}
      </QueryState>
    </div>
  );
}
