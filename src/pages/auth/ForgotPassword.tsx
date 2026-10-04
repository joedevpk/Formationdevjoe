import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthShell } from '@/pages/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured } from '@/services/supabase';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) { setMsg({ ok: false, text: 'Authentification non configurée.' }); return; }
    setBusy(true);
    const { error } = await resetPassword(email.trim());
    setBusy(false);
    setMsg(error ? { ok: false, text: "Envoi impossible pour le moment. Réessaie dans un instant." } : { ok: true, text: 'Si un compte existe pour cet email, un lien de réinitialisation vient d’être envoyé.' });
  };

  return (
    <AuthShell title="Mot de passe oublié" subtitle="Reçois un lien pour en choisir un nouveau." footer={<Link to="/login" className="font-semibold text-primary-600 dark:text-primary-300">← Retour à la connexion</Link>}>
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <div><label htmlFor="email" className="label">Email</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" /></div>
        {msg && <p role="status" className={msg.ok ? 'text-sm text-success-600 dark:text-success-400' : 'text-sm text-error-500'}>{msg.text}</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Envoi…' : 'Envoyer le lien'}</Button>
      </form>
    </AuthShell>
  );
}
