import { createElement } from 'react';
import type { CvData, CvTemplate } from '../types';
import { fullName } from '../format';
import { cvQrUrl } from '@/lib/site';
import { slugify } from '@/utils';

/**
 * Charge l'image (CORS) et la convertit en JPEG (le PDF n'accepte pas WebP). Renvoie null en cas d'échec :
 * le CV est alors généré sans photo plutôt que de planter.
 */
export function toJpegDataUrl(url: string | null | undefined, maxSide = 480): Promise<string | null> {
  if (!url || typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => resolve(null), 8000);
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * ratio));
        const h = Math.max(1, Math.round(img.naturalHeight * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch {
        resolve(null); // canvas « teinté » (CORS) ou format non décodable
      }
    };
    img.onerror = () => { window.clearTimeout(timer); resolve(null); };
    img.src = url;
  });
}

/** QR code vers /cv — uniquement si SITE_URL est configuré (jamais de faux domaine) et si le CV l'autorise. */
export async function buildQr(show: boolean): Promise<string | null> {
  const url = cvQrUrl();
  if (!show || !url) return null;
  try {
    const QR = await import('qrcode');
    return await QR.toDataURL(url, { margin: 1, width: 220, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } });
  } catch {
    return null;
  }
}

/** Génère le PDF (A4, texte sélectionnable, liens cliquables). Les bibliothèques ne sont chargées qu'à l'appel. */
export async function generateCvPdf(data: CvData, template?: CvTemplate): Promise<Blob> {
  const [{ pdf }, { CvPdfDocument }, photo, qr] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./CvPdf'),
    toJpegDataUrl(data.profile.photo_url),
    buildQr(data.profile.show_qr),
  ]);
  // Le composant renvoie bien un <Document> ; react-pdf exige ce type d'élément à la racine.
  return pdf(createElement(CvPdfDocument, { data, template, photo, qr }) as unknown as Parameters<typeof pdf>[0]).toBlob();
}

export const cvFileName = (data: CvData) => `CV-${slugify(fullName(data)) || 'cv'}.pdf`;

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
