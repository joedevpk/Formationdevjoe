import type { Certificate } from '@/types';
import { formatPeriod } from './format';
import { certDate, pdfSafe } from './certText';

/** Repère commun écran (px, A4 paysage à 96 dpi) et PDF (mis à l'échelle par le viewBox). */
export const CERT_W = 1123;
export const CERT_H = 794;
/** Zone de texte (à droite de la bande diagonale). */
export const CONTENT_X = 490;
export const CONTENT_W = 590;

export const CERT_COLORS = {
  navy: '#14275f', navyDeep: '#0b1b4a', ink: '#1e293b', gold: '#b88a1e', goldDark: '#7a5a12', grey: '#475569', rule: '#cbd2e1',
} as const;

export interface Grad { id: string; kind: 'linear' | 'radial'; stops: [number, string][]; x1?: number; y1?: number; x2?: number; y2?: number }
export interface Shape { d?: string; cx?: number; cy?: number; r?: number; fill: string; stroke?: string; strokeWidth?: number; opacity?: number; round?: boolean }

export const GRADIENTS: Grad[] = [
  { id: 'jdcBlue', kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 1, stops: [[0, '#0f3a96'], [0.55, '#0a2a78'], [1, '#061a52']] },
  { id: 'jdcBlueLight', kind: 'linear', x1: 0, y1: 1, x2: 1, y2: 0, stops: [[0, '#1d63d6'], [1, '#2f86ee']] },
  { id: 'jdcGold', kind: 'linear', x1: 0, y1: 0, x2: 0.4, y2: 1, stops: [[0, '#f7e6a6'], [0.3, '#d8a935'], [0.6, '#f3dc8b'], [1, '#9a7119']] },
  { id: 'jdcSeal', kind: 'radial', stops: [[0, '#fff3bf'], [0.55, '#e3b84a'], [1, '#a9791a']] },
  { id: 'jdcSealCore', kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 1, stops: [[0, '#fbeaa8'], [0.5, '#d9a93a'], [1, '#b2831f']] },
  { id: 'jdcPaper', kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 1, stops: [[0, '#ffffff'], [1, '#f4f6fb']] },
];

const F = 24; // marge du cadre
const EDGE_TOP = 210; const EDGE_BOT = 430; // arête de la bande bleue (haut / bas)
const B = CERT_H - F;

function burst(cx: number, cy: number, rOut: number, rIn: number, n: number): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n - Math.PI / 2;
    const r = i % 2 === 0 ? rOut : rIn;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

const SX = 268; const SY = 332; // centre du sceau (à cheval sur le liseré doré)

