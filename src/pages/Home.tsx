import { Link } from 'react-router-dom';
import { ArrowRight, GraduationCap, Hammer, Lightbulb } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { Reveal } from '@/components/ui/Reveal';
import { Photo } from '@/components/ui/Photo';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProjectCard } from '@/components/ui/ProjectCard';
import { CourseCard } from '@/components/ui/CourseCard';
import { TrainingCard } from '@/components/training/TrainingCard';
import { useSessions } from '@/lib/training/api';
import { QueryState } from '@/components/ui/QueryState';
import { useCourses, useProjects, useTestimonials } from '@/lib/queries';
import { isComingSoon } from '@/lib/courseStatus';
import { useCvPublished } from '@/lib/cv/queries';
import { safeUrl } from '@/utils';

const doing = [
  { icon: Hammer, kicker: 'BUILD', text: 'Je conçois et développe des sites, applications et plateformes.' },
  { icon: GraduationCap, kicker: 'TEACH', text: 'Je forme aux technologies web, à l’IA, à Supabase et au Vibe Coding.' },
  { icon: Lightbulb, kicker: 'CREATE', text: 'Je transforme des idées en prototypes et produits numériques.' },
];

const tracks = [
  { kicker: 'DÉBUTER', stack: 'HTML · CSS · JavaScript', text: 'Les bases solides pour créer ses premières pages et comprendre comment le web fonctionne.' },
  { kicker: 'CONSTRUIRE', stack: 'React · TypeScript · Supabase', text: 'Bâtir de vraies applications avec une base de données, des comptes utilisateurs et une interface propre.' },
  { kicker: 'ACCÉLÉRER', stack: 'IA · Vibe Coding · Déploiement · Pitch', text: 'Aller plus vite avec l’IA sans perdre la compréhension, puis publier et présenter son produit.' },
];

const principles = [
  'Comprendre avant de générer.',
  'Construire avant de promettre.',
  'Tester avant de publier.',
  'Apprendre en construisant.',
];

