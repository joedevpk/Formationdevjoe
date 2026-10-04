import { useRef, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionStyle } from 'framer-motion';
import { photos, type PhotoId } from '@/data/photos';
import { cn } from '@/utils';

interface PhotoProps {
  id: PhotoId;
  /** Attribut sizes (largeur d'affichage réelle) : le navigateur choisit la bonne version 480/800/1080. */
  sizes: string;
  className?: string;
  /** Image au-dessus de la ligne de flottaison (hero) : chargée en priorité, sinon lazy-loading. */
  priority?: boolean;
  /** Surcharge du point focal (object-position CSS), desktop. */
  focus?: string;
  focusMobile?: string;
  /** Parallax très léger (désactivé si l'utilisateur préfère réduire les animations). */
  parallax?: boolean;
  alt?: string;
  decorative?: boolean;
}

/**
 * Photo officielle JOE DEV CODES : jamais déformée (object-fit: cover), point focal adapté à chaque photo
 * (mobile / desktop), srcset multi-résolutions, aperçu flou (LQIP) puis fondu, lazy-loading par défaut.
 * Le conteneur DOIT recevoir sa hauteur/ratio via className (ex. « aspect-[4/5] » ou « h-full »).
 */
export function Photo({ id, sizes, className, priority, focus, focusMobile, parallax, alt, decorative }: PhotoProps) {
  const p = photos[id];
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-5%', '5%']);
  const animate = Boolean(parallax) && !reduce;

  const srcSet = p.widths.map((w) => `${p.src}-${w}.webp ${w}w`).join(', ');
  const largest = p.widths[p.widths.length - 1];
  const style = { '--op-m': focusMobile ?? p.focusMobile, '--op-d': focus ?? p.focus } as CSSProperties;
  const imgCls = cn(
    'absolute inset-0 h-full w-full object-cover [object-position:var(--op-m)] md:[object-position:var(--op-d)] transition-opacity duration-700',
    loaded ? 'opacity-100' : 'opacity-0',
  );
  // `fetchpriority` en minuscule : accepté par React 18 sans avertissement (l'attribut camelCase n'existe qu'en React 19).
  const priorityAttrs = priority ? { fetchpriority: 'high' } : {};
  const common = {
    src: `${p.src}-${largest}.webp`, srcSet, sizes, width: p.width, height: p.height,
    alt: decorative ? '' : alt ?? p.alt, 'aria-hidden': decorative ? true : undefined,
    loading: priority ? ('eager' as const) : ('lazy' as const), decoding: 'async' as const,
    // image déjà en cache avant l'hydratation : onLoad ne se déclenche pas, on vérifie `complete`
    ref: (el: HTMLImageElement | null) => { if (el?.complete && el.naturalWidth > 0) setLoaded(true); },
    onLoad: () => setLoaded(true), className: imgCls, style, ...priorityAttrs,
  };

  return (
    <div ref={ref} className={cn('relative overflow-hidden bg-neutral-900', className)} style={{ backgroundImage: `url(${p.lqip})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {animate ? <motion.img {...common} style={{ ...style, y, scale: 1.12 } as MotionStyle} /> : <img {...common} />}
    </div>
  );
}
