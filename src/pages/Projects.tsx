import { useMemo, useState } from 'react';
import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { ProjectCard } from '@/components/ui/ProjectCard';
import { QueryState } from '@/components/ui/QueryState';
import { Photo } from '@/components/ui/Photo';
import { Reveal } from '@/components/ui/Reveal';
import { useProjects } from '@/lib/queries';
import { cn } from '@/utils';

export default function Projects() {
  const query = useProjects();
  const [cat, setCat] = useState('Tous');
  const cats = useMemo(() => ['Tous', ...Array.from(new Set((query.data ?? []).map((p) => p.category)))], [query.data]);
  const list = (query.data ?? []).filter((p) => cat === 'Tous' || p.category === cat);
  return (
    <>
      <Seo title="Projets" description="Applications web, plateformes, IA et Supabase : les projets que je construis, avec leur statut réel." />
      <PageHero eyebrow="Portfolio" title="Quelques projets que je construis" description="Applications, plateformes et produits numériques. Chaque projet indique clairement s’il est disponible, en développement ou privé." />
      <section className="section-container py-12">
        {cats.length > 2 && (
          <div className="no-scrollbar mb-8 flex gap-2 overflow-x-auto">
            {cats.map((c) => <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)} className={cn('whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold', cat === c ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950' : 'border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400')}>{c}</button>)}
          </div>
        )}
        <QueryState query={{ ...query, data: list.length === 0 && query.data ? [] : query.data }} isEmpty={(d) => d.length === 0} emptyTitle="Les projets arrivent bientôt" emptyText="Aucun projet n’est publié pour le moment.">
          {() => (
            <div className="grid gap-5 md:grid-cols-2">{list.map((p) => <ProjectCard key={p.id} project={p} />)}</div>
          )}
        </QueryState>
      </section>
      <section className="section-container pb-14">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary-500">Coulisses</p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold">Derrière chaque projet, du terrain et une équipe.</h2>
            <p className="mt-3 text-neutral-600 dark:text-neutral-400">Les réalisations naissent de rencontres, d'événements et de beaucoup d'itérations. Chaque étude de cas raconte le problème, la solution et ce que j'en ai appris.</p>
          </Reveal>
          <div className="grid grid-cols-5 gap-3">
            <Reveal className="col-span-2"><Photo id="p03" sizes="(min-width: 1024px) 260px, 40vw" className="aspect-[3/4] w-full rounded-3xl border border-neutral-200 dark:border-white/10" /></Reveal>
            <Reveal delay={0.1} className="col-span-3 flex items-center">
              <Photo id="p14" sizes="(min-width: 1024px) 390px, 60vw" className="aspect-[4/3] w-full rounded-3xl border border-neutral-200 dark:border-white/10" />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
