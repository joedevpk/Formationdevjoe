import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { pipeline } from '@/data/catalog';

const details: Record<string, string> = {
  'Idée': 'Une intuition, une envie, un besoin constaté.',
  'Problème': 'Qui souffre de quoi, et à quel point ?',
  'Recherche': 'Parler aux utilisateurs, regarder l’existant.',
  'Conception': 'Fonctionnalités, parcours, architecture.',
  'Prototype': 'Une maquette pour tester avant de coder.',
  'Vibe Coding': 'Construire vite avec l’IA, en gardant la main.',
  'Développement': 'Code propre, typé, relu et testé.',
  'Supabase': 'Base de données, authentification, sécurité RLS.',
  'IA': 'Une fonctionnalité intelligente, côté serveur.',
  'Test': 'Vérifier, casser, corriger.',
  'Déploiement': 'Mise en ligne, variables, domaine, HTTPS.',
  'Pitch': 'Raconter le produit avec impact.',
  'Produit': 'Un produit utilisé par de vraies personnes.',
};

export default function IdeaToProduct() {
  return (
    <>
      <Seo title="De l'idée au produit" description="La méthode JOE DEV CODES en 13 étapes pour transformer une idée en produit numérique." />
      <PageHero eyebrow="Signature" title="De l'idée au produit" description="Treize étapes, une seule direction : transformer une idée en produit réellement utilisable." />
      <section className="section-container max-w-3xl py-14">
        <ol className="relative space-y-3">
          {pipeline.map((s, i) => (
            <Reveal key={s}>
              <li className="card relative flex items-center gap-4 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 font-mono text-sm font-bold text-primary-500">{String(i + 1).padStart(2, '0')}</span>
                <div><h2 className="text-lg font-bold uppercase tracking-wide">{s}</h2><p className="text-sm text-neutral-600 dark:text-neutral-400">{details[s]}</p></div>
              </li>
            </Reveal>
          ))}
        </ol>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row"><Button to="/pitch-lab">Essayer le Pitch Lab</Button><Button to="/services" variant="outline">Parler de mon projet</Button></div>
      </section>
    </>
  );
}
