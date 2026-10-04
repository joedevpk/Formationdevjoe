import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Seo } from '@/components/ui/Seo';
import { QueryState } from '@/components/ui/QueryState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { formatDate } from '@/utils';
import type { Profile, UserRole } from '@/types';

export default function Learners() {
  const { isAdmin, profile } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['studio', 'profiles'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Profile[];
    },
  });
  const setRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => { const { error } = await supabase.from('profiles').update({ role }).eq('id', id); if (error) throw new Error(error.message); },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['studio', 'profiles'] }); toast('success', 'Rôle mis à jour.'); },
    onError: (e: Error) => toast('error', e.message),
  });
  const s = search.trim().toLowerCase();
  return (
    <div className="space-y-6">
      <Seo title="Studio — Apprenants" />
      <h1 className="text-3xl font-extrabold">Apprenants</h1>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher" className="input-field max-w-sm" />
      <QueryState query={query} isEmpty={(d) => d.length === 0} emptyTitle="Aucun utilisateur">
        {(list) => (
          <div className="card overflow-x-auto"><table className="w-full min-w-[36rem] text-left text-sm">
            <thead><tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800"><th className="px-4 py-3">Nom</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Inscrit le</th><th className="px-4 py-3">Rôle</th></tr></thead>
            <tbody>{list.filter((p) => !s || `${p.full_name ?? ''} ${p.email}`.toLowerCase().includes(s)).map((p) => (
              <tr key={p.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"><td className="px-4 py-3">{p.full_name ?? '—'}</td><td className="px-4 py-3">{p.email}</td><td className="px-4 py-3">{formatDate(p.created_at)}</td>
                <td className="px-4 py-3">{isAdmin && p.id !== profile?.id ? <select aria-label="Rôle" className="input-field w-auto py-1.5" value={p.role} onChange={(e) => setRole.mutate({ id: p.id, role: e.target.value as UserRole })}><option value="LEARNER">LEARNER</option><option value="INSTRUCTOR">INSTRUCTOR</option><option value="ADMIN">ADMIN</option></select> : p.role}</td></tr>
            ))}</tbody></table></div>
        )}
      </QueryState>
    </div>
  );
}
