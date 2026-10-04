import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSignOut } from '@/lib/useSignOut';
import { supabase } from '@/services/supabase';
import { getInitials } from '@/utils';

const schema = z.object({ full_name: z.string().trim().min(2, 'Nom requis').max(200), phone: z.string().trim().max(40).optional(), bio: z.string().trim().max(1000).optional() });
type FormValues = z.infer<typeof schema>;
const pwSchema = z.object({ password: z.string().min(8, '8 caractères minimum') });

export default function Profile() {
  const { profile, updateProfile } = useAuth();
  const signOut = useSignOut();
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: profile?.full_name ?? '', phone: profile?.phone ?? '', bio: profile?.bio ?? '' },
  });
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState<string | null>(null);

  const onSubmit = async (v: FormValues) => {
    const { error } = await updateProfile({ full_name: v.full_name, phone: v.phone || null, bio: v.bio || null });
    toast(error ? 'error' : 'success', error ?? 'Profil mis à jour.');
  };

  const onAvatar = async (file: File | undefined) => {
    if (!file || !profile) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) { toast('error', 'Image requise, 2 Mo maximum.'); return; }
    setUploading(true);
    const path = `${profile.id}/avatar-${Date.now()}.${file.name.split('.').pop() ?? 'png'}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { setUploading(false); toast('error', "Téléversement impossible."); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const r = await updateProfile({ avatar_url: data.publicUrl });
    setUploading(false);
    toast(r.error ? 'error' : 'success', r.error ?? 'Photo mise à jour.');
  };

  const changePw = async () => {
    const res = pwSchema.safeParse({ password: pw });
    if (!res.success) { setPwErr(res.error.issues[0].message); return; }
    setPwErr(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setPwErr(error.message); return; }
    setPw(''); toast('success', 'Mot de passe modifié.');
  };

  return (
    <div className="max-w-2xl space-y-8">
      <Seo title="Mon profil" />
      <h1 className="text-3xl font-extrabold">Mon profil</h1>
      <div className="card flex items-center gap-4 p-5">
        {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/15 text-lg font-bold text-primary-500">{getInitials(profile?.full_name)}</span>}
        <div><p className="font-semibold">{profile?.email}</p><label className="mt-1 inline-block cursor-pointer text-sm text-primary-500 hover:underline">{uploading ? 'Envoi…' : 'Changer la photo'}<input type="file" accept="image/*" className="sr-only" onChange={(e) => void onAvatar(e.target.files?.[0])} /></label></div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 p-6" noValidate>
        <div><label htmlFor="full_name" className="label">Nom complet</label><input id="full_name" className="input-field" {...register('full_name')} />{errors.full_name && <p className="mt-1 text-xs text-error-500">{errors.full_name.message}</p>}</div>
        <div><label htmlFor="phone" className="label">Téléphone</label><input id="phone" className="input-field" {...register('phone')} /></div>
        <div><label htmlFor="bio" className="label">Bio</label><textarea id="bio" rows={3} className="input-field" {...register('bio')} /></div>
        <Button type="submit" disabled={isSubmitting}>Enregistrer</Button>
      </form>
      <div className="card space-y-3 p-6"><h2 className="font-bold">Changer mon mot de passe</h2>
        <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Nouveau mot de passe" className="input-field" placeholder="Nouveau mot de passe" />
        {pwErr && <p role="alert" className="text-xs text-error-500">{pwErr}</p>}<Button variant="outline" onClick={() => void changePw()}>Modifier</Button></div>
      <Button variant="ghost" onClick={() => void signOut()}>Se déconnecter</Button>
    </div>
  );
}
