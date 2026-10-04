import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { QueryState } from '@/components/ui/QueryState';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/services/supabase';

interface Row { id: string; title: string; status: string; coming_soon: boolean; pending: number; notified: number }

/** Liste d'attente par formation + envoi des emails via l'Edge Function (jamais depuis le navigateur vers un fournisseur). */
export default function NotificationsAdmin() {
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['studio-waitlist'],
    queryFn: async (): Promise<Row[]> => {
      const [c, w] = await Promise.all([
        supabase.from('courses').select('id,title,status,coming_soon').order('position'),
        supabase.from('course_waitlist').select('course_id,notified_at'),
      ]);
      if (c.error) throw c.error;
      if (w.error) throw w.error;
      const waits = (w.data ?? []) as { course_id: string; notified_at: string | null }[];
      return ((c.data ?? []) as { id: string; title: string; status: string; coming_soon: boolean }[])
        .map((r) => ({ ...r, pending: waits.filter((x) => x.course_id === r.id && !x.notified_at).length, notified: waits.filter((x) => x.course_id === r.id && x.notified_at).length }))
        .filter((r) => r.pending + r.notified > 0 || r.coming_soon);
    },
  });

  const send = async (r: Row) => {
    setBusy(r.id);
    setNote(null);
    try {
      const { data, error } = await supabase.functions.invoke('notify-course-published', { body: { course_id: r.id } });
      const res = data as { configured?: boolean; sent?: number; failed?: number } | null;
      if (error || !res) setNote('Le service d’envoi est indisponible (Edge Function non déployée ?).');
      else if (!res.configured) setNote('Notifications email non configurées.');
      else { toast('success', `Emails envoyés : ${res.sent ?? 0}`); await qc.invalidateQueries({ queryKey: ['studio-waitlist'] }); }
    } catch {
      setNote('Le service d’envoi est indisponible.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Seo title="Notifications" noindex />
      <h1 className="text-3xl font-extrabold">Notifications</h1>
      <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">À la publication d’une formation, les notifications dans l’application sont créées automatiquement (une seule fois par personne). Les emails ne partent que si le service d’envoi est configuré côté serveur.</p>
      {note && <p role="status" className="rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">{note}</p>}
      <QueryState query={query} isEmpty={(d) => d.length === 0} emptyTitle="Aucune liste d’attente" emptyText="Dès qu’un visiteur clique sur « Me prévenir », il apparaît ici.">
        {(rows) => (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div><p className="font-semibold">{r.title}</p><p className="text-xs text-neutral-500">{r.pending} en attente · {r.notified} prévenu{r.notified > 1 ? 's' : ''}</p></div>
                <div className="flex items-center gap-3">
                  <Badge variant={r.status === 'PUBLIEE' ? 'success' : 'warning'}>{r.status === 'PUBLIEE' ? 'Publiée' : 'Pas encore publiée'}</Badge>
                  {r.status === 'PUBLIEE' && r.pending > 0 && <Button size="sm" disabled={busy === r.id} onClick={() => void send(r)}>{busy === r.id ? 'Envoi…' : 'Envoyer les emails'}</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
