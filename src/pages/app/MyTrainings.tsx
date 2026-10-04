import { Link } from 'react-router-dom';
import { Award, CalendarDays, MapPin, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QueryState } from '@/components/ui/QueryState';
import { RegistrationBadge } from '@/components/training/StatusBadges';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceStats, useAnnouncements, useMyAttendance, useMyRegistrations, useMyTrainingCertificates, type MyRegistration } from '@/lib/training/api';
import { announcementKinds, formatPeriod } from '@/lib/training/format';
import { formatDate } from '@/utils';

function Card({ r, pct, cert }: { r: MyRegistration; pct: number | null; cert: boolean }) {
  const s = r.training_sessions;
  return (
    <article className="card flex flex-col p-5" aria-label={r.courses?.title ?? 'Formation'}>
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="badge-primary">Formation présentielle</span><RegistrationBadge status={r.status} /></div>
      <h3 className="mt-3 text-lg font-bold">{r.courses?.title ?? 'Formation'}</h3>
      {s && (
        <dl className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
          <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-neutral-400" aria-hidden="true" /><dt className="sr-only">Session</dt><dd>{formatPeriod(s.starts_on, s.ends_on)}</dd></div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-neutral-400" aria-hidden="true" /><dt className="sr-only">Lieu</dt><dd>{s.location}</dd></div>
        </dl>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {pct !== null && <Badge variant="neutral">Présence : {pct} %</Badge>}
        {s?.status === 'TERMINEE' && <Badge variant="neutral">Formation terminée</Badge>}
        {cert && <Badge variant="success">Certificat disponible</Badge>}
      </div>
      <div className="mt-5 flex flex-wrap gap-2"><Button to={`/app/formations/inscriptions/${r.id}`} size="sm">Voir mon inscription</Button>{cert && <Button to="/app/certificats" variant="outline" size="sm"><Award className="h-3.5 w-3.5" aria-hidden="true" />Mon certificat</Button>}</div>
    </article>
  );
}

/** Section « Mes formations » de l'espace participant : inscriptions présentielles, présence, certificat, annonces. */
export function MyTrainings() {
  const { profile } = useAuth();
  const regs = useMyRegistrations(profile?.id);
  const att = useMyAttendance(profile?.id);
  const certs = useMyTrainingCertificates(profile?.id);
  const ann = useAnnouncements(profile?.id);

  return (
    <QueryState query={regs} isEmpty={(d) => d.length === 0} emptyTitle="Aucune inscription à une formation présentielle" emptyText="Consulte les sessions ouvertes et inscris-toi en quelques clics." emptyAction={<Button to="/formations" variant="outline">Voir les formations</Button>}>
      {(list) => {
        const attendance = att.data ?? [];
        const myCerts = (certs.data ?? []).filter((c) => c.status === 'VALIDE');
        const decorate = (r: MyRegistration) => ({ r, pct: r.training_sessions ? attendanceStats(attendance, r.id, r.session_id).pct : null, cert: myCerts.some((c) => c.registration_id === r.id) });
        const live = list.filter((r) => ['EN_ATTENTE', 'CONFIRMEE', 'PRESENT'].includes(r.status) && r.training_sessions?.status !== 'TERMINEE' && r.training_sessions?.status !== 'ANNULEE')
          .sort((a, b) => (a.training_sessions?.starts_on ?? '').localeCompare(b.training_sessions?.starts_on ?? ''));
        const done = list.filter((r) => ['CONFIRMEE', 'PRESENT'].includes(r.status) && r.training_sessions?.status === 'TERMINEE');
        const other = list.filter((r) => !live.includes(r) && !done.includes(r));
        const courseIds = new Set(list.filter((r) => r.status !== 'REFUSEE' && r.status !== 'ANNULEE').map((r) => r.course_id));
        const news = (ann.data ?? []).filter((a) => a.course_id && courseIds.has(a.course_id) && (a.visibility === 'PARTICIPANTS' || a.visibility === 'PUBLIC')).slice(0, 5);
        const next = live[0];
        return (
          <div className="space-y-10">
            {next?.training_sessions && (
              <section aria-labelledby="next-session" className="card border-primary-500/30 p-6">
                <h2 id="next-session" className="text-sm font-bold uppercase tracking-wide text-neutral-500">Prochaine session</h2>
                <p className="mt-2 text-lg font-bold">{next.courses?.title}</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{formatPeriod(next.training_sessions.starts_on, next.training_sessions.ends_on)} · {next.training_sessions.location}</p>
              </section>
            )}
            {live.length > 0 && <section aria-labelledby="mt-live"><h2 id="mt-live" className="mb-4 text-xl font-bold">Sessions à venir et en cours</h2><div className="grid gap-4 md:grid-cols-2">{live.map((r) => { const d = decorate(r); return <Card key={r.id} {...d} />; })}</div></section>}
            {done.length > 0 && <section aria-labelledby="mt-done"><h2 id="mt-done" className="mb-4 text-xl font-bold">Formations terminées</h2><div className="grid gap-4 md:grid-cols-2">{done.map((r) => { const d = decorate(r); return <Card key={r.id} {...d} />; })}</div></section>}
            {other.length > 0 && <section aria-labelledby="mt-other"><h2 id="mt-other" className="mb-4 text-xl font-bold">Inscriptions annulées ou non retenues</h2><div className="grid gap-4 md:grid-cols-2">{other.map((r) => { const d = decorate(r); return <Card key={r.id} {...d} />; })}</div></section>}
            {news.length > 0 && (
              <section aria-labelledby="mt-news">
                <h2 id="mt-news" className="mb-4 flex items-center gap-2 text-xl font-bold"><Megaphone className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" />Annonces de mes formations</h2>
                <ul className="space-y-2">{news.map((a) => (
                  <li key={a.id}><Link to={`/app/annonces/${a.id}`} className="card-hover block p-4"><p className="font-mono text-xs uppercase tracking-wide text-neutral-500">{announcementKinds[a.kind]} · {formatDate(a.published_at)}</p><p className="mt-1 font-semibold">{a.title}</p></Link></li>
                ))}</ul>
              </section>
            )}
          </div>
        );
      }}
    </QueryState>
  );
}
