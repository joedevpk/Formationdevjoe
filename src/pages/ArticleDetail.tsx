import { useParams } from 'react-router-dom';
import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RichText } from '@/components/ui/RichText';
import { QueryState } from '@/components/ui/QueryState';
import { useArticle } from '@/lib/queries';
import { formatDate, safeUrl } from '@/utils';

export default function ArticleDetail() {
  const { slug } = useParams();
  const query = useArticle(slug);
  return (
    <QueryState query={query} isEmpty={(d) => d === null} emptyTitle="Article introuvable" emptyAction={<Button to="/articles" variant="outline">Tous les articles</Button>}>
      {(a) => {
        if (!a) return null;
        const img = safeUrl(a.image_url);
        return (
          <>
            <Seo title={a.title} description={a.excerpt} image={img ?? undefined} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: a.title, datePublished: a.published_at ?? a.created_at, description: a.excerpt }).replace(/</g, '\\u003c') }} />
            <PageHero eyebrow={a.category} title={a.title} description={a.excerpt}>
              <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-neutral-500">{formatDate(a.published_at ?? a.created_at)}</span>{a.tags.map((t) => <Badge key={t} variant="neutral">{t}</Badge>)}</div>
            </PageHero>
            <article className="section-container max-w-3xl py-12">
              {img && <img src={img} alt="" width={1280} height={720} className="mb-8 w-full rounded-3xl" loading="lazy" decoding="async" />}
              <RichText text={a.content} />
              <div className="mt-10"><Button to="/articles" variant="outline">← Toutes les notes</Button></div>
            </article>
          </>
        );
      }}
    </QueryState>
  );
}
