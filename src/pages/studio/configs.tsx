import { Badge } from '@/components/ui/Badge';
import { iconNames } from '@/components/ui/Icon';
import { supabase } from '@/services/supabase';
import { formatDate, formatDateTime } from '@/utils';
import { categoriesCourses, projectCategories, resourceCategories, resourceKinds } from '@/data/catalog';
import type { CrudConfig, Row } from '@/pages/studio/CrudPage';

const pub = (v: unknown) => <Badge variant={v ? 'success' : 'neutral'}>{v ? 'Publié' : 'Brouillon'}</Badge>;
const statusBadge = (v: unknown) => <Badge variant={v === 'PUBLIEE' ? 'success' : v === 'ARCHIVEE' ? 'neutral' : 'warning'}>{v === 'PUBLIEE' ? 'Publiée' : v === 'ARCHIVEE' ? 'Archivée' : 'Brouillon'}</Badge>;

export const coursesConfig: CrudConfig = {
  table: 'courses', title: 'Formations', singular: 'une formation', description: 'Crée et publie tes formations. Une formation contient des modules, des leçons et un projet final.',
  orderBy: { column: 'position', ascending: true }, searchKeys: ['title', 'category', 'slug'], slugFrom: 'title',
  defaults: { level: 'DEBUTANT', status: 'BROUILLON', category: 'Web', has_certificate: true, is_featured: false, position: 0, currency: 'USD' },
  columns: [{ key: 'title', label: 'Titre' }, { key: 'category', label: 'Catégorie' }, { key: 'level', label: 'Niveau' }, { key: 'status', label: 'Statut', render: (r) => statusBadge(r.status) }],
  fields: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'slug', label: 'Slug (URL)', type: 'text', half: true, help: 'Laisse vide pour le générer depuis le titre.' },
    { name: 'category', label: 'Catégorie', type: 'select', options: categoriesCourses, half: true },
    { name: 'short_description', label: 'Description courte', type: 'textarea', required: true },
    { name: 'long_description', label: 'Description longue', type: 'textarea' },
    { name: 'image_url', label: 'Image', type: 'image', bucket: 'course-images' },
    { name: 'level', label: 'Niveau', type: 'select', half: true, options: [{ value: 'DEBUTANT', label: 'Débutant' }, { value: 'INTERMEDIAIRE', label: 'Intermédiaire' }, { value: 'AVANCE', label: 'Avancé' }] },
    { name: 'duration', label: 'Durée', type: 'text', half: true, help: 'Ex. « 6 semaines »' },
    { name: 'price', label: 'Prix', type: 'number', half: true, help: 'Laisse vide si non affiché.' },
    { name: 'currency', label: 'Devise', type: 'text', half: true },
    { name: 'status', label: 'Statut', type: 'select', half: true, options: [{ value: 'BROUILLON', label: 'Brouillon' }, { value: 'PUBLIEE', label: 'Publiée' }, { value: 'ARCHIVEE', label: 'Archivée' }] },
    { name: 'position', label: 'Ordre', type: 'number', half: true },
    { name: 'objectives', label: 'Objectifs (un par ligne)', type: 'list' },
    { name: 'prerequisites', label: 'Prérequis (un par ligne)', type: 'list' },
    { name: 'final_project', label: 'Projet final', type: 'text' },
    { name: 'has_certificate', label: 'Délivre un certificat', type: 'checkbox', half: true },
    { name: 'is_featured', label: 'Mise en avant', type: 'checkbox', half: true },
  ],
};

export const modulesConfig: CrudConfig = {
  table: 'course_modules', title: 'Modules', singular: 'un module', select: '*, courses(title)',
  orderBy: { column: 'created_at', ascending: false }, searchKeys: ['title'],
  defaults: { position: 0 },
  columns: [{ key: 'title', label: 'Module' }, { key: 'course', label: 'Formation', render: (r) => String((r.courses as { title?: string } | null)?.title ?? '—') }, { key: 'position', label: 'Ordre' }],
  stripOnSave: ['courses'],
  fields: [
    { name: 'course_id', label: 'Formation', type: 'relation', relation: { table: 'courses', label: 'title' }, required: true },
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'position', label: 'Ordre', type: 'number', half: true },
  ],
};

export const lessonsConfig: CrudConfig = {
  table: 'lessons', title: 'Leçons', singular: 'une leçon', select: '*, course_modules(title)',
  orderBy: { column: 'created_at', ascending: false }, searchKeys: ['title'],
  defaults: { kind: 'TEXTE', position: 0, is_published: true },
  stripOnSave: ['course_modules'],
  columns: [{ key: 'title', label: 'Leçon' }, { key: 'module', label: 'Module', render: (r) => String((r.course_modules as { title?: string } | null)?.title ?? '—') }, { key: 'kind', label: 'Type' }, { key: 'is_published', label: 'Statut', render: (r) => pub(r.is_published) }],
  // course_id est déduit du module choisi (cohérence garantie).
  beforeSave: async (values) => {
    const { data, error } = await supabase.from('course_modules').select('course_id').eq('id', String(values.module_id)).single();
    if (error) throw new Error('Module introuvable');
    return { ...values, course_id: (data as { course_id: string }).course_id };
  },
  fields: [
    { name: 'module_id', label: 'Module', type: 'relation', relation: { table: 'course_modules', label: 'title' }, required: true },
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'kind', label: 'Type', type: 'select', half: true, options: ['TEXTE', 'VIDEO', 'CODE', 'QUIZ', 'EXERCICE', 'PROJET'] },
    { name: 'duration_minutes', label: 'Durée (minutes)', type: 'number', half: true },
    { name: 'video_url', label: 'Lien vidéo', type: 'url' },
    { name: 'content', label: 'Contenu', type: 'textarea', help: 'Markdown simple : ### titre, - liste, ```code```, **gras**.' },
    { name: 'position', label: 'Ordre', type: 'number', half: true },
    { name: 'is_published', label: 'Publiée', type: 'checkbox', half: true },
  ],
};

