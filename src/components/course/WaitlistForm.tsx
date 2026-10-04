import { useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { joinWaitlist } from '@/lib/waitlist';
import { useAuth } from '@/contexts/AuthContext';

/** Bloc « Cette formation arrive bientôt » : email uniquement, aucun faux bouton d'inscription au cours. */
export function WaitlistForm({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const { profile } = useAuth();
  const [email, setEmail] = useState(profile?.email ?? '');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setState('busy');
    const r = await joinWaitlist(courseId, email);
    if (r === 'ok') setState('done');
    else {
      setState('idle');
      setErr(r === 'invalid' ? 'Saisis une adresse email valide.' : 'Inscription impossible pour le moment. Réessaie dans un instant.');
    }
  };

  if (state === 'done') {
    return (
      <div role="status" className="card flex items-start gap-3 border-success-500/40 bg-success-500/5 p-5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-500" aria-hidden="true" />
        <p className="text-sm">Adresse enregistrée. Ce n’est pas encore une inscription à une session : nous te préviendrons dès qu’une session ouvrira ses inscriptions.</p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="card space-y-3 p-5" noValidate aria-label={`Être informé du lancement de ${courseTitle}`}>
      <div>
        <p className="font-semibold">Cette formation arrive bientôt.</p>
        <p className="mt-1 text-sm text-neutral-500">Laisse ton email, je te préviens dès qu’elle est ouverte. Pas de newsletter.</p>
      </div>
      <div>
        <label htmlFor="waitlist-email" className="label">Email</label>
        <input id="waitlist-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
      </div>
      {err && <p role="alert" className="text-xs text-error-500">{err}</p>}
      <button type="submit" disabled={state === 'busy'} className="btn-secondary w-full px-5 py-2.5">{state === 'busy' ? 'Envoi…' : 'Me prévenir'}</button>
    </form>
  );
}
