import { useQuery } from '@tanstack/react-query';
import { Seo } from '@/components/ui/Seo';
import { Badge } from '@/components/ui/Badge';
import { QueryState } from '@/components/ui/QueryState';
import { supabase } from '@/services/supabase';
import { RegistrationsPanel } from '@/pages/studio/training/RegistrationsPanel';
import { formatDate } from '@/utils';

interface EnrRow { id: string; status: string; enrolled_at: string; profiles: { full_name: string | null; email: string } | null; courses: { title: string } | null }
interface RegRow { id: string; name: string; email: string; created_at: string; workshops: { title: string } | null }

export default function Enrollments() {
  const enr = useQuery({
    queryKey: ['studio', 'enrollments'],
    queryFn: async (): Promise<EnrRow[]> => {
      const { data, error } = await supabase.from('enrollments').select('id,status,enrolled_at,profiles(full_name,email),courses(title)').order('enrolled_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as EnrRow[];
    },
  });
  const reg = useQuery({
    queryKey: ['studio', 'workshop_registrations'],
    queryFn: async (): Promise<RegRow[]> => {
      const { data, error } = await supabase.from('workshop_registrations').select('id,name,email,created_at,workshops(title)').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as RegRow[];
    },
  });
  return (
    <div className="space-y-10">
      <Seo title="Studio — Inscriptions" />
      <section className="space-y-4" aria-labelledby="reg-pres"><h1 id="reg-pres" className="text-3xl font-extrabold">Inscriptions aux formations présentielles</h1>
        <p className="text-sm text-neutral-500">Confirme, refuse ou annule les inscriptions. Le détail d’une session (liste, présences, validation) se gère dans Studio → Sessions.</p>
        <RegistrationsPanel /></section>
      <section className="space-y-4"><h2 className="text-2xl font-extrabold">Inscriptions aux supports en ligne</h2>
        <QueryState query={enr} isEmpty={(d) => d.length === 0} emptyTitle="Aucune inscription">
          {(list) => <div className="card overflow-x-auto"><table className="w-full min-w-[36rem] text-left text-sm"><thead><tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800"><th className="px-4 py-3">Apprenant</th><th className="px-4 py-3">Formation</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Statut</th></tr></thead>
            <tbody>{list.map((r) => <tr key={r.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"><td className="px-4 py-3">{r.profiles?.full_name ?? r.profiles?.email ?? '—'}</td><td className="px-4 py-3">{r.courses?.title ?? '—'}</td><td className="px-4 py-3">{formatDate(r.enrolled_at)}</td><td className="px-4 py-3"><Badge variant={r.status === 'TERMINEE' ? 'success' : r.status === 'ANNULEE' ? 'neutral' : 'primary'}>{r.status}</Badge></td></tr>)}</tbody></table></div>}
        </QueryState></section>
      <section className="space-y-4"><h2 className="text-2xl font-extrabold">Inscriptions aux workshops</h2>
        <QueryState query={reg} isEmpty={(d) => d.length === 0} emptyTitle="Aucune inscription à un workshop">
          {(list) => <div className="card overflow-x-auto"><table className="w-full min-w-[36rem] text-left text-sm"><thead><tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800"><th className="px-4 py-3">Nom</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Workshop</th><th className="px-4 py-3">Date</th></tr></thead>
            <tbody>{list.map((r) => <tr key={r.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"><td className="px-4 py-3">{r.name}</td><td className="px-4 py-3">{r.email}</td><td className="px-4 py-3">{r.workshops?.title ?? '—'}</td><td className="px-4 py-3">{formatDate(r.created_at)}</td></tr>)}</tbody></table></div>}
        </QueryState></section>
    </div>
  );
}
