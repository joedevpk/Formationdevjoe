import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { Certificate, Course, Profile } from '@/types';
import type { TrainingAnnouncement, TrainingAttendance, TrainingRegistration, TrainingSession } from '@/lib/training/types';

const KEY = 'studio-training';

async function all<T>(table: string, order?: { col: string; asc?: boolean }, select = '*'): Promise<T[]> {
  let q = supabase.from(table).select(select);
  if (order) q = q.order(order.col, { ascending: order.asc ?? true });
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export type StudioCourse = Pick<Course, 'id' | 'title' | 'slug' | 'status' | 'delivery_mode' | 'trainer_name' | 'duration' | 'has_certificate'>;
export const useStudioCourses = () => useQuery({ queryKey: [KEY, 'courses'], queryFn: () => all<StudioCourse>('courses', { col: 'title' }, 'id,title,slug,status,delivery_mode,trainer_name,duration,has_certificate') });
export const useStudioSessions = () => useQuery({ queryKey: [KEY, 'sessions'], queryFn: () => all<TrainingSession>('training_sessions', { col: 'starts_on', asc: false }) });
export const useStudioRegistrations = () => useQuery({ queryKey: [KEY, 'registrations'], queryFn: () => all<TrainingRegistration>('training_registrations', { col: 'registered_at', asc: false }) });
export const useStudioAttendance = () => useQuery({ queryKey: [KEY, 'attendance'], queryFn: () => all<TrainingAttendance>('training_attendance', { col: 'attendance_date' }) });
export const useStudioAnnouncements = () => useQuery({ queryKey: [KEY, 'announcements'], queryFn: () => all<TrainingAnnouncement>('training_announcements', { col: 'created_at', asc: false }) });
export const useStudioCertificates = () => useQuery({ queryKey: [KEY, 'certificates'], queryFn: () => all<Certificate>('certificates', { col: 'issued_at', asc: false }) });
export type Trainer = Pick<Profile, 'id' | 'full_name' | 'email' | 'role'>;
export const useStaffProfiles = () => useQuery({
  queryKey: [KEY, 'staff'],
  queryFn: async (): Promise<Trainer[]> => {
    const { data, error } = await supabase.from('profiles').select('id,full_name,email,role').in('role', ['ADMIN', 'INSTRUCTOR']);
    if (error) throw new Error(error.message);
    return (data ?? []) as Trainer[];
  },
});

/** Invalide toutes les données du Studio « formations présentielles » + les caches publics concernés. */
export function useRefreshTraining() {
  const qc = useQueryClient();
  return async () => {
    await Promise.all([KEY, 'training-sessions', 'training-announcements', 'my-registrations', 'certificates', 'published-list'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
  };
}

export const courseTitle = (courses: StudioCourse[] | undefined, id: string) => courses?.find((c) => c.id === id)?.title ?? 'Formation';
