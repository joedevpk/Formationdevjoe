import { Heart, ExternalLink } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { Badge } from '@/components/ui/Badge';
import { QueryState } from '@/components/ui/QueryState';
import { useToast } from '@/components/ui/Toast';
import { useResources } from '@/lib/queries';
import { useFavorites, useToggleFavorite } from '@/lib/learner';
import { useAuth } from '@/contexts/AuthContext';
import { safeUrl } from '@/utils';

export default function MyResources() {
  const { profile } = useAuth();
  const toast = useToast();
  const query = useResources();
  const favs = useFavorites(profile?.id);
  const toggle = useToggleFavorite(profile?.id);
  return (
    <div className="space-y-8">
      <Seo title="Mes ressources" />
      <h1 className="text-3xl font-extrabold">Mes ressources</h1>
      <QueryState query={query} isEmpty={(d) => d.length === 0} emptyTitle="Aucune ressource publiée">
        {(list) => (
          <div className="grid gap-4 md:grid-cols-2">
            {list.map((r) => {
              const fav = favs.data?.some((f) => f.entity_type === 'resource' && f.entity_id === r.id) ?? false;
              const url = safeUrl(r.url);
              return (
                <div key={r.id} className="card p-5">
                  <div className="flex items-center justify-between"><div className="flex gap-2"><Badge variant="primary">{r.category}</Badge><Badge variant="neutral">{r.kind}</Badge></div>
                    <button aria-label="Favori" onClick={() => toggle.mutate({ type: 'resource', id: r.id, on: !fav }, { onError: () => toast('error', 'Action impossible') })}><Heart className={`h-5 w-5 ${fav ? 'fill-error-500 text-error-500' : 'text-neutral-400'}`} /></button></div>
                  <h2 className="mt-3 font-bold">{r.title}</h2>{r.description && <p className="mt-1 text-sm text-neutral-500">{r.description}</p>}
                  {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-500"><ExternalLink className="h-4 w-4" />Ouvrir</a>}
                </div>
              );
            })}
          </div>
        )}
      </QueryState>
    </div>
  );
}
