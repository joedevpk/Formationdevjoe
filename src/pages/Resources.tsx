import { useMemo, useState } from 'react';
import { Search, ExternalLink, FileText } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { Badge } from '@/components/ui/Badge';
import { QueryState } from '@/components/ui/QueryState';
import { useResources } from '@/lib/queries';
import { resourceCategories, resourceKinds } from '@/data/catalog';
import { safeUrl } from '@/utils';

export default function Resources() {
  const query = useResources();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [kind, setKind] = useState('');
  const list = useMemo(() => (query.data ?? []).filter((r) =>
    (!cat || r.category === cat) && (!kind || r.kind === kind) &&
    (!q.trim() || (r.title + ' ' + (r.description ?? '')).toLowerCase().includes(q.trim().toLowerCase()))), [query.data, q, cat, kind]);

  return (
    <>
      <Seo title="Ressources" description="Tutoriels, cheatsheets, prompts, templates et outils pour apprendre à coder et construire." />
      <PageHero eyebrow="Ressources" title="Ressources" description="Cheatsheets, prompts, templates, snippets : tout ce qui aide à construire plus vite." />
      <section className="section-container py-12">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem_12rem]">
          <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une ressource" aria-label="Rechercher" className="input-field pl-10" /></div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Catégorie" className="input-field"><option value="">Toutes catégories</option>{resourceCategories.map((c) => <option key={c}>{c}</option>)}</select>
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type" className="input-field"><option value="">Tous types</option>{resourceKinds.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <div className="mt-8">
          <QueryState query={{ ...query, data: list.length === 0 && query.data ? [] : query.data }} isEmpty={(d) => d.length === 0} emptyTitle="Aucune ressource trouvée" emptyText="Modifie ta recherche ou tes filtres.">
            {() => (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((r) => {
                  const url = safeUrl(r.url);
                  return (
                    <div key={r.id} className="card flex flex-col p-5">
                      <div className="flex items-center gap-2"><Badge variant="primary">{r.category}</Badge><Badge variant="neutral">{r.kind}</Badge></div>
                      <h3 className="mt-3 font-bold">{r.title}</h3>
                      {r.description && <p className="mt-1 flex-1 text-sm text-neutral-600 dark:text-neutral-400">{r.description}</p>}
                      <div className="mt-4 text-sm font-semibold">
                        {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-500 hover:underline"><ExternalLink className="h-4 w-4" />Ouvrir</a>
                          : <span className="inline-flex items-center gap-1 text-neutral-500"><FileText className="h-4 w-4" />Bientôt disponible</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </QueryState>
        </div>
      </section>
    </>
  );
}
