import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { LogoMark } from '@/components/ui/Logo';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useSignOut } from '@/lib/useSignOut';

const fullScreen = 'flex min-h-screen supports-[height:100dvh]:min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center';

/** Écran de chargement plein écran : sobre, jamais une page vide pendant la session / le profil. */
export function AuthLoadingScreen({ message = 'Préparation de votre espace…' }: { message?: string }) {
  return (
    <div role="status" aria-live="polite" className={fullScreen}>
      <LogoMark className="h-11 w-11" />
      <Spinner size="md" />
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
    </div>
  );
}

/**
 * Session valide mais profil introuvable (réseau, serveur) : on l'explique et on propose une action,
 * au lieu de rediriger sur `null` ou d'afficher une page vide.
 */
export function ProfileErrorScreen() {
  const { retryProfile } = useAuth();
  const signOut = useSignOut();
  const [busy, setBusy] = useState(false);

  const retry = async () => {
    setBusy(true);
    try { await retryProfile(); } finally { setBusy(false); }
  };

  return (
    <div role="alert" className={fullScreen}>
      <AlertTriangle className="h-10 w-10 text-warning-500" aria-hidden="true" />
      <h1 className="text-2xl font-extrabold">Impossible de charger votre espace</h1>
      <p className="max-w-md text-sm text-neutral-500 dark:text-neutral-400">
        Vous êtes bien connecté, mais votre profil n’a pas pu être récupéré. Vérifiez votre connexion puis réessayez.
      </p>
      <div className="mt-1 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => void retry()} disabled={busy} className="btn-primary px-6 py-3">{busy ? 'Nouvelle tentative…' : 'Réessayer'}</button>
        <button type="button" onClick={() => void signOut()} className="btn-outline px-6 py-3">Se déconnecter</button>
      </div>
      <Link to="/" className="text-sm text-neutral-500 underline underline-offset-4 hover:text-neutral-900 dark:hover:text-white">Retour à l’accueil</Link>
    </div>
  );
}
