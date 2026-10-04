/** URL publique configurée au build (SITE_URL). Chaîne vide si absente : aucune URL n'est jamais inventée. */
export const SITE_URL: string = typeof __SITE_URL__ === 'string' ? __SITE_URL__ : '';
export const CV_PATH = '/cv';
/** URL absolue du CV pour le QR code : exige SITE_URL. */
export const cvQrUrl = (): string | null => (SITE_URL ? `${SITE_URL}${CV_PATH}` : null);
/** URL du CV pour le partage : domaine configuré, sinon domaine courant du navigateur (réel, jamais fictif). */
export const cvShareUrl = (): string => `${SITE_URL || window.location.origin}${CV_PATH}`;
/** Lien public de vérification d'un certificat (domaine configuré, sinon domaine courant : jamais fictif). */
export const certificateVerifyUrl = (number: string): string => `${SITE_URL || window.location.origin}/verify-certificate/${encodeURIComponent(number)}`;
/** URL encodée dans le QR code de pointage d'un participant (ouverte par le staff connecté). */
export const checkInUrl = (token: string): string => `${SITE_URL || window.location.origin}/studio/pointage/${encodeURIComponent(token)}`;
