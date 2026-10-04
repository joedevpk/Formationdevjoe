import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLoadingScreen, ProfileErrorScreen } from '@/components/auth/AuthScreens';
import { authUrl } from '@/lib/redirect';
import { isSupabaseConfigured } from '@/services/supabase';

/**
 * Trois états, jamais de page vide :
 *  - chargement (session ou profil)  → écran « Chargement de votre espace… »
 *  - non connecté                    → /login?redirect=<page demandée>
 *  - connecté (profil chargé)        → la page (après contrôle du rôle)
 * Session valide mais profil indisponible → écran d'erreur avec « Réessayer ».
 */
export function ProtectedRoute({ children, staffOnly, adminOnly }: { children: ReactNode; staffOnly?: boolean; adminOnly?: boolean }) {
  const { status, isStaff, isAdmin, signedOutByUser } = useAuth();
  const location = useLocation();
  if (!isSupabaseConfigured) return <Navigate to="/login" replace />;
  if (status === 'loading') return <AuthLoadingScreen message="Chargement de votre espace…" />;
  if (status === 'unauthenticated') {
    // Déconnexion volontaire : retour à l'accueil. Session absente ou expirée : connexion, avec retour à la page demandée.
    return <Navigate to={signedOutByUser ? '/' : authUrl('/login', location.pathname + location.search)} replace />;
  }
  if (status === 'profile-error') return <ProfileErrorScreen />;
  if (adminOnly && !isAdmin) return <Navigate to={isStaff ? '/studio' : '/app'} replace />;
  if (staffOnly && !isStaff) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