export default function Home() {
  const projects = useProjects();
  const courses = useCourses();
  const testimonials = useTestimonials();
  const sessions = useSessions();
  const cvPublished = useCvPublished().data === true;

  return (
    <>
      <Seo />

      {/* HERO — sobre : texte à gauche, portrait éditorial à droite (sous le texte sur mobile). Aucune animation continue. */}
      <section className="border-b border-neutral-200 dark:border-neutral-900">
        <div className="section-container grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-24">
          <div>
            <p className="inline-flex rounded-full border border-neutral-300 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">JOE DEV CODES</p>
            <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-6xl">
              Construire. Apprendre. Transformer des idées en produits numériques.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-lg">
              Je suis Joe, développeur, formateur, étudiant et entrepreneur. Je construis des applications et des plateformes tout en aidant d’autres personnes à développer leurs compétences numériques.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/formations" className="btn-primary px-7 py-3.5 text-base">Découvrir les formations <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <Link to="/projets" className="btn-outline px-7 py-3.5 text-base">Voir mes projets</Link>
            </div>
            {cvPublished && <p className="mt-5 text-sm"><Link to="/cv" className="font-semibold text-neutral-700 underline underline-offset-4 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300">Voir mon CV</Link></p>}
            <p className="mt-8 font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">Web · IA · Supabase · Vibe Coding</p>
          </div>

          <div className="mx-auto w-full max-w-sm lg:max-w-md">
            <Photo id="p08" priority sizes="(min-width: 1024px) 448px, (min-width: 640px) 384px, 90vw" focus="32% 48%" focusMobile="30% 48%"
              className="aspect-[4/5] w-full rounded-2xl border border-neutral-200 dark:border-neutral-800" />
          </div>
        </div>
      </section>

      {/* CE QUE JE FAIS */}
      <section className="section-container py-16 sm:py-20" aria-labelledby="doing">
        <SectionHeading title={<span id="doing">Ce que je fais</span>} description="Développeur • Formateur • Étudiant • Entrepreneur" />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {doing.map((d, i) => (
            <Reveal key={d.kicker} delay={i * 0.06}>
              <div className="card h-full p-7">
                <d.icon className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" />
                <h3 className="mt-5 font-mono text-sm font-semibold tracking-[0.18em]">{d.kicker}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{d.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-neutral-600 dark:text-neutral-400">Apprendre en construisant. Construire pour résoudre de vrais problèmes.</p>
      </section>

      {/* FORMATIONS PRÉSENTIELLES — uniquement celles qui existent réellement ; sessions lues dans Supabase (aucune date inventée) */}
      {!(courses.data && courses.data.length === 0) && (
        <section className="section-container pb-16 sm:pb-20" aria-labelledby="courses">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <SectionHeading title={<span id="courses">Formations présentielles</span>} description="Des formations pratiques, organisées en présentiel pour apprendre, pratiquer et construire de vrais projets numériques." />
            <Link to="/formations" className="btn-outline px-5 py-2.5">Voir toutes les formations</Link>
          </div>
          <div className="mt-10">
            <QueryState query={courses} isEmpty={(d) => d.length === 0}>
              {(list) => {
                const shown = [...list.filter((c) => !isComingSoon(c)), ...list.filter((c) => isComingSoon(c))].slice(0, 3);
                return (
                  <div className="grid gap-5 md:grid-cols-3">
                    {shown.map((c) => (c.delivery_mode === 'EN_LIGNE'
                      ? <CourseCard key={c.id} course={c} />
                      : <TrainingCard key={c.id} course={c} sessions={(sessions.data ?? []).filter((x) => x.course_id === c.id)} />))}
                  </div>
                );
              }}
            </QueryState>
          </div>
        </section>
      )}

      {/* PROJETS — uniquement ceux qui existent réellement ; section absente s'il n'y en a pas */}
      {!(projects.data && projects.data.length === 0) && (
        <section className="border-y border-neutral-200 bg-neutral-50 py-16 dark:border-neutral-900 dark:bg-neutral-900/30 sm:py-20" aria-labelledby="projects">
          <div className="section-container">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <SectionHeading title={<span id="projects">Quelques projets que je construis</span>} />
              <Link to="/projets" className="btn-outline px-5 py-2.5">Tous les projets</Link>
            </div>
            <div className="mt-10">
              <QueryState query={projects} isEmpty={(d) => d.length === 0}>
                {(list) => <div className="grid gap-5 md:grid-cols-2">{list.slice(0, 4).map((p) => <ProjectCard key={p.id} project={p} />)}</div>}
              </QueryState>
            </div>
          </div>
        </section>
      )}

      {/* APPRENDRE AVEC JOE */}
      <section className="section-container py-16 sm:py-20" aria-labelledby="learn">
        <SectionHeading title={<span id="learn">Les parcours</span>} description="Trois parcours, du premier fichier HTML jusqu’au produit publié." />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {tracks.map((t, i) => (
            <Reveal key={t.kicker} delay={i * 0.06}>
              <Link to="/parcours" className="card-hover group flex h-full flex-col p-7">
                <span className="font-mono text-xs text-neutral-500">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 font-mono text-sm font-semibold tracking-[0.18em]">{t.kicker}</h3>
                <p className="mt-1 text-sm font-semibold text-primary-600 dark:text-primary-300">{t.stack}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t.text}</p>
              </Link>
            </Reveal>
          ))}
        </div>
        <div className="mt-8"><Link to="/parcours" className="btn-primary px-6 py-3">Voir les parcours</Link></div>
      </section>

      {/* MON APPROCHE — remplace toute statistique de crédibilité */}
      <section className="border-y border-neutral-200 bg-neutral-50 py-16 dark:border-neutral-900 dark:bg-neutral-900/30 sm:py-20" aria-labelledby="approach">
        <div className="section-container">
          <SectionHeading title={<span id="approach">Mon approche</span>} />
          <ol className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {principles.map((p, i) => (
              <li key={p} className="flex gap-4 border-t border-neutral-300 pt-5 dark:border-neutral-700">
                <span className="font-mono text-sm text-neutral-500">{String(i + 1).padStart(2, '0')}</span>
                <span className="font-display text-xl font-bold">{p}</span>
              </li>
            ))}
          </ol>
          <div className="mt-10"><Link to="/a-propos" className="btn-outline px-6 py-3">En savoir plus</Link></div>
        </div>
      </section>

      {/* TÉMOIGNAGES — uniquement de vrais retours publiés depuis le Studio */}
      {testimonials.data && testimonials.data.length > 0 && (
        <section className="section-container py-16 sm:py-20" aria-labelledby="feedback">
          <SectionHeading title={<span id="feedback">Ils ont appris avec moi</span>} />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {testimonials.data.slice(0, 3).map((t) => (
              <figure key={t.id} className="card p-6">
                <blockquote className="text-sm leading-relaxed">« {t.content} »</blockquote>
                <figcaption className="mt-4 flex items-center gap-3 text-sm font-semibold">
                  {safeUrl(t.avatar_url) && <img src={safeUrl(t.avatar_url) as string} alt="" width={36} height={36} loading="lazy" className="h-9 w-9 rounded-full object-cover" />}
                  <span>{t.name}{t.role && <span className="font-normal text-neutral-500"> — {t.role}</span>}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
