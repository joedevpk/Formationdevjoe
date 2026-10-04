import { Seo } from '@/components/ui/Seo';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { LoadingState } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { roadmap } from '@/data/catalog';
import { useLearner } from '@/lib/learner';

export default function Progress() {
  const { rows, loading, error } = useLearner();
  const total = rows.reduce((s, r) => s + r.total, 0);
  const done = rows.reduce((s, r) => s + r.done, 0);
  const global = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-8">
      <Seo title="Ma progression" />
      <h1 className="text-3xl font-extrabold">Ma progression</h1>
      {loading ? <LoadingState /> : error ? <p className="text-error-500">Erreur de chargement.</p> : (
        <>
          <div className="card p-6"><ProgressBar value={global} label={`Progression globale — ${done} / ${total} leçons`} /></div>
          {rows.length === 0 ? <div className="card p-8 text-center"><p className="text-sm text-neutral-500">Inscris-toi à une formation pour suivre ta progression.</p><div className="mt-4"><Button to="/formations">Voir les formations</Button></div></div> : (
            <div className="space-y-3">{rows.map((r) => <div key={r.enrollment.id} className="card p-5"><p className="mb-3 font-semibold">{r.course.title}</p><ProgressBar value={r.pct} label={`${r.done} / ${r.total}`} /></div>)}</div>
          )}
          <section><h2 className="mb-3 text-xl font-bold">La roadmap en 12 niveaux</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{roadmap.map((r) => <div key={r.level} className="card p-4 text-sm"><span className="font-mono text-xs text-primary-500">NIVEAU {String(r.level).padStart(2, '0')}</span><p className="font-semibold">{r.title}</p></div>)}</div></section>
        </>
      )}
    </div>
  );
}
