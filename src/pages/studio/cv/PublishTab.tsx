import { CV_TEMPLATES } from '@/lib/cv/types';
import type { cvCompleteness } from '@/lib/cv/format';
import { SITE_URL } from '@/lib/site';
import type { Draft } from './ProfileTab';
import { cn } from '@/utils';

function Toggle({ id, checked, onChange, label, help }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; help?: string }) {
  return (
    <div className="flex gap-3">
      <input id={id} type="checkbox" className="mt-1" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div><label htmlFor={id} className="text-sm font-medium">{label}</label>{help && <p className="text-xs text-neutral-500">{help}</p>}</div>
    </div>
  );
}

type Completeness = ReturnType<typeof cvCompleteness>;

export function PublishTab({ draft, setDraft, hasServices, completeness, onGoTo }: { draft: Draft; setDraft: (f: (d: Draft) => Draft) => void; hasServices: boolean; completeness: Completeness; onGoTo: (tab: string) => void }) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  return (
    <div className="space-y-10">
      <section aria-labelledby="cv-quality" className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-3">
          <h2 id="cv-quality" className="text-lg font-bold">Qualité du CV</h2>
          <p className="font-mono text-sm font-semibold" aria-label={`${completeness.done} critères sur ${completeness.total}`}>{completeness.done}/{completeness.total}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completeness.score} aria-label="Complétude du CV">
          <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${completeness.score}%` }} />
        </div>
        <p className="mt-2 text-xs text-neutral-500">Calculé uniquement à partir de ce que tu as réellement saisi.</p>
        <ul className="mt-4 space-y-2">
          {completeness.checks.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 text-sm">
              <span className={c.done ? 'text-neutral-500 line-through' : 'font-medium'}>{c.done ? '✓ ' : '○ '}{c.label}</span>
              {!c.done && <button type="button" onClick={() => onGoTo(c.tab)} className="shrink-0 text-xs font-semibold text-primary-600 underline underline-offset-4 dark:text-primary-300">{c.hint}</button>}
            </li>
          ))}
        </ul>
      </section>

      <fieldset>
        <legend className="mb-3 text-lg font-bold">Modèle</legend>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Modèle de CV">
          {CV_TEMPLATES.map((t) => (
            <label key={t.id} className={cn('card cursor-pointer p-4 transition', draft.template === t.id ? 'border-primary-600 ring-2 ring-primary-600/30' : 'hover:border-neutral-400')}>
              <input type="radio" name="cv-template" className="sr-only" checked={draft.template === t.id} onChange={() => set('template', t.id)} />
              <span className="block font-semibold">{t.label}</span>
              <span className="mt-1 block text-sm text-neutral-600 dark:text-neutral-400">{t.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-lg font-bold">Ce qui est affiché</legend>
        <Toggle id="cv-show-email" checked={draft.show_email} onChange={(v) => set('show_email', v)} label="Afficher mon email dans le CV public et le PDF" help={draft.email ? undefined : 'Aucun email saisi dans l’onglet Profil.'} />
        <Toggle id="cv-show-phone" checked={draft.show_phone} onChange={(v) => set('show_phone', v)} label="Afficher mon téléphone dans le CV public et le PDF" help={draft.phone ? undefined : 'Aucun téléphone saisi dans l’onglet Profil.'} />
        <Toggle id="cv-show-services" checked={draft.show_services} onChange={(v) => set('show_services', v)} label="Afficher mes services" help={hasServices ? 'Services publiés du site (Studio → Contenu → Services). Aucun service n’est inventé.' : 'Aucun service publié sur le site pour le moment.'} />
        <Toggle id="cv-show-qr" checked={draft.show_qr} onChange={(v) => set('show_qr', v)} label="Ajouter un QR code vers /cv dans le PDF"
          help={SITE_URL ? `Le QR pointera vers ${SITE_URL}/cv.` : 'Indisponible : la variable SITE_URL n’est pas configurée au build (Render). Aucun QR n’est généré sans domaine réel.'} />
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <legend className="px-1 text-lg font-bold">Publication</legend>
        <Toggle id="cv-public" checked={draft.is_public} onChange={(v) => set('is_public', v)} label="CV publié : la page /cv est accessible à tout le monde"
          help="Désactivé : /cv affiche « Cette page CV n’est pas disponible. » et aucune donnée n’est exposée. N’oublie pas d’enregistrer." />
        <p className="text-sm font-semibold">{draft.is_public ? 'CV publié : Oui' : 'CV publié : Non'}</p>
      </fieldset>
    </div>
  );
}
