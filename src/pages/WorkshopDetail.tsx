import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Clock, MonitorPlay } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { QueryState } from '@/components/ui/QueryState';
import { useWorkshop } from '@/lib/queries';
import { workshopStatus } from '@/pages/Workshops';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { formatDateTime, safeUrl } from '@/utils';

const schema = z.object({ name: z.string().trim().min(2, 'Nom requis').max(200), email: z.string().trim().email('Email invalide').max(320) });
type FormValues = z.infer<typeof schema>;

export default function WorkshopDetail() {
  const { slug } = useParams();
  const query = useWorkshop(slug);
  const { profile } = useAuth();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: profile?.full_name ?? '', email: profile?.email ?? '' },
  });

  const onSubmit = async (v: FormValues, workshopId: string) => {
    setErr(null);
    if (!isSupabaseConfigured || workshopId.startsWith('demo-')) { setErr("Les inscriptions ne sont pas encore activées (base de données non configurée)."); return; }
    const { error } = await supabase.from('workshop_registrations').insert({ workshop_id: workshopId, user_id: profile?.id ?? null, name: v.name, email: v.email });
    if (error) setErr("Inscription impossible pour le moment. Réessaie plus tard."); else setDone(true);
  };

  return (
    <QueryState query={{ ...query, data: query.data ?? (query.isLoading ? undefined : null) }} isEmpty={(d) => d === null} emptyTitle="Session introuvable" emptyAction={<Button to="/workshops" variant="outline">Tous les workshops</Button>}>
      {(w) => {
        if (!w) return null;
        const link = safeUrl(w.location_url);
        const open = w.status === 'A_VENIR' || w.status === 'OUVERT';
        return (
          <>
            <Seo title={w.title} description={w.description} />
            <PageHero eyebrow="Workshop" title={w.title} description={w.description}>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={workshopStatus[w.status].variant}>{workshopStatus[w.status].label}</Badge>
                <span className="inline-flex items-center gap-1 text-sm text-neutral-500"><MonitorPlay className="h-4 w-4" />{w.format}</span>
                <span className="inline-flex items-center gap-1 text-sm text-neutral-500"><Calendar className="h-4 w-4" />{w.starts_at ? formatDateTime(w.starts_at) : 'Date à confirmer'}</span>
                {w.duration && <span className="inline-flex items-center gap-1 text-sm text-neutral-500"><Clock className="h-4 w-4" />{w.duration}</span>}
              </div>
              {link && <div className="mt-4"><Button href={link} variant="outline" size="sm">Lien de la session</Button></div>}
            </PageHero>
            <section className="section-container max-w-xl py-12">
              <h2 className="mb-4 text-2xl font-bold">S'inscrire</h2>
              {!open ? <p className="text-sm text-neutral-500">Les inscriptions ne sont pas ouvertes pour cette session.</p> : done ? (
                <div className="card border-success-500/40 bg-success-500/5 p-5 text-sm">Inscription enregistrée. Tu recevras les informations pratiques par email.</div>
              ) : (
                <form onSubmit={handleSubmit((v) => onSubmit(v, w.id))} className="card space-y-4 p-6" noValidate>
                  <div><label htmlFor="name" className="label">Nom</label><input id="name" className="input-field" {...register('name')} />{errors.name && <p className="mt-1 text-xs text-error-500">{errors.name.message}</p>}</div>
                  <div><label htmlFor="email" className="label">Email</label><input id="email" type="email" className="input-field" {...register('email')} />{errors.email && <p className="mt-1 text-xs text-error-500">{errors.email.message}</p>}</div>
                  {err && <p role="alert" className="text-sm text-error-500">{err}</p>}
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Envoi…' : "Je m'inscris"}</Button>
                </form>
              )}
            </section>
          </>
        );
      }}
    </QueryState>
  );
}
