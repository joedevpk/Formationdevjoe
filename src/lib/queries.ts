import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type {
  Article, Course, CourseModule, Enrollment, IdentitySettings, Lesson, LessonProgress, Project, Resource, Service, Testimonial, Workshop,
} from '@/types';
import { fallbackCourses, fallbackCurriculum, fallbackResources, fallbackServices, fallbackWorkshops } from '@/lib/fallback';

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export const defaultIdentity: IdentitySettings = {
  name: 'JOE DEV CODES',
  title: 'Développeur • Formateur • Étudiant • Entrepreneur',
  bio: '',
  photo: '',
  location: '',
  email: '',
  phone: '',
  github: '',
  linkedin: '',
  youtube: '',
  facebook: '',
  instagram: '',
  tiktok: '',
  cv: '',
  presentation: '',
};

export function useIdentity() {
  return useQuery({
    queryKey: ['identity'],
    queryFn: async (): Promise<IdentitySettings> => {
      if (!isSupabaseConfigured) return defaultIdentity;
      const rows = unwrap(await supabase.from('settings').select('key,value').like('key', 'identity.%')) ?? [];
      const out: Record<string, string> = { ...defaultIdentity };
      for (const r of rows as { key: string; value: string | null }[]) {
        const k = r.key.replace('identity.', '');
        if (k in out && r.value) out[k] = r.value;
      }
      return out as unknown as IdentitySettings;
    },
  });
}

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async (): Promise<Course[]> => {
      if (!isSupabaseConfigured) return fallbackCourses;
      return (unwrap(await supabase.from('courses').select('*').or('status.eq.PUBLIEE,coming_soon.eq.true').order('position')) ?? []) as Course[];
    },
  });
}

export interface CourseBundle { course: Course; modules: CourseModule[]; lessons: Lesson[] }

export function useCourse(slug: string | undefined) {
  return useQuery({
    queryKey: ['course', slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<CourseBundle | null> => {
      if (!slug) return null;
      if (!isSupabaseConfigured) {
        const course = fallbackCourses.find((c) => c.slug === slug);
        return course ? { course, ...fallbackCurriculum(slug) } : null;
      }
      const course = unwrap(await supabase.from('courses').select('*').eq('slug', slug).maybeSingle()) as Course | null;
      if (!course) return null;
      const [m, l] = await Promise.all([
        supabase.from('course_modules').select('*').eq('course_id', course.id).order('position'),
        supabase.from('lessons').select('*').eq('course_id', course.id).order('position'),
      ]);
      return {
        course,
        modules: (unwrap(m) ?? []) as CourseModule[],
        lessons: (unwrap(l) ?? []) as Lesson[],
      };
    },
  });
}

type ProjectRow = Project & { project_technologies?: { name: string }[] };

function mapProject(r: ProjectRow): Project {
  const { project_technologies, ...rest } = r;
  return { ...rest, technologies: (project_technologies ?? []).map((t) => t.name) };
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      if (!isSupabaseConfigured) return [];
      const rows = unwrap(await supabase.from('projects').select('*, project_technologies(name)').eq('is_published', true).order('project_date', { ascending: false, nullsFirst: false })) ?? [];
      return (rows as ProjectRow[]).map(mapProject);
    },
  });
}

export function useProject(slug: string | undefined) {
  return useQuery({
    queryKey: ['project', slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<Project | null> => {
      if (!isSupabaseConfigured || !slug) return null;
      const row = unwrap(await supabase.from('projects').select('*, project_technologies(name)').eq('slug', slug).eq('is_published', true).maybeSingle()) as ProjectRow | null;
      return row ? mapProject(row) : null;
    },
  });
}

export function useResources() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: async (): Promise<Resource[]> => {
      if (!isSupabaseConfigured) return fallbackResources;
      return (unwrap(await supabase.from('resources').select('*').eq('is_published', true).order('created_at', { ascending: false })) ?? []) as Resource[];
    },
  });
}

export function useArticles() {
  return useQuery({
    queryKey: ['articles'],
    queryFn: async (): Promise<Article[]> => {
      if (!isSupabaseConfigured) return [];
      return (unwrap(await supabase.from('articles').select('*').eq('is_published', true).order('published_at', { ascending: false, nullsFirst: false })) ?? []) as Article[];
    },
  });
}

export function useArticle(slug: string | undefined) {
  return useQuery({
    queryKey: ['article', slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<Article | null> => {
      if (!isSupabaseConfigured || !slug) return null;
      return unwrap(await supabase.from('articles').select('*').eq('slug', slug).eq('is_published', true).maybeSingle()) as Article | null;
    },
  });
}

export function useWorkshops() {
  return useQuery({
    queryKey: ['workshops'],
    queryFn: async (): Promise<Workshop[]> => {
      if (!isSupabaseConfigured) return fallbackWorkshops;
      return (unwrap(await supabase.from('workshops').select('*').eq('is_published', true).order('starts_at', { ascending: true, nullsFirst: false })) ?? []) as Workshop[];
    },
  });
}

export function useWorkshop(slug: string | undefined) {
  const all = useWorkshops();
  return { ...all, data: all.data?.find((w) => w.slug === slug) ?? null };
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async (): Promise<Service[]> => {
      if (!isSupabaseConfigured) return fallbackServices;
      return (unwrap(await supabase.from('services').select('*').eq('is_published', true).order('position')) ?? []) as Service[];
    },
  });
}

export function useTestimonials() {
  return useQuery({
    queryKey: ['testimonials'],
    queryFn: async (): Promise<Testimonial[]> => {
      if (!isSupabaseConfigured) return [];
      return (unwrap(await supabase.from('testimonials').select('*').eq('is_published', true).order('created_at', { ascending: false })) ?? []) as Testimonial[];
    },
  });
}

// ───────── Espace apprenant ─────────
export function useMyEnrollments(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-enrollments', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Enrollment[]> =>
      (unwrap(await supabase.from('enrollments').select('*').eq('user_id', userId as string).order('enrolled_at', { ascending: false })) ?? []) as Enrollment[],
  });
}

export function useMyProgress(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-progress', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<LessonProgress[]> =>
      (unwrap(await supabase.from('lesson_progress').select('*').eq('user_id', userId as string)) ?? []) as LessonProgress[],
  });
}

export function useLessonCounts() {
  return useQuery({
    queryKey: ['lesson-counts'],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!isSupabaseConfigured) return {};
      const rows = (unwrap(await supabase.from('lessons').select('course_id').eq('is_published', true)) ?? []) as { course_id: string }[];
      const out: Record<string, number> = {};
      for (const r of rows) out[r.course_id] = (out[r.course_id] ?? 0) + 1;
      return out;
    },
  });
}

export function useSetting(key: string) {
  return useQuery({
    queryKey: ['setting', key],
    queryFn: async (): Promise<string> => {
      if (!isSupabaseConfigured) return '';
      const row = unwrap(await supabase.from('settings').select('value').eq('key', key).maybeSingle()) as { value: string | null } | null;
      return row?.value ?? '';
    },
  });
}
