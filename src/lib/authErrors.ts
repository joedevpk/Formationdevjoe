/**
 * Traduit une erreur Supabase Auth en message lisible. Les messages techniques
 * (AuthApiError, codes, stack) ne sont JAMAIS montrés à l'utilisateur.
 */
export function friendlyAuthError(err: unknown, context: 'login' | 'signup' | 'reset' = 'login'): string {
  const e = (err ?? {}) as { message?: string; code?: string; status?: number; name?: string };
  const code = (e.code ?? '').toLowerCase();
  const msg = (e.message ?? '').toLowerCase();

  if (e.name === 'AuthRetryableFetchError' || e.status === 0 || msg.includes('failed to fetch') || msg.includes('network')) {
    return 'Impossible de contacter le serveur. Vérifiez votre connexion puis réessayez.';
  }
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) return 'Ton adresse email n’est pas encore confirmée. Vérifie ta boîte mail.';
  if (code === 'user_already_exists' || msg.includes('already registered') || msg.includes('already been registered')) return 'Un compte existe déjà avec cet email. Connecte-toi.';
  if (code === 'weak_password' || msg.includes('password should be') || msg.includes('weak password')) return 'Mot de passe trop faible : utilise au moins 8 caractères.';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || e.status === 429 || msg.includes('rate limit')) return 'Trop de tentatives. Réessaie dans quelques minutes.';
  if (code === 'signup_disabled') return 'Les inscriptions sont momentanément fermées.';
  if (code === 'validation_failed' || msg.includes('invalid email') || msg.includes('unable to validate email')) return 'Adresse email invalide.';
  if (e.status && e.status >= 500) return 'Le service est momentanément indisponible. Réessaie dans un instant.';
  return context === 'signup' ? 'Création du compte impossible pour le moment. Réessaie dans un instant.'
    : context === 'reset' ? 'Envoi impossible pour le moment. Réessaie dans un instant.'
    : 'Connexion impossible pour le moment. Réessaie dans un instant.';
}
