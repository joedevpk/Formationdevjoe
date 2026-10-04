import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { QueryState } from '@/components/ui/QueryState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { DownloadCertificateButton } from '@/components/training/CertificateSheet';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { rpc } from '@/lib/training/api';
import { formatPeriod, trainingError } from '@/lib/training/format';
import type { Certificate } from '@/types';
import { formatDate } from '@/utils';
import { useRefreshTraining, useStudioCertificates } from './hooks';
import { ManualCertificateModal } from './ManualCertificateModal';

/** Tous les certificats : révocation / rétablissement (ADMIN), PDF, et nombre de vérifications publiques. */
export default function CertificatesAdmin() {
  const toast = useToast();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';
  const [creating, setCreating] = useState(false);
  const refresh = useRefreshTraining();
  const q = useStudioCertificates();
  const checks = useQuery({
    queryKey: ['studio-training', 'verifications'],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase.from('certificate_verifications').select('certificate_id');
      if (error) throw new Error(error.message);
      const out: Record<string, number> = {};
      for (const r of (data ?? []) as { certificate_id: string }[]) out[r.certificate_id] = (out[r.certificate_id] ?? 0) + 1;
      return out;
    },
  });
  const [target, setTarget] = useState<Certificate | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const revoke = async () => {
    if (!target) return;
    setBusy(true);
    try { await rpc('revoke_certificate', { p_certificate_id: target.id, p_reason: reason.trim() || null }); await refresh(); toast('success', 'Certificat révoqué.'); setTarget(null); setReason(''); }
    catch (e) { toast('error', trainingError(e)); }
    finally { setBusy(false); }
  };
  const restore = async (c: Certificate) => {
    try { await rpc('restore_certificate', { p_certificate_id: c.id }); await refresh(); toast('success', 'Certificat rétabli.'); }
    catch (e) { toast('error', trainingError(e)); }
  };

  return (
    <div className="space-y-6">
      <Seo title="Studio — Certificats" noindex />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-3xl font-extrabold">Certificats</h1><p className="mt-1 text-sm text-neutral-500">Certificats de formation délivrés par JOE DEV CODES, générés automatiquement à la fin d’une session ou créés manuellement par l’administrateur. Un certificat révoqué reste vérifiable mais apparaît comme « CERTIFICAT RÉVOQUÉ ».</p></div>
        {isAdmin && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden="true" />Créer un certificat</Button>}
      </div>
      <QueryState query={q} isEmpty={(d) => d.length === 0} emptyTitle="Aucun certificat" emptyText="Les certificats sont générés à la fin d’une formation pour les participants éligibles. Tu peux aussi en créer un manuellement avec « Créer un certificat ».">
        {(list) => (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <caption className="sr-only">Certificats délivrés</caption>
              <thead><tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800"><th scope="col" className="px-3 py-3">Numéro</th><th scope="col" className="px-3 py-3">Participant</th><th scope="col" className="px-3 py-3">Formation</th><th scope="col" className="px-3 py-3">Délivré</th><th scope="col" className="px-3 py-3">Vérif.</th><th scope="col" className="px-3 py-3">Statut</th><th scope="col" className="px-3 py-3">Actions</th></tr></thead>
              <tbody>{list.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 align-top last:border-0 dark:border-neutral-900">
                  <td className="px-3 py-3 font-mono text-xs">{c.certificate_number}{c.issue_mode === 'MANUEL' && <span className="mt-1 block"><Badge variant="neutral">Manuel</Badge></span>}</td>
                  <td className="px-3 py-3 font-semibold">{c.holder_name ?? '—'}</td>
                  <td className="px-3 py-3 text-xs">{c.course_title}<br /><span className="text-neutral-500">{formatPeriod(c.period_start, c.period_end)}</span></td>
                  <td className="px-3 py-3 text-xs">{formatDate(c.issued_at)}</td>
                  <td className="px-3 py-3 text-xs">{checks.data?.[c.id] ?? 0}</td>
                  <td className="px-3 py-3"><Badge variant={c.status === 'VALIDE' ? 'success' : 'error'}>{c.status === 'VALIDE' ? 'Valide' : 'Révoqué'}</Badge>{c.revoked_reason && <p className="mt-1 text-xs text-neutral-500">{c.revoked_reason}</p>}</td>
                  <td className="px-3 py-3"><div className="flex flex-wrap items-center gap-2"><DownloadCertificateButton certificate={c} label="PDF" className="btn-outline px-3 py-1.5 text-xs" />{c.status === 'VALIDE' ? <Button size="sm" variant="ghost" onClick={() => { setTarget(c); setReason(''); }}>Révoquer</Button> : <Button size="sm" variant="ghost" onClick={() => void restore(c)}>Rétablir</Button>}</div></td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </QueryState>
      <ManualCertificateModal open={creating} onClose={() => setCreating(false)} />
      <Modal open={Boolean(target)} onClose={() => setTarget(null)} title="Révoquer le certificat">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Le certificat {target?.certificate_number} de {target?.holder_name} sera marqué « CERTIFICAT RÉVOQUÉ » sur la page de vérification publique.</p>
        <div className="mt-4"><label htmlFor="rv-reason" className="label">Motif (interne)</label><textarea id="rv-reason" rows={3} className="input-field" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} /></div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setTarget(null)}>Annuler</Button><Button variant="danger" disabled={busy} onClick={() => void revoke()}>{busy ? '…' : 'Révoquer'}</Button></div>
      </Modal>
    </div>
  );
}
