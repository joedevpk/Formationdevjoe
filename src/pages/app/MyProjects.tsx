import { Link } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { Seo } from '@/components/ui/Seo';
import { LoadingState } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useLearner } from '@/lib/learner';

// Les « projets » de l'apprenant = les projets finaux des formations auxquelles il est inscrit.
export default function MyProjects() {
  const { rows, loading } = useLearner();
  const list = rows.filter((r) => r.course.final_project);
  return (
    <div className="space-y-8">
      <Seo title="Mes projets" />
      <h1 className="text-3xl font-extrabold">Mes projets</h1>
      {loading ? <LoadingState /> : list.length === 0 ? (
        <div className="card p-8 text-center"><p className="text-sm text-neutral-500">Tes projets finaux apparaîtront ici quand tu t'inscriras à une formation.</p><div className="mt-4"><Button to="/formations">Voir les formations</Button></div></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">{list.map((r) => (
          <div key={r.course.id} className="card p-6"><Rocket className="h-5 w-5 text-primary-500" /><h2 className="mt-3 font-bold">{r.course.final_project}</h2><p className="mt-1 text-sm text-neutral-500">{r.course.title}</p>
            <div className="mt-4 flex items-center gap-2"><Badge variant={r.pct === 100 ? 'success' : 'warning'}>{r.pct === 100 ? 'Formation terminée' : 'À réaliser'}</Badge><Link to={`/app/formations/${r.course.slug}`} className="ml-auto text-sm text-primary-500 hover:underline">Ouvrir</Link></div></div>
        ))}</div>
      )}
    </div>
  );
}
