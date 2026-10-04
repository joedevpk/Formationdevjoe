import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Déconnexion complète : retour à l'accueil, session Supabase fermée, état local vidé,
 * cache de données (inscriptions, progression, notifications…) réinitialisé.
 * La navigation part AVANT la purge de l'état : pas de passage intermédiaire par /login?redirect=…
 */
export function useSignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useCallback(async () => {
    navigate('/', { replace: true });
    await signOut();
    await queryClient.resetQueries();
  }, [navigate, signOut, queryClient]);
}
