import { useQuery } from '@tanstack/react-query';
import { Seo } from '@/components/ui/Seo';
import { QueryState } from '@/components/ui/QueryState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { supabase } from '@/services/supabase';

interface Stat { title: string; enrolled: number; completed: number }

export default function Analytics() {
  const query = useQuery({
    queryKey: ['studio', 'analytics'],
    queryFn: async (): Promise<Stat[]> => {
      const [c, e] = await Promise.all([
        supabase.from('courses').select('id,title'),
        supabase.from('enrollments').select('course_id,status'),
      ]);
      if (c.error) throw new Error(c.error.message);
      if (e.error) throw new Error(e.error.message);
      const enr = (e.data ?? []) as { course_id: string; status: string }[];
      return ((c.data ?? []) as { id: string; title: string }[]).map((x) => ({
        title: x.title,
        enrolled: enr.filter((r) => r.course_id === x.id && r.status !== 'ANNULEE').length,
        completed: enr.filter((r) => r.course_id === x.id && r.status === 'TERMINEE').length,
      }));
    },
  });
  return (
    <div className="space-y-6">
      <Seo title="Studio — Analytics" />
      <h1 className="text-3xl font-extrabold">Analytics</h1>
      <QueryState query={query} isEmpty={(d) => d.length === 0} emptyTitle="Pas encore de données" emptyText="Les statistiques apparaîtront avec les premières formations et inscriptions.">
        {(list) => { const max = Math.max(1, ...list.map((s) => s.enrolled)); return (
          <div className="space-y-3">{list.map((s) => (
            <div key={s.title} className="card p-5"><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">{s.title}</span><span className="text-neutral-500">{s.enrolled} inscrits • {s.completed} terminées</span></div><ProgressBar value={s.enrolled} max={max} /></div>
          ))}</div>
        ); }}
      </QueryState>
    </div>
  );
}
