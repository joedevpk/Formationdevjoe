export type CvTemplate = 'minimal' | 'modern' | 'executive' | 'developer';
export const CV_TEMPLATES: { id: CvTemplate; label: string; description: string }[] = [
  { id: 'minimal', label: 'Minimal', description: 'Très épuré, une colonne, beaucoup d’espace.' },
  { id: 'modern', label: 'Modern', description: 'En-tête avec photo, compétences en étiquettes, accent discret.' },
  { id: 'executive', label: 'Executive', description: 'Classique et sobre, typographie à empattements.' },
  { id: 'developer', label: 'Developer', description: 'Titres en monospace, sections en colonnes, orienté technique.' },
];

export interface CvLink { label: string; url: string }

export interface CvProfileData {
  first_name: string; last_name: string; display_name: string;
  photo_url: string | null; headline: string; location: string | null;
  email: string | null; phone: string | null;
  website: string | null; github: string | null; linkedin: string | null;
  links: CvLink[];
  summary_short: string; summary_long: string;
  show_summary: boolean; show_services: boolean; show_qr: boolean;
  template: CvTemplate;
}

export interface CvSkill { id: string; category: string; name: string; level: string | null; position: number }
export interface CvExperience { id: string; role: string; organization: string; location: string | null; start_date: string | null; end_date: string | null; is_current: boolean; description: string; achievements: string[]; technologies: string[]; position: number }
export interface CvEducation { id: string; institution: string; degree: string; field: string | null; location: string | null; start_date: string | null; end_date: string | null; description: string; position: number }
export interface CvCertification { id: string; name: string; issuer: string; issued_on: string | null; credential_id: string | null; url: string | null; description: string; position: number }
export interface CvAchievement { id: string; title: string; event: string | null; year: number | null; description: string; result: string | null; url: string | null; image_url: string | null; position: number }
export interface CvLanguage { id: string; language: string; level: string; position: number }
export interface CvProject { id: string; slug: string; title: string; summary: string; role: string | null; status: string; demo_url: string | null; github_url: string | null; image_url: string | null; results: string | null; technologies: string[] }
export interface CvTrainerCourse { id: string; slug: string; title: string; category: string; level: string }
export interface CvService { id: string; title: string }

/** Forme renvoyée par la fonction SQL get_public_cv() — et reconstruite à l'identique pour l'aperçu du Studio. */
export interface CvData {
  profile: CvProfileData;
  skills: CvSkill[]; experiences: CvExperience[]; education: CvEducation[];
  certifications: CvCertification[]; achievements: CvAchievement[]; languages: CvLanguage[];
  projects: CvProject[]; trainer_courses: CvTrainerCourse[]; services: CvService[];
  updated_at: string | null;
}
