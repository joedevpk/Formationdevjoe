import { createElement } from 'react';
import type { Certificate } from '@/types';
import { certificateVerifyUrl } from '@/lib/site';

/** QR code de vérification (lien /verify-certificate/<numéro>). Renvoie null si la génération échoue : le PDF reste valide. */
export async function buildVerifyQr(number: string): Promise<string | null> {
  try {
    const QR = await import('qrcode');
    return await QR.toDataURL(certificateVerifyUrl(number), { margin: 1, width: 360, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } });
  } catch {
    return null;
  }
}

/** Génère le PDF réel (A4 paysage, texte sélectionnable). Les bibliothèques PDF ne sont chargées qu'à l'appel. */
export async function generateCertificatePdf(certificate: Certificate, issuerName?: string): Promise<Blob> {
  const [{ pdf }, { CertificatePdfDocument }, qr] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./CertificatePdf'),
    buildVerifyQr(certificate.certificate_number),
  ]);
  const el = createElement(CertificatePdfDocument, { certificate, qr, verifyUrl: certificateVerifyUrl(certificate.certificate_number), issuerName });
  return pdf(el as unknown as Parameters<typeof pdf>[0]).toBlob();
}

export const certificateFileName = (c: Pick<Certificate, 'certificate_number'>) => `Certificat-${c.certificate_number}.pdf`;

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
