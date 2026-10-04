import { FileText, MapPin } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';
import { Photo } from '@/components/ui/Photo';
import { useIdentity, useSetting } from '@/lib/queries';
import { safeUrl } from '@/utils';

// Textes volontairement simples et sans promesse. Les textes de Studio → Paramètres (bio, présentation) les remplacent quand ils existent.
const sections: [string, string][] = [
  ['Ce que je construis', 'Des sites, des applications web et des plateformes. En ce moment, je travaille surtout avec React, TypeScript et Supabase, et j’utilise l’IA comme un outil pour aller plus vite, pas pour penser à ma place.'],
  ['Ce que j’apprends', 'Je suis encore étudiant, et je le reste volontairement. J’apprends en construisant des projets réels : c’est là que je comprends ce que les cours ne montrent pas.'],
  ['Pourquoi je forme', 'Parce que ce que j’apprends ne vaut que si je peux l’expliquer. Former m’oblige à être clair, et aide d’autres personnes à passer de l’idée à quelque chose qui fonctionne.'],
  ['Ma manière de travailler', 'Je pars d’un vrai problème, je construis une première version simple, je la teste, puis je l’améliore. Je préfère livrer quelque chose de petit qui marche plutôt que promettre quelque chose de grand.'],
];

export default function About() {
  const { data: id } = useIdentity();
  const tl = useSetting('about.timeline');
  // Parcours : affiché uniquement si renseigné dans Studio → Paramètres (lignes « Titre | Description »). Pas de parcours inventé.
  const timeline: string[][] = tl.data ? tl.data.split('\n').map((l) => l.split('|').map((s) => s.trim())).filter((p) => p[0]) : [];
  const photo = safeUrl(id?.photo);
  const cv = safeUrl(id?.cv);

  return (
    <>
      <Seo title="À propos" description="Joe Dev : développeur, formateur, étudiant et entrepreneur. Ce que je construis, ce que j’apprends et ma manière de travailler." />
      <PageHero eyebrow="À propos" title="Je construis, j’apprends, et je partage ce que j’apprends." description={id?.bio || 'Je suis Joe, développeur, formateur, étudiant et entrepreneur.'}>
        <div className="flex flex-wrap items-center gap-3">
          {id?.location && <span className="inline-flex items-center gap-1.5 text-sm text-neutral-500"><MapPin className="h-4 w-4" aria-hidden="true" />{id.location}</span>}
          {cv && <Button href={cv} variant="outline" size="sm"><FileText className="h-4 w-4" aria-hidden="true" />Télécharger mon CV</Button>}
        </div>
      </PageHero>

      <section className="section-container grid gap-12 py-14 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
        <div className="mx-auto w-full max-w-sm lg:mx-0 lg:sticky lg:top-24 lg:self-start">
          {photo ? <img src={photo} alt={id?.name ?? 'Portrait de Joe Dev'} width={800} height={1000} loading="lazy" decoding="async" className="aspect-[4/5] w-full rounded-2xl border border-neutral-200 object-cover dark:border-neutral-800" />
            : <Photo id="p06" sizes="(min-width: 1024px) 384px, 90vw" className="aspect-[4/5] w-full rounded-2xl border border-neutral-200 dark:border-neutral-800" />}
        </div>
        <div className="space-y-10">
          <div><h2 className="text-2xl font-bold">Qui je suis</h2><p className="mt-3 leading-relaxed text-neutral-600 dark:text-neutral-400">{id?.presentation || 'Je m’appelle Joe. Je suis développeur et formateur, étudiant et entrepreneur : quatre façons de faire la même chose, c’est-à-dire construire des choses utiles et apprendre en le faisant.'}</p></div>
          {sections.map(([t, p]) => (
            <div key={t}><h2 className="text-2xl font-bold">{t}</h2><p className="mt-3 leading-relaxed text-neutral-600 dark:text-neutral-400">{p}</p></div>
          ))}
        </div>
      </section>

      {timeline.length > 0 && (
        <section className="border-t border-neutral-200 py-14 dark:border-neutral-900 lg:py-20">
          <div className="section-container">
            <SectionHeading title="Mon parcours" />
            <ol className="mt-10 space-y-6 border-l border-neutral-200 pl-6 dark:border-neutral-800">
              {timeline.map(([title, text], i) => (
                <li key={title + i}><h3 className="font-bold">{title}</h3>{text && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{text}</p>}</li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </>
  );
}
