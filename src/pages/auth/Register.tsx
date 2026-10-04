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

const schema = z.object({
  first_name: z.string().trim().min(1, 'Prénom requis').max(100),
  last_name: z.string().trim().min(1, 'Nom requis').max(100),
  email: z.string().trim().email('Email invalide').max(320),
  password: z.string().min(8, '8 caractères minimum').max(128),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Les mots de passe ne correspondent pas' });
type FormValues = z.infer<typeof schema>;

const err = (m?: string) => (m ? <p role="alert" className="mt-1 text-xs text-error-600 dark:text-error-400">{m}</p> : null);

export default function Register() {
  const { signUp, status, profile } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const redirect = readRedirect(location.search, location.state);
  const [serverError, setServerError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Déjà connecté, ou inscription avec session immédiate : on part vers l'espace dès que le profil est chargé.
  if (status === 'authenticated' && profile) return <Navigate to={postAuthTarget(profile, redirect)} replace />;
  if (status === 'profile-error') return <ProfileErrorScreen />;
  if (status === 'loading') return <AuthLoadingScreen />;

  const onSubmit = async (v: FormValues) => {
    setServerError(null);
    if (!isSupabaseConfigured) { setServerError('L’inscription n’est pas disponible pour le moment.'); return; }
    const { error, needsConfirmation, profile: p } = await signUp(v.email, v.password, `${v.first_name} ${v.last_name}`.trim());
    if (error) { setServerError(error); return; }
    if (needsConfirmation) { setInfo('Compte créé. Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.'); return; }
    const first = p?.full_name?.trim().split(' ')[0];
    toast('success', first ? `Compte créé. Bienvenue, ${first} !` : 'Compte créé. Bienvenue sur JOE DEV CODES.');
  };

  return (
    <AuthShell title="Créer un compte" subtitle="Gratuit. Suis tes formations et ta progression." footer={<>Déjà un compte ? <Link to={authUrl('/login', redirect)} className="font-semibold text-primary-600 dark:text-primary-300">Se connecter</Link></>}>
      {info ? (
        <div role="status" className="space-y-4"><p className="text-sm text-success-700 dark:text-success-300">{info}</p><Link to={authUrl('/login', redirect)} className="btn-primary w-full py-2.5">Aller à la connexion</Link></div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="first_name" className="label">Prénom</label><input id="first_name" autoComplete="given-name" className="input-field" aria-invalid={Boolean(errors.first_name)} {...register('first_name')} />{err(errors.first_name?.message)}</div>
            <div><label htmlFor="last_name" className="label">Nom</label><input id="last_name" autoComplete="family-name" className="input-field" aria-invalid={Boolean(errors.last_name)} {...register('last_name')} />{err(errors.last_name?.message)}</div>
          </div>
          <div><label htmlFor="email" className="label">Email</label><input id="email" type="email" autoComplete="email" className="input-field" aria-invalid={Boolean(errors.email)} {...register('email')} />{err(errors.email?.message)}</div>
          <div><label htmlFor="password" className="label">Mot de passe</label><input id="password" type="password" autoComplete="new-password" className="input-field" aria-invalid={Boolean(errors.password)} {...register('password')} />{err(errors.password?.message)}</div>
          <div><label htmlFor="confirm" className="label">Confirmer le mot de passe</label><input id="confirm" type="password" autoComplete="new-password" className="input-field" aria-invalid={Boolean(errors.confirm)} {...register('confirm')} />{err(errors.confirm?.message)}</div>
          {serverError && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{serverError}</p>}
          <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? 'Création…' : 'Créer mon compte'}</Button>
        </form>
      )}
    </AuthShell>
  );
}
