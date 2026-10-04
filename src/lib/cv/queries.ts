import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type { CvData, CvProfileData, CvTemplate } from './types';

/** Un CV n'a que très peu de chances de changer pendant une visite : cache court mais réel, pas de refetch au focus. */
const PUBLIC_STALE = 5 * 60 * 1000;

/** Booléen léger : afficher ou non les liens « CV » (navbar, accueil) sans charger tout le CV. */
export function useCvPublished() {
  return useQuery({
    queryKey: ['cv-published'],
    staleTime: PUBLIC_STALE,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<boolean> => {
      if (!isSupabaseConfigured) return false;
      try {
        const { data, error } = await supabase.rpc('cv_is_published');
        return !error && data === true;
      } catch {
        return false; // Une panne Supabase ne doit jamais faire planter la navbar
      }
    },
  });
}

/** CV public via la fonction SQL get_public_cv() : `null` = non publié / non configuré. Les erreurs réseau remontent (état « Réessayer »). */
export function usePublicCv() {
  return useQuery({
    queryKey: ['cv-public'],
    staleTime: PUBLIC_STALE,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<CvData | null> => {
      if (!isSupabaseConfigured) return null;
      const { data, error } = await supabase.rpc('get_public_cv');
      if (error) throw error;
      return (data as CvData | null) ?? null;
    },
  });
}

// ───────────── Studio (ADMIN) ─────────────
export interface AdminProfile extends CvProfileData { id: string; show_email: boolean; show_phone: boolean; is_public: boolean; updated_at: string }
export interface AdminProject { id: string; slug: string; title: string; summary: string; role: string | null; status: string; demo_url: string | null; github_url: string | null; image_url: string | null; results: string | null; is_published: boolean; show_in_cv: boolean; cv_position: number; technologies: string[] }
export interface AdminCourse { id: string; slug: string; title: string; category: string; level: string; status: string; show_in_cv: boolean }
type Vis = { is_visible: boolean };
export interface AdminCv {
  profile: AdminProfile | null;
  skills: (CvData['skills'][number] & Vis)[];
  experiences: (CvData['experiences'][number] & Vis)[];
  education: (CvData['education'][number] & Vis)[];
  certifications: (CvData['certifications'][number] & Vis)[];
  achievements: (CvData['achievements'][number] & Vis)[];
  languages: (CvData['languages'][number] & Vis)[];
  projects: AdminProject[];
  courses: AdminCourse[];
  services: { id: string; title: string; is_published: boolean }[];
}

export const defaultProfile = (): Omit<AdminProfile, 'id' | 'updated_at'> => ({
  first_name: '', last_name: '', display_name: '', photo_url: null,
  headline: 'Développeur • Formateur • Étudiant • Entrepreneur', location: null,
  email: null, phone: null, website: null, github: null, linkedin: null, links: [],
  summary_short: '', summary_long: '', show_summary: true, show_services: false, show_qr: true,
  show_email: false, show_phone: false, template: 'minimal' as CvTemplate, is_public: false,
});

function must<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error;
  return (r.data ?? ([] as unknown as T));
}

export function useCvAdmin(enabled: boolean) {
  return useQuery({
    queryKey: ['cv-admin'],
    enabled: enabled && isSupabaseConfigured,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<AdminCv> => {
      const ord = { ascending: true } as const;
      const [prof, skills, exps, edu, certs, ach, langs, projs, courses, services] = await Promise.all([
        supabase.from('cv_profiles').select('*').maybeSingle(),
        supabase.from('cv_skills').select('*').order('position', ord).order('created_at', ord),
        supabase.from('cv_experiences').select('*').order('position', ord).order('created_at', ord),
        supabase.from('cv_education').select('*').order('position', ord).order('created_at', ord),
        supabase.from('cv_certifications').select('*').order('position', ord).order('created_at', ord),
        supabase.from('cv_achievements').select('*').order('position', ord).order('created_at', ord),
        supabase.from('cv_languages').select('*').order('position', ord).order('created_at', ord),
        supabase.from('projects').select('id,slug,title,summary,role,status,demo_url,github_url,image_url,results,is_published,show_in_cv,cv_position,project_technologies(name)').order('cv_position', ord).order('created_at', { ascending: false }),
        supabase.from('courses').select('id,slug,title,category,level,status,show_in_cv').order('position', ord),
        supabase.from('services').select('id,title,is_published').order('position', ord),
      ]);
      if (prof.error) throw prof.error;
      return {
        profile: (prof.data as AdminProfile | null) ?? null,
        skills: must(skills) as AdminCv['skills'],
        experiences: must(exps) as AdminCv['experiences'],
        education: must(edu) as AdminCv['education'],
        certifications: must(certs) as AdminCv['certifications'],
        achievements: must(ach) as AdminCv['achievements'],
        languages: must(langs) as AdminCv['languages'],
        projects: (must(projs) as (Omit<AdminProject, 'technologies'> & { project_technologies: { name: string }[] | null })[]).map(({ project_technologies, ...p }) => ({ ...p, technologies: (project_technologies ?? []).map((t) => t.name).sort() })),
        courses: must(courses) as AdminCourse[],
        services: must(services) as AdminCv['services'],
      };
    },
  });
}

/**
 * Reconstruit côté client exactement ce que get_public_cv() renverrait (mêmes règles de visibilité),
 * pour l'aperçu du Studio. `draft` = profil en cours d'édition (non encore enregistré).
 */
export function toCvData(a: AdminCv, draft: Omit<AdminProfile, 'id' | 'updated_at'>): CvData {
  const vis = <T extends Vis>(xs: T[]) => xs.filter((x) => x.is_visible).map((x) => { const { is_visible: _v, ...rest } = x; void _v; return rest; });
  const p = draft;
  const { show_email: _e, show_phone: _p, is_public: _i, ...pub } = p;
  void _e; void _p; void _i;
  const stamps = [a.profile?.updated_at].filter(Boolean) as string[];
  return {
    profile: {
      ...pub,
      email: p.show_email ? p.email : null,
      phone: p.show_phone ? p.phone : null,
      summary_short: p.show_summary ? p.summary_short : '',
      summary_long: p.show_summary ? p.summary_long : '',
    },
    skills: vis(a.skills), experiences: vis(a.experiences), education: vis(a.education),
    certifications: vis(a.certifications), achievements: vis(a.achievements), languages: vis(a.languages),
    projects: a.projects.filter((x) => x.is_published && x.show_in_cv).map((x) => ({ id: x.id, slug: x.slug, title: x.title, summary: x.summary, role: x.role, status: x.status, demo_url: x.demo_url, github_url: x.github_url, image_url: x.image_url, results: x.results, technologies: x.technologies })),
    trainer_courses: a.courses.filter((c) => c.show_in_cv && c.status === 'PUBLIEE').map((c) => ({ id: c.id, slug: c.slug, title: c.title, category: c.category, level: c.level })),
    services: p.show_services ? a.services.filter((s) => s.is_published).map((s) => ({ id: s.id, title: s.title })) : [],
    updated_at: stamps[0] ?? null,
  };
}
