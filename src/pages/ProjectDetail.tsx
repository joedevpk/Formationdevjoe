import { useParams } from 'react-router-dom';
import { Github, ExternalLink, Play } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { PageHero } from '@/components/ui/PageHero';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { QueryState } from '@/components/ui/QueryState';
import { useProject } from '@/lib/queries';
import { formatDate, safeUrl } from '@/utils';
import { projectState } from '@/lib/courseStatus';

export default function ProjectDetail() {
  const { slug } = useParams();
  const query = useProject(slug);
  return (
    <QueryState query={query} isEmpty={(d) => d === null} emptyTitle="Projet introuvable" emptyText="Ce projet n’est pas disponible." emptyAction={<Button to="/projets" variant="outline">Retour aux projets</Button>}>
      {(p) => {
        if (!p) return null;
        const state = projectState(p.status);
        const isPrivate = state === 'Projet privé';
        const demo = isPrivate ? null : safeUrl(p.demo_url), gh = isPrivate ? null : safeUrl(p.github_url), video = safeUrl(p.video_url), img = safeUrl(p.image_url);
        // Sections d'étude de cas : uniquement celles renseignées (jamais de contenu inventé).
        const sections: [string, string | null][] = [
          ['Le problème', p.problem], ['La solution', p.solution], ['Architecture', p.architecture],
          ['Difficultés', p.challenges], ['Résultats', p.results], ["Ce que j'ai appris", p.learned],
        ];
        return (
          <>
            <Seo title={`Étude de cas — ${p.title}`} description={p.summary} image={img ?? undefined} />
            <PageHero eyebrow={`Étude de cas • ${p.category}`} title={p.title} description={p.summary}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={state === 'Disponible' ? 'success' : state === 'En développement' ? 'warning' : 'neutral'}>{state}</Badge>
                {p.role && <Badge variant="neutral">Rôle : {p.role}</Badge>}
                {p.project_date && <span className="text-sm text-neutral-500">{formatDate(p.project_date)}</span>}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {demo && <Button href={demo}><ExternalLink className="h-4 w-4" />Démo</Button>}
                {gh && <Button href={gh} variant="outline"><Github className="h-4 w-4" />GitHub</Button>}
                {video && <Button href={video} variant="outline"><Play className="h-4 w-4" />Vidéo</Button>}
              </div>
            </PageHero>
            <div className="section-container max-w-4xl space-y-10 py-14">
              {img && <img src={img} alt={`Aperçu du projet ${p.title}`} width={1280} height={720} loading="lazy" decoding="async" className="w-full rounded-3xl border border-neutral-200 dark:border-neutral-800" />}
              {sections.filter(([, v]) => v).map(([t, v]) => (
                <section key={t}><h2 className="text-2xl font-bold">{t}</h2><p className="mt-3 whitespace-pre-line leading-relaxed text-neutral-700 dark:text-neutral-300">{v}</p></section>
              ))}
              {p.technologies.length > 0 && <section><h2 className="text-2xl font-bold">Technologies</h2><div className="mt-3 flex flex-wrap gap-2">{p.technologies.map((t) => <Badge key={t} variant="primary">{t}</Badge>)}</div></section>}
              {p.features.length > 0 && <section><h2 className="text-2xl font-bold">Fonctionnalités</h2><ul className="mt-3 list-disc space-y-1 pl-6">{p.features.map((f) => <li key={f}>{f}</li>)}</ul></section>}
              <Button to="/projets" variant="outline">← Tous les projets</Button>
            </div>
          </>
        );
      }}
    </QueryState>
  );
}
