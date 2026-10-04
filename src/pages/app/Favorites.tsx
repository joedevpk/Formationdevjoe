import { Link } from 'react-router-dom';
import { Seo } from '@/components/ui/Seo';
import { LoadingState } from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/lib/learner';
import { useCourses, useResources } from '@/lib/queries';

export default function Favorites() {
  const { profile } = useAuth();
  const favs = useFavorites(profile?.id);
  const courses = useCourses();
  const resources = useResources();
  if (favs.isLoading) return <LoadingState />;
  const fc = (courses.data ?? []).filter((c) => favs.data?.some((f) => f.entity_type === 'course' && f.entity_id === c.id));
  const fr = (resources.data ?? []).filter((r) => favs.data?.some((f) => f.entity_type === 'resource' && f.entity_id === r.id));
  return (
    <div className="space-y-8">
      <Seo title="Mes favoris" />
      <h1 className="text-3xl font-extrabold">Mes favoris</h1>
      {fc.length + fr.length === 0 ? <div className="card p-8 text-center text-sm text-neutral-500">Aucun favori pour le moment. Utilise le cœur sur une formation ou une ressource.</div> : (
        <div className="space-y-2">
          {fc.map((c) => <Link key={c.id} to={`/app/formations/${c.slug}`} className="card-hover block p-4 text-sm font-semibold">Formation — {c.title}</Link>)}
          {fr.map((r) => <div key={r.id} className="card p-4 text-sm"><span className="font-semibold">Ressource — {r.title}</span></div>)}
        </div>
      )}
    </div>
  );
}
