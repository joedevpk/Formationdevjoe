import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Mail, MapPin } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { Button } from '@/components/ui/Button';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useIdentity } from '@/lib/queries';
import { cn } from '@/utils';

const types = ['Apprendre', 'Créer un projet', 'Collaborer'] as const;

const schema = z.object({
  name: z.string().trim().min(2, 'Nom requis').max(200),
  email: z.string().trim().email('Email invalide').max(320),
  subject: z.string().trim().min(2, 'Sujet requis').max(200),
  request_type: z.enum(types),
  message: z.string().trim().min(10, 'Message trop court (10 caractères minimum)').max(5000),
});
type FormValues = z.infer<typeof schema>;
const fieldErr = (m?: string) => (m ? <p role="alert" className="mt-1 text-xs text-error-600 dark:text-error-400">{m}</p> : null);

export default function Contact() {
  const { data: id } = useIdentity();
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { request_type: types[0] } });
  const current = watch('request_type');

  const onSubmit = async (v: FormValues) => {
    setErr(null);
    if (!isSupabaseConfigured) { setErr('L’envoi n’est pas disponible pour le moment.'); return; }
    try {
      const { error } = await supabase.from('contact_messages').insert({ name: v.name, email: v.email, subject: v.subject, request_type: v.request_type, message: v.message });
      if (error) throw error;
      reset();
      setSent(true);
    } catch {
      setErr('Envoi impossible pour le moment. Réessaie dans un instant.');
    }
  };

  return (
    <>
      <Seo title="Contact" description="Un projet, une idée ou une question ? Écris-moi pour apprendre, créer un projet ou collaborer." />
      <PageHero eyebrow="Contact" title="Un projet, une idée ou une question ?" />
      <section className="section-container grid gap-10 py-12 lg:grid-cols-[1fr_18rem]">
        {sent ? (
          <div role="status" className="card flex flex-col items-center gap-3 border-success-500/40 bg-success-500/5 p-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-success-500" aria-hidden="true" />
            <p className="text-lg font-bold">Message envoyé. Je reviendrai vers vous dès que possible.</p>
            <Button variant="outline" onClick={() => setSent(false)}>Envoyer un autre message</Button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="card space-y-5 p-6 sm:p-8" noValidate>
            <fieldset><legend className="label">Je souhaite</legend>
              <div className="flex flex-wrap gap-2">
                {types.map((t) => <button type="button" key={t} aria-pressed={current === t} onClick={() => setValue('request_type', t)} className={cn('rounded-full border px-4 py-2 text-sm font-semibold transition', current === t ? 'border-primary-600 bg-primary-600 text-white' : 'border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800')}>{t}</button>)}
              </div>
            </fieldset>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label htmlFor="name" className="label">Nom</label><input id="name" autoComplete="name" className="input-field" aria-invalid={Boolean(errors.name)} {...register('name')} />{fieldErr(errors.name?.message)}</div>
              <div><label htmlFor="email" className="label">Email</label><input id="email" type="email" autoComplete="email" className="input-field" aria-invalid={Boolean(errors.email)} {...register('email')} />{fieldErr(errors.email?.message)}</div>
            </div>
            <div><label htmlFor="subject" className="label">Sujet</label><input id="subject" className="input-field" aria-invalid={Boolean(errors.subject)} {...register('subject')} />{fieldErr(errors.subject?.message)}</div>
            <div><label htmlFor="message" className="label">Message</label><textarea id="message" rows={6} className="input-field resize-y" aria-invalid={Boolean(errors.message)} {...register('message')} />{fieldErr(errors.message?.message)}</div>
            {err && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{err}</p>}
            <Button type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? 'Envoi…' : 'Envoyer le message'}</Button>
          </form>
        )}
        <aside className="space-y-3 text-sm">
          {id?.email && <div className="card flex items-center gap-3 p-4"><Mail className="h-4 w-4 text-primary-600 dark:text-primary-300" aria-hidden="true" /><a href={`mailto:${id.email}`} className="break-all hover:underline">{id.email}</a></div>}
          {id?.location && <div className="card flex items-center gap-3 p-4"><MapPin className="h-4 w-4 text-primary-600 dark:text-primary-300" aria-hidden="true" />{id.location}</div>}
        </aside>
      </section>
    </>
  );
}
