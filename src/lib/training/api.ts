import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type {
  PublishedList, SessionWithSeats, TrainingAnnouncement, TrainingAttendance, TrainingRegistration, TrainingSession, VerifiedCertificate,
} from './types';
import type { Certificate, Course } from '@/types';

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Appel RPC : lève une Error dont le message contient le code métier (voir trainingError). */
export async function rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/** Sessions visibles publiquement (RLS : hors brouillon, formation publiée) + places confirmées (agrégat). */
export function useSessions() {
  return useQuery({
    queryKey: ['training-sessions'],
    queryFn: async (): Promise<SessionWithSeats[]> => {
      if (!isSupabaseConfigured) return [];
      const rows = (unwrap(await supabase.from('training_sessions').select('*').neq('status', 'BROUILLON').order('starts_on')) ?? []) as TrainingSession[];
      if (rows.length === 0) return [];
      const seats = (await rpc<{ session_id: string; taken: number }[] | null>('training_seats', { p_session_ids: rows.map((r) => r.id) })) ?? [];
      const taken = new Map(seats.map((s) => [s.session_id, s.taken]));
      return rows.map((r) => ({ ...r, taken: taken.get(r.id) ?? 0 }));
    },
  });
}

export interface MyRegistration extends TrainingRegistration {
  training_sessions: TrainingSession | null;
  courses: Pick<Course, 'title' | 'slug' | 'image_url' | 'duration' | 'trainer_name' | 'materials' | 'practical_info' | 'level'> | null;
}

const REG_SELECT = '*, training_sessions(*), courses(title,slug,image_url,duration,trainer_name,materials,practical_info,level)';

export function useMyRegistrations(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-registrations', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MyRegistration[]> =>
      (unwrap(await supabase.from('training_registrations').select(REG_SELECT).eq('user_id', userId as string).order('registered_at', { ascending: false })) ?? []) as unknown as MyRegistration[],
  });
}

export function useMyRegistration(id: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['my-registration', id, userId],
    enabled: Boolean(id && userId),
    queryFn: async (): Promise<MyRegistration | null> =>
      unwrap(await supabase.from('training_registrations').select(REG_SELECT).eq('id', id as string).eq('user_id', userId as string).maybeSingle()) as unknown as MyRegistration | null,
  });
}

export function useMyAttendance(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-attendance', userId],
    enabled: Boolean(userId),
    // RLS : le participant ne voit que ses propres présences (enregistrées côté serveur).
    queryFn: async (): Promise<TrainingAttendance[]> =>
      (unwrap(await supabase.from('training_attendance').select('*').order('attendance_date')) ?? []) as TrainingAttendance[],
  });
}

/** Annonces visibles par l'utilisateur courant (la RLS applique PUBLIC / PARTICIPANTS / FORMATEURS / ADMIN, publication, expiration). */
export function useAnnouncements(userId?: string | null) {
  return useQuery({
    queryKey: ['training-announcements', userId ?? 'anon'],
    queryFn: async (): Promise<TrainingAnnouncement[]> => {
      if (!isSupabaseConfigured) return [];
      return (unwrap(await supabase.from('training_announcements').select('*').eq('status', 'PUBLIEE').order('published_at', { ascending: false })) ?? []) as TrainingAnnouncement[];
    },
  });
}

export function useMyTrainingCertificates(userId: string | undefined) {
  return useQuery({
    queryKey: ['certificates', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Certificate[]> =>
      (unwrap(await supabase.from('certificates').select('*').eq('user_id', userId as string).order('issued_at', { ascending: false })) ?? []) as Certificate[],
  });
}

export function useCertificate(id: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['certificate', id, userId],
    enabled: Boolean(id && userId),
    queryFn: async (): Promise<Certificate | null> =>
      unwrap(await supabase.from('certificates').select('*').eq('id', id as string).maybeSingle()) as Certificate | null,
  });
}

export function useVerifiedCertificate(number: string | undefined) {
  return useQuery({
    queryKey: ['verify-certificate', number],
    enabled: Boolean(number),
    retry: false,
    queryFn: async (): Promise<VerifiedCertificate> => {
      if (!isSupabaseConfigured) return { found: false };
      return (await rpc<VerifiedCertificate>('verify_certificate', { p_number: number })) ?? { found: false };
    },
  });
}

export function usePublishedList(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['published-list', sessionId],
    enabled: Boolean(sessionId),
    retry: false,
    queryFn: async (): Promise<PublishedList> => (await rpc<PublishedList>('get_published_list', { p_session_id: sessionId })) ?? { access: 'NOT_PUBLISHED', rows: [] },
  });
}

/** Pourcentage de présence (présent + retard) sur les jours effectivement pointés pour la session. */
export function attendanceStats(rows: TrainingAttendance[], registrationId: string, sessionId: string) {
  const held = new Set(rows.filter((r) => r.session_id === sessionId).map((r) => r.attendance_date)).size;
  const mine = rows.filter((r) => r.registration_id === registrationId);
  const attended = mine.filter((r) => r.status !== 'ABSENT').length;
  return { held, attended, pct: held === 0 ? null : Math.round((attended * 100) / held) };
}
