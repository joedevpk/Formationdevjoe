import { useEffect, useRef, useState } from 'react';
import { Download, Link2, Share2 } from 'lucide-react';
import type { Certificate } from '@/types';
import { ART, CERT_COLORS as C, CERT_H, CERT_TEXT as T, CERT_W, CONTENT_W, CONTENT_X, GRADIENTS, certView, courseSize, nameSize } from '@/lib/training/certArt';
import { certificateVerifyUrl } from '@/lib/site';

const SCRIPT = "'JDC Script','Apple Chancery','URW Chancery L','Brush Script MT',cursive";
const SERIF = "'Times New Roman',Times,serif";

function CertificateArt() {
  return (
    <svg viewBox={`0 0 ${CERT_W} ${CERT_H}`} width={CERT_W} height={CERT_H} className="absolute inset-0" aria-hidden="true">
      <defs>
        {GRADIENTS.map((g) => g.kind === 'linear'
          ? <linearGradient key={g.id} id={g.id} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>{g.stops.map(([o, c]) => <stop key={o} offset={`${o * 100}%`} stopColor={c} />)}</linearGradient>
          : <radialGradient key={g.id} id={g.id} cx="0.5" cy="0.5" r="0.5">{g.stops.map(([o, c]) => <stop key={o} offset={`${o * 100}%`} stopColor={c} />)}</radialGradient>)}
      </defs>
      {ART.map((a, i) => (a.d
        ? <path key={i} d={a.d} fill={a.fill} stroke={a.stroke} strokeWidth={a.strokeWidth} opacity={a.opacity} strokeLinecap={a.round ? 'round' : undefined} strokeLinejoin={a.round ? 'round' : undefined} />
        : <circle key={i} cx={a.cx} cy={a.cy} r={a.r} fill={a.fill} stroke={a.stroke} strokeWidth={a.strokeWidth} opacity={a.opacity} />))}
    </svg>
  );
}

const line = { flex: 1, borderBottom: `1px solid ${C.rule}`, textAlign: 'center' as const };

