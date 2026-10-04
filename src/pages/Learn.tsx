import { Link } from 'react-router-dom';
import { Check, Clock } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { tracks } from '@/data/catalog';
import { useCourses } from '@/lib/queries';

export default function Learn() {
  const { data } = useCourses();
  return (
    <>
      <Seo title="Apprendre avec Joe Dev" description="Trois parcours : Débutant, Créateur, Builder. Choisis celui qui correspond à ton niveau et à ton objectif." />
      <PageHero eyebrow="Apprendre" title="Apprendre avec Joe Dev" description="Trois parcours pour aller de zéro à ton premier site, puis à l'application, puis à la plateforme et au produit." />
      <section className="section-container grid gap-5 py-14 lg:grid-cols-3">
        {tracks.map((t, i) => (
          <Reveal key={t.key} delay={i * 0.08}>
            <div className="card flex h-full flex-col p-7">
              <Badge variant={i === 0 ? 'success' : i === 1 ? 'primary' : 'warning'}>{t.title}</Badge>
              <h2 className="mt-4 text-2xl font-extrabold">{t.tagline}</h2>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500"><Clock className="h-3.5 w-3.5" />{t.duration}</p>
              <h3 className="mt-6 text-xs font-bold uppercase tracking-wide text-neutral-500">Compétences</h3>
              <ul className="mt-2 space-y-1.5 text-sm">{t.skills.map((s) => <li key={s} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-success-500" />{s}</li>)}</ul>
              <h3 className="mt-6 text-xs font-bold uppercase tracking-wide text-neutral-500">Formations</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {t.courses.map((slug) => {
                  const c = data?.find((x) => x.slug === slug);
                  return <li key={slug}>{c ? <Link to={`/formations/${slug}`} className="underline-offset-2 hover:text-primary-500 hover:underline">{c.title}</Link> : <span className="text-neutral-500">{slug}</span>}</li>;
                })}
              </ul>
              <h3 className="mt-6 text-xs font-bold uppercase tracking-wide text-neutral-500">Projet</h3>
              <p className="mt-2 flex-1 text-sm">{t.project}</p>
              <div className="mt-6"><Button to="/register" variant={i === 1 ? 'secondary' : 'outline'} className="w-full">Commencer ce parcours</Button></div>
            </div>
          </Reveal>
        ))}
      </section>
    </>
  );
}
