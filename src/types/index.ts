export type UserRole = 'ADMIN' | 'INSTRUCTOR' | 'LEARNER';
export type PublishStatus = 'BROUILLON' | 'PUBLIEE' | 'ARCHIVEE';
export type CourseLevel = 'DEBUTANT' | 'INTERMEDIAIRE' | 'AVANCE';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  long_description: string | null;
  image_url: string | null;
  level: CourseLevel;
  duration: string | null;
  price: number | null;
  currency: string | null;
  status: PublishStatus;
  category: string;
  objectives: string[];
  prerequisites: string[];
  final_project: string | null;
  has_certificate: boolean;
  is_featured: boolean;
  coming_soon?: boolean;
  show_in_cv?: boolean;
  delivery_mode?: 'PRESENTIEL' | 'EN_LIGNE' | 'HYBRIDE';
  materials?: string[];
  practical_info?: string | null;
  trainer_name?: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type LessonKind = 'TEXTE' | 'VIDEO' | 'CODE' | 'QUIZ' | 'EXERCICE' | 'PROJET';

export interface Lesson {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  kind: LessonKind;
  content: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  position: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface LessonResource {
  id: string;
  lesson_id: string;
  title: string;
  url: string;
  kind: string;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: 'ACTIVE' | 'TERMINEE' | 'ANNULEE';
  enrolled_at: string;
  completed_at: string | null;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  completed_at: string;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  image_url: string | null;
  problem: string | null;
  solution: string | null;
  architecture: string | null;
  features: string[];
  challenges: string | null;
  results: string | null;
  learned: string | null;
  role: string | null;
  status: string;
  demo_url: string | null;
  github_url: string | null;
  video_url: string | null;
  technologies: string[];
  project_date: string | null;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  kind: string;
  url: string | null;
  content: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image_url: string | null;
  tags: string[];
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workshop {
  id: string;
  slug: string;
  title: string;
  description: string;
  starts_at: string | null;
  duration: string | null;
  format: string;
  location_url: string | null;
  image_url: string | null;
  status: 'A_VENIR' | 'OUVERT' | 'COMPLET' | 'TERMINE' | 'ANNULE';
  capacity: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  position: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  request_type: string;
  message: string;
  status: 'NOUVEAU' | 'LU' | 'TRAITE';
  created_at: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  avatar_url: string | null;
  content: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  link?: string | null;
  kind?: string | null;
  created_at: string;
}

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  code: string;
  issued_at: string;
  certificate_number: string;
  status: 'VALIDE' | 'REVOQUE';
  registration_id: string | null;
  session_id: string | null;
  holder_name: string | null;
  course_title: string | null;
  period_start: string | null;
  period_end: string | null;
  duration_label: string | null;
  location: string | null;
  trainer_name: string | null;
  revoked_at?: string | null;
  revoked_reason?: string | null;
  issue_mode?: 'AUTO' | 'MANUEL';
  manual_reason?: string | null;
}

export interface Favorite {
  id: string;
  user_id: string;
  entity_type: 'course' | 'resource' | 'article';
  entity_id: string;
  created_at: string;
}

export interface SettingRow {
  key: string;
  value: string | null;
  updated_at: string;
}

export interface IdentitySettings {
  name: string;
  title: string;
  bio: string;
  photo: string;
  location: string;
  email: string;
  phone: string;
  github: string;
  linkedin: string;
  youtube: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  cv: string;
  presentation: string;
}
