import { Link } from 'react-router-dom';
import { Calendar, Clock, MonitorPlay } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { Badge } from '@/components/ui/Badge';
import { QueryState } from '@/components/ui/QueryState';
import { Photo } from '@/components/ui/Photo';
import { Reveal } from '@/components/ui/Reveal';
import { useWorkshops } from '@/lib/queries';
import { formatDateTime } from '@/utils';
import type { Workshop } from '@/types';

export const workshopStatus: Record<Workshop['status'], { label: string; variant: 'success' | 'primary' | 'warning' | 'neutral' | 'error' }> = {
  A_VENIR: { label: 'À venir', variant: 'primary' }, OUVERT: { label: 'Inscriptions ouvertes', variant: 'success' },
  COMPLET: { label: 'Complet', variant: 'warning' }, TERMINE: { label: 'Terminé', variant: 'neutral' }, ANNULE: { label: 'Annulé', variant: 'error' },
};

export default function Workshops() {
  const query = useWorkshops();
  return (
    <>
      <Seo title="Workshops & sessions" description="Workshops HTML/CSS, JavaScript, Supabase, IA, Vibe Coding, pitch, bootcamp et live debugging." />
      <PageHero eyebrow="Workshops" title="Workshops & sessions" description="Des sessions pratiques, en ligne ou en présentiel. Les dates sont annoncées ici dès qu'elles sont confirmées." />
      <section className="section-container pt-12">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-4xl border border-neutral-200 bg-neutral-950 text-white dark:border-white/10">
            <Photo id="p01" sizes="(min-width: 1280px) 1200px, 100vw" parallax className="absolute inset-0 -z-10 h-full w-full" focus="50% 40%" focusMobile="45% 40%" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-neutral-950/20 sm:bg-gradient-to-r sm:from-neutral-950 sm:via-neutral-950/70 sm:to-transparent" />
            <div className="absolute bottom-6 right-6 hidden w-64 overflow-hidden rounded-2xl border border-white/20 shadow-glass-lg md:block lg:w-80">
              <Photo id="p10" sizes="320px" className="aspect-[3/2] w-full" />
            </div>
            <div className="flex min-h-[18rem] max-w-xl flex-col justify-end p-8 sm:min-h-[20rem] sm:justify-center sm:p-12">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary-300">En présentiel ou en ligne</p>
              <h2 className="mt-3 text-balance text-2xl font-extrabold sm:text-3xl">Des sessions courtes, pratiques, entre apprenants.</h2>
              <p className="mt-2 text-sm text-neutral-300">Un thème, un résultat concret à la fin de la session.</p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="section-container py-12">
        <QueryState query={query} isEmpty={(d) => d.length === 0} emptyTitle="Aucune session programmée" emptyText="Reviens bientôt, ou écris-moi pour organiser un workshop.">
          {(list) => (
            <div className="grid gap-4 md:grid-cols-2">
              {list.map((w) => (
                <Link key={w.id} to={`/workshops/${w.slug}`} className="card-hover block p-6">
                  <div className="flex items-center justify-between gap-2"><Badge variant={workshopStatus[w.status].variant}>{workshopStatus[w.status].label}</Badge><span className="inline-flex items-center gap-1 text-xs text-neutral-500"><MonitorPlay className="h-3.5 w-3.5" />{w.format}</span></div>
                  <h3 className="mt-3 text-lg font-bold">{w.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{w.description}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-neutral-500">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{w.starts_at ? formatDateTime(w.starts_at) : 'Date à confirmer'}</span>
                    {w.duration && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{w.duration}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </QueryState>
      </section>
    </>
  );
}
