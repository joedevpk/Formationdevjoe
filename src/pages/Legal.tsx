import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { useIdentity } from '@/lib/queries';

function Doc({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <>
      <Seo title={title} description={description} />
      <PageHero eyebrow="Informations" title={title} />
      <div className="section-container max-w-3xl space-y-8 py-12 text-neutral-700 dark:text-neutral-300 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-neutral-950 dark:[&_h2]:text-white [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        {children}
      </div>
    </>
  );
}

function useContactEmail() {
  const { data: id } = useIdentity();
  return id?.email?.trim() || null;
}

export function MentionsLegales() {
  const email = useContactEmail();
  return (
    <Doc title="Mentions légales" description="Éditeur, hébergement et propriété intellectuelle du site JOE DEV CODES.">
      <section><h2>Éditeur du site</h2><p>JOE DEV CODES, site personnel édité par Joe Dev (développeur, formateur, étudiant, entrepreneur). {email ? <>Contact : <a className="underline" href={`mailto:${email}`}>{email}</a>.</> : <>Contact : via la <Link to="/contact" className="underline">page de contact</Link>.</>}</p></section>
      <section><h2>Hébergement</h2><p>Le site est un site statique hébergé sur Render. Les données (comptes, formations, messages) sont hébergées par Supabase.</p></section>
      <section><h2>Propriété intellectuelle</h2><p>Les textes, images et contenus pédagogiques de ce site sont la propriété de leur auteur, sauf mention contraire. Toute reproduction sans autorisation est interdite.</p></section>
      <section><h2>Responsabilité</h2><p>Les contenus sont fournis à titre informatif et pédagogique. Les formations « bientôt disponibles » sont des annonces et non des offres fermes.</p></section>
    </Doc>
  );
}

export function Confidentialite() {
  const email = useContactEmail();
  return (
    <Doc title="Confidentialité" description="Quelles données JOE DEV CODES collecte, pourquoi, et comment les supprimer.">
      <section><h2>Ce que nous collectons</h2>
        <ul>
          <li><strong>Compte :</strong> prénom, nom, email et mot de passe (stocké de façon chiffrée par Supabase Auth, jamais en clair).</li>
          <li><strong>Apprentissage :</strong> tes inscriptions, ta progression et tes certificats.</li>
          <li><strong>Message de contact :</strong> nom, email, sujet et message que tu envoies.</li>
          <li><strong>Liste d’attente :</strong> l’email que tu laisses pour être prévenu du lancement d’une formation.</li>
        </ul>
      </section>
      <section><h2>Pourquoi</h2><p>Uniquement pour faire fonctionner ton espace, répondre à tes messages et te prévenir quand une formation ouvre. Pas de publicité, pas de revente de données.</p></section>
      <section><h2>Cookies et stockage local</h2><p>Le site utilise le stockage local de ton navigateur pour garder ta session ouverte et mémoriser le thème clair/sombre. Aucun traceur publicitaire n’est utilisé.</p></section>
      <section><h2>Tes droits</h2><p>Tu peux demander l’accès, la correction ou la suppression de tes données {email ? <>en écrivant à <a className="underline" href={`mailto:${email}`}>{email}</a></> : <>via la <Link to="/contact" className="underline">page de contact</Link></>}.</p></section>
    </Doc>
  );
}