/** Décor : bande bleue diagonale, liserés dorés, sceau doré « </> », cadre. Dessiné dans le même repère pour l'écran et le PDF. */
export const ART: Shape[] = [
  { d: `M0 0 H${CERT_W} V${CERT_H} H0 Z`, fill: 'url(#jdcPaper)' },
  { d: `M${F} ${F} L${EDGE_TOP} ${F} L${EDGE_BOT} ${B} L${F} ${B} Z`, fill: 'url(#jdcBlue)' },
  { d: `M${F} ${F} L${F} 300 L118 ${F} Z`, fill: '#071c58', opacity: 0.9 },
  { d: `M${F} ${B} L${F} 470 L280 ${B} Z`, fill: 'url(#jdcBlueLight)', opacity: 0.92 },
  { d: `M${F} ${B} L${F} 610 L170 ${B} Z`, fill: '#3b92f0', opacity: 0.9 },
  { d: `M${EDGE_TOP} ${F} L${EDGE_TOP + 24} ${F} L${EDGE_BOT + 24} ${B} L${EDGE_BOT} ${B} Z`, fill: 'url(#jdcGold)' },
  { d: `M${EDGE_TOP + 38} ${F} L${EDGE_TOP + 44} ${F} L${EDGE_BOT + 44} ${B} L${EDGE_BOT + 38} ${B} Z`, fill: 'url(#jdcGold)' },
  // sceau
  { cx: SX + 2, cy: SY + 4, r: 86, fill: '#0b1b4a', opacity: 0.14 },
  { d: burst(SX, SY, 88, 81, 40), fill: 'url(#jdcSeal)', stroke: '#8a6414', strokeWidth: 1 },
  { cx: SX, cy: SY, r: 71, fill: 'none', stroke: '#8a6414', strokeWidth: 1.8 },
  { cx: SX, cy: SY, r: 64, fill: 'none', stroke: '#fbeaa8', strokeWidth: 1.2 },
  { cx: SX, cy: SY, r: 54, fill: 'url(#jdcSealCore)', stroke: '#8a6414', strokeWidth: 1.6 },
  { d: `M${SX - 15} ${SY - 20} L${SX - 37} ${SY} L${SX - 15} ${SY + 20}`, fill: 'none', stroke: '#6b4b0c', strokeWidth: 6.5, round: true },
  { d: `M${SX + 15} ${SY - 20} L${SX + 37} ${SY} L${SX + 15} ${SY + 20}`, fill: 'none', stroke: '#6b4b0c', strokeWidth: 6.5, round: true },
  { d: `M${SX + 7} ${SY - 27} L${SX - 7} ${SY + 27}`, fill: 'none', stroke: '#6b4b0c', strokeWidth: 6.5, round: true },
  // cadre
  { d: `M${F} ${F} H${CERT_W - F} V${B} H${F} Z`, fill: 'none', stroke: CERT_COLORS.navyDeep, strokeWidth: 1.6 },
];

/** « ALICE MUKENDI » → « Alice Mukendi » (mots en capitales de 3 lettres et plus) : plus lisible en écriture calligraphique. */
export function prettyName(raw: string | null | undefined): string {
  const s = pdfSafe(raw).trim().replace(/\s+/g, ' ');
  if (!s) return '';
  return s.split(' ').map((w) => (w.length >= 3 && w === w.toUpperCase() && w !== w.toLowerCase()
    ? w.toLowerCase().replace(/(^|[-’'])(\p{L})/gu, (_m, p: string, ch: string) => p + ch.toUpperCase())
    : w)).join(' ');
}

/** Taille (px écran) du texte calligraphique selon sa longueur : un nom ou une formation très longs ne débordent jamais. */
export const nameSize = (len: number) => (len <= 16 ? 60 : len <= 24 ? 50 : len <= 32 ? 41 : len <= 42 ? 33 : 27);
export const courseSize = (len: number) => (len <= 22 ? 44 : len <= 30 ? 38 : len <= 38 ? 32 : len <= 48 ? 27 : 23);

export interface CertView {
  holder: string; course: string; trainer: string; period: string; duration: string; place: string; date: string; number: string;
}
export function certView(c: Certificate): CertView {
  return {
    holder: prettyName(c.holder_name) || 'Participant',
    course: pdfSafe(c.course_title).trim() || 'Formation',
    trainer: pdfSafe(c.trainer_name).trim(),
    period: pdfSafe(formatPeriod(c.period_start, c.period_end)),
    duration: pdfSafe(c.duration_label).trim(),
    place: pdfSafe(c.location).trim(),
    date: certDate(c.issued_at),
    number: c.certificate_number,
  };
}

export const CERT_TEXT = {
  brand: 'JOE DEV CODES', title1: 'CERTIFICAT', title2: 'DE FORMATION',
  lead: 'CE CERTIFICAT EST DÉCERNÉ PAR JOE DEV CODES À',
  because: 'POUR AVOIR SUIVI ET VALIDÉ AVEC SUCCÈS LA FORMATION',
  trainedBy: 'ANIMÉE PAR', period: 'PÉRIODE', duration: 'DURÉE', madeAt: 'FAIT À', on: 'LE',
  trainerRole: 'LE FORMATEUR', directorRole: 'LE RESPONSABLE', scan: 'Scannez pour vérifier',
} as const;
