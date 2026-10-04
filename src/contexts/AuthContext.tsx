import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type { Profile } from '@/types';
import { friendlyAuthError } from '@/lib/authErrors';

/**
 * Séquence d'authentification (jamais de redirection sur un profil `null`) :
 *   loading → (session ?) → unauthenticated
 *                         → profil en chargement (loading) → authenticated | profile-error
 */
export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'profile-error';

interface AuthContextValue {
  /** Utilisateur Supabase Auth (session valide), même si son profil n'est pas encore chargé. */
  user: User | null;
  profile: Profile | null;
  status: AuthStatus;
  /** Vrai après un clic sur « Déconnexion » (jusqu'à la prochaine connexion) : la route protégée renvoie alors vers l'accueil, pas vers /login. */
  signedOutByUser: boolean;
  /** Vrai tant que la session ou le profil ne sont pas résolus. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; profile: Profile | null }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: string | null; needsConfirmation: boolean; profile: Profile | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  /** Relance le chargement du profil après un échec (écran « profil indisponible »). */
  retryProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'bio' | 'avatar_url'>>) => Promise<{ error: string | null }>;
  isAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_TIMEOUT_MS = 8000;
const PROFILE_TIMEOUT_MS = 6000;
const PROFILE_ATTEMPTS = 3;
const PROFILE_UNAVAILABLE = 'Connexion réussie, mais votre espace n’a pas pu être chargé. Réessayez dans un instant.';

/**
 * Vrai uniquement quand Supabase indique que la session/le refresh token est définitivement invalide
 * (token inconnu, déjà utilisé, session expirée ou supprimée côté serveur).
 * Une erreur réseau, un timeout ou un 5xx ne sont PAS des sessions invalides : on ne déconnecte pas.
 */
function isInvalidSessionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; status?: number; code?: string; message?: string };
  if (e.name === 'AuthRetryableFetchError') return false;
  if (typeof e.status === 'number' && (e.status === 0 || e.status >= 500)) return false;
  const code = (e.code ?? '').toLowerCase();
  if (['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found', 'session_expired', 'bad_jwt'].includes(code)) return true;
  const msg = (e.message ?? '').toLowerCase();
  return msg.includes('invalid refresh token') || msg.includes('refresh token not found') || msg.includes('refresh_token_not_found');
}

/** Purge la session locale invalide sans appel réseau (le refresh token est déjà rejeté côté serveur). */
async function clearStaleSession(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (e) {
    console.warn('Impossible de purger la session locale :', e);
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    Promise.resolve(p).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e: unknown) => { clearTimeout(t); reject(e instanceof Error ? e : new Error(String(e))); },
    );
  });
}

/**
 * Charge le profil avec quelques nouvelles tentatives (réseau instable, jeton qui vient d'être émis).
 * Renvoie null si le profil reste introuvable : l'appelant affiche alors un état d'erreur explicite,
 * il ne redirige jamais « à l'aveugle ».
 */
