import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Retour en haut de page"
      className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:text-neutral-950 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:text-white">
      <ArrowUp className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
