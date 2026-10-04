import { Link } from 'react-router-dom';
import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { Badge } from '@/components/ui/Badge';
import { QueryState } from '@/components/ui/QueryState';
import { useArticles } from '@/lib/queries';
import { formatDate, safeUrl } from '@/utils';

export default function Articles() {
  const query = useArticles();
  return (
    <>
      <Seo title="Joe Dev Notes" description="Tutoriels, retours d'expérience, IA, Vibe Coding et entrepreneuriat." />
      <PageHero eyebrow="Blog" title="JOE DEV NOTES" description="Tutoriels, conseils, retours d'expérience et études de projets. Uniquement du contenu réel." />
      <section className="section-container py-12">
        <QueryState query={query} isEmpty={(d) => d.length === 0} emptyTitle="Aucun article publié pour le moment" emptyText="Les premières notes arrivent bientôt.">
          {(list) => (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {list.map((a) => {
                const img = safeUrl(a.image_url);
                return (
                  <Link key={a.id} to={`/articles/${a.slug}`} className="card-hover overflow-hidden">
                    {img && <img src={img} alt="" width={1280} height={720} loading="lazy" decoding="async" className="aspect-video w-full object-cover" />}
                    <div className="p-5"><div className="flex items-center gap-2"><Badge variant="primary">{a.category}</Badge><span className="text-xs text-neutral-500">{formatDate(a.published_at ?? a.created_at)}</span></div>
                      <h3 className="mt-3 text-lg font-bold">{a.title}</h3><p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{a.excerpt}</p></div>
                  </Link>
                );
              })}
            </div>
          )}
        </QueryState>
      </section>
    </>
  );
}
