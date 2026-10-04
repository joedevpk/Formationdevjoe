import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { useIdentity } from '@/lib/queries';
import { useCvPublished } from '@/lib/cv/queries';
import { safeUrl } from '@/utils';

// Uniquement des routes qui existent dans App.tsx : aucun lien factice ni doublon.
const explore = [['/', 'Accueil'], ['/formations', 'Formations'], ['/projets', 'Projets'], ['/ressources', 'Ressources'], ['/a-propos', 'À propos']] as const;
const discover = [['/vibe-coding', 'Vibe Coding'], ['/parcours', 'Parcours'], ['/workshops', 'Workshops'], ['/services', 'Services'], ['/contact', 'Contact']] as const;

const socials = [
  { key: 'github', label: 'GitHub' }, { key: 'linkedin', label: 'LinkedIn' }, { key: 'youtube', label: 'YouTube' },
  { key: 'facebook', label: 'Facebook' }, { key: 'instagram', label: 'Instagram' }, { key: 'tiktok', label: 'TikTok' },
] as const;

const colTitle = 'mb-4 font-mono text-xs font-medium uppercase tracking-[0.2em] text-neutral-500';
const linkCls = 'text-neutral-700 transition hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300';

export function Footer() {
  const { data: id } = useIdentity();
  const cvPublished = useCvPublished().data === true;
  // Réseau ou email non renseigné = masqué, jamais de lien factice
  const visible = socials
    .map((s) => ({ ...s, url: safeUrl(id?.[s.key]) }))
    .filter((s): s is typeof s & { url: string } => Boolean(s.url));
  const email = id?.email?.trim();

  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-900">
      <div className="section-container py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo />
            <p className="mt-4 text-sm font-semibold">Développeur • Formateur • Étudiant • Entrepreneur</p>
          </div>

          <nav aria-label="Navigation">
            <h2 className={colTitle}>Navigation</h2>
            <ul className="space-y-2.5 text-sm">
              {explore.map(([to, label]) => <li key={to}><Link to={to} className={linkCls}>{label}</Link></li>)}
              {cvPublished && <li><Link to="/cv" className={linkCls}>CV</Link></li>}
            </ul>
          </nav>

          <nav aria-label="Découvrir">
            <h2 className={colTitle}>Découvrir</h2>
            <ul className="space-y-2.5 text-sm">
              {discover.map(([to, label]) => <li key={to}><Link to={to} className={linkCls}>{label}</Link></li>)}
            </ul>
          </nav>

          <div>
            <h2 className={colTitle}>Contact</h2>
            <ul className="space-y-2.5 text-sm">
              <li>{email ? <a href={`mailto:${email}`} className={`${linkCls} break-all`}>{email}</a> : <Link to="/contact" className={linkCls}>Écrire un message</Link>}</li>
              {visible.map((s) => (
                <li key={s.key}><a href={s.url} target="_blank" rel="noopener noreferrer" className={linkCls}>{s.label}<span className="sr-only"> (nouvel onglet)</span></a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-neutral-200 pt-6 text-xs text-neutral-500 dark:border-neutral-900 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Joe Dev Codes</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li><Link to="/mentions-legales" className="hover:text-neutral-900 dark:hover:text-white">Mentions légales</Link></li>
            <li><Link to="/confidentialite" className="hover:text-neutral-900 dark:hover:text-white">Confidentialité</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
