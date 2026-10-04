import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Seo, JsonLd } from '@/components/ui/Seo';
import { LoadingState } from '@/components/ui/Spinner';
import { CvDocument } from '@/components/cv/CvDocument';
import { DownloadCvButton, ShareCvButton } from '@/components/cv/CvActions';
import { usePublicCv } from '@/lib/cv/queries';
import { fullName, safeHref, summaryParagraphs } from '@/lib/cv/format';
import { formatDate } from '@/utils';
import { SITE_URL } from '@/lib/site';

export default function Cv() {
  const q = usePublicCv();
  const data = q.data ?? null;

  // JSON-LD « Person » : uniquement des champs réellement présents dans le CV publié.
  const ld = useMemo(() => {
    if (!data) return null;
    const p = data.profile;
    const sameAs = [p.github, p.linkedin, p.website, ...p.links.map((l) => l.url)].map(safeHref).filter(Boolean);
    return {
      '@context': 'https://schema.org', '@type': 'Person', name: fullName(data), jobTitle: p.headline,
      ...(SITE_URL ? { url: `${SITE_URL}/cv` } : {}),
      ...(p.email ? { email: p.email } : {}),
      ...(p.location ? { address: { '@type': 'PostalAddress', addressLocality: p.location } } : {}),
      ...(safeHref(p.photo_url) ? { image: safeHref(p.photo_url) } : {}),
      ...(sameAs.length ? { sameAs } : {}),
    };
  }, [data]);

  if (q.isLoading) {
    return <div className="section-container py-20" role="status"><LoadingState /><p className="mt-3 text-center text-sm text-neutral-500">Chargement du CV...</p></div>;
  }

  if (q.isError) {
    return (
      <section className="section-container flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <Seo title="CV" description="CV indisponible pour le moment." noindex />
        <p className="text-lg font-semibold">Impossible de charger le CV.</p>
        <button type="button" onClick={() => void q.refetch()} className="btn-primary px-5 py-2.5">Réessayer</button>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="section-container flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <Seo title="CV" description="Cette page CV n’est pas disponible." noindex />
        <h1 className="text-2xl font-bold">Cette page CV n’est pas disponible.</h1>
        <Link to="/" className="btn-outline px-5 py-2.5">Retour à l’accueil</Link>
      </section>
    );
  }

  const name = fullName(data);
  const desc = summaryParagraphs(data)[0]?.slice(0, 155) || `CV de ${name} : ${data.profile.headline}.`;

  return (
    <>
      <Seo rawTitle={`CV — ${name} | ${data.profile.headline}`} description={desc} image={safeHref(data.profile.photo_url)} />
      <JsonLd data={ld} />
      <div className="border-b border-neutral-200 dark:border-neutral-900">
        <div className="section-container flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">CV — {name}</h1>
            {data.updated_at && <p className="mt-1 text-sm text-neutral-500">CV mis à jour le {formatDate(data.updated_at)}</p>}
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <DownloadCvButton data={data} />
            <Link to="/" className="btn-outline px-5 py-2.5">Voir le portfolio</Link>
            <Link to="/formations" className="btn-outline px-5 py-2.5">Mes formations</Link>
            <Link to="/contact" className="btn-outline px-5 py-2.5">Me contacter</Link>
            <ShareCvButton data={data} />
          </div>
        </div>
      </div>
      <div className="bg-neutral-100 px-0 py-6 dark:bg-neutral-900 sm:px-4 sm:py-10">
        <CvDocument data={data} className="sm:shadow-sm sm:ring-1 sm:ring-neutral-200" />
      </div>
    </>
  );
}
