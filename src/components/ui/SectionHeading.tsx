import { type ReactNode } from 'react';
import { cn } from '@/utils';

export function SectionHeading({ eyebrow, title, description, align = 'left', className }: {
  eyebrow?: string; title: ReactNode; description?: ReactNode; align?: 'left' | 'center'; className?: string;
}) {
  return (
    <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && <p className="mb-3 font-mono text-xs font-medium uppercase tracking-[0.2em] text-primary-500">{eyebrow}</p>}
      <h2 className="text-balance text-3xl font-extrabold sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-pretty text-base leading-relaxed text-neutral-600 dark:text-neutral-400">{description}</p>}
    </div>
  );
}
