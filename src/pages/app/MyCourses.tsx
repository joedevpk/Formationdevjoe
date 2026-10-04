import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { LoadingState } from '@/components/ui/Spinner';
import { CourseCard } from '@/components/ui/CourseCard';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { isComingSoon } from '@/lib/courseStatus';
import { MyTrainings } from '@/pages/app/MyTrainings';
import { useFavorites, useLearner, useToggleFavorite } from '@/lib/learner';

export default function MyCourses() {
  const { profile } = useAuth();
  const toast = useToast();
  const { rows, loading, error, courses } = useLearner();
  const favs = useFavorites(profile?.id);
  const toggle = useToggleFavorite(profile?.id);
  const enrolled = new Set(rows.map((r) => r.course.id));
  const catalog = courses.filter((c) => c.delivery_mode === 'EN_LIGNE' && !enrolled.has(c.id) && !isComingSoon(c));

  return (
    <div className="space-y-10">
      <Seo title="Mes formations" />
      <h1 className="text-3xl font-extrabold">Mes formations</h1>
      <MyTrainings />
      {(loading || rows.length > 0) && <h2 className="text-2xl font-extrabold">Supports en ligne</h2>}
      {loading ? <LoadingState /> : error ? <p className="text-sm text-neutral-500">Contenu momentanément indisponible.</p> : rows.length === 0 ? null : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((r) => (
            <div key={r.enrollment.id} className="card p-6">
              <div className="flex items-center justify-between"><Badge variant={r.enrollment.status === 'TERMINEE' ? 'success' : 'primary'}>{r.enrollment.status === 'TERMINEE' ? 'Terminée' : 'En cours'}</Badge>
                <button aria-label="Favori" onClick={() => toggle.mutate({ type: 'course', id: r.course.id, on: !favs.data?.some((f) => f.entity_id === r.course.id) }, { onError: () => toast('error', 'Action impossible') })}>
                  <Heart className={`h-5 w-5 ${favs.data?.some((f) => f.entity_id === r.course.id) ? 'fill-error-500 text-error-500' : 'text-neutral-400'}`} /></button></div>
              <h2 className="mt-3 text-lg font-bold">{r.course.title}</h2>
              <ProgressBar value={r.pct} label={`${r.done} / ${r.total} leçons`} className="mt-4" />
              <div className="mt-5"><Button to={`/app/formations/${r.course.slug}`} size="sm">{r.pct === 0 ? 'Commencer' : r.pct === 100 ? 'Revoir' : 'Continuer'}</Button></div>
            </div>
          ))}
        </div>
      )}
      {catalog.length > 0 && (
        <section><h2 className="mb-4 text-xl font-bold">Explorer le catalogue</h2><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{catalog.map((c) => <CourseCard key={c.id} course={c} />)}</div></section>
      )}
      <p className="text-xs text-neutral-500">Besoin d'aide ? <Link to="/contact" className="underline">Écris-moi</Link>.</p>
    </div>
  );
}
