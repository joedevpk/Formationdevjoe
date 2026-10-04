import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { LoadingState } from '@/components/ui/Spinner';
import { rpc } from '@/lib/training/api';
import { formatDay, trainingError } from '@/lib/training/format';

interface Result { first_name: string; last_name: string; date: string; session_id: string }

/** Ouverte par le staff après avoir scanné le QR d'un participant : le pointage est enregistré côté serveur (droits vérifiés). */
export default function CheckIn() {
  const { token } = useParams();
  const [state, setState] = useState<{ kind: 'busy' } | { kind: 'ok'; r: Result } | { kind: 'error'; msg: string }>({ kind: 'busy' });
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !token) return;
    done.current = true;
    rpc<Result>('training_check_in', { p_token: token })
      .then((r) => setState({ kind: 'ok', r }))
      .catch((e) => setState({ kind: 'error', msg: trainingError(e) }));
  }, [token]);
  return (
    <div className="mx-auto max-w-md space-y-6 py-10 text-center">
      <Seo title="Pointage" noindex />
      {state.kind === 'busy' ? <LoadingState message="Enregistrement de la présence…" /> : state.kind === 'ok' ? (
        <div className="card space-y-3 border-success-500/40 p-8" role="status"><CheckCircle2 className="mx-auto h-12 w-12 text-success-600" aria-hidden="true" /><h1 className="text-2xl font-extrabold">Présence enregistrée</h1><p className="text-lg font-semibold">{state.r.first_name} {state.r.last_name}</p><p className="text-sm text-neutral-500">{formatDay(state.r.date)}</p></div>
      ) : (
        <div className="card space-y-3 border-error-500/40 p-8" role="alert"><XCircle className="mx-auto h-12 w-12 text-error-500" aria-hidden="true" /><h1 className="text-2xl font-extrabold">Pointage impossible</h1><p className="text-sm text-neutral-600 dark:text-neutral-400">{state.msg}</p></div>
      )}
      <Link to="/studio/presences" className="btn-outline px-5 py-2.5">Retour aux présences</Link>
    </div>
  );
}
