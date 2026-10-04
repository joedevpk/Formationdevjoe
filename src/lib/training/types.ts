export type SessionStatus = 'BROUILLON' | 'BIENTOT' | 'OUVERT' | 'FERME' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
export type RegistrationStatus = 'EN_ATTENTE' | 'CONFIRMEE' | 'REFUSEE' | 'ANNULEE' | 'PRESENT';
export type ValidationStatus = 'A_VALIDER' | 'VALIDE' | 'NON_VALIDE';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'RETARD';
export type AnnouncementVisibility = 'PUBLIC' | 'PARTICIPANTS' | 'FORMATEURS' | 'ADMIN';
export type AnnouncementStatus = 'BROUILLON' | 'PUBLIEE' | 'ARCHIVEE';
export type AnnouncementKind =
  | 'INFORMATION' | 'CHANGEMENT_SALLE' | 'CHANGEMENT_HORAIRE' | 'RAPPEL' | 'OUVERTURE_INSCRIPTIONS' | 'FERMETURE_INSCRIPTIONS'
  | 'LISTE_PUBLIEE' | 'MATERIEL' | 'REPORT' | 'ANNULATION' | 'RESULTATS' | 'CERTIFICATS';

export interface TrainingSession {
  id: string;
  course_id: string;
  title: string | null;
  starts_on: string;
  ends_on: string;
  daily_start: string | null;
  daily_end: string | null;
  schedule_note: string | null;
  location: string;
  address: string | null;
  trainer_id: string | null;
  trainer_name: string | null;
  capacity: number;
  status: SessionStatus;
  min_attendance_pct: number | null;
  requires_final_validation: boolean;
  requires_final_project: boolean;
  requires_evaluation: boolean;
  list_status: 'PRIVEE' | 'PUBLIEE';
  list_visibility: 'PUBLIC' | 'PARTICIPANTS';
  list_published_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Session + places confirmées (agrégat public, issu de training_seats). */
export interface SessionWithSeats extends TrainingSession { taken: number }

export interface TrainingRegistration {
  id: string;
  session_id: string;
  course_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: RegistrationStatus;
  registered_at: string;
  listed: boolean;
  validation_status: ValidationStatus;
  validated_at: string | null;
  final_project_ok: boolean;
  evaluation_ok: boolean;
  checkin_token: string;
}

export interface TrainingAnnouncement {
  id: string;
  course_id: string | null;
  session_id: string | null;
  kind: AnnouncementKind;
  title: string;
  content: string;
  image_url: string | null;
  visibility: AnnouncementVisibility;
  status: AnnouncementStatus;
  published_at: string | null;
  expires_at: string | null;
  author_id: string | null;
  created_at: string;
}

export interface TrainingAttendance {
  id: string;
  session_id: string;
  registration_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  method: 'MANUEL' | 'QR';
  marked_at: string;
}

export interface VerifiedCertificate {
  found: boolean;
  status?: 'VALIDE' | 'REVOQUE';
  certificate_number?: string;
  holder_name?: string | null;
  course_title?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  duration_label?: string | null;
  location?: string | null;
  trainer_name?: string | null;
  issued_at?: string;
  revoked_at?: string | null;
}

export interface PublishedList {
  access: 'NOT_PUBLISHED' | 'LOGIN_REQUIRED' | 'FORBIDDEN' | 'PUBLIC' | 'PARTICIPANTS';
  rows: { number: number; first_name: string; last_name: string }[];
  published_at?: string | null;
}
