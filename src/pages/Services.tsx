import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { QueryState } from '@/components/ui/QueryState';
import { useServices } from '@/lib/queries';

export default function Services() {
  const query = useServices();
  return (
    <>
      <Seo title="Ce que je peux construire" description="Sites web, applications, plateformes SaaS, dashboards, intégrations Supabase et IA, MVP, accompagnement et formation." />
      <PageHero eyebrow="Services" title="Ce que je peux construire" description="Du site vitrine à la plateforme SaaS : un accompagnement technique de l'idée à la mise en ligne.">
        <Button to="/contact" size="lg">Parler de mon projet</Button>
      </PageHero>
      <section className="section-container py-14">
        <QueryState query={query} isEmpty={(d) => d.length === 0} emptyTitle="Services bientôt disponibles">
          {(list) => (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => (
                <div key={s.id} className="card p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500"><Icon name={s.icon} className="h-5 w-5" /></span>
                  <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{s.description}</p>
                </div>
              ))}
            </div>
          )}
        </QueryState>
      </section>
    </>
  );
}
