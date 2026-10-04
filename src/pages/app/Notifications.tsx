import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { QueryState } from '@/components/ui/QueryState';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/lib/learner';
import { supabase } from '@/services/supabase';
import type { NotificationRow, Certificate } from '@/types';
import { formatDateTime, cn } from '@/utils';

/** Préférences : désactiver les alertes « nouvelle formation ». Table notification_preferences (RLS : chacun la sienne). */
function Preferences({ userId }: { userId: string }) {
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(true);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from('notification_preferences').select('in_app_new_courses,email_new_courses').eq('user_id', userId).maybeSingle();
        if (!cancelled && data) { setInApp(Boolean(data.in_app_new_courses)); setEmail(Boolean(data.email_new_courses)); }
      } catch { /* préférences par défaut */ }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [userId]);
  const save = async (next: { in_app_new_courses: boolean; email_new_courses: boolean }) => {
    try { await supabase.from('notification_preferences').upsert({ user_id: userId, ...next }); } catch { /* sans effet bloquant */ }
  };
  if (!ready) return null;
  return (
    <fieldset className="card space-y-3 p-5 text-sm">
      <legend className="px-1 font-semibold">Me prévenir des nouvelles formations</legend>
      <label className="flex items-center gap-2"><input type="checkbox" checked={inApp} onChange={(e) => { setInApp(e.target.checked); void save({ in_app_new_courses: e.target.checked, email_new_courses: email }); }} />Dans l’application</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={email} onChange={(e) => { setEmail(e.target.checked); void save({ in_app_new_courses: inApp, email_new_courses: e.target.checked }); }} />Par email <span className="text-neutral-500">(si le service d’envoi est configuré)</span></label>
    </fieldset>
  );
}

/** Boutons d'une notification : ouvrir l'annonce / l'inscription ; pour un certificat, « Voir mon certificat » + « Télécharger le PDF ». */
function NotificationActions({ n }: { n: NotificationRow }) {
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  if (!n.link || !n.link.startsWith('/')) return null;
  if (n.kind === 'CERTIFICATE') {
    const id = n.link.split('/').pop() ?? '';
    const download = async () => {
      setState('busy');
      try {
        const { data, error } = await supabase.from('certificates').select('*').eq('id', id).maybeSingle();
        if (error || !data) throw error ?? new Error('introuvable');
        const g = await import('@/lib/training/pdf/generate');
        g.saveBlob(await g.generateCertificatePdf(data as Certificate), g.certificateFileName(data as Certificate));
        setState('idle');
      } catch { setState('error'); }
    };
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Link to={n.link} className="btn-primary px-3.5 py-1.5 text-xs">Voir mon certificat</Link>
        <button type="button" className="btn-outline px-3.5 py-1.5 text-xs" disabled={state === 'busy'} onClick={() => void download()}>{state === 'busy' ? 'Génération…' : 'Télécharger le PDF'}</button>
        {state === 'error' && <span role="alert" className="text-xs text-error-600">PDF indisponible pour le moment.</span>}
      </div>
    );
  }
  const label = n.kind === 'ANNOUNCEMENT' ? 'Ouvrir l’annonce' : n.kind === 'LIST' ? 'Voir la liste' : 'Ouvrir';
  return <div className="mt-2"><Link to={n.link} className="btn-outline px-3.5 py-1.5 text-xs">{label}</Link></div>;
}

export default function Notifications() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const query = useNotifications(profile?.id);
  const markAll = async () => {
    if (!profile) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    await qc.invalidateQueries({ queryKey: ['notifications'] });
  };
  return (
    <div className="space-y-8">
      <Seo title="Notifications" noindex />
      <div className="flex items-center justify-between"><h1 className="text-3xl font-extrabold">Notifications</h1><Button variant="outline" size="sm" onClick={() => void markAll()}>Tout marquer comme lu</Button></div>
      {profile && <Preferences userId={profile.id} />}
      <QueryState query={query} isEmpty={(d) => d.length === 0} emptyTitle="Aucune notification">
        {(list) => <ul className="space-y-2">{list.map((n) => (
          <li key={n.id} className={cn('card flex gap-3 p-4', !n.is_read && 'border-primary-500/40')}><Bell className="mt-0.5 h-4 w-4 text-primary-500" />
            <div><p className="text-sm font-semibold">{n.title}</p>{n.body && <p className="text-sm text-neutral-500">{n.body}</p>}<p className="mt-1 text-xs text-neutral-400">{formatDateTime(n.created_at)}</p><NotificationActions n={n} /></div></li>
        ))}</ul>}
      </QueryState>
    </div>
  );
}
