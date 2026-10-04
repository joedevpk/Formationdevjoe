import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { QueryState } from '@/components/ui/QueryState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/services/supabase';
import { announcementKinds, visibilityLabels } from '@/lib/training/format';
import type { TrainingAnnouncement } from '@/lib/training/types';
import { formatDateTime, safeUrl } from '@/utils';

/** Une annonce de formation. La RLS ne renvoie que ce que l'utilisateur a le droit de lire (publiée, non expirée, visibilité). */
export default function AnnouncementView() {
  const { id } = useParams();
  const q = useQuery({
    queryKey: ['announcement', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<(TrainingAnnouncement & { courses: { title: string } | null }) | null> => {
      const { data, error } = await supabase.from('training_announcements').select('*, courses(title)').eq('id', id as string).eq('status', 'PUBLIEE').maybeSingle();
      if (error) throw new Error(error.message);
      return data as never;
    },
  });
  return (
    <div className="space-y-6">
      <Seo title="Annonce" noindex />
      <Link to="/app/formations" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Mes formations</Link>
      <QueryState query={q} isEmpty={(d) => d === null} emptyTitle="Annonce introuvable" emptyText="Elle n’existe plus, a expiré ou ne t’est pas destinée." emptyAction={<Button to="/app/formations" variant="outline">Mes formations</Button>}>
        {(a) => {
          if (!a) return null;
          const img = safeUrl(a.image_url);
          return (
            <article className="space-y-4">
              <div className="flex flex-wrap items-center gap-2"><Badge variant="primary">{announcementKinds[a.kind]}</Badge><Badge variant="neutral">{visibilityLabels[a.visibility]}</Badge></div>
              <h1 className="text-3xl font-extrabold">{a.title}</h1>
              <p className="text-sm text-neutral-500">{a.courses?.title ? `${a.courses.title} · ` : ''}{formatDateTime(a.published_at)}</p>
              {img && <img src={img} alt="" width={1280} height={720} className="aspect-video w-full max-w-2xl rounded-2xl border border-neutral-200 object-cover dark:border-neutral-800" />}
              <p className="max-w-2xl whitespace-pre-line text-base leading-relaxed">{a.content}</p>
            </article>
          );
        }}
      </QueryState>
    </div>
  );
}
