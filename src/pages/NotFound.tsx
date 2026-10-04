import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <section className="section-container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <Seo title="Page introuvable" description="Cette page n’existe pas." noindex />
      <p className="font-mono text-sm text-primary-600 dark:text-primary-300">404</p>
      <h1 className="mt-2 text-balance text-3xl font-extrabold sm:text-4xl">Cette page n’existe pas.</h1>
      <p className="mt-3 max-w-md text-neutral-500">Le lien est peut-être erroné ou la page a été déplacée.</p>
      <div className="mt-8 flex w-full max-w-sm flex-col justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row">
        <Button to="/" size="lg">Retour à l’accueil</Button>
        <Button to="/formations" variant="outline" size="lg">Voir les formations</Button>
      </div>
    </section>
  );
}
