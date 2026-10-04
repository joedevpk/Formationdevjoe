import { useState } from 'react';
import { Copy, Check, ArrowDown } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/ui/Reveal';
import { CodeWindow } from '@/components/ui/CodeWindow';
import { Photo } from '@/components/ui/Photo';
import { vibeSteps, vibeScenarios } from '@/data/catalog';
import { cn } from '@/utils';

export default function VibeCoding() {
  const [active, setActive] = useState(vibeScenarios[0].key);
  const [copied, setCopied] = useState(false);
  const sc = vibeScenarios.find((s) => s.key === active) ?? vibeScenarios[0];

  const copy = async () => {
    try { await navigator.clipboard.writeText(sc.prompt); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* presse-papiers indisponible */ }
  };

  return (
    <>
      <Seo title="Vibe Coding" description="Code different. Build smarter. Apprendre à construire plus vite avec l'IA sans devenir dépendant d'elle." />
      <section className="relative overflow-hidden bg-neutral-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(116,100,251,0.3),transparent_60%)]" />
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="section-container relative grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="text-center lg:text-left">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary-300">Vibe Coding</p>
            <h1 className="mt-5 text-balance text-5xl font-extrabold leading-none sm:text-7xl">CODE DIFFERENT.<br /><span className="text-gradient">BUILD SMARTER.</span></h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-neutral-400 lg:mx-0">L'IA accélère le développement. La compréhension reste indispensable.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <a href="#lab" className="btn bg-white px-6 py-3 text-neutral-950 hover:bg-neutral-200">Ouvrir le Vibe Coding Lab</a>
              <a href="/formations/vibe-coding" className="btn border border-neutral-700 px-6 py-3 text-white hover:bg-neutral-900">Voir la formation</a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-primary-500/30 to-accent-500/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 shadow-glow">
              <Photo id="p08" priority sizes="(min-width: 1024px) 448px, 90vw" className="aspect-[4/5] w-full" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-950/70 via-transparent to-transparent" />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/15 bg-neutral-900/60 p-4 font-mono text-xs text-neutral-200 backdrop-blur-xl">
                <span className="text-primary-300">prompt</span> → architecture → code → test → <span className="text-accent-300">deploy</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-container py-20">
        <SectionHeading eyebrow="Philosophie" title="Le Vibe Coder Cultivé" description="L'objectif n'est pas de demander à l'IA de tout faire. C'est de comprendre, concevoir, guider l'IA, vérifier, corriger, améliorer, puis déployer." />
        <div className="mt-10 flex flex-wrap items-center gap-2">
          {['Comprendre', 'Concevoir', "Guider l'IA", 'Vérifier', 'Corriger', 'Améliorer', 'Déployer'].map((s, i, a) => (
            <span key={s} className="flex items-center gap-2"><span className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold dark:border-neutral-800">{s}</span>{i < a.length - 1 && <span className="text-neutral-400">→</span>}</span>
          ))}
        </div>

        <h3 className="mb-6 mt-16 text-xl font-bold">Le cycle de travail</h3>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {vibeSteps.map((s, i) => (
            <Reveal key={s} delay={i * 0.04}>
              <li className="card relative p-4 text-center"><span className="font-mono text-[10px] text-primary-500">{String(i + 1).padStart(2, '0')}</span><p className="mt-1 font-semibold">{s}</p>
                {i < vibeSteps.length - 1 && <ArrowDown className="absolute -bottom-3 left-1/2 z-10 h-4 w-4 -translate-x-1/2 rounded-full bg-white text-neutral-400 dark:bg-neutral-950 sm:hidden" />}</li>
            </Reveal>
          ))}
        </ol>
      </section>

      <section id="lab" className="border-t border-neutral-200 bg-neutral-50 py-20 dark:border-neutral-900 dark:bg-neutral-900/30">
        <div className="section-container">
          <SectionHeading eyebrow="Vibe Coding Lab" title="Sept scénarios pour t'entraîner" description="Choisis un scénario, copie le prompt, adapte-le à ton projet, puis vérifie le résultat avec la checklist." />
          <div className="mt-10 grid gap-6 lg:grid-cols-[18rem_1fr]">
            <div className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col" role="tablist" aria-label="Scénarios">
              {vibeScenarios.map((s) => (
                <button key={s.key} role="tab" aria-selected={active === s.key} onClick={() => setActive(s.key)}
                  className={cn('whitespace-nowrap rounded-xl border px-4 py-3 text-left text-sm font-semibold transition', active === s.key ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-300' : 'border-neutral-200 hover:border-neutral-400 dark:border-neutral-800')}>
                  {s.title}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <CodeWindow title={`prompt — ${sc.key}`}><span className="whitespace-pre-wrap">{sc.prompt}</span></CodeWindow>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => void copy()}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copié' : 'Copier le prompt'}</Button>
              </div>
              <div className="card p-5">
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">À vérifier toi-même</h4>
                <ul className="space-y-2 text-sm">{sc.check.map((c) => <li key={c} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-success-500" />{c}</li>)}</ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-container py-20 text-center">
        <h2 className="text-3xl font-extrabold">Construire plus vite, sans perdre la main.</h2>
        <div className="mt-6"><Button to="/register" size="lg">Commencer la formation</Button></div>
      </section>
    </>
  );
}
