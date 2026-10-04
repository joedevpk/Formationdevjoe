import type { CvData, CvEducation, CvExperience } from './types';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « 2023-03-01 » → « mars 2023 » (sans fuseau horaire : on lit la chaîne, pas un Date). */
export function monthYear(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso ?? '');
  if (!m) return '';
  const idx = Number(m[2]) - 1;
  return idx >= 0 && idx < 12 ? `${MONTHS[idx]} ${m[1]}` : m[1];
}

export function period(start: string | null, end: string | null, current = false): string {
  const a = monthYear(start);
  const b = current ? 'Présent' : monthYear(end);
  if (a && b) return `${a} – ${b}`;
  return a || b;
}
export const experiencePeriod = (e: CvExperience) => period(e.start_date, e.end_date, e.is_current);
export const educationPeriod = (e: CvEducation) => period(e.start_date, e.end_date);

export function fullName(d: CvData): string {
  const p = d.profile;
  return p.display_name.trim() || `${p.first_name} ${p.last_name}`.trim();
}

export const paragraphs = (t: string): string[] => t.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);

/** Lien affichable sans protocole : « https://github.com/x » → « github.com/x ». */
export const prettyUrl = (u: string): string => u.replace(/^https?:\/\//, '').replace(/\/$/, '');

export function skillGroups(d: CvData): { category: string; items: { name: string; level: string | null }[] }[] {
  const order: string[] = [];
  const map = new Map<string, { name: string; level: string | null }[]>();
  for (const s of d.skills) {
    if (!map.has(s.category)) { map.set(s.category, []); order.push(s.category); }
    map.get(s.category)!.push({ name: s.name, level: s.level });
  }
  return order.map((category) => ({ category, items: map.get(category)! }));
}

/** Liens de contact (email/téléphone seulement s'ils sont publics dans la donnée). Ordre stable. */
export function contactItems(d: CvData): { label: string; text: string; href?: string }[] {
  const p = d.profile;
  const out: { label: string; text: string; href?: string }[] = [];
  if (p.location) out.push({ label: 'Localisation', text: p.location });
  if (p.email) out.push({ label: 'Email', text: p.email, href: `mailto:${p.email}` });
  if (p.phone) out.push({ label: 'Téléphone', text: p.phone, href: `tel:${p.phone.replace(/\s+/g, '')}` });
  if (p.website) out.push({ label: 'Site', text: prettyUrl(p.website), href: p.website });
  if (p.github) out.push({ label: 'GitHub', text: prettyUrl(p.github), href: p.github });
  if (p.linkedin) out.push({ label: 'LinkedIn', text: prettyUrl(p.linkedin), href: p.linkedin });
  for (const l of p.links) if (l.url) out.push({ label: l.label || 'Lien', text: l.label || prettyUrl(l.url), href: l.url });
  return out;
}

/** Quelles sections ont des données. Une section vide n'est jamais affichée. */
export function sectionFlags(d: CvData) {
  const summary = paragraphs(d.profile.summary_long).length > 0 || d.profile.summary_short.trim().length > 0;
  return {
    summary: d.profile.show_summary && summary,
    skills: d.skills.length > 0,
    experiences: d.experiences.length > 0,
    projects: d.projects.length > 0,
    trainer: d.trainer_courses.length > 0,
    services: d.profile.show_services && d.services.length > 0,
    education: d.education.length > 0,
    certifications: d.certifications.length > 0,
    achievements: d.achievements.length > 0,
    languages: d.languages.length > 0,
  };
}

export const summaryParagraphs = (d: CvData): string[] => {
  const long = paragraphs(d.profile.summary_long);
  return long.length ? long : paragraphs(d.profile.summary_short);
};

const LEVEL_LABEL: Record<string, string> = { DEBUTANT: 'Débutant', INTERMEDIAIRE: 'Intermédiaire', AVANCE: 'Avancé' };
export const levelLabel = (l: string) => LEVEL_LABEL[l] ?? l;

/** Les liens du CV doivent rester http(s)/mailto/tel : jamais de javascript: ni de data:. */
export function safeHref(u: string | null | undefined): string | undefined {
  if (!u) return undefined;
  return /^(https?:\/\/|mailto:|tel:)/i.test(u.trim()) ? u.trim() : undefined;
}

export interface CvCheck { id: string; label: string; done: boolean; hint: string; tab: string }

/**
 * Qualité du CV : calculée uniquement à partir du contenu réellement saisi (aucune valeur inventée).
 * Chaque critère indique quoi faire et dans quel onglet du Studio.
 */
export function cvCompleteness(d: CvData): { score: number; done: number; total: number; checks: CvCheck[] } {
  const p = d.profile;
  const checks: CvCheck[] = [
    { id: 'name', label: 'Nom renseigné', done: Boolean(fullName(d)), hint: 'Ajoute ton nom.', tab: 'profile' },
    { id: 'headline', label: 'Titre professionnel', done: p.headline.trim().length > 0, hint: 'Résume ton activité en une ligne.', tab: 'profile' },
    { id: 'photo', label: 'Photo de profil', done: Boolean(p.photo_url), hint: 'Ajoute une photo (lien https://).', tab: 'profile' },
    { id: 'summary', label: 'Résumé professionnel', done: p.summary_short.trim().length >= 40 || p.summary_long.trim().length >= 40, hint: 'Rédige un résumé d’au moins une ou deux phrases.', tab: 'profile' },
    { id: 'contact', label: 'Un moyen de contact ou un lien', done: Boolean(p.email || p.phone || p.website || p.github || p.linkedin || p.links.length), hint: 'Ajoute un email, GitHub ou LinkedIn.', tab: 'profile' },
    { id: 'skills', label: 'Compétences (au moins 3)', done: d.skills.length >= 3, hint: 'Liste les compétences que tu maîtrises réellement.', tab: 'skills' },
    { id: 'experience', label: 'Expérience ou réalisation', done: d.experiences.length + d.achievements.length > 0, hint: 'Ajoute une expérience ou une réalisation réelle.', tab: 'experiences' },
    { id: 'projects', label: 'Projet mis en avant', done: d.projects.length > 0, hint: 'Coche « Afficher dans mon CV » sur un projet publié.', tab: 'projects' },
    { id: 'education', label: 'Formation / parcours', done: d.education.length > 0, hint: 'Ajoute ton parcours académique.', tab: 'education' },
    { id: 'languages', label: 'Langues', done: d.languages.length > 0, hint: 'Ajoute les langues que tu parles.', tab: 'languages' },
  ];
  const done = checks.filter((c) => c.done).length;
  return { score: Math.round((done / checks.length) * 100), done, total: checks.length, checks };
}
