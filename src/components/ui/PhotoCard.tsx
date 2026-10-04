import { type ReactNode } from 'react';
import { Photo } from '@/components/ui/Photo';
import type { PhotoId } from '@/data/photos';
import { cn } from '@/utils';

/** Photo en carte avec légende en bas (dégradé sombre garantissant la lisibilité). */
export function PhotoCard({ id, ratio = 'aspect-[4/5]', sizes, eyebrow, title, text, className, focus, focusMobile }: {
  id: PhotoId; ratio?: string; sizes: string; eyebrow?: string; title?: string; text?: ReactNode; className?: string; focus?: string; focusMobile?: string;
}) {
  return (
    <figure className={cn('group relative overflow-hidden rounded-3xl border border-neutral-200 dark:border-white/10', className)}>
      <Photo id={id} sizes={sizes} focus={focus} focusMobile={focusMobile} className={cn(ratio, 'w-full transition-transform duration-700 group-hover:scale-[1.03]')} />
      {(title || text) && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-neutral-950/90 via-neutral-950/40 to-transparent" />
          <figcaption className="absolute inset-x-0 bottom-0 p-5 text-white">
            {eyebrow && <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary-300">{eyebrow}</p>}
            {title && <p className="mt-1 text-lg font-bold leading-tight">{title}</p>}
            {text && <p className="mt-1 text-sm text-neutral-300">{text}</p>}
          </figcaption>
        </>
      )}
    </figure>
  );
}