export const projectsConfig: CrudConfig = {
  table: 'projects', title: 'Projets', singular: 'un projet', description: 'Ton portfolio : chaque projet a une étude de cas. Ne renseigne que des résultats réels.',
  select: '*, project_technologies(name)', orderBy: { column: 'created_at', ascending: false }, searchKeys: ['title', 'category', 'slug'], slugFrom: 'title',
  defaults: { category: 'Web', status: 'En développement', is_published: false, show_in_cv: false, is_featured: false, features: [], technologies: [] },
  stripOnSave: ['technologies', 'project_technologies'],
  toForm: (r: Row) => ({ ...r, technologies: ((r.project_technologies as { name: string }[] | undefined) ?? []).map((t) => t.name) }),
  afterSave: async (id, values) => {
    const techs = (values.technologies as string[]) ?? [];
    const del = await supabase.from('project_technologies').delete().eq('project_id', id);
    if (del.error) throw new Error(del.error.message);
    if (techs.length) {
      const ins = await supabase.from('project_technologies').insert(techs.map((name) => ({ project_id: id, name })));
      if (ins.error) throw new Error(ins.error.message);
    }
  },
  columns: [{ key: 'title', label: 'Projet' }, { key: 'category', label: 'Catégorie' }, { key: 'status', label: 'Avancement' }, { key: 'is_published', label: 'Statut', render: (r) => pub(r.is_published) }],
  fields: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'slug', label: 'Slug (URL)', type: 'text', half: true },
    { name: 'category', label: 'Catégorie', type: 'select', half: true, options: projectCategories },
    { name: 'summary', label: 'Description', type: 'textarea', required: true },
    { name: 'image_url', label: 'Image / capture', type: 'image', bucket: 'project-images' },
    { name: 'problem', label: 'Le problème', type: 'textarea' },
    { name: 'solution', label: 'La solution', type: 'textarea' },
    { name: 'architecture', label: 'Architecture', type: 'textarea' },
    { name: 'features', label: 'Fonctionnalités (une par ligne)', type: 'list' },
    { name: 'technologies', label: 'Technologies (une par ligne)', type: 'list' },
    { name: 'challenges', label: 'Difficultés', type: 'textarea' },
    { name: 'results', label: 'Résultats (réels uniquement)', type: 'textarea' },
    { name: 'learned', label: "Ce que j'ai appris", type: 'textarea' },
    { name: 'role', label: 'Mon rôle', type: 'text', half: true },
    { name: 'status', label: 'État du projet', type: 'select', half: true, options: ['En développement', 'Disponible', 'Projet privé'], help: 'Un projet privé n’affiche ni démo ni dépôt.' },
    { name: 'demo_url', label: 'Lien démo', type: 'url', half: true },
    { name: 'github_url', label: 'Lien GitHub', type: 'url', half: true },
    { name: 'video_url', label: 'Lien vidéo', type: 'url' },
    { name: 'project_date', label: 'Date', type: 'date', half: true },
    { name: 'is_published', label: 'Afficher sur le portfolio', type: 'checkbox', half: true },
    { name: 'show_in_cv', label: 'Afficher dans mon CV', type: 'checkbox', half: true, help: 'Visibilité : un projet non publié sur le portfolio n’apparaît pas dans le CV public.' },
    { name: 'is_featured', label: 'Mis en avant', type: 'checkbox', half: true },
  ],
};

export const resourcesConfig: CrudConfig = {
  table: 'resources', title: 'Ressources', singular: 'une ressource', orderBy: { column: 'created_at' }, searchKeys: ['title', 'category', 'kind'],
  defaults: { category: 'HTML', kind: 'Tutoriels', is_published: true },
  columns: [{ key: 'title', label: 'Titre' }, { key: 'category', label: 'Catégorie' }, { key: 'kind', label: 'Type' }, { key: 'is_published', label: 'Statut', render: (r) => pub(r.is_published) }],
  fields: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'category', label: 'Catégorie', type: 'select', half: true, options: resourceCategories },
    { name: 'kind', label: 'Type', type: 'select', half: true, options: resourceKinds },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'url', label: 'Lien', type: 'url' },
    { name: 'content', label: 'Contenu (prompt, snippet…)', type: 'textarea' },
    { name: 'is_published', label: 'Publiée', type: 'checkbox' },
  ],
};

