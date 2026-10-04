import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Award, CalendarDays, ChevronLeft, Clock, MapPin, Package, UserRound } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { QueryState } from '@/components/ui/QueryState';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { RegistrationBadge } from '@/components/training/StatusBadges';
import { DownloadCertificateButton } from '@/components/training/CertificateSheet';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceStats, rpc, useAnnouncements, useMyAttendance, useMyRegistration, useMyTrainingCertificates } from '@/lib/training/api';
import { announcementKinds, formatDay, formatPeriod, formatSchedule, registrationStatus, sessionDays, trainingError } from '@/lib/training/format';
import { checkInUrl } from '@/lib/site';
import { formatDate } from '@/utils';

const ATT_LABEL = { PRESENT: ['Présent', 'success'], ABSENT: ['Absent', 'error'], RETARD: ['En retard', 'warning'] } as const;

/** QR code de pointage du participant : encode l'adresse de pointage + son jeton secret (le staff seul peut l'utiliser). */
function CheckInQr({ token }: { token: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void import('qrcode').then((QR) => QR.toDataURL(checkInUrl(token), { margin: 1, width: 280, errorCorrectionLevel: 'M' })).then((u) => alive && setSrc(u)).catch(() => alive && setSrc(null));
    return () => { alive = false; };
  }, [token]);
  if (!src) return null;
  return (
    <div className="card flex flex-col items-center gap-2 p-5 text-center">
      <img src={src} alt="QR code de pointage" width={160} height={160} className="h-40 w-40 rounded-lg bg-white p-1" />
      <p className="text-sm font-semibold">Ton QR code de pointage</p>
      <p className="text-xs text-neutral-500">Présente-le au formateur à ton arrivée. Seul le formateur peut enregistrer ta présence.</p>
    </div>
  );
}

