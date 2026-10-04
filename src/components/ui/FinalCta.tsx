import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { homeFor } from '@/lib/redirect';

/** Appel à l'action de fin de page : deux actions claires, adaptées à l'état de connexion. */
export function FinalCta() {
  const { profile } = useAuth();
  return (
    <section className="section-container py-16 sm:py-20" aria-labelledby="final-cta">
      <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-8 text-center dark:border-neutral-800 dark:bg-neutral-900/40 sm:p-12">
        <h2 id="final-cta" className="text-balance text-2xl font-extrabold sm:text-3xl">Une idée à transformer en projet ?</h2>
        <p className="mx-auto mt-3 max-w-xl text-neutral-600 dark:text-neutral-400">
          {profile ? 'Retrouve ta progression dans ton espace, ou écris-moi pour en parler.' : 'Crée ton compte pour suivre ta progression, ou écris-moi pour en parler.'}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {profile
            ? <Link to={homeFor(profile)} className="btn-primary px-6 py-3">Mon espace</Link>
            : <Link to="/register" className="btn-primary px-6 py-3">Commencer</Link>}
          <Link to="/contact" className="btn-outline px-6 py-3">Me contacter</Link>
        </div>
      </div>
    </section>
  );
}