/** Aperçu du certificat à l'écran, mis à l'échelle pour tenir dans la colonne. Même dessin et même contenu que le PDF. */
export function CertificateSheet({ certificate: c, qr }: { certificate: Certificate; qr?: string | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setScale(Math.min(1, el.clientWidth / CERT_W));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const v = certView(c);
  const facts = [v.period && `${T.period} : ${v.period}`, v.duration && `${T.duration} : ${v.duration}`].filter(Boolean).join('   ·   ');
  return (
    <div ref={box} className="w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 shadow-glass dark:border-neutral-800 dark:bg-neutral-900" style={{ height: CERT_H * scale }}>
      <div role="img" aria-label={`Certificat de formation ${c.certificate_number}`} style={{ width: CERT_W, height: CERT_H, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'relative', fontFamily: SERIF, color: C.ink }}>
        <CertificateArt />
        <div style={{ position: 'absolute', top: 0, left: CONTENT_X, width: CONTENT_W, height: CERT_H, padding: '46px 0 30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: 30, height: 30, borderRadius: 6, background: C.navyDeep, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ui-monospace,Menlo,monospace', fontWeight: 700, fontSize: 10.5 }}>JDC</span>
            <span style={{ marginLeft: 8, background: C.gold, color: '#fff', padding: '6px 18px', fontFamily: 'Arial,Helvetica,sans-serif', fontWeight: 700, fontSize: 12, letterSpacing: '0.3em' }}>{T.brand}</span>
          </div>
          <div style={{ marginTop: 14, fontWeight: 700, fontSize: 66, letterSpacing: '0.04em', color: C.navy, lineHeight: 1 }}>{T.title1}</div>
          <div style={{ marginTop: 2, fontWeight: 700, fontSize: 29, letterSpacing: '0.17em', color: C.navy, lineHeight: 1.1 }}>{T.title2}</div>
          <div style={{ marginTop: 20, fontSize: 11.5, letterSpacing: '0.14em', textAlign: 'center' }}>{T.lead}</div>
          <div style={{ marginTop: 8, alignSelf: 'stretch', textAlign: 'center', fontFamily: SCRIPT, color: C.navy, fontSize: nameSize(v.holder.length), lineHeight: 1.15, borderBottom: `1px solid ${C.rule}` }}>{v.holder}</div>
          <div style={{ marginTop: 12, fontSize: 11.5, letterSpacing: '0.12em', textAlign: 'center' }}>{T.because}</div>
          <div style={{ marginTop: 8, alignSelf: 'stretch', textAlign: 'center', fontFamily: SCRIPT, color: C.navy, fontSize: courseSize(v.course.length), lineHeight: 1.15, borderBottom: `1px solid ${C.rule}` }}>{v.course}</div>
          {v.trainer && (
            <div style={{ display: 'flex', alignItems: 'flex-end', alignSelf: 'stretch', marginTop: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 10.5, letterSpacing: '0.13em', marginRight: 8, marginBottom: 3 }}>{T.trainedBy}</span>
              <span style={{ ...line, fontFamily: SCRIPT, color: C.navy, fontSize: 25, lineHeight: 1.2 }}>{v.trainer}</span>
            </div>
          )}
          {facts && <div style={{ marginTop: 12, fontSize: 11, letterSpacing: '0.07em', color: C.grey, textAlign: 'center' }}>{facts}</div>}
          <div style={{ display: 'flex', alignItems: 'flex-end', alignSelf: 'stretch', marginTop: 14 }}>
            {v.place && (<>
              <span style={{ fontWeight: 700, fontSize: 10.5, letterSpacing: '0.13em', marginRight: 8, marginBottom: 3 }}>{T.madeAt}</span>
              <span style={{ ...line, fontFamily: SCRIPT, color: C.navy, fontSize: 25, lineHeight: 1.2 }}>{v.place}</span>
              <span style={{ width: 22 }} />
            </>)}
            <span style={{ fontWeight: 700, fontSize: 10.5, letterSpacing: '0.13em', marginRight: 8, marginBottom: 3 }}>{T.on}</span>
            <span style={{ ...line, flex: v.place ? 'none' : 1, width: v.place ? 190 : undefined, fontFamily: SCRIPT, color: C.navy, fontSize: 25, lineHeight: 1.2 }}>{v.date}</span>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch' }}>
            <div style={{ width: 150, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {qr ? <img src={qr} alt="QR code de vérification du certificat" width={92} height={92} style={{ width: 92, height: 92 }} /> : null}
              <span style={{ marginTop: 3, fontFamily: 'Arial,Helvetica,sans-serif', fontSize: 8.5, color: C.grey }}>{qr ? T.scan : 'Vérification en ligne'}</span>
              <span style={{ marginTop: 2, fontFamily: 'ui-monospace,Menlo,monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.06em', color: C.navy }}>{v.number}</span>
            </div>
            {[[v.trainer || '\u00a0', T.trainerRole], ['JOE DEV CODES', T.directorRole]].map(([n, role]) => (
              <div key={role} style={{ width: 190, textAlign: 'center' }}>
                <div style={{ height: 40, fontFamily: SCRIPT, color: C.navy, fontSize: 27, lineHeight: '40px', whiteSpace: 'nowrap' }}>{n}</div>
                <div style={{ borderBottom: `1.2px solid ${C.navyDeep}` }} />
                <div style={{ marginTop: 4, fontWeight: 700, fontSize: 10, letterSpacing: '0.12em' }}>{role}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontFamily: 'Arial,Helvetica,sans-serif', fontSize: 8, color: C.grey, textAlign: 'center' }}>Certificat de formation délivré par JOE DEV CODES · Vérification : {certificateVerifyUrl(c.certificate_number)}</div>
        </div>
      </div>
    </div>
  );
}

/** Télécharge le PDF réel ; les bibliothèques ne sont chargées qu'au clic. */
export function DownloadCertificateButton({ certificate, className = 'btn-primary px-5 py-2.5', label = 'Télécharger le certificat PDF' }: { certificate: Certificate; className?: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const run = async () => {
    setState('busy');
    try {
      const g = await import('@/lib/training/pdf/generate');
      g.saveBlob(await g.generateCertificatePdf(certificate), g.certificateFileName(certificate));
      setState('idle');
    } catch (e) {
      console.error('[certificat] génération PDF', e);
      setState('error');
    }
  };
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" onClick={() => void run()} disabled={state === 'busy' || certificate.status === 'REVOQUE'} className={className}>
        <Download className="h-4 w-4" aria-hidden="true" />{state === 'busy' ? 'Génération du PDF…' : label}
      </button>
      {state === 'error' && <span role="alert" className="text-xs text-error-600 dark:text-error-400">Impossible de générer le PDF pour le moment. Réessaie.</span>}
    </span>
  );
}

/** Copie le lien public de vérification, ou ouvre le partage natif quand le navigateur le propose. */
export function ShareCertificateButton({ certificate, className = 'btn-outline px-5 py-2.5', label = 'Partager mon certificat' }: { certificate: Certificate; className?: string; label?: string }) {
  const [status, setStatus] = useState<'idle' | 'copied'>('idle');
  const share = async () => {
    const url = certificateVerifyUrl(certificate.certificate_number);
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: `Certificat — ${certificate.course_title ?? 'Formation'}`, url }); return; } catch (e) {
        if ((e as DOMException).name === 'AbortError') return;
      }
    }
    try { await navigator.clipboard.writeText(url); setStatus('copied'); window.setTimeout(() => setStatus('idle'), 2500); }
    catch { window.prompt('Copie ce lien :', url); }
  };
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={() => void share()} className={className}>
        {status === 'copied' ? <Link2 className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}{label}
      </button>
      <span role="status" aria-live="polite" className="text-xs text-success-700 dark:text-success-300">{status === 'copied' ? 'Lien copié' : ''}</span>
    </span>
  );
}
