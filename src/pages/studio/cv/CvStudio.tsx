import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Seo } from '@/components/ui/Seo';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { CvDocument } from '@/components/cv/CvDocument';
import { DownloadCvButton, ShareCvButton } from '@/components/cv/CvActions';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { defaultProfile, toCvData, useCvAdmin, type AdminProfile } from '@/lib/cv/queries';
import { cvCompleteness, educationPeriod, experiencePeriod, monthYear, safeHref } from '@/lib/cv/format';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { formatDate, cn } from '@/utils';
import { ListEditor, type Field, type Rec } from './ListEditor';
import { ProfileTab, type Draft } from './ProfileTab';
import { ProjectsTab } from './ProjectsTab';
import { PublishTab } from './PublishTab';
import { ScaledPreview } from './ScaledPreview';

const TABS = [
  { id: 'profile', label: 'Profil' }, { id: 'skills', label: 'Compétences' }, { id: 'experiences', label: 'Expériences' },
  { id: 'education', label: 'Formation' }, { id: 'projects', label: 'Projets' }, { id: 'certifications', label: 'Certifications' },
  { id: 'achievements', label: 'Réalisations' }, { id: 'languages', label: 'Langues' }, { id: 'publish', label: 'Modèle et publication' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const skillFields: Field[] = [
  { name: 'category', label: 'Catégorie', type: 'text', required: true, half: true, suggestions: ['Frontend', 'Backend', 'Database', 'AI', 'Tools'] },
  { name: 'name', label: 'Compétence', type: 'text', required: true, half: true },
  { name: 'level', label: 'Niveau', type: 'text', nullable: true, half: true, help: 'Ex. Intermédiaire. Jamais de pourcentage artificiel.' },
];
const expFields: Field[] = [
  { name: 'role', label: 'Poste', type: 'text', required: true, half: true },
  { name: 'organization', label: 'Organisation', type: 'text', half: true },
  { name: 'location', label: 'Localisation', type: 'text', nullable: true, half: true },
  { name: 'start_date', label: 'Début', type: 'month', half: true },
  { name: 'end_date', label: 'Fin', type: 'month', half: true },
  { name: 'is_current', label: 'Actuellement en poste', type: 'checkbox' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'achievements', label: 'Réalisations (une par ligne)', type: 'list' },
  { name: 'technologies', label: 'Technologies (une par ligne)', type: 'list' },
];
const eduFields: Field[] = [
  { name: 'institution', label: 'Établissement', type: 'text', required: true },
  { name: 'degree', label: 'Diplôme / niveau', type: 'text', half: true },
  { name: 'field', label: 'Domaine', type: 'text', nullable: true, half: true },
  { name: 'location', label: 'Localisation', type: 'text', nullable: true, half: true },
  { name: 'start_date', label: 'Début', type: 'month', half: true },
  { name: 'end_date', label: 'Fin', type: 'month', half: true },
  { name: 'description', label: 'Description', type: 'textarea' },
];
const certFields: Field[] = [
  { name: 'name', label: 'Nom', type: 'text', required: true, half: true },
  { name: 'issuer', label: 'Organisme', type: 'text', half: true },
  { name: 'issued_on', label: 'Date', type: 'month', half: true },
  { name: 'credential_id', label: 'Identifiant', type: 'text', nullable: true, half: true },
  { name: 'url', label: 'Lien de vérification', type: 'url' },
  { name: 'description', label: 'Description', type: 'textarea' },
];
const achFields: Field[] = [
  { name: 'title', label: 'Titre', type: 'text', required: true, half: true },
  { name: 'event', label: 'Événement', type: 'text', nullable: true, half: true },
  { name: 'year', label: 'Année', type: 'year', half: true },
  { name: 'result', label: 'Résultat', type: 'text', nullable: true, half: true },
  { name: 'url', label: 'Lien', type: 'url', half: true },
  { name: 'image_url', label: 'Image (URL)', type: 'url', half: true },
  { name: 'description', label: 'Description', type: 'textarea' },
];
const langFields: Field[] = [
  { name: 'language', label: 'Langue', type: 'text', required: true, half: true },
  { name: 'level', label: 'Niveau', type: 'text', half: true, suggestions: ['Débutant', 'Intermédiaire', 'Courant', 'Langue maternelle'] },
];

const join = (...p: (string | null | undefined | false)[]) => p.filter(Boolean).join(' · ');
const toDraft = (p: AdminProfile | null): Draft => {
  if (!p) return defaultProfile();
  const { id: _i, updated_at: _u, ...rest } = p; void _i; void _u;
  return { ...defaultProfile(), ...rest, links: Array.isArray(rest.links) ? rest.links : [] };
};

export default function CvStudio() {
  const toast = useToast();
  const qc = useQueryClient();
  const admin = useCvAdmin(true);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [tab, setTab] = useState<TabId>('profile');
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [draft, setDraftState] = useState<Draft | null>(null);
  const [savedJson, setSavedJson] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (admin.data && draft === null) {
      const d = toDraft(admin.data.profile);
      setDraftState(d);
      setSavedJson(JSON.stringify(d));
    }
  }, [admin.data, draft]);

  const setDraft = (f: (d: Draft) => Draft) => setDraftState((d) => (d ? f(d) : d));
  const dirty = draft !== null && JSON.stringify(draft) !== savedJson;

  const preview = useMemo(() => (admin.data && draft ? toCvData(admin.data, draft) : null), [admin.data, draft]);
  const configured = draft !== null && Boolean(draft.display_name.trim() || draft.first_name.trim() || draft.last_name.trim());

  const refresh = async () => {
    await Promise.all([
      admin.refetch(),
      ...['cv-public', 'cv-published'].map((k) => qc.invalidateQueries({ queryKey: [k] })),
    ]);
  };

  const validate = (d: Draft) => {
    const e: Record<string, string> = {};
    if (!(d.display_name.trim() || d.first_name.trim() || d.last_name.trim())) e.display_name = 'Renseigne au moins ton nom.';
    for (const k of ['website', 'github', 'linkedin', 'photo_url'] as const) if (d[k] && !safeHref(d[k])) e[k] = 'Lien invalide (doit commencer par https://).';
    if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) e.email = 'Email invalide.';
    if (d.links.some((l) => l.url && !safeHref(l.url))) e.links = 'Un des liens est invalide (https:// requis).';
    return e;
  };

  const save = async () => {
    if (!draft) return;
    const errs = validate(draft);
    setErrors(errs);
    if (Object.keys(errs).length) { setTab('profile'); toast('error', 'Corrige les champs signalés.'); return; }
    setSaving(true);
    const clean: Draft = {
      ...draft,
      first_name: draft.first_name.trim(), last_name: draft.last_name.trim(),
      display_name: draft.display_name.trim() || `${draft.first_name} ${draft.last_name}`.trim(),
      headline: draft.headline.trim() || 'Développeur • Formateur • Étudiant • Entrepreneur',
      links: draft.links.filter((l) => l.url.trim()).map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
    };
    for (const k of ['location', 'email', 'phone', 'website', 'github', 'linkedin', 'photo_url'] as const) clean[k] = clean[k]?.trim() || null;
    try {
      const existing = admin.data?.profile;
      const { error } = existing
        ? await supabase.from('cv_profiles').update(clean).eq('id', existing.id)
        : await supabase.from('cv_profiles').insert(clean);
      if (error) throw error;
      setDraftState(clean);
      setSavedJson(JSON.stringify(clean));
      // Synchronisation du site (footer, contact, à propos) : jamais l'email/téléphone s'ils sont masqués dans le CV.
      const rows = [
        { key: 'identity.name', value: clean.display_name }, { key: 'identity.title', value: clean.headline },
        { key: 'identity.photo', value: clean.photo_url ?? '' }, { key: 'identity.location', value: clean.location ?? '' },
        { key: 'identity.github', value: clean.github ?? '' }, { key: 'identity.linkedin', value: clean.linkedin ?? '' },
        ...(clean.show_email ? [{ key: 'identity.email', value: clean.email ?? '' }] : []),
        ...(clean.show_phone ? [{ key: 'identity.phone', value: clean.phone ?? '' }] : []),
      ].filter((r) => r.value);
      const sync = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
      await Promise.all([refresh(), qc.invalidateQueries({ queryKey: ['identity'] })]);
      toast(sync.error ? 'error' : 'success', sync.error ? 'CV enregistré, mais la mise à jour du site a échoué.' : 'Profil enregistré.');
    } catch {
      toast('error', 'Enregistrement impossible. Réessaie dans un instant.');
    } finally {
      setSaving(false);
    }
  };

  if (!isSupabaseConfigured) return <p className="text-sm text-neutral-500">Le Studio nécessite une connexion Supabase configurée.</p>;
  if (admin.isLoading || (admin.data && draft === null)) return <div role="status"><LoadingState /><p className="mt-3 text-center text-sm text-neutral-500">Chargement du CV...</p></div>;
  if (admin.isError || !admin.data || !draft || !preview) {
    return (
      <div className="space-y-3 py-10 text-center">
        <p className="font-semibold">Impossible de charger le CV.</p>
        <button type="button" onClick={() => void admin.refetch()} className="btn-primary px-5 py-2.5">Réessayer</button>
      </div>
    );
  }

  const a = admin.data;
  const published = Boolean(a.profile?.is_public);
  const L = (items: unknown[]) => items as Rec[];
  const showEditor = isDesktop || mobileView === 'edit';
  const showPreview = isDesktop || mobileView === 'preview';
  const common = { onChanged: refresh };
  const completeness = cvCompleteness(preview);

  return (
    <div className="space-y-6">
      <Seo title="CV & Profil professionnel" noindex />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">CV & Profil professionnel</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            <Badge variant={published ? 'success' : 'neutral'}>{published ? 'Publié' : 'Non publié'}</Badge>
            <Badge variant={completeness.score >= 80 ? 'success' : 'warning'}>Qualité du CV : {completeness.score} %</Badge>
            {a.profile && <span>Dernière mise à jour : {formatDate(a.profile.updated_at)}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <button type="button" onClick={() => void save()} disabled={saving || !dirty} className="btn-primary px-5 py-2.5">{saving ? 'Enregistrement…' : dirty ? 'Enregistrer' : 'Enregistré'}</button>
          <button type="button" onClick={() => { setMobileView('preview'); window.setTimeout(() => document.getElementById('cv-preview')?.scrollIntoView({ behavior: 'smooth' }), 0); }} className="btn-outline px-5 py-2.5">Prévisualiser</button>
          <DownloadCvButton data={configured ? preview : null} template={draft.template} label="Télécharger PDF" className="btn-outline px-5 py-2.5" />
          {published
            ? <Link to="/cv" target="_blank" rel="noopener noreferrer" className="btn-outline px-5 py-2.5">Voir mon CV public</Link>
            : <span className="inline-flex items-center rounded-xl border border-dashed border-neutral-300 px-4 py-2.5 text-xs text-neutral-500 dark:border-neutral-700">CV non publié : publie-le dans « Modèle et publication ».</span>}
          {published && <ShareCvButton data={preview} />}
        </div>
      </div>
      {dirty && <p role="status" className="text-sm text-warning-700 dark:text-warning-300">Modifications du profil non enregistrées (l’aperçu les montre déjà).</p>}

      {!isDesktop && (
        <div className="flex gap-2" role="tablist" aria-label="Affichage">
          {(['edit', 'preview'] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={mobileView === v} onClick={() => setMobileView(v)}
              className={cn('flex-1 rounded-xl border px-4 py-2 text-sm font-semibold', mobileView === v ? 'border-primary-600 bg-primary-600 text-white' : 'border-neutral-300 dark:border-neutral-700')}>{v === 'edit' ? 'Informations' : 'Aperçu'}</button>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] xl:grid-cols-[minmax(0,1fr)_32rem]">
        {showEditor && (
          <div className="min-w-0 space-y-6">
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Sections du CV">
              {TABS.map((t) => (
                <button key={t.id} id={`tab-${t.id}`} type="button" role="tab" aria-selected={tab === t.id} aria-controls="cv-panel" onClick={() => setTab(t.id)}
                  className={cn('shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors', tab === t.id ? 'border-primary-600 bg-primary-600 text-white' : 'border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800')}>{t.label}</button>
              ))}
            </div>
            <div id="cv-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-w-0">
              {tab === 'profile' && <ProfileTab draft={draft} setDraft={setDraft} errors={errors} />}
              {tab === 'skills' && <ListEditor table="cv_skills" title="Compétences" noun="une compétence" items={L(a.skills)} fields={skillFields} defaults={{ category: 'Frontend' }} emptyText="Aucune compétence. Ajoute celles que tu maîtrises réellement, par catégorie." summary={(r) => ({ title: `${r.name}`, sub: join(String(r.category), r.level as string | null) })} {...common} />}
              {tab === 'experiences' && <ListEditor table="cv_experiences" title="Expériences professionnelles" noun="une expérience" items={L(a.experiences)} fields={expFields} defaults={{ achievements: [], technologies: [] }} emptyText="Aucune expérience : la section n’apparaît pas dans le CV." summary={(r) => ({ title: String(r.role), sub: join(String(r.organization), experiencePeriod(r as never)) })} {...common} />}
              {tab === 'education' && <ListEditor table="cv_education" title="Formation" noun="une formation" items={L(a.education)} fields={eduFields} defaults={{}} emptyText="Aucune formation : la section n’apparaît pas dans le CV." summary={(r) => ({ title: String(r.institution), sub: join(String(r.degree), r.field as string | null, educationPeriod(r as never)) })} {...common} />}
              {tab === 'projects' && <ProjectsTab admin={a} onChanged={refresh} />}
              {tab === 'certifications' && <ListEditor table="cv_certifications" title="Certifications" noun="une certification" items={L(a.certifications)} fields={certFields} defaults={{}} emptyText="Aucune certification. N’ajoute que des certifications réellement obtenues." summary={(r) => ({ title: String(r.name), sub: join(String(r.issuer), monthYear(r.issued_on as string | null)) })} {...common} />}
              {tab === 'achievements' && <ListEditor table="cv_achievements" title="Concours, hackathons, réalisations" noun="une réalisation" items={L(a.achievements)} fields={achFields} defaults={{}} emptyText="Section facultative, absente du CV tant qu’elle est vide." summary={(r) => ({ title: String(r.title), sub: join(r.event as string | null, r.year ? String(r.year) : null) })} {...common} />}
              {tab === 'languages' && <ListEditor table="cv_languages" title="Langues" noun="une langue" items={L(a.languages)} fields={langFields} defaults={{}} emptyText="Aucune langue." summary={(r) => ({ title: String(r.language), sub: String(r.level) })} {...common} />}
              {tab === 'publish' && <PublishTab draft={draft} setDraft={setDraft} hasServices={a.services.some((s) => s.is_published)} completeness={completeness} onGoTo={(t) => { if (TABS.some((x) => x.id === t)) setTab(t as TabId); }} />}
            </div>
          </div>
        )}

        {showPreview && (
          <aside id="cv-preview" aria-label="Aperçu du CV" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">Aperçu — modèle {draft.template}</p>
            {!configured ? (
              <div className="card p-6 text-sm"><p className="font-semibold">Votre profil professionnel n’est pas encore configuré.</p><p className="mt-1 text-neutral-500">Renseigne ton nom dans l’onglet Profil : l’aperçu apparaît ici et se met à jour au fil de tes modifications.</p></div>
            ) : isDesktop ? (
              <ScaledPreview><CvDocument data={preview} template={draft.template} /></ScaledPreview>
            ) : (
              <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"><CvDocument data={preview} template={draft.template} /></div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
