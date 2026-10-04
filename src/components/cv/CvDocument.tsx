import { type ReactNode } from 'react';
import type { CvData, CvTemplate } from '@/lib/cv/types';
import { contactItems, educationPeriod, experiencePeriod, fullName, levelLabel, monthYear, safeHref, sectionFlags, skillGroups, summaryParagraphs, prettyUrl } from '@/lib/cv/format';
import { cn } from '@/utils';

/**
 * Rendu HTML du CV (page publique + aperçu Studio). Volontairement indépendant du thème du site :
 * toujours « papier » (fond blanc, texte sombre, aucune classe dark:) pour rester fidèle à la version imprimée.
 * Une seule colonne de flux (comme le PDF) : pas de débordement horizontal, lisible dès 320 px.
 */

const fonts: Record<CvTemplate, string> = {
  minimal: 'font-sans',
  modern: 'font-sans',
  executive: 'font-[Georgia,"Times_New_Roman",serif]',
  developer: 'font-sans',
};
const mono = 'font-mono';

function A({ href, children, className }: { href?: string; children: ReactNode; className?: string }) {
  const h = safeHref(href);
  if (!h) return <span className={className}>{children}</span>;
  return <a href={h} target={h.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={cn('underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900', className)}>{children}</a>;
}

function Section({ t, title, children }: { t: CvTemplate; title: string; children: ReactNode }) {
  const id = `cv-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  if (t === 'developer') {
    return (
      <section aria-labelledby={id} className="grid gap-2 border-t border-neutral-200 py-6 sm:grid-cols-[8.5rem_1fr] sm:gap-8">
        <h2 id={id} className={cn(mono, 'text-xs font-semibold uppercase tracking-wider text-neutral-500')}>{`// ${title}`}</h2>
        <div className="min-w-0">{children}</div>
      </section>
    );
  }
  const head: Record<Exclude<CvTemplate, 'developer'>, string> = {
    minimal: 'border-b border-neutral-200 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500',
    modern: 'border-l-4 border-indigo-700 pl-3 text-sm font-bold uppercase tracking-wider text-neutral-900',
    executive: 'border-b border-neutral-900 pb-1 text-sm font-bold uppercase tracking-[0.12em] text-neutral-900',
  };
  return (
    <section aria-labelledby={id} className="py-5">
      <h2 id={id} className={head[t]}>{title}</h2>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}

const Chips = ({ items, t }: { items: string[]; t: CvTemplate }) => (
  <ul className="flex flex-wrap gap-1.5" aria-label="Technologies">
    {items.map((x) => <li key={x} className={cn('rounded border border-neutral-300 px-1.5 py-0.5 text-[11px] leading-4 text-neutral-700', t === 'developer' && mono)}>{x}</li>)}
  </ul>
);

const Row = ({ title, meta, sub, children }: { title: ReactNode; meta?: string; sub?: ReactNode; children?: ReactNode }) => (
  <article className="mb-5 break-inside-avoid last:mb-0">
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <h3 className="text-[15px] font-semibold leading-snug text-neutral-900">{title}</h3>
      {meta && <p className="shrink-0 text-xs text-neutral-500">{meta}</p>}
    </div>
    {sub && <p className="mt-0.5 text-sm text-neutral-600">{sub}</p>}
    {children}
  </article>
);

const Para = ({ children }: { children: ReactNode }) => <p className="mt-2 text-sm leading-relaxed text-neutral-700">{children}</p>;

