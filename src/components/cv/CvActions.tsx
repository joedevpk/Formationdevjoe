import { useState } from 'react';
import { Download, Link2, Share2 } from 'lucide-react';
import type { CvData, CvTemplate } from '@/lib/cv/types';
import { cvShareUrl } from '@/lib/site';
import { fullName } from '@/lib/cv/format';

/** Télécharge le PDF réel. Les bibliothèques PDF (lourdes) ne sont chargées qu'au premier clic. */
export function DownloadCvButton({ data, template, label = 'Télécharger le CV', className = 'btn-primary px-5 py-2.5' }: { data: CvData | null; template?: CvTemplate; label?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const run = async () => {
    if (!data) return;
    setBusy(true);
    setError(false);
    try {
      const { generateCvPdf, cvFileName, saveBlob } = await import('@/lib/cv/pdf/generate');
      saveBlob(await generateCvPdf(data, template), cvFileName(data));
    } catch (e) {
      console.error('[cv] génération PDF', e);
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" onClick={() => void run()} disabled={busy || !data} className={className}>
        <Download className="h-4 w-4" aria-hidden="true" />{busy ? 'Génération du PDF…' : label}
      </button>
      {error && <span role="alert" className="text-xs text-error-600 dark:text-error-400">Impossible de générer le PDF pour le moment. Réessayez.</span>}
    </span>
  );
}

/** Copier le lien, ou menu de partage natif (Web Share API) quand le navigateur le propose. */
export function ShareCvButton({ data, className = 'btn-outline px-5 py-2.5' }: { data?: CvData | null; className?: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch {
      // Contexte non sécurisé / permission refusée : repli manuel
      window.prompt('Copie ce lien :', url);
      setStatus('idle');
      return;
    }
    window.setTimeout(() => setStatus('idle'), 2500);
  };

  const share = async () => {
    const url = cvShareUrl();
    const title = data ? `CV — ${fullName(data)}` : 'CV';
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title, url }); return; } catch (e) {
        if ((e as DOMException).name === 'AbortError') return; // l'utilisateur a fermé le menu
      }
    }
    await copy(url);
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={() => void share()} className={className}>
        {status === 'copied' ? <Link2 className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}Partager mon CV
      </button>
      <span role="status" aria-live="polite" className="text-xs text-success-700 dark:text-success-300">{status === 'copied' ? 'Lien copié' : ''}</span>
    </span>
  );
}
