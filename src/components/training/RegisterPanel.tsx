import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authUrl } from '@/lib/redirect';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { rpc, type MyRegistration } from '@/lib/training/api';
import { displaySessionStatus, trainingError } from '@/lib/training/format';
import type { SessionWithSeats } from '@/lib/training/types';
import { RegistrationBadge } from '@/components/training/StatusBadges';
import { isSupabaseConfigured } from '@/services/supabase';

function splitName(full: string | null | undefined): [string, string] {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  return [parts[0] ?? '', parts.slice(1).join(' ')];
}

/** Bloc d'inscription à une session présentielle. L'inscription passe par une fonction serveur (capacité, doublons, e-mail du compte). */
export function RegisterPanel({ session, mine }: { session: SessionWithSeats; mine?: MyRegistration }) {
  const { profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const status = displaySessionStatus(session, session.taken);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fn0, ln0] = splitName(profile?.full_name);
  const [first, setFirst] = useState(fn0);
  const [last, setLast] = useState(ln0);
  const [phone, setPhone] = useState(profile?.phone ?? '');
  
  const active = mine && ['EN_ATTENTE', 'CONFIRMEE', 'PRESENT'].includes(mine.status);
  if (active) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
        <RegistrationBadge status={mine.status} long />
        <Link to={`/app/formations/inscriptions/${mine.id}`} className="font-semibold text-primary-600 underline dark:text-primary-300">Voir mon inscription</Link>
      </div>
    );
  }
  if (mine?.status === 'REFUSEE') return <p className="text-sm text-neutral-500">Ton inscription à cette session n’a pas été retenue.</p>;
  if (!status.canRegister) {
    const msg = status.key === 'complet' ? 'Cette session est complète.'
      : status.key === 'bientot' ? 'Les inscriptions ouvriront bientôt.'
      : status.key === 'en_cours' ? 'Cette session a démarré : les inscriptions sont closes.'
      : status.key === 'ferme' ? 'Les inscriptions à cette session sont fermées.'
      : status.key === 'terminee' ? 'Cette session est terminée.'
      : status.key === 'annulee' ? 'Cette session a été annulée.'
      : 'Les inscriptions ne sont pas ouvertes.';
    return <p className="text-sm text-neutral-500">{msg} {(status.key === 'en_cours' || status.key === 'ferme' || status.key === 'complet') && <Link to="/contact" className="font-semibold text-primary-600 underline dark:text-primary-300">Écris-nous pour la prochaine session</Link>}</p>;
  }

  if (!profile || !isSupabaseConfigured) {
    return (
      <div className="flex flex-wrap gap-3">
        <Link to={authUrl('/register', location.pathname)} className="btn-primary px-5 py-2.5">Créer un compte pour s’inscrire</Link>
        <Link to={authUrl('/login', location.pathname)} className="btn-outline px-5 py-2.5">Se connecter</Link>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!first.trim() || !last.trim()) { setErr('Renseigne ton prénom et ton nom.'); return; }
    setBusy(true);
    try {
      const id = await rpc<string>('register_for_training_session', { p_session_id: session.id, p_first_name: first.trim(), p_last_name: last.trim(), p_phone: phone.trim() || null });
      await Promise.all(['my-registrations', 'my-registration', 'training-sessions'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
      toast('success', 'Inscription enregistrée. Elle est en attente de confirmation.');
      navigate(`/app/formations/inscriptions/${id}`);
    } catch (e2) {
      setErr(trainingError(e2));
      void qc.invalidateQueries({ queryKey: ['training-sessions'] });
    } finally {
      setBusy(false);
    }
  };

  if (!open) return <Button onClick={() => setOpen(true)}>S’inscrire à cette session</Button>;
  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800" aria-label="Inscription à la session">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label htmlFor={`rf-${session.id}`} className="label">Prénom</label><input id={`rf-${session.id}`} className="input-field" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" required /></div>
        <div><label htmlFor={`rl-${session.id}`} className="label">Nom</label><input id={`rl-${session.id}`} className="input-field" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" required /></div>
        <div><label htmlFor={`rp-${session.id}`} className="label">Téléphone <span className="font-normal normal-case text-neutral-500">(facultatif)</span></label><input id={`rp-${session.id}`} type="tel" className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></div>
        <div><label htmlFor={`re-${session.id}`} className="label">Email du compte</label><input id={`re-${session.id}`} className="input-field opacity-70" value={profile.email} readOnly /></div>
      </div>
      <p className="text-xs text-neutral-500">Ton inscription sera examinée : tu verras son statut dans ton espace. Ton email et ton téléphone ne sont jamais affichés publiquement.</p>
      {err && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{err}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? 'Inscription…' : 'Confirmer mon inscription'}</Button><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button></div>
    </form>
  );
}