export function CvDocument({ data, template, className }: { data: CvData; template?: CvTemplate; className?: string }) {
  const t = template ?? data.profile.template;
  const p = data.profile;
  const f = sectionFlags(data);
  const name = fullName(data);
  const contact = contactItems(data);
  const photo = safeHref(p.photo_url);

  const photoEl = photo ? (
    <img src={photo} alt={`Portrait de ${name}`} width={112} height={112} loading="lazy" decoding="async"
      className={cn('h-24 w-24 shrink-0 object-cover sm:h-28 sm:w-28', t === 'executive' ? 'rounded-sm' : 'rounded-full', t === 'developer' && 'rounded-md')} />
  ) : null;

  const contactEl = contact.length > 0 && (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600', t === 'executive' && 'justify-center', t === 'developer' && mono + ' text-xs')}>
      {contact.map((c) => <li key={c.label + c.text}>{c.href ? <A href={c.href}>{c.text}</A> : c.text}</li>)}
    </ul>
  );

  return (
    <article aria-label={`CV de ${name}`} className={cn('mx-auto w-full max-w-[794px] break-words bg-white px-5 py-8 text-neutral-900 sm:px-12 sm:py-12', fonts[t], className)}>
      <header className={cn('flex gap-5', t === 'executive' ? 'flex-col items-center text-center' : 'flex-col items-start sm:flex-row sm:items-center', t === 'modern' && 'rounded-lg bg-neutral-50 p-5 sm:p-6')}>
        {t !== 'minimal' && photoEl}
        <div className="min-w-0 flex-1">
          <h1 className={cn(t === 'executive' ? 'text-3xl font-bold tracking-wide' : 'text-3xl font-semibold tracking-tight', t === 'developer' && mono + ' text-2xl')}>{name}</h1>
          <p className={cn('mt-1 text-base text-neutral-700', t === 'developer' && mono + ' text-sm text-indigo-800', t === 'modern' && 'font-medium text-indigo-800')}>{p.headline}</p>
          <div className="mt-3">{contactEl}</div>
        </div>
        {t === 'minimal' && photoEl}
      </header>
      {t === 'executive' && <hr className="mt-5 border-t-2 border-neutral-900" />}

      <div className={cn(t === 'minimal' || t === 'modern' ? 'mt-3' : 'mt-1')}>
        {f.summary && (
          <Section t={t} title="Profil">
            {summaryParagraphs(data).map((x, i) => <p key={i} className="mb-2 text-sm leading-relaxed text-neutral-700 last:mb-0">{x}</p>)}
          </Section>
        )}

        {f.skills && (
          <Section t={t} title="Compétences">
            {t === 'modern' || t === 'developer' ? (
              <dl className="space-y-3">
                {skillGroups(data).map((g) => (
                  <div key={g.category} className="sm:grid sm:grid-cols-[7.5rem_1fr] sm:gap-4">
                    <dt className={cn('text-xs font-semibold uppercase tracking-wide text-neutral-500', t === 'developer' && mono)}>{g.category}</dt>
                    <dd className="mt-1 sm:mt-0"><Chips t={t} items={g.items.map((i) => (i.level ? `${i.name} · ${i.level}` : i.name))} /></dd>
                  </div>
                ))}
              </dl>
            ) : (
              <dl className="space-y-1.5 text-sm">
                {skillGroups(data).map((g) => (
                  <div key={g.category} className="sm:flex sm:gap-3">
                    <dt className="shrink-0 font-semibold sm:w-28">{g.category}</dt>
                    <dd className="text-neutral-700">{g.items.map((i) => (i.level ? `${i.name} (${i.level})` : i.name)).join(', ')}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Section>
        )}

        {f.experiences && (
          <Section t={t} title="Expériences">
            {data.experiences.map((e) => (
              <Row key={e.id} title={e.role} meta={experiencePeriod(e)} sub={[e.organization, e.location].filter(Boolean).join(' · ')}>
                {e.description && <Para>{e.description}</Para>}
                {e.achievements.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700 marker:text-neutral-400">{e.achievements.map((a, i) => <li key={i}>{a}</li>)}</ul>}
                {e.technologies.length > 0 && <div className="mt-2"><Chips t={t} items={e.technologies} /></div>}
              </Row>
            ))}
          </Section>
        )}

        {f.projects && (
          <Section t={t} title="Projets">
            {data.projects.map((pr) => (
              <Row key={pr.id} title={pr.title} meta={pr.status} sub={pr.role ?? undefined}>
                {pr.summary && <Para>{pr.summary}</Para>}
                {pr.results && <Para>{pr.results}</Para>}
                {pr.technologies.length > 0 && <div className="mt-2"><Chips t={t} items={pr.technologies} /></div>}
                {(pr.demo_url || pr.github_url) && (
                  <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-neutral-600">
                    {pr.demo_url && <A href={pr.demo_url}>{prettyUrl(pr.demo_url)}</A>}
                    {pr.github_url && <A href={pr.github_url}>{prettyUrl(pr.github_url)}</A>}
                  </p>
                )}
              </Row>
            ))}
          </Section>
        )}

        {f.trainer && (
          <Section t={t} title="Activité de formateur">
            <ul className="space-y-1 text-sm text-neutral-700">
              {data.trainer_courses.map((c) => <li key={c.id}><span className="font-semibold text-neutral-900">{c.title}</span> <span className="text-neutral-500">· {c.category} · {levelLabel(c.level)}</span></li>)}
            </ul>
          </Section>
        )}

        {f.services && (
          <Section t={t} title="Services">
            <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700 marker:text-neutral-400">{data.services.map((s) => <li key={s.id}>{s.title}</li>)}</ul>
          </Section>
        )}

        {f.education && (
          <Section t={t} title="Formation">
            {data.education.map((e) => (
              <Row key={e.id} title={e.institution} meta={educationPeriod(e)} sub={[e.degree, e.field, e.location].filter(Boolean).join(' · ')}>
                {e.description && <Para>{e.description}</Para>}
              </Row>
            ))}
          </Section>
        )}

        {f.certifications && (
          <Section t={t} title="Certifications">
            {data.certifications.map((c) => (
              <Row key={c.id} title={c.url ? <A href={c.url}>{c.name}</A> : c.name} meta={monthYear(c.issued_on)} sub={[c.issuer, c.credential_id && `ID ${c.credential_id}`].filter(Boolean).join(' · ')}>
                {c.description && <Para>{c.description}</Para>}
              </Row>
            ))}
          </Section>
        )}

        {f.achievements && (
          <Section t={t} title="Réalisations">
            {data.achievements.map((a) => (
              <Row key={a.id} title={a.url ? <A href={a.url}>{a.title}</A> : a.title} meta={a.year ? String(a.year) : undefined} sub={a.event ?? undefined}>
                {a.result && <p className="mt-1 text-sm font-medium text-neutral-800">{a.result}</p>}
                {a.description && <Para>{a.description}</Para>}
              </Row>
            ))}
          </Section>
        )}

        {f.languages && (
          <Section t={t} title="Langues">
            <ul className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
              {data.languages.map((l) => <li key={l.id}><span className="font-semibold">{l.language}</span>{l.level && <span className="text-neutral-600"> — {l.level}</span>}</li>)}
            </ul>
          </Section>
        )}
      </div>
    </article>
  );
}
