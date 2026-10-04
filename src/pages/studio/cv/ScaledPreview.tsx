import { useEffect, useRef, useState, type ReactNode } from 'react';

const PAPER = 794; // largeur A4 à 96 dpi

/** Affiche le CV à sa largeur « papier » réduite pour tenir dans la colonne (écrans larges). */
export function ScaledPreview({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [h, setH] = useState(0);

  useEffect(() => {
    const el = box.current;
    const inn = inner.current;
    if (!el || !inn) return;
    const measure = () => { setScale(Math.min(1, el.clientWidth / PAPER)); setH(inn.scrollHeight); };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el); ro.observe(inn);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={box} className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900" style={{ height: h ? h * scale : undefined }}>
      <div ref={inner} style={{ width: PAPER, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
    </div>
  );
}
