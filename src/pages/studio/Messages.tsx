import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Seo } from '@/components/ui/Seo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { QueryState } from '@/components/ui/QueryState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { formatDateTime } from '@/utils';
import type { ContactMessage } from '@/types';

export default function Messages() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState<ContactMessage | null>(null);
  const [del, setDel] = useState<ContactMessage | null>(null);
  const query = useQuery({
    queryKey: ['studio', 'contact_messages'],
    queryFn: async (): Promise<ContactMessage[]> => {
      const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ContactMessage[];
    },
    enabled: isAdmin,
  });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['studio', 'contact_messages'] }); void qc.invalidateQueries({ queryKey: ['studio-counts'] }); };
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ContactMessage['status'] }) => { const { error } = await supabase.from('contact_messages').update({ status }).eq('id', id); if (error) throw new Error(error.message); },
    onSuccess: refresh, onError: (e: Error) => toast('error', e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('contact_messages').delete().eq('id', id); if (error) throw new Error(error.message); },
    onSuccess: () => { refresh(); setDel(null); toast('success', 'Message supprimé.'); }, onError: (e: Error) => toast('error', e.message),
  });

  if (!isAdmin) return <div className="card p-8 text-center text-sm text-neutral-500">Les messages de contact sont réservés aux administrateurs.</div>;
  return (
    <div className="space-y-6">
      <Seo title="Studio — Messages" />
      <h1 className="text-3xl font-extrabold">Messages</h1>
      <QueryState query={query} isEmpty={(d) => d.length === 0} emptyTitle="Aucun message" emptyText="Les demandes du formulaire de contact arrivent ici.">
        {(list) => <div className="space-y-2">{list.map((m) => (
          <div key={m.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{m.name}</span><Badge variant={m.status === 'NOUVEAU' ? 'warning' : m.status === 'TRAITE' ? 'success' : 'neutral'}>{m.status}</Badge><Badge variant="neutral">{m.request_type}</Badge></div>
              <p className="mt-1 truncate text-sm text-neutral-500">{m.message}</p><p className="text-xs text-neutral-400">{formatDateTime(m.created_at)}</p></div>
            <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => { setOpen(m); if (m.status === 'NOUVEAU') setStatus.mutate({ id: m.id, status: 'LU' }); }}>Ouvrir</Button><Button size="sm" variant="ghost" onClick={() => setDel(m)}>Supprimer</Button></div>
          </div>))}</div>}
      </QueryState>
      <Modal open={open !== null} onClose={() => setOpen(null)} title={open ? `${open.name} — ${open.request_type}` : ''}>
        {open && <div className="space-y-3 text-sm"><p><strong>Email :</strong> <a className="text-primary-500" href={`mailto:${open.email}`}>{open.email}</a></p>{open.phone && <p><strong>Téléphone :</strong> {open.phone}</p>}<p className="whitespace-pre-wrap rounded-xl bg-neutral-100 p-4 dark:bg-neutral-900">{open.message}</p>
          <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => { setStatus.mutate({ id: open.id, status: 'TRAITE' }); setOpen(null); }}>Marquer comme traité</Button></div></div>}
      </Modal>
      <ConfirmDialog open={del !== null} title="Supprimer le message" message="Ce message sera définitivement supprimé." busy={remove.isPending} onCancel={() => setDel(null)} onConfirm={() => del && remove.mutate(del.id)} />
    </div>
  );
}