export default function RegistrationDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const reg = useMyRegistration(id, profile?.id);
  const att = useMyAttendance(profile?.id);
  const certs = useMyTrainingCertificates(profile?.id);
  const ann = useAnnouncements(profile?.id);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const cancel = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await rpc('cancel_training_registration', { p_registration_id: id });
      await Promise.all(['my-registration', 'my-registrations', 'training-sessions'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
      toast('success', 'Inscription annulée.');
    } catch (e) { toast('error', trainingError(e)); }
    finally { setBusy(false); setConfirm(false); }
  };

  return (
    <div className="space-y-8">
      <Seo title="Mon inscription" noindex />
      <Link to="/app/formations" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Mes formations</Link>
      <QueryState query={reg} isEmpty={(d) => d === null} emptyTitle="Inscription introuvable" emptyText="Elle n’existe pas ou ne t’appartient pas." emptyAction={<Button to="/app/formations" variant="outline">Mes formations</Button>}>
        {(r) => {
          if (!r) return null;
          const s = r.training_sessions;
          const myAtt = (att.data ?? []).filter((a) => a.registration_id === r.id);
          const stats = attendanceStats(att.data ?? [], r.id, r.session_id);
          const cert = (certs.data ?? []).find((c) => c.registration_id === r.id);
          const news = (ann.data ?? []).filter((a) => (a.session_id ? a.session_id === r.session_id : a.course_id === r.course_id) && (a.visibility === 'PARTICIPANTS' || a.visibility === 'PUBLIC'));
          const days = s ? sessionDays(s) : [];
          const canCancel = (r.status === 'EN_ATTENTE' || r.status === 'CONFIRMEE') && s && ['BIENTOT', 'OUVERT', 'FERME'].includes(s.status);
          const conditions = s ? [
            s.min_attendance_pct ? `Présence minimale : ${s.min_attendance_pct} %` : null,
            s.requires_final_validation ? 'Validation finale par l’organisateur' : null,
            s.requires_final_project ? 'Projet final requis' : null,
            s.requires_evaluation ? 'Évaluation requise' : null,
          ].filter(Boolean) as string[] : [];
          const materials = r.courses?.materials ?? [];
          return (
            <>
              <header className="space-y-3">
                <span className="badge-primary">Formation présentielle</span>
                <h1 className="text-3xl font-extrabold">Votre inscription</h1>
              </header>

              <section aria-label="Résumé de l’inscription" className="card divide-y divide-neutral-100 dark:divide-neutral-800">
                {([
                  ['Formation', r.courses?.title ?? '—'],
                  ['Session', s ? formatPeriod(s.starts_on, s.ends_on) : '—'],
                  ['Lieu', s ? [s.location, s.address].filter(Boolean).join(' — ') : '—'],
                ] as const).map(([k, v]) => <div key={k} className="flex flex-col gap-0.5 p-4 sm:flex-row sm:justify-between"><span className="text-sm text-neutral-500">{k}</span><span className="font-semibold sm:text-right">{v}</span></div>)}
                <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm text-neutral-500">Statut</span><span className="flex items-center gap-2"><span className="font-semibold">{registrationStatus[r.status].label}</span><RegistrationBadge status={r.status} /></span></div>
                <div className="flex flex-col gap-0.5 p-4 sm:flex-row sm:justify-between"><span className="text-sm text-neutral-500">Inscrit le</span><span className="font-semibold">{formatDate(r.registered_at)}</span></div>
              </section>

              {r.status === 'EN_ATTENTE' && <p role="status" className="rounded-xl border border-warning-500/40 bg-warning-500/5 p-4 text-sm">Ton inscription est en attente de confirmation. Tu seras prévenu dans l’application dès qu’elle sera traitée.</p>}
              {r.status === 'REFUSEE' && <p role="status" className="rounded-xl border border-error-500/40 bg-error-500/5 p-4 text-sm">Ton inscription n’a pas été retenue pour cette session. <Link to="/contact" className="underline">Contacte-nous</Link> pour en savoir plus.</p>}

              {s && (
                <section aria-labelledby="pratique" className="grid gap-4 md:grid-cols-2">
                  <div className="card space-y-2 p-5 text-sm">
                    <h2 id="pratique" className="font-bold">Informations pratiques</h2>
                    <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-neutral-400" aria-hidden="true" />{formatDay(s.starts_on)}{s.starts_on !== s.ends_on ? ` → ${formatDay(s.ends_on)}` : ''}</p>
                    {formatSchedule(s) && <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-neutral-400" aria-hidden="true" />{formatSchedule(s)}</p>}
                    <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-neutral-400" aria-hidden="true" />{s.location}</p>
                    {(s.trainer_name || r.courses?.trainer_name) && <p className="flex items-center gap-2"><UserRound className="h-4 w-4 text-neutral-400" aria-hidden="true" />{s.trainer_name || r.courses?.trainer_name}</p>}
                    {r.courses?.practical_info && <p className="whitespace-pre-line pt-1 text-neutral-600 dark:text-neutral-400">{r.courses.practical_info}</p>}
                  </div>
                  {materials.length > 0 && <div className="card space-y-2 p-5 text-sm"><h2 className="flex items-center gap-2 font-bold"><Package className="h-4 w-4" aria-hidden="true" />Matériel à apporter</h2><ul className="space-y-1">{materials.map((m) => <li key={m}>• {m}</li>)}</ul></div>}
                </section>
              )}

              {(r.status === 'CONFIRMEE' || r.status === 'PRESENT') && s && s.status !== 'TERMINEE' && s.status !== 'ANNULEE' && <CheckInQr token={r.checkin_token} />}

              {s && days.length > 0 && (r.status === 'CONFIRMEE' || r.status === 'PRESENT') && (
                <section aria-labelledby="presence" className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="presence" className="text-xl font-bold">Présence</h2>{stats.pct !== null && <Badge variant="neutral">{stats.attended} / {stats.held} jour{stats.held > 1 ? 's' : ''} pointé{stats.held > 1 ? 's' : ''} · {stats.pct} %</Badge>}</div>
                  <ul className="card divide-y divide-neutral-100 dark:divide-neutral-800">
                    {days.map((d) => { const a = myAtt.find((x) => x.attendance_date === d); const [lbl, v] = a ? ATT_LABEL[a.status] : ['Pas encore pointé', 'neutral'] as const;
                      return <li key={d} className="flex items-center justify-between p-3 text-sm"><span>{formatDay(d)}</span><Badge variant={v}>{lbl}</Badge></li>; })}
                  </ul>
                  <p className="text-xs text-neutral-500">La présence est enregistrée par le formateur : tu ne peux pas la modifier toi-même.</p>
                </section>
              )}

              {conditions.length > 0 && (
                <section aria-labelledby="conditions" className="card space-y-2 p-5 text-sm"><h2 id="conditions" className="font-bold">Conditions d’obtention du certificat</h2><ul className="space-y-1">{conditions.map((c) => <li key={c}>• {c}</li>)}</ul></section>
              )}

              {cert && (
                <section aria-labelledby="cert" className="card flex flex-wrap items-center justify-between gap-4 border-success-500/40 p-5">
                  <div><h2 id="cert" className="flex items-center gap-2 font-bold"><Award className="h-5 w-5 text-success-600" aria-hidden="true" />Certificat disponible</h2><p className="mt-1 text-sm text-neutral-500">N° {cert.certificate_number}{cert.status === 'REVOQUE' ? ' — révoqué' : ''}</p></div>
                  <div className="flex flex-wrap gap-2"><Button to={`/app/certificats/${cert.id}`} variant="outline">Voir mon certificat</Button><DownloadCertificateButton certificate={cert} /></div>
                </section>
              )}

              {s?.list_status === 'PUBLIEE' && <p className="text-sm"><Link to={`/formations/${r.courses?.slug}/sessions/${s.id}/liste`} className="font-semibold text-primary-600 underline dark:text-primary-300">Voir la liste officielle des participants</Link></p>}

              <section aria-labelledby="annonces" className="space-y-3">
                <h2 id="annonces" className="text-xl font-bold">Annonces</h2>
                {news.length === 0 ? <p className="text-sm text-neutral-500">Aucune annonce pour le moment.</p> : (
                  <ul className="space-y-2">{news.map((a) => <li key={a.id}><Link to={`/app/annonces/${a.id}`} className="card-hover block p-4"><p className="font-mono text-xs uppercase tracking-wide text-neutral-500">{announcementKinds[a.kind]} · {formatDate(a.published_at)}</p><p className="mt-1 font-semibold">{a.title}</p></Link></li>)}</ul>
                )}
              </section>

              {canCancel && <div><Button variant="ghost" onClick={() => setConfirm(true)}>Annuler mon inscription</Button></div>}
              <ConfirmDialog open={confirm} title="Annuler l’inscription" message="Ta place sera libérée pour un autre participant. Tu pourras te réinscrire si des places restent disponibles." confirmLabel="Annuler l’inscription" busy={busy} onConfirm={() => void cancel()} onCancel={() => setConfirm(false)} />
              {r.status === 'ANNULEE' && <Button variant="outline" onClick={() => navigate(`/formations/${r.courses?.slug ?? ''}`)}>Voir la formation</Button>}
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
