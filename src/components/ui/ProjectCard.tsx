import { Link } from 'react-router-dom';
import { ArrowRight, FolderKanban } from 'lucide-react';
import type { Project } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { projectState, type ProjectState } from '@/lib/courseStatus';
import { safeUrl } from '@/utils';

const stateVariant: Record<ProjectState, 'success' | 'warning' | 'neutral'> = {
  'Disponible': 'success',
  'En développement': 'warning',
  'Projet privé': 'neutral',
};

/** Carte projet : image, nom, description courte, technologies, statut, bouton. Aucune donnée inventée. */
export function ProjectCard({ project: p }: { project: Project }) {
  const img = safeUrl(p.image_url);
  const state = projectState(p.status);
  return (
    <Link to={`/projets/${p.slug}`} className="card-hover group flex h-full flex-col overflow-hidden">
      {img ? (
        <img src={img} alt={`Aperçu du projet ${p.title}`} width={1280} height={720} loading="lazy" decoding="async" className="aspect-video w-full object-cover" />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-neutral-100 text-neutral-400 dark:bg-neutral-900" aria-hidden="true"><FolderKanban className="h-10 w-10" /></div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-neutral-500">{p.category}</span>
          <Badge variant={stateVariant[state]}>{state}</Badge>
        </div>
        <h3 className="mt-2 text-xl font-bold">{p.title}</h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{p.summary}</p>
        {p.technologies.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{p.technologies.slice(0, 5).map((t) => <Badge key={t} variant="neutral">{t}</Badge>)}</div>}
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-300">Voir le projet <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
      </div>
    </Link>
  );
}
