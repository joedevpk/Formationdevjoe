import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { defaultIdentity, useIdentity, useSetting } from '@/lib/queries';
import { safeUrl } from '@/utils';
import type { IdentitySettings } from '@/types';

const fields: { key: keyof IdentitySettings; label: string; area?: boolean; url?: boolean }[] = [
  { key: 'name', label: 'Nom' }, { key: 'title', label: 'Titre' },
  { key: 'bio', label: 'Bio (courte)', area: true }, { key: 'presentation', label: 'Présentation (page À propos)', area: true },
  { key: 'photo', label: 'Photo (URL)', url: true }, { key: 'location', label: 'Localisation' },
  { key: 'email', label: 'Email' }, { key: 'phone', label: 'Téléphone' },
  { key: 'github', label: 'GitHub', url: true }, { key: 'linkedin', label: 'LinkedIn', url: true }, { key: 'youtube', label: 'YouTube', url: true },
  { key: 'facebook', label: 'Facebook', url: true }, { key: 'instagram', label: 'Instagram', url: true }, { key: 'tiktok', label: 'TikTok', url: true },
  { key: 'cv', label: 'CV (URL)', url: true },
];

export default function Settings() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const identity = useIdentity();
  const timeline = useSetting('about.timeline');
  const [form, setForm] = useState<IdentitySettings>(defaultIdentity);
  const [tl, setTl] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (identity.data) setForm(identity.data); }, [identity.data]);
  useEffect(() => { if (timeline.data !== undefined) setTl(timeline.data); }, [timeline.data]);

  if (!isAdmin) return <div className="card p-8 text-center text-sm text-neutral-500">Les paramètres sont réservés aux administrateurs.</div>;
  if (identity.isLoading) return <LoadingState />;

  const save = async () => {
    const e: Record<string, string> = {};
    for (const f of fields) if (f.url && form[f.key] && !safeUrl(form[f.key])) e[f.key] = 'URL http(s) invalide';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Email invalide';
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    // Une valeur vide supprime la ligne (réseau social masqué sur le site)
    const rows = fields.map((f) => ({ key: `identity.${f.key}`, value: form[f.key].trim() }));
    const upserts = rows.filter((r) => r.value).concat([{ key: 'about.timeline', value: tl.trim() }].filter((r) => r.value));
    const removals = rows.filter((r) => !r.value).map((r) => r.key).concat(tl.trim() ? [] : ['about.timeline']);
    const a = upserts.length ? await supabase.from('settings').upsert(upserts, { onConflict: 'key' }) : { error: null };
    const b = removals.length ? await supabase.from('settings').delete().in('key', removals) : { error: null };
    setBusy(false);
    if (a.error || b.error) { toast('error', (a.error ?? b.error)?.message ?? 'Erreur'); return; }
    await Promise.all([qc.invalidateQueries({ queryKey: ['identity'] }), qc.invalidateQueries({ queryKey: ['setting'] })]);
    toast('success', 'Identité enregistrée.');
  };

  return (
    <div className="max-w-3xl space-y-8">
      <Seo title="Studio — Paramètres" />
      <div><h1 className="text-3xl font-extrabold">Identité de Joe Dev</h1><p className="mt-1 text-sm text-neutral-500">Ces informations s'affichent sur le site. Un réseau social vide est masqué.</p></div>
      <div className="card grid gap-4 p-6 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.area ? 'sm:col-span-2' : ''}>
            <label htmlFor={f.key} className="label">{f.label}</label>
            {f.area ? <textarea id={f.key} rows={3} className="input-field" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} /> : <input id={f.key} className="input-field" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />}
            {errs[f.key] && <p role="alert" className="mt-1 text-xs text-error-500">{errs[f.key]}</p>}
          </div>
        ))}
      </div>
      <div className="card p-6"><label htmlFor="tl" className="label">Parcours (page À propos)</label>
        <textarea id="tl" rows={7} className="input-field font-mono text-xs" value={tl} onChange={(e) => setTl(e.target.value)} placeholder={'Titre | Description\nUne étape par ligne. Laisse vide pour les étapes par défaut (sans dates).'} />
        <p className="mt-1 text-xs text-neutral-500">Une étape par ligne au format « Titre | Description ». Ajoute tes vraies dates ici si tu le souhaites.</p></div>
      <div className="card p-6"><h2 className="font-bold">Assistant IA</h2><p className="mt-1 text-sm text-neutral-500">Les clés d'IA restent côté serveur (Edge Function <code>ai-assistant</code>). Voir le README pour les activer. Sans configuration, l'assistant affiche « Assistant IA non configuré. »</p></div>
      <Button onClick={() => void save()} disabled={busy} size="lg">{busy ? 'Enregistrement…' : 'Enregistrer'}</Button>
    </div>
  );
}
