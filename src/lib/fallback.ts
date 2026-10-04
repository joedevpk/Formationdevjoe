// Contenu de démonstration affiché uniquement quand Supabase n'est pas configuré (aperçu local).
import { courses as seedCourses, servicesSeed, workshopsSeed, resourcesSeed } from '@/data/catalog';
import type { Course, CourseModule, Lesson, Resource, Service, Workshop } from '@/types';
import { slugify } from '@/utils';

const now = '2026-01-01T00:00:00.000Z';

export const fallbackCourses: Course[] = seedCourses.map((c, i) => ({
  id: `demo-${c.slug}`, slug: c.slug, title: c.title, short_description: c.short, long_description: c.long, image_url: null,
  level: c.level, duration: c.duration, price: null, currency: null, status: 'PUBLIEE', category: c.category,
  objectives: c.objectives, prerequisites: c.prerequisites, final_project: c.finalProject, has_certificate: true,
  is_featured: Boolean(c.featured), coming_soon: false, position: i, created_at: now, updated_at: now,
}));

export function fallbackCurriculum(slug: string): { modules: CourseModule[]; lessons: Lesson[] } {
  const c = seedCourses.find((x) => x.slug === slug);
  if (!c) return { modules: [], lessons: [] };
  const modules: CourseModule[] = [];
  const lessons: Lesson[] = [];
  c.modules.forEach((m, mi) => {
    const mid = `demo-${slug}-m${mi}`;
    modules.push({ id: mid, course_id: `demo-${slug}`, title: m.title, description: m.description, position: mi, created_at: now, updated_at: now });
    m.lessons.forEach((l, li) => lessons.push({
      id: `${mid}-l${li}`, module_id: mid, course_id: `demo-${slug}`, title: l.title, kind: l.kind, content: l.content,
      video_url: null, duration_minutes: l.minutes, position: li, is_published: true, created_at: now, updated_at: now,
    }));
  });
  return { modules, lessons };
}

export const fallbackServices: Service[] = servicesSeed.map((s, i) => ({
  id: `demo-s${i}`, title: s.title, description: s.description, icon: s.icon, position: i, is_published: true, created_at: now, updated_at: now,
}));

export const fallbackWorkshops: Workshop[] = workshopsSeed.map((w, i) => ({
  id: `demo-w${i}`, slug: slugify(w.title), title: w.title, description: w.description, starts_at: null, duration: null,
  format: w.format, location_url: null, image_url: null, status: 'A_VENIR', capacity: null, is_published: true, created_at: now, updated_at: now,
}));

export const fallbackResources: Resource[] = resourcesSeed.map((r, i) => ({
  id: `demo-r${i}`, title: r.title, description: r.description, category: r.category, kind: r.kind, url: null, content: null,
  is_published: true, created_at: now, updated_at: now,
}));
