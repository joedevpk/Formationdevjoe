import { useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useIdentity } from '@/lib/queries';
import { safeHref } from '@/lib/cv/format';
import type { AdminProfile } from '@/lib/cv/queries';

export type Draft = Omit<AdminProfile, 'id' | 'updated_at'>;
const cls = 'input-field';

function F({ id, label, children, help, error }: { id: string; label: string; children: React.ReactNode; help?: string; error?: string }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {help && <p className="mt-1 text-xs text-neutral-500">{help}</p>}
      {error && <p role="alert" className="mt-1 text-xs text-error-600 dark:text-error-400">{error}</p>}
    </div>
  );
}

export function ProfileTab({ draft, setDraft, errors }: { draft: Draft; setDraft: (f: (d: Draft) => Draft) => void; errors: Record<string, string> }) {
  const toast = useToast();
  const { profile } = useAuth();
  const identity = useIdentity();
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const text = (k: 'location' | 'email' | 'phone' | 'website' | 'github' | 'linkedin' | 'photo_url') => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value || null);

  /** Ne remplit QUE les champs vides, à partir de Paramètres → identité. N'écrase jamais ce que tu as saisi. */
  const importIdentity = () => {
    const id = identity.data;
    if (!id) { toast('error', 'Paramètres indisponibles pour le moment.'); return; }
    const filled: string[] = [];
    setDraft((d) => {
      const n = { ...d };
      const fill = <K extends keyof Draft>(k: K, v: string, label: string) => { if (v.trim() && !String(n[k] ?? '').trim()) { (n[k] as string) = v.trim(); filled.push(label); } };
      const [first, ...rest] = id.name.trim().split(/\s+/);
      fill('first_name', first ?? '', 'prénom'); fill('last_name', rest.join(' '), 'nom'); fill('display_name', id.name, 'nom professionnel');
      fill('photo_url', id.photo, 'photo'); fill('location', id.location, 'localisation'); fill('email', id.email, 'email'); fill('phone', id.phone, 'téléphone');
      fill('github', id.github, 'GitHub'); fill('linkedin', id.linkedin, 'LinkedIn'); fill('summary_short', id.bio, 'résumé court'); fill('summary_long', id.presentation, 'résumé long');
      return n;
    });
    toast('success', filled.length ? 'Importé depuis Paramètres.' : 'Rien à importer : les champs sont déjà remplis ou Paramètres est vide.');
  };

  const upload = async (file?: File) => {
    if (!file || !profile) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { toast('error', 'Image requise, 5 Mo maximum.'); return; }
    setUploading(true);
    const path = `${profile.id}/cv-${Date.now()}.${(file.name.split('.').pop() ?? 'jpg').toLowerCase()}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    setUploading(false);
    if (error) { toast('error', 'Téléversement impossible. Réessaie dans un instant.'); return; }
    set('photo_url', supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl);
  };

  const links = draft.links;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-neutral-600 dark:text-neutral-400">Une seule saisie : ces informations alimentent le CV, le PDF, la page /cv et (nom, titre, photo, liens) le site.</p>
        <button type="button" onClick={importIdentity} className="btn-outline px-4 py-2 text-sm">Importer depuis Paramètres</button>
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-lg font-bold">Identité</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <F id="cv-first" label="Prénom"><input id="cv-first" autoComplete="given-name" className={cls} value={draft.first_name} onChange={(e) => set('first_name', e.target.value)} /></F>
          <F id="cv-last" label="Nom"><input id="cv-last" autoComplete="family-name" className={cls} value={draft.last_name} onChange={(e) => set('last_name', e.target.value)} /></F>
          <F id="cv-display" label="Nom professionnel" help="Affiché en grand sur le CV. Par défaut : prénom + nom." error={errors.display_name}><input id="cv-display" className={cls} value={draft.display_name} onChange={(e) => set('display_name', e.target.value)} /></F>
          <F id="cv-headline" label="Titre professionnel"><input id="cv-headline" className={cls} value={draft.headline} onChange={(e) => set('headline', e.target.value)} /></F>
          <F id="cv-location" label="Localisation"><input id="cv-location" className={cls} value={draft.location ?? ''} onChange={text('location')} /></F>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          {safeHref(draft.photo_url) && <img src={safeHref(draft.photo_url)} alt="Aperçu de la photo du CV" width={72} height={72} className="h-[72px] w-[72px] rounded-full object-cover" />}
          <F id="cv-photo-url" label="Photo (URL)" error={errors.photo_url}><input id="cv-photo-url" type="url" className={`${cls} w-64`} value={draft.photo_url ?? ''} onChange={text('photo_url')} /></F>
          <div>
            <label htmlFor="cv-photo-file" className="btn-outline inline-flex cursor-pointer items-center gap-2 px-4 py-2 text-sm"><Upload className="h-4 w-4" aria-hidden="true" />{uploading ? 'Envoi…' : 'Téléverser'}</label>
            <input id="cv-photo-file" type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => void upload(e.target.files?.[0])} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-lg font-bold">Contact et liens</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <F id="cv-email" label="Email" error={errors.email}><input id="cv-email" type="email" autoComplete="email" className={cls} value={draft.email ?? ''} onChange={text('email')} /></F>
          <F id="cv-phone" label="Téléphone"><input id="cv-phone" type="tel" autoComplete="tel" className={cls} value={draft.phone ?? ''} onChange={text('phone')} /></F>
          <F id="cv-website" label="Site web" error={errors.website}><input id="cv-website" type="url" className={cls} value={draft.website ?? ''} onChange={text('website')} /></F>
          <F id="cv-github" label="GitHub" error={errors.github}><input id="cv-github" type="url" className={cls} value={draft.github ?? ''} onChange={text('github')} /></F>
          <F id="cv-linkedin" label="LinkedIn" error={errors.linkedin}><input id="cv-linkedin" type="url" className={cls} value={draft.linkedin ?? ''} onChange={text('linkedin')} /></F>
        </div>
        <p className="text-xs text-neutral-500">Email et téléphone ne sont publics que si tu les affiches dans l’onglet « Modèle et publication ».</p>
        <div className="space-y-2">
          <p className="label">Autres liens professionnels</p>
          {links.map((l, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input aria-label={`Libellé du lien ${i + 1}`} className={`${cls} w-40`} placeholder="Libellé" value={l.label} onChange={(e) => set('links', links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <input aria-label={`URL du lien ${i + 1}`} type="url" className={`${cls} min-w-0 flex-1`} placeholder="https://" value={l.url} onChange={(e) => set('links', links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
              <button type="button" aria-label={`Supprimer le lien ${i + 1}`} onClick={() => set('links', links.filter((_, j) => j !== i))} className="rounded p-2 text-neutral-500 hover:text-error-600"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          ))}
          {errors.links && <p role="alert" className="text-xs text-error-600 dark:text-error-400">{errors.links}</p>}
          {links.length < 12 && <button type="button" onClick={() => set('links', [...links, { label: '', url: '' }])} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-300"><Plus className="h-4 w-4" aria-hidden="true" />Ajouter un lien</button>}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-lg font-bold">Profil professionnel</legend>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.show_summary} onChange={(e) => set('show_summary', e.target.checked)} />Afficher cette section dans le CV</label>
        <F id="cv-short" label="Texte court" help={`${draft.summary_short.length}/600 — utilisé comme description de la page /cv si le texte long est vide.`}><textarea id="cv-short" rows={3} maxLength={600} className={cls} value={draft.summary_short} onChange={(e) => set('summary_short', e.target.value)} /></F>
        <F id="cv-long" label="Texte long" help={`${draft.summary_long.length}/4000 — quelques paragraphes séparés par une ligne vide. Écris ce qui est vrai et vérifiable.`}><textarea id="cv-long" rows={8} maxLength={4000} className={cls} value={draft.summary_long} onChange={(e) => set('summary_long', e.target.value)} /></F>
      </fieldset>
    </div>
  );
}
