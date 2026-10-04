import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Seo } from '@/components/ui/Seo';
import { SkeletonStats } from '@/components/ui/Skeleton';
import { supabase } from '@/services/supabase';

async function count(table: string, eq?: [string, string]): Promise<number> {
  const base = supabase.from(table).select('*', { count: 'exact', head: true });
  const { count: c, error } = eq ? await base.eq(eq[0], eq[1]) : await base;
  if (error) throw new Error(error.message);
  return c ?? 0;
}

export default function Overview() {
  const query = useQuery({
    queryKey: ['studio-counts'],
    queryFn: async () => {
      const [learners, published, enrollments, lessons, projects, messages, workshops] = await Promise.all([
        count('profiles', ['role', 'LEARNER']),
        count('courses', ['status', 'PUBLIEE']),
        count('enrollments'),
        count('lessons'),
        count('projects'),
        count('contact_messages', ['status', 'NOUVEAU']),
        count('workshops'),
      ]);
      return [
        { label: 'Apprenants', value: learners, to: '/studio/apprenants' },
        { label: 'Formations publiées', value: published, to: '/studio/formations' },
        { label: 'Inscriptions', value: enrollments, to: '/studio/inscriptions' },
        { label: 'Leçons', value: lessons, to: '/studio/formations' },
        { label: 'Projets', value: projects, to: '/studio/projets' },
        { label: 'Messages non lus', value: messages, to: '/studio/messages' },
        { label: 'Workshops', value: workshops, to: '/studio/workshops' },
      ];
    },
  });
  return (
    <div className="space-y-8">
      <Seo title="Vue générale" noindex />
      <div><h1 className="text-3xl font-extrabold">Vue générale</h1><p className="mt-1 text-neutral-500">Chiffres réels de ta base de données.</p></div>
      {query.isLoading ? <SkeletonStats count={4} /> : query.isError ? <p className="text-sm text-error-500">Impossible de charger les statistiques (vérifie la base et les politiques RLS).</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {query.data?.map((s) => <Link key={s.label} to={s.to} className="card-hover p-5"><p className="text-3xl font-extrabold">{s.value}</p><p className="mt-1 text-sm text-neutral-500">{s.label}</p></Link>)}
        </div>
      )}
    </div>
  );
}
