import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { QueryState } from '@/components/ui/QueryState';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/services/supabase';
import { announcementKinds, trainingError, visibilityLabels } from '@/lib/training/format';
import type { TrainingAnnouncement } from '@/lib/training/types';
import { formatDateTime } from '@/utils';
import { AnnouncementForm } from './AnnouncementForm';
import { courseTitle, useRefreshTraining, useStudioAnnouncements, useStudioCourses } from './hooks';

export default function AnnouncementsAdmin() {
  const toast = useToast();
  const refresh = useRefreshTraining();
  const q = useStudioAnnouncements();
  const courses = useStudioCourses();
  const [editing, setEditing] = useState<TrainingAnnouncement | 'new' | null>(null);
  const [del, setDel] = useState<TrainingAnnouncement | null>(null);

  const archive = async (a: TrainingAnnouncement) => {
    const { error } = await supabase.from('training_announcements').update({ status: 'ARCHIVEE' }).eq('id', a.id);
    if (error) { toast('error', trainingError(error)); return; }
    await refresh(); toast('success', 'Annonce archivée.');
  };
  const remove = async () => {
    if (!del) return;
    const { error } = await supabase.from('training_announcements').delete().eq('id', del.id);
    setDel(null);
    if (error) { toast('error', trainingError(error)); return; }
    await refresh(); toast('success', 'Annonce supprimée.');
  };

  return (
    <div className="space-y-6">
      <Seo title="Studio — Annonces" noindex />
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-extrabold">Annonces de formation</h1><p className="mt-1 text-sm text-neutral-500">Changement de salle ou d’horaire, rappel, matériel, liste, résultats, certificats…</p></div>
        {!editing && <Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden="true" />Nouvelle annonce</Button>}</div>
      {editing && <AnnouncementForm key={editing === 'new' ? 'new' : editing.id} announcement={editing === 'new' ? undefined : editing} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />}
      <QueryState query={q} isEmpty={(d) => d.length === 0} emptyTitle="Aucune annonce" emptyText="Publie ta première annonce : les participants concernés sont notifiés dans leur espace.">
        {(list) => (
          <ul className="space-y-2">
            {list.map((a) => (
              <li key={a.id} className="card flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0"><p className="font-semibold">{a.title}</p>
                  <p className="text-xs text-neutral-500">{announcementKinds[a.kind]} · {a.course_id ? courseTitle(courses.data, a.course_id) : 'Générale'} · {visibilityLabels[a.visibility]}{a.published_at ? ` · publiée le ${formatDateTime(a.published_at)}` : ''}{a.expires_at ? ` · expire le ${formatDateTime(a.expires_at)}` : ''}</p></div>
                <div className="flex items-center gap-2"><Badge variant={a.status === 'PUBLIEE' ? 'success' : 'neutral'}>{a.status === 'PUBLIEE' ? 'Publiée' : a.status === 'ARCHIVEE' ? 'Archivée' : 'Brouillon'}</Badge>
                  <Button size="sm" variant="outline" onClick={() => setEditing(a)}>Modifier</Button>
                  {a.status === 'PUBLIEE' && <Button size="sm" variant="ghost" onClick={() => void archive(a)}>Archiver</Button>}
                  <button type="button" onClick={() => setDel(a)} className="text-sm text-neutral-500 hover:text-error-600">Supprimer</button></div>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      <ConfirmDialog open={Boolean(del)} title="Supprimer l’annonce" message={`Supprimer « ${del?.title ?? ''} » ? Les notifications déjà envoyées restent dans les espaces des participants.`} onConfirm={() => void remove()} onCancel={() => setDel(null)} />
    </div>
  );
}
