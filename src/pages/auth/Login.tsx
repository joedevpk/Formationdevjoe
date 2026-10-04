import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthShell } from '@/pages/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { AuthLoadingScreen, ProfileErrorScreen } from '@/components/auth/AuthScreens';
import { useAuth } from '@/contexts/AuthContext';
import { authUrl, postAuthTarget, readRedirect } from '@/lib/redirect';
import { isSupabaseConfigured } from '@/services/supabase';

const schema = z.object({ email: z.string().trim().email('Email invalide'), password: z.string().min(1, 'Mot de passe requis') });
type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { signIn, status, profile } = useAuth();
  const location = useLocation();
  const toast = useToast();
  // Page demandée avant la connexion : ?redirect=/app/formations (ancien format state.from toujours accepté)
  const redirect = readRedirect(location.search, location.state);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Séquence : session → profil chargé → rôle → redirection. Jamais de redirection sur un profil `null`.
  if (status === 'authenticated' && profile) return <Navigate to={postAuthTarget(profile, redirect)} replace />;
  if (status === 'profile-error') return <ProfileErrorScreen />;
  if (status === 'loading') return <AuthLoadingScreen />;

  const onSubmit = async (v: FormValues) => {
    setServerError(null);
    if (!isSupabaseConfigured) { setServerError('La connexion n’est pas disponible pour le moment.'); return; }
    const { error, profile: p } = await signIn(v.email, v.password);
    if (error) { setServerError(error); return; }
    // La redirection est déclenchée par le rendu ci-dessus dès que le profil est en place.
    const first = p?.full_name?.trim().split(' ')[0];
    toast('success', first ? `Bienvenue, ${first}` : 'Bienvenue');
  };

  return (
    <AuthShell title="Connexion" subtitle={redirect ? 'Connecte-toi pour accéder à cette page.' : 'Retrouve tes formations et ta progression.'} footer={<>Pas encore de compte ? <Link to={authUrl('/register', redirect)} className="font-semibold text-primary-600 dark:text-primary-300">Créer un compte</Link></>}>
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
        <div><label htmlFor="email" className="label">Email</label><input id="email" type="email" autoComplete="email" className="input-field" aria-invalid={Boolean(errors.email)} {...register('email')} />{errors.email && <p role="alert" className="mt-1 text-xs text-error-600 dark:text-error-400">{errors.email.message}</p>}</div>
        <div><label htmlFor="password" className="label">Mot de passe</label><input id="password" type="password" autoComplete="current-password" className="input-field" aria-invalid={Boolean(errors.password)} {...register('password')} />{errors.password && <p role="alert" className="mt-1 text-xs text-error-600 dark:text-error-400">{errors.password.message}</p>}</div>
        {serverError && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{serverError}</p>}
        <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? 'Connexion…' : 'Se connecter'}</Button>
        <p className="text-center text-sm"><Link to="/mot-de-passe-oublie" className="text-neutral-500 hover:text-primary-600 dark:hover:text-primary-300">Mot de passe oublié ?</Link></p>
      </form>
    </AuthShell>
  );
}