export const articlesConfig: CrudConfig = {
  table: 'articles', title: 'Articles', singular: 'un article', description: 'Joe Dev Notes : tutoriels, retours d’expérience, études de projets.',
  orderBy: { column: 'created_at' }, searchKeys: ['title', 'category', 'slug'], slugFrom: 'title',
  defaults: { category: 'Tutoriels', is_published: false, tags: [] },
  beforeSave: async (v) => {
    if (!v.is_published) return { ...v, published_at: null };
    // conserve la date de première publication lors des modifications
    const { data } = await supabase.from('articles').select('published_at').eq('slug', String(v.slug)).maybeSingle();
    return { ...v, published_at: (data as { published_at: string | null } | null)?.published_at ?? new Date().toISOString() };
  },
  columns: [{ key: 'title', label: 'Titre' }, { key: 'category', label: 'Catégorie' }, { key: 'published_at', label: 'Publié le', render: (r) => (r.published_at ? formatDate(String(r.published_at)) : '—') }, { key: 'is_published', label: 'Statut', render: (r) => pub(r.is_published) }],
  fields: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'slug', label: 'Slug (URL)', type: 'text', half: true },
    { name: 'category', label: 'Catégorie', type: 'select', half: true, options: ['Tutoriels', 'Conseils développement', 'IA', 'Vibe Coding', "Retours d'expérience", 'Hackathons', 'Entrepreneuriat', 'Études de projets', 'Erreurs de développement', 'Ressources'] },
    { name: 'excerpt', label: 'Résumé', type: 'textarea', required: true },
    { name: 'content', label: 'Contenu', type: 'textarea', required: true, help: 'Markdown simple : ### titre, - liste, ```code```, **gras**.' },
    { name: 'image_url', label: 'Image', type: 'image', bucket: 'article-images' },
    { name: 'tags', label: 'Tags (un par ligne)', type: 'list' },
    { name: 'is_published', label: 'Publié', type: 'checkbox' },
  ],
};

export const workshopsConfig: CrudConfig = {
  table: 'workshops', title: 'Workshops', singular: 'un workshop', orderBy: { column: 'created_at' }, searchKeys: ['title', 'slug'], slugFrom: 'title',
  defaults: { format: 'En ligne', status: 'A_VENIR', is_published: true },
  columns: [{ key: 'title', label: 'Titre' }, { key: 'starts_at', label: 'Date', render: (r) => (r.starts_at ? formatDateTime(String(r.starts_at)) : 'À confirmer') }, { key: 'status', label: 'Statut' }, { key: 'is_published', label: 'Visible', render: (r) => pub(r.is_published) }],
  fields: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'slug', label: 'Slug (URL)', type: 'text', half: true },
    { name: 'format', label: 'Format', type: 'text', half: true },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
    { name: 'starts_at', label: 'Date et heure', type: 'datetime', half: true },
    { name: 'duration', label: 'Durée', type: 'text', half: true },
    { name: 'location_url', label: 'Lien de la session', type: 'url' },
    { name: 'capacity', label: 'Capacité', type: 'number', half: true },
    { name: 'status', label: 'Statut', type: 'select', half: true, options: ['A_VENIR', 'OUVERT', 'COMPLET', 'TERMINE', 'ANNULE'] },
    { name: 'image_url', label: 'Image', type: 'image', bucket: 'workshop-images' },
    { name: 'is_published', label: 'Visible sur le site', type: 'checkbox' },
  ],
};

export const servicesConfig: CrudConfig = {
  table: 'services', title: 'Services', singular: 'un service', orderBy: { column: 'position', ascending: true }, searchKeys: ['title'],
  defaults: { icon: 'Code2', position: 0, is_published: true },
  columns: [{ key: 'title', label: 'Service' }, { key: 'icon', label: 'Icône' }, { key: 'is_published', label: 'Statut', render: (r) => pub(r.is_published) }],
  fields: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
    { name: 'icon', label: 'Icône', type: 'select', half: true, options: iconNames },
    { name: 'position', label: 'Ordre', type: 'number', half: true },
    { name: 'is_published', label: 'Publié', type: 'checkbox' },
  ],
};

export const testimonialsConfig: CrudConfig = {
  table: 'testimonials', title: 'Témoignages', singular: 'un témoignage', description: 'Uniquement de vrais retours, avec l’accord de leur auteur.',
  orderBy: { column: 'created_at' }, searchKeys: ['name', 'content'], defaults: { is_published: false },
  columns: [{ key: 'name', label: 'Auteur' }, { key: 'content', label: 'Témoignage' }, { key: 'is_published', label: 'Statut', render: (r) => pub(r.is_published) }],
  fields: [
    { name: 'name', label: 'Auteur', type: 'text', required: true, half: true },
    { name: 'role', label: 'Rôle / contexte', type: 'text', half: true },
    { name: 'avatar_url', label: 'Photo (URL)', type: 'url', half: true },
    { name: 'content', label: 'Témoignage', type: 'textarea', required: true },
    { name: 'is_published', label: 'Publié', type: 'checkbox' },
  ],
};
