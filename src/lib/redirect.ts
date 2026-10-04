import type { Profile } from '@/types';

/** Pages d'authentification : jamais une destination valide après connexion (évite les boucles). */
const AUTH_PATHS = ['/login', '/register', '/mot-de-passe-oublie'];

/** Destination « neutre » : n'exprime pas de page précise, le rôle décide (Studio pour le staff). */
const DEFAULT_APP = '/app';

export const isStaffRole = (role?: Profile['role'] | null): boolean => role === 'ADMIN' || role === 'INSTRUCTOR';

/** Page d'atterrissage par défaut selon le rôle : /studio (ADMIN, INSTRUCTOR) ou /app (apprenant). */
export const homeFor = (profile: Pick<Profile, 'role'>): string => (isStaffRole(profile.role) ? '/studio' : DEFAULT_APP);

/**
 * Valide un paramètre `redirect`. Seuls les chemins internes sont acceptés :
 * pas d'URL absolue, pas de `//hote` (protocole relatif), pas d'antislash, pas de retour vers /login.
 * Renvoie null si la valeur est absente ou dangereuse.
 */
export function safeRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(v)) return null;
  const path = (v.split(/[?#]/)[0] ?? '').replace(/\/+$/, '') || '/';
  if (AUTH_PATHS.includes(path)) return null;
  return v;
}

/** Construit `/login?redirect=/app/formations` (le « / » reste lisible : valide dans une query string). */
export function authUrl(base: '/login' | '/register', from?: string | null): string {
  const target = safeRedirect(from);
  if (!target) return base;
  return `${base}?redirect=${encodeURIComponent(target).replace(/%2F/gi, '/')}`;
}

/**
 * Où envoyer l'utilisateur une fois authentifié et son profil chargé.
 * - page précise demandée (ex. /app/formations) → on y retourne ;
 * - aucune page, ou simple « /app » → page d'accueil du rôle (/studio pour le staff).
 */
export function postAuthTarget(profile: Pick<Profile, 'role'>, redirect: string | null): string {
  if (!redirect || redirect === DEFAULT_APP) return homeFor(profile);
  return redirect;
}

/** Lit `?redirect=` ; accepte l'ancien format `state.from` pour ne casser aucun lien existant. */
export function readRedirect(search: string, state: unknown): string | null {
  const fromQuery = safeRedirect(new URLSearchParams(search).get('redirect'));
  if (fromQuery) return fromQuery;
  const legacy = (state as { from?: unknown } | null)?.from;
  return typeof legacy === 'string' ? safeRedirect(legacy) : null;
}
