import { Reveal } from '@/components/ui/Reveal';
import { PhotoCard } from '@/components/ui/PhotoCard';

const steps = [
  { id: 'p13', eyebrow: '01 • Étudiant', title: 'Apprendre, poser les bases', text: "Le point de départ : comprendre avant de construire.", focus: '30% 58%' },
  { id: 'p05', eyebrow: '02 • Reconnaissance', title: 'Valider ce qui est appris', text: "Attestations et diplômes : des étapes, pas une fin.", focus: '55% 30%' },
  { id: 'p04', eyebrow: '03 • Terrain & équipe', title: 'Apprendre ensemble', text: "Se confronter au terrain et progresser en groupe.", focus: '50% 62%' },
] as const;

/** Triptyque « mon évolution » : étudiant → reconnaissance → équipe. Légendes descriptives, sans date ni fait inventé. */
export function Evolution() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {steps.map((s, i) => (
        <Reveal key={s.id} delay={i * 0.1} className={i === 1 ? 'sm:mt-10' : ''}>
          <PhotoCard id={s.id} focus={s.focus} focusMobile={s.focus} sizes="(min-width: 640px) 33vw, 90vw" ratio="aspect-[4/5]" eyebrow={s.eyebrow} title={s.title} text={s.text} />
        </Reveal>
      ))}
    </div>
  );
}
