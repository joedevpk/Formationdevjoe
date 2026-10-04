import { Link, useLocation, useParams } from 'react-router-dom';
import { authUrl } from '@/lib/redirect';
import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { QueryState } from '@/components/ui/QueryState';
import { Button } from '@/components/ui/Button';
import { usePublishedList, useSessions } from '@/lib/training/api';
import { useCourse } from '@/lib/queries';
import { formatPeriod } from '@/lib/training/format';

/** Liste officielle des participants d'une session : numéro, prénom, nom — jamais email, téléphone ni autre donnée privée. */
export default function TrainingList() {
  const { slug, sessionId } = useParams();
  const location = useLocation();
  const course = useCourse(slug);
  const sessions = useSessions();
  const list = usePublishedList(sessionId);
  const session = (sessions.data ?? []).find((s) => s.id === sessionId);
  const title = course.data?.course.title ?? 'Formation';

  return (
    <>
      <Seo title={`Liste des participants — ${title}`} noindex />
      <PageHero eyebrow="Formation présentielle" title="Liste des participants" description={`${title}${session ? ` — ${formatPeriod(session.starts_on, session.ends_on)}` : ''}`} />
      <section className="section-container max-w-3xl py-10">
        <QueryState query={list} isEmpty={() => false}>
          {(d) => d.access === 'NOT_PUBLISHED' ? (
            <div className="card p-8 text-center"><p className="font-semibold">Cette liste n’est pas publiée.</p><p className="mt-1 text-sm text-neutral-500">Elle sera visible dès que l’organisateur la publiera.</p></div>
          ) : d.access === 'LOGIN_REQUIRED' ? (
            <div className="card space-y-4 p-8 text-center"><p className="font-semibold">Cette liste est réservée aux participants connectés.</p>
              <div className="flex justify-center gap-3"><Link to={authUrl('/login', location.pathname)} className="btn-primary px-5 py-2.5">Se connecter</Link></div></div>
          ) : d.access === 'FORBIDDEN' ? (
            <div className="card p-8 text-center"><p className="font-semibold">Cette liste est réservée aux participants de la session.</p><div className="mt-4"><Button to="/formations" variant="outline">Voir les formations</Button></div></div>
          ) : d.rows.length === 0 ? (
            <div className="card p-8 text-center"><p className="font-semibold">Aucun participant dans la liste.</p></div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Participants de la session</caption>
                <thead><tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800"><th scope="col" className="px-4 py-3">N°</th><th scope="col" className="px-4 py-3">Prénom</th><th scope="col" className="px-4 py-3">Nom</th></tr></thead>
                <tbody>{d.rows.map((r) => <tr key={r.number} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"><td className="px-4 py-3 font-mono text-xs">{r.number}</td><td className="px-4 py-3">{r.first_name}</td><td className="px-4 py-3 font-semibold">{r.last_name}</td></tr>)}</tbody>
              </table>
              <p className="border-t border-neutral-100 px-4 py-3 text-xs text-neutral-500 dark:border-neutral-800">{d.access === 'PUBLIC' ? 'Liste publique' : 'Liste réservée aux participants connectés'} — par respect de la vie privée, aucune autre information n’est affichée.</p>
            </div>
          )}
        </QueryState>
      </section>
    </>
  );
}
