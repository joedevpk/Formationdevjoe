import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { QueryState } from '@/components/ui/QueryState';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/services/supabase';
import type { Course } from '@/types';

export default function CoursesList() {
  const qc = useQueryClient();
  const toast = useToast();
  const [del, setDel] = useState<Course | null>(null);
  const query = useQuery({
    queryKey: ['studio-courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').order('position').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Course[];
    },
  });
  const remove = async () => {
    if (!del) return;
    const { error } = await supabase.from('courses').delete().eq('id', del.id);
    setDel(null);
    if (error) { toast('error', /COURSE_HAS_CERTIFICATES/.test(error.message) ? 'Des certificats ont été délivrés : archive la formation au lieu de la supprimer.' : 'Suppression impossible.'); return; }
    await Promise.all(['studio-courses', 'courses'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
    toast('success', 'Formation supprimée.');
  };
  const label = (c: Course) => (c.status === 'PUBLIEE' ? <Badge variant="success">Publiée</Badge> : c.status === 'ARCHIVEE' ? <Badge variant="neutral">Archivée</Badge> : c.coming_soon ? <Badge variant="warning">Annoncée</Badge> : <Badge variant="neutral">Brouillon</Badge>);

  return (
    <div className="space-y-6">
      <Seo title="Formations" noindex />
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-extrabold">Formations</h1><Button to="/studio/formations/nouvelle"><Plus className="h-4 w-4" aria-hidden="true" />Nouvelle formation</Button></div>
      <QueryState query={query} isEmpty={(d) => d.length === 0} emptyTitle="Aucune formation" emptyText="Crée ta première formation avec le bouton ci-dessus.">
        {(list) => (
          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0"><p className="truncate font-semibold">{c.title}</p><p className="text-xs text-neutral-500">{c.category}</p></div>
                <div className="flex items-center gap-3">{label(c)}<Link to={`/studio/formations/${c.id}`} className="btn-outline px-3 py-1.5 text-sm">Modifier</Link><button type="button" onClick={() => setDel(c)} className="text-sm text-neutral-500 hover:text-error-600">Supprimer</button></div>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      <ConfirmDialog open={Boolean(del)} title="Supprimer la formation" message={`Supprimer « ${del?.title ?? ''} » et tout son contenu ? Cette action est définitive.`} onConfirm={() => void remove()} onCancel={() => setDel(null)} />
    </div>
  );
}
