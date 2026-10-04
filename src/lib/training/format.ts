import type { AnnouncementKind, AnnouncementVisibility, RegistrationStatus, SessionStatus, TrainingSession } from './types';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral';

/** « YYYY-MM-DD » → Date locale (jamais décalée par le fuseau horaire). */
export function parseDay(day: string | null | undefined): Date | null {
  if (!day) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const fr = 'fr-FR';

export function formatDay(day: string | null | undefined): string {
  const d = parseDay(day);
  return d ? d.toLocaleDateString(fr, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
}

/** « 15–20 novembre 2026 », « 28 novembre – 2 décembre 2026 », « 15 novembre 2026 ». */
export function formatPeriod(start: string | null | undefined, end: string | null | undefined): string {
  const a = parseDay(start); const b = parseDay(end ?? start);
  if (!a || !b) return '';
  if (a.getTime() === b.getTime()) return formatDay(start);
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (sameMonth) return `${a.getDate()}–${b.getDate()} ${b.toLocaleDateString(fr, { month: 'long', year: 'numeric' })}`;
  if (a.getFullYear() === b.getFullYear()) return `${a.toLocaleDateString(fr, { day: 'numeric', month: 'long' })} – ${formatDay(end)}`;
  return `${formatDay(start)} – ${formatDay(end)}`;
}

/** Libellé court sans année pour une carte : « 15–20 novembre ». */
export function formatPeriodShort(start: string, end: string): string {
  const a = parseDay(start); const b = parseDay(end);
  if (!a || !b) return '';
  if (a.getTime() === b.getTime()) return a.toLocaleDateString(fr, { day: 'numeric', month: 'long' });
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${a.getDate()}–${b.getDate()} ${b.toLocaleDateString(fr, { month: 'long' })}`;
  return `${a.toLocaleDateString(fr, { day: 'numeric', month: 'long' })} – ${b.toLocaleDateString(fr, { day: 'numeric', month: 'long' })}`;
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '');
export function formatSchedule(s: Pick<TrainingSession, 'daily_start' | 'daily_end' | 'schedule_note'>): string {
  const range = s.daily_start && s.daily_end ? `${hhmm(s.daily_start)} – ${hhmm(s.daily_end)}` : s.daily_start ? `à partir de ${hhmm(s.daily_start)}` : '';
  return [range, s.schedule_note].filter(Boolean).join(' · ');
}

/** Liste des jours (YYYY-MM-DD) d'une session, plafonnée pour éviter toute boucle démesurée. */
export function sessionDays(s: Pick<TrainingSession, 'starts_on' | 'ends_on'>): string[] {
  const a = parseDay(s.starts_on); const b = parseDay(s.ends_on);
  if (!a || !b) return [];
  const out: string[] = [];
  for (let d = new Date(a), i = 0; d <= b && i < 366; d.setDate(d.getDate() + 1), i += 1) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return out;
}

export const todayDay = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ───────── Statuts ─────────
export interface DisplayStatus { key: string; label: string; variant: BadgeVariant; canRegister: boolean }

/** Statut affiché publiquement : issu de la base (statut + places confirmées), jamais inventé. */
export function displaySessionStatus(s: Pick<TrainingSession, 'status' | 'capacity'>, taken: number): DisplayStatus {
  switch (s.status as SessionStatus) {
    case 'ANNULEE': return { key: 'annulee', label: 'Annulée', variant: 'error', canRegister: false };
    case 'TERMINEE': return { key: 'terminee', label: 'Terminée', variant: 'neutral', canRegister: false };
    case 'EN_COURS': return { key: 'en_cours', label: 'En cours', variant: 'primary', canRegister: false };
    case 'FERME': return { key: 'ferme', label: 'Inscriptions fermées', variant: 'neutral', canRegister: false };
    case 'BIENTOT': return { key: 'bientot', label: 'Bientôt disponible', variant: 'warning', canRegister: false };
    case 'OUVERT': return taken >= s.capacity
      ? { key: 'complet', label: 'Complet', variant: 'error', canRegister: false }
      : { key: 'ouvert', label: 'Inscriptions ouvertes', variant: 'success', canRegister: true };
    default: return { key: 'brouillon', label: 'Brouillon', variant: 'neutral', canRegister: false };
  }
}

export const sessionStatusLabels: Record<SessionStatus, string> = {
  BROUILLON: 'Brouillon', BIENTOT: 'Bientôt disponible', OUVERT: 'Inscriptions ouvertes', FERME: 'Inscriptions fermées',
  EN_COURS: 'En cours', TERMINEE: 'Terminée', ANNULEE: 'Annulée',
};

export const registrationStatus: Record<RegistrationStatus, { label: string; short: string; variant: BadgeVariant }> = {
  EN_ATTENTE: { label: 'Inscription en attente de confirmation', short: 'En attente', variant: 'warning' },
  CONFIRMEE: { label: 'Inscription confirmée', short: 'Confirmée', variant: 'success' },
  REFUSEE: { label: 'Inscription refusée', short: 'Refusée', variant: 'error' },
  ANNULEE: { label: 'Inscription annulée', short: 'Annulée', variant: 'neutral' },
  PRESENT: { label: 'Participation confirmée (présent)', short: 'Présent', variant: 'success' },
};

export const announcementKinds: Record<AnnouncementKind, string> = {
  INFORMATION: 'Information importante', CHANGEMENT_SALLE: 'Changement de salle', CHANGEMENT_HORAIRE: 'Changement d’horaire', RAPPEL: 'Rappel avant la formation',
  OUVERTURE_INSCRIPTIONS: 'Ouverture des inscriptions', FERMETURE_INSCRIPTIONS: 'Fermeture des inscriptions', LISTE_PUBLIEE: 'Publication de la liste des participants',
  MATERIEL: 'Matériel à apporter', REPORT: 'Report d’une séance', ANNULATION: 'Annulation', RESULTATS: 'Publication des résultats', CERTIFICATS: 'Disponibilité des certificats',
};

export const visibilityLabels: Record<AnnouncementVisibility, string> = {
  PUBLIC: 'Public', PARTICIPANTS: 'Participants', FORMATEURS: 'Formateurs', ADMIN: 'Administrateurs',
};

// ───────── Erreurs serveur → messages lisibles ─────────
const MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: 'Connecte-toi pour continuer.',
  NOT_OPEN: 'Les inscriptions ne sont pas ouvertes pour cette session.',
  SESSION_FULL: 'Cette session est complète.',
  ALREADY_REGISTERED: 'Tu es déjà inscrit à cette session.',
  REGISTRATION_REFUSED: 'Ton inscription à cette session a été refusée.',
  INVALID_NAME: 'Renseigne ton prénom et ton nom.',
  INVALID_PHONE: 'Numéro de téléphone invalide.',
  CANNOT_CANCEL: 'Cette inscription ne peut plus être annulée.',
  FORBIDDEN: 'Action non autorisée.',
  SESSION_NOT_COMPLETED: 'La formation doit d’abord être marquée « Terminée ».',
  SESSION_NOT_FOUND: 'Session introuvable.',
  EMPTY_LIST: 'Sélectionne au moins un participant avant de publier la liste.',
  NOT_CONFIRMED: 'Ce participant n’est pas confirmé.',
  DATE_OUT_OF_RANGE: 'Cette date est hors des dates de la session.',
  INVALID_TOKEN: 'QR code non reconnu.',
  SESSION_NOT_ACTIVE: 'La session n’est pas active.',
  COURSE_HAS_CERTIFICATES: 'Des certificats ont été délivrés : archive la formation au lieu de la supprimer.',
  CERTIFICATE_NOT_FOUND: 'Certificat introuvable ou déjà dans cet état.',
  CERTIFICATE_EXISTS: 'Un certificat existe déjà pour cet apprenant (même formation / session).',
  LEARNER_NOT_FOUND: 'Apprenant introuvable.',
  COURSE_NOT_FOUND: 'Formation introuvable.',
  HOLDER_NAME_REQUIRED: 'Renseigne le nom à inscrire sur le certificat (150 caractères maximum).',
  INVALID_DATE: 'Dates invalides : la fin ne peut pas précéder le début, et la date de délivrance ne peut pas être dans le futur.',
};

/** Extrait le code métier levé par la base (RAISE EXCEPTION 'CODE') ; sinon message générique (jamais de détail technique). */
export function trainingError(err: unknown, fallback = 'Action impossible pour le moment. Réessaie dans un instant.'): string {
  const raw = typeof err === 'string' ? err : (err as { message?: string } | null)?.message ?? '';
  for (const code of Object.keys(MESSAGES)) if (raw.includes(code)) return MESSAGES[code];
  if (/Failed to fetch|NetworkError|network/i.test(raw)) return 'Connexion impossible. Vérifie ta connexion puis réessaie.';
  return fallback;
}
