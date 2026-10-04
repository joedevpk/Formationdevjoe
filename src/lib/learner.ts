import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { Certificate, Favorite, NotificationRow } from '@/types';
import { useCourses, useLessonCounts, useMyEnrollments, useMyProgress } from '@/lib/queries';
import { useAuth } from '@/contexts/AuthContext';

export function useLearner() {
  const { profile } = useAuth();
  const uid = profile?.id;
  const courses = useCourses();
  const enrollments = useMyEnrollments(uid);
  const progress = useMyProgress(uid);
  const counts = useLessonCounts();

  const loading = courses.isLoading || enrollments.isLoading || progress.isLoading || counts.isLoading;
  const error = courses.isError || enrollments.isError || progress.isError;

  const rows = useMemo(() => {
    const cs = courses.data ?? [];
    return (enrollments.data ?? [])
      .filter((e) => e.status !== 'ANNULEE')
      .map((e) => {
        const course = cs.find((c) => c.id === e.course_id);
        const total = counts.data?.[e.course_id] ?? 0;
        const done = (progress.data ?? []).filter((p) => p.course_id === e.course_id).length;
        const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
        return { enrollment: e, course, total, done, pct };
      })
      .filter((r): r is typeof r & { course: NonNullable<typeof r.course> } => Boolean(r.course));
  }, [courses.data, enrollments.data, progress.data, counts.data]);

  return { rows, loading, error, courses: courses.data ?? [], progress: progress.data ?? [], refetch: () => { void enrollments.refetch(); void progress.refetch(); } };
}

export function useCertificates(userId: string | undefined) {
  return useQuery({
    queryKey: ['certificates', userId], enabled: Boolean(userId),
    queryFn: async (): Promise<Certificate[]> => {
      const { data, error } = await supabase.from('certificates').select('*').eq('user_id', userId as string).order('issued_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Certificate[];
    },
  });
}

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', userId], enabled: Boolean(userId),
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId as string).order('created_at', { ascending: false }).limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as NotificationRow[];
    },
  });
}

export function useFavorites(userId: string | undefined) {
  return useQuery({
    queryKey: ['favorites', userId], enabled: Boolean(userId),
    queryFn: async (): Promise<Favorite[]> => {
      const { data, error } = await supabase.from('favorites').select('*').eq('user_id', userId as string);
      if (error) throw new Error(error.message);
      return (data ?? []) as Favorite[];
    },
  });
}

export function useToggleFavorite(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, id, on }: { type: Favorite['entity_type']; id: string; on: boolean }) => {
      if (!userId) throw new Error('Non connecté');
      if (on) {
        const { error } = await supabase.from('favorites').upsert({ user_id: userId, entity_type: type, entity_id: id }, { onConflict: 'user_id,entity_type,entity_id', ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('entity_type', type).eq('entity_id', id);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites', userId] }),
  });
}
