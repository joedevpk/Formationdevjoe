import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Evolution } from '@/components/ui/Evolution';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { roadmap } from '@/data/catalog';
import { useAuth } from '@/contexts/AuthContext';

export default function Path() {
  const { profile } = useAuth();
  return (
    <>
      <Seo title="Parcours" description="La roadmap en 12 niveaux pour devenir créateur numérique : du HTML à l'entrepreneuriat." />
      <PageHero eyebrow="Parcours" title="Mon parcours pour devenir créateur numérique" description="Douze niveaux, de la culture numérique à l'entrepreneuriat. Avance à ton rythme, projet après projet." />
      <section className="section-container pt-16">
        <SectionHeading eyebrow="Mon évolution" title="Étudiant, puis créateur : un parcours qui se construit." className="mb-10" />
        <Evolution />
      </section>
      <section className="section-container py-16">
        <div className="mb-10 max-w-md"><ProgressBar value={0} label="Ta progression dans le parcours" />
          <p className="mt-2 text-xs text-neutral-500">{profile ? 'Ta progression détaillée par formation est dans Mon espace.' : 'Crée un compte pour suivre ta progression.'}</p></div>
        <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {roadmap.map((r, i) => (
            <Reveal key={r.level} delay={(i % 3) * 0.06}>
              <li className="card h-full p-5">
                <span className="font-mono text-xs text-primary-500">NIVEAU {String(r.level).padStart(2, '0')}</span>
                <h3 className="mt-2 text-lg font-bold">{r.title}</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{r.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row"><Button to="/apprendre">Choisir mon parcours</Button><Button to="/formations" variant="outline">Voir les formations</Button></div>
      </section>
    </>
  );
}
