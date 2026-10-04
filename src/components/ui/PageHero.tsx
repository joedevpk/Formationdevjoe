import { type ReactNode } from 'react';

export function PageHero({ eyebrow, title, description, children }: { eyebrow?: string; title: ReactNode; description?: ReactNode; children?: ReactNode }) {
  return (
    <section className="border-b border-neutral-200 dark:border-neutral-900">
      <div className="section-container py-12 sm:py-16 lg:py-20">
        {eyebrow && <p className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">{eyebrow}</p>}
        <h1 className="max-w-4xl text-balance text-3xl font-extrabold sm:text-4xl lg:text-5xl">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-lg">{description}</p>}
        {children && <div className="mt-7">{children}</div>}
      </div>
    </section>
  );
}
