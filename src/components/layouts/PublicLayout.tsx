import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';
import { ScrollProgress } from '@/components/ui/ScrollProgress';
import { BackToTop } from '@/components/ui/BackToTop';
import { FinalCta } from '@/components/ui/FinalCta';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const withFinalCta = ['/', '/a-propos', '/formations', '/parcours', '/projets'];

export function PublicLayout() {
  const { pathname } = useLocation();
  // Bloc { } obligatoire : useEffect ne doit retourner que undefined ou une fonction de nettoyage,
  // jamais le résultat d'un appel (ni une Promise).
  useEffect(() => {
    try {
      window.scrollTo({ top: 0 });
    } catch {
      /* environnement sans scroll (tests, SSR) : on ignore */
    }
  }, [pathname]);
  return (
    <div className="flex min-h-screen supports-[height:100dvh]:min-h-dvh flex-col">
      <ScrollProgress />
      <a href="#contenu" className="sr-only z-[100] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-950 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Aller au contenu</a>
      <Navbar />
      <main id="contenu" className="flex-1" tabIndex={-1}>
        {/* Boundary par page : une erreur dans une page garde la navbar et le footer, et se réinitialise au changement de route */}
        <ErrorBoundary key={pathname} variant="inline"><Outlet /></ErrorBoundary>
      </main>
      {withFinalCta.includes(pathname) && <FinalCta />}
      <Footer />
      <BackToTop />
    </div>
  );
}