async function fetchProfile(userId: string): Promise<Profile | null> {
  for (let attempt = 0; attempt < PROFILE_ATTEMPTS; attempt++) {
    try {
      const { data, error } = await withTimeout(supabase.from('profiles').select('*').eq('id', userId).maybeSingle(), PROFILE_TIMEOUT_MS);
      if (error) throw error;
      if (data) return data as Profile;
    } catch (e) {
      console.warn(`Chargement du profil impossible (tentative ${attempt + 1}/${PROFILE_ATTEMPTS}) :`, e);
    }
    if (attempt < PROFILE_ATTEMPTS - 1) await sleep(300 * (attempt + 1));
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(isSupabaseConfigured);
  const [profileFailed, setProfileFailed] = useState(false);
  const [signedOutByUser, setSignedOutByUser] = useState(false);

  // Refs : valeurs lues dans des callbacks stables (pas de re-création de fonctions à chaque rendu).
  const profileRef = useRef<Profile | null>(null);
  const userRef = useRef<User | null>(null);
  const epoch = useRef(0); // incrémenté à chaque déconnexion : invalide les chargements en cours
  const inflight = useRef<{ id: string; promise: Promise<Profile | null> } | null>(null);

  const applyProfile = useCallback((p: Profile | null) => {
    profileRef.current = p;
    setProfile(p);
  }, []);

  const applyUser = useCallback((u: User | null) => {
    userRef.current = u;
    setUser(u);
    if (u) setSignedOutByUser(false);
  }, []);

  /** Réinitialise tout l'état local : aucune donnée utilisateur ne reste affichée. */
  const clearLocal = useCallback(() => {
    epoch.current += 1;
    inflight.current = null;
    applyUser(null);
    applyProfile(null);
    setProfileFailed(false);
  }, [applyProfile, applyUser]);

  /** Charge le profil de `u` (dédupliqué : un seul appel réseau même si plusieurs événements arrivent). */
  const loadProfile = useCallback((u: User): Promise<Profile | null> => {
    if (inflight.current?.id === u.id) return inflight.current.promise;
    const myEpoch = epoch.current;
    setProfileFailed(false);
    const promise: Promise<Profile | null> = fetchProfile(u.id)
      .then((p) => {
        if (epoch.current !== myEpoch) return null; // déconnecté pendant le chargement
        const kept = profileRef.current?.id === u.id ? profileRef.current : null;
        if (p) {
          applyProfile(p);
          return p;
        }
        // Échec : on garde le profil déjà connu s'il y en a un, sinon on passe en erreur explicite.
        if (!kept) { applyProfile(null); setProfileFailed(true); }
        return kept;
      })
      .finally(() => {
        if (inflight.current?.promise === promise) inflight.current = null;
      });
    inflight.current = { id: u.id, promise };
    return promise;
  }, [applyProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    // Filet de sécurité : l'initialisation ne doit JAMAIS bloquer le site (réseau qui ne répond pas).
    const safety = setTimeout(() => { if (active) setInitializing(false); }, SESSION_TIMEOUT_MS);

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) {
          // Ancienne session dont le refresh token est invalide : purge locale unique (stoppe les boucles de 400).
          if (isInvalidSessionError(error)) await clearStaleSession();
          else console.warn('Session indisponible (erreur temporaire) :', error.message);
        } else if (data.session?.user) {
          applyUser(data.session.user);
          void loadProfile(data.session.user); // en arrière-plan : status reste « loading » jusqu'au résultat
        }
      } catch (e) {
        console.error('Erreur d’initialisation de la session :', e);
      } finally {
        clearTimeout(safety);
        if (active) setInitializing(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Ne jamais appeler Supabase directement dans ce callback (risque de blocage) : on diffère.
      setTimeout(() => {
        if (!active) return;
        if (event === 'SIGNED_OUT') { clearLocal(); return; }
        const u = session?.user;
        if (!u) return;
        // Même utilisateur (ex. TOKEN_REFRESHED) : on garde la même référence → aucun re-render inutile.
        if (event === 'USER_UPDATED' || userRef.current?.id !== u.id) applyUser(u);
        if (event === 'USER_UPDATED' || profileRef.current?.id !== u.id) void loadProfile(u);
      }, 0);
    });

    return () => {
      active = false;
      clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
  }, [applyUser, clearLocal, loadProfile]);

  const refreshProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        if (isInvalidSessionError(error)) { await clearStaleSession(); clearLocal(); }
        return;
      }
      if (data.user) await loadProfile(data.user);
    } catch (e) {
      console.error('Erreur lors du rafraîchissement du profil :', e);
    }
  }, [clearLocal, loadProfile]);

  const retryProfile = useCallback(async () => {
    const u = userRef.current;
    if (u) await loadProfile(u);
  }, [loadProfile]);

  const signIn: AuthContextValue['signIn'] = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: friendlyAuthError(error, 'login'), profile: null };
      if (!data.user) return { error: friendlyAuthError(null, 'login'), profile: null };
      applyUser(data.user);
      // On attend le profil AVANT de rendre la main : la page de connexion ne redirige jamais sur `null`.
      const p = await loadProfile(data.user);
      return p ? { error: null, profile: p } : { error: PROFILE_UNAVAILABLE, profile: null };
    } catch (e) {
      return { error: friendlyAuthError(e, 'login'), profile: null };
    }
  }, [applyUser, loadProfile]);

  // Le rôle n'est jamais envoyé par le client : le trigger SQL crée le profil en LEARNER.
  const signUp: AuthContextValue['signUp'] = useCallback(async (email, password, fullName, phone) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, phone: phone || '' }, emailRedirectTo: window.location.origin + '/login' },
      });
      if (error) return { error: friendlyAuthError(error, 'signup'), needsConfirmation: false, profile: null };
      // Supabase renvoie un utilisateur sans identité quand l'email existe déjà (anti-énumération) : on le signale clairement.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return { error: 'Un compte existe déjà avec cet email. Connecte-toi.', needsConfirmation: false, profile: null };
      }
      // Connexion automatique : si une session existe, on charge le profil AVANT de rediriger vers /app.
      if (data.session?.user) {
        applyUser(data.session.user);
        const p = await loadProfile(data.session.user);
        return { error: null, needsConfirmation: false, profile: p };
      }
      return { error: null, needsConfirmation: true, profile: null };
    } catch (e) {
      return { error: friendlyAuthError(e, 'signup'), needsConfirmation: false, profile: null };
    }
  }, [applyUser, loadProfile]);

  const signOut = useCallback(async () => {
    setSignedOutByUser(true);
    clearLocal(); // d'abord l'état local : plus aucune donnée utilisateur affichée, même si le réseau est lent
    try {
      const { error } = await supabase.auth.signOut();
      if (error) await clearStaleSession(); // serveur injoignable ou session déjà invalide : on purge au moins localement
    } catch {
      await clearStaleSession();
    }
  }, [clearLocal]);

  const resetPassword: AuthContextValue['resetPassword'] = useCallback(async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login' });
      return { error: error ? friendlyAuthError(error, 'reset') : null };
    } catch (e) {
      return { error: friendlyAuthError(e, 'reset') };
    }
  }, []);

  const updateProfile: AuthContextValue['updateProfile'] = useCallback(async (updates) => {
    const current = profileRef.current;
    if (!current) return { error: 'Non connecté' };
    const { error } = await supabase.from('profiles').update(updates).eq('id', current.id);
    if (error) return { error: 'Enregistrement impossible pour le moment. Réessaie dans un instant.' };
    await refreshProfile();
    return { error: null };
  }, [refreshProfile]);

  const status: AuthStatus = initializing ? 'loading'
    : !user ? 'unauthenticated'
    : profile ? 'authenticated'
    : profileFailed ? 'profile-error'
    : 'loading';

  const role = profile?.role;
  const value = useMemo<AuthContextValue>(() => ({
    user, profile, status, signedOutByUser, loading: status === 'loading',
    signIn, signUp, signOut, resetPassword, refreshProfile, retryProfile, updateProfile,
    isAdmin: role === 'ADMIN',
    isStaff: role === 'ADMIN' || role === 'INSTRUCTOR',
  }), [user, profile, status, signedOutByUser, role, signIn, signUp, signOut, resetPassword, refreshProfile, retryProfile, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
