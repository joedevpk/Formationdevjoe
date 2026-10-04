import { Link } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, FolderKanban } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonStats } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useCertificates, useLearner } from '@/lib/learner';
import { isComingSoon } from '@/lib/courseStatus';
import { useMyRegistrations } from '@/lib/training/api';
import { formatPeriod } from '@/lib/training/format';

export default function Dashboard() {
  const { profile } = useAuth();
  const { rows, loading, error, courses } = useLearner();
  const certs = useCertificates(profile?.id);
  const regs = useMyRegistrations(profile?.id);
  const nextSession = (regs.data ?? []).filter((r) => ['EN_ATTENTE', 'CONFIRMEE', 'PRESENT'].includes(r.status) && r.training_sessions && !['TERMINEE', 'ANNULEE'].includes(r.training_sessions.status))
    .sort((a, b) => (a.training_sessions?.starts_on ?? '').localeCompare(b.training_sessions?.starts_on ?? ''))[0];
  const first = profile?.full_name?.trim().split(' ')[0] ?? '';
  const active = rows.filter((r) => r.enrollment.status === 'ACTIVE');
  const next = active.find((r) => r.pct < 100) ?? active[0];
  const withProject = active.filter((r) => r.course.final_project);
  const enrolledIds = new Set(rows.map((r) => r.course.id));
  const suggestions = courses.filter((c) => !enrolledIds.has(c.id) && !isComingSoon(c)).slice(0, 3);

  return (
    <div className="space-y-10">
      <Seo title="Mon espace" noindex />
      <h1 className="text-3xl font-extrabold">Bienvenue{first ? `, ${first}` : ''}</h1>

      {loading ? <SkeletonStats count={3} /> : error ? (
        <div className="card p-6 text-sm"><p className="font-semibold">Contenu momentanément indisponible.</p><p className="mt-1 text-neutral-500">Ta progression n’a pas pu être chargée. Réessaie dans un instant.</p></div>
      ) : (
        <>
          {nextSession?.training_sessions && (
            <section aria-labelledby="next-training" className="card border-primary-500/30 p-6">
              <h2 id="next-training" className="text-sm font-bold uppercase tracking-wide text-neutral-500">Ma prochaine formation présentielle</h2>
              <p className="mt-2 text-lg font-bold">{nextSession.courses?.title}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{formatPeriod(nextSession.training_sessions.starts_on, nextSession.training_sessions.ends_on)} · {nextSession.training_sessions.location}</p>
              <div className="mt-4"><Button to={`/app/formations/inscriptions/${nextSession.id}`} size="sm">Voir mon inscription</Button></div>
            </section>
          )}
          <section aria-labelledby="continue">
            <h2 id="continue" className="mb-4 text-xl font-bold">Continuer votre apprentissage</h2>
            {next ? (
              <div className="card p-6">
                <h3 className="text-lg font-bold">{next.course.title}</h3>
                <ProgressBar value={next.pct} label={`${next.done} / ${next.total} leçons`} className="mt-4" />
                <div className="mt-5"><Button to={`/app/formations/${next.course.slug}`}>{next.done === 0 ? 'Commencer le cours' : 'Reprendre'} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button></div>
              </div>
            ) : (
              <div className="card p-8 text-center"><p className="font-semibold">Tu n’as pas encore de formation en cours.</p><p className="mt-1 text-sm text-neutral-500">Choisis une formation pour commencer.</p><div className="mt-4"><Button to="/formations">Voir les formations</Button></div></div>
            )}
          </section>

          <section aria-labelledby="mine" className="grid gap-4 md:grid-cols-3">
            <h2 id="mine" className="sr-only">Mon espace</h2>
            <Link to="/app/formations" className="card-hover p-5"><BookOpen className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" /><p className="mt-3 font-semibold">Mes formations</p><p className="text-sm text-neutral-500">{rows.length === 0 ? 'Aucune inscription' : `${rows.length} inscription${rows.length > 1 ? 's' : ''}`}</p></Link>
            <Link to="/app/projets" className="card-hover p-5"><FolderKanban className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" /><p className="mt-3 font-semibold">Mes projets</p><p className="text-sm text-neutral-500">{withProject.length === 0 ? 'Aucun projet en cours' : `${withProject.length} à réaliser`}</p></Link>
            <Link to="/app/certificats" className="card-hover p-5"><Award className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" /><p className="mt-3 font-semibold">Mes certificats</p><p className="text-sm text-neutral-500">{certs.data ? (certs.data.length === 0 ? 'Aucun pour le moment' : `${certs.data.length} obtenu${certs.data.length > 1 ? 's' : ''}`) : '…'}</p></Link>
          </section>

          {suggestions.length > 0 && !next && (
            <section aria-labelledby="suggest">
              <h2 id="suggest" className="mb-4 text-xl font-bold">Pour commencer</h2>
              <ul className="space-y-2">{suggestions.map((c) => <li key={c.id}><Link to={`/formations/${c.slug}`} className="card-hover flex items-center justify-between p-4 text-sm font-semibold">{c.title}<ArrowRight className="h-4 w-4 text-neutral-400" aria-hidden="true" /></Link></li>)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
