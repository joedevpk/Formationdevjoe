import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import type { AdminCv, AdminProject } from '@/lib/cv/queries';

/** Les projets sont ceux de la base existante (table projects) : aucune duplication. */
function ProjectRow({ p, idx, count, busy, onSave, onMove }: { p: AdminProject; idx: number; count: number; busy: boolean; onSave: (patch: Partial<AdminProject>) => Promise<void>; onMove: (d: -1 | 1) => void }) {
  const [role, setRole] = useState(p.role ?? '');
  const [results, setResults] = useState(p.results ?? '');
  const dirty = role !== (p.role ?? '') || results !== (p.results ?? '');
  return (
    <li className="card space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{p.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <Badge variant={p.is_published ? 'success' : 'neutral'}>{p.is_published ? 'Sur le portfolio' : 'Hors portfolio'}</Badge>
            <span>{p.status}</span>
            {p.technologies.length > 0 && <span>{p.technologies.join(', ')}</span>}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={p.show_in_cv} disabled={busy} onChange={(e) => void onSave({ show_in_cv: e.target.checked })} />
          Afficher dans mon CV
        </label>
        <div className="flex">
          <button type="button" disabled={busy || idx === 0} onClick={() => onMove(-1)} aria-label={`Monter ${p.title}`} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
          <button type="button" disabled={busy || idx === count - 1} onClick={() => onMove(1)} aria-label={`Descendre ${p.title}`} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      </div>
      {p.show_in_cv && !p.is_published && <p className="text-xs text-warning-700 dark:text-warning-300">Ce projet n’apparaîtra dans le CV que lorsqu’il sera publié sur le portfolio.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label htmlFor={`role-${p.id}`} className="label">Votre rôle</label><input id={`role-${p.id}`} className="input-field" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex. Développeur" /></div>
        <div className="sm:col-span-2"><label htmlFor={`res-${p.id}`} className="label">Résultats / réalisations réels</label><textarea id={`res-${p.id}`} rows={2} className="input-field" value={results} onChange={(e) => setResults(e.target.value)} placeholder="Uniquement ce qui est vrai et vérifiable. Laisse vide sinon." /></div>
      </div>
      {dirty && <button type="button" disabled={busy} onClick={() => void onSave({ role: role.trim() || null, results: results.trim() || null })} className="btn-primary px-4 py-1.5 text-sm">Enregistrer ce projet</button>}
    </li>
  );
}

export function ProjectsTab({ admin, onChanged }: { admin: AdminCv; onChanged: () => Promise<unknown> }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const guard = async (fn: () => PromiseLike<{ error: unknown }>) => {
    setBusy(true);
    try { const { error } = await fn(); if (error) throw error; await onChanged(); } catch { toast('error', 'Action impossible. Réessaie dans un instant.'); } finally { setBusy(false); }
  };
  const saveProject = (id: string, patch: Partial<AdminProject>) => {
    const { technologies: _t, ...clean } = patch; void _t;
    return guard(() => supabase.from('projects').update(clean).eq('id', id));
  };
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    const order = admin.projects.map((p) => p.id);
    if (j < 0 || j >= order.length) return;
    [order[idx], order[j]] = [order[j], order[idx]];
    return guard(async () => {
      const rs = await Promise.all(order.map((id, pos) => supabase.from('projects').update({ cv_position: pos }).eq('id', id)));
      return { error: rs.find((r) => r.error)?.error ?? null };
    });
  };

  return (
    <div className="space-y-10">
      <section aria-labelledby="cv-projects" className="space-y-4">
        <div><h2 id="cv-projects" className="text-lg font-bold">Projets</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Les mêmes projets que le portfolio. Coche ceux à montrer dans le CV. Pour modifier un projet en détail : <Link to="/studio/projets" className="underline">Studio → Projets</Link>.</p></div>
        {admin.projects.length === 0 ? <p className="rounded-xl border border-dashed border-neutral-300 p-5 text-sm text-neutral-500 dark:border-neutral-700">Aucun projet. Ajoute-en depuis Studio → Projets.</p> : (
          <ul className="space-y-3">{admin.projects.map((p, i) => <ProjectRow key={p.id} p={p} idx={i} count={admin.projects.length} busy={busy} onSave={(patch) => saveProject(p.id, patch)} onMove={(d) => void move(i, d)} />)}</ul>
        )}
      </section>

      <section aria-labelledby="cv-trainer" className="space-y-4">
        <div><h2 id="cv-trainer" className="text-lg font-bold">Activité de formateur</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Les formations ne deviennent jamais des expériences automatiquement. Coche celles que tu as créées et que tu veux citer. Seules les formations publiées apparaissent.</p></div>
        <ul className="space-y-2">
          {admin.courses.map((c) => (
            <li key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{c.title}</p><p className="text-xs text-neutral-500">{c.status === 'PUBLIEE' ? 'Publiée' : 'Non publiée — n’apparaîtra pas'}</p></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.show_in_cv} disabled={busy} onChange={(e) => void guard(() => supabase.from('courses').update({ show_in_cv: e.target.checked }).eq('id', c.id))} />Afficher comme activité de formateur</label>
            </li>
          ))}
          {admin.courses.length === 0 && <li className="text-sm text-neutral-500">Aucune formation.</li>}
        </ul>
      </section>
    </div>
  );
}
