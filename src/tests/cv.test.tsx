// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { db, now, seed, installFakeSupabase, rpc, rpcCalls, type Row } from './fakeSupabase';

const pdfMock = vi.hoisted(() => ({ fail: false, saved: 0 }));
vi.mock('@/lib/cv/pdf/generate', () => ({
  generateCvPdf: async () => { if (pdfMock.fail) throw new Error('boom'); return new Blob(['%PDF-1.4'], { type: 'application/pdf' }); },
  cvFileName: () => 'CV-test.pdf',
  saveBlob: () => { pdfMock.saved++; },
}));

const T = { timeout: 8000 };
vi.setConfig({ testTimeout: 40000 });

beforeAll(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://fake.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  window.scrollTo = vi.fn() as never;
  window.confirm = () => true;
  class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  (globalThis as never as { IntersectionObserver: unknown }).IntersectionObserver = IO;
  installFakeSupabase();
});

const desktop = (on: boolean) => {
  window.matchMedia = ((q: string) => ({ matches: on && q.includes('min-width'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
};
afterEach(() => cleanup());
beforeEach(() => {
  seed(); localStorage.clear(); rpcCalls.length = 0; pdfMock.fail = false; pdfMock.saved = 0; desktop(true);
  for (const k of Object.keys(rpc)) delete rpc[k];
});

/** Reproduit les règles de visibilité de get_public_cv() (validées sur un vrai PostgreSQL par `npm run test:db`). */
function publicCvFromDb() {
  const p = db.cv_profiles[0] as Row | undefined;
  if (!p || !p.is_public) return null;
  const vis = (t: string) => db[t].filter((r) => r.is_visible !== false).map(({ is_visible: _v, created_at: _c, ...r }) => (void _v, void _c, r));
  return {
    profile: { ...p, email: p.show_email ? p.email : null, phone: p.show_phone ? p.phone : null, links: p.links ?? [] },
    skills: vis('cv_skills'), experiences: vis('cv_experiences'), education: vis('cv_education'), certifications: vis('cv_certifications'),
    achievements: vis('cv_achievements'), languages: vis('cv_languages'),
    projects: db.projects.filter((x) => x.show_in_cv && x.is_published).map((x) => ({ ...x, technologies: [] })),
    trainer_courses: [], services: [], updated_at: p.updated_at ?? now,
  };
}
const wirePublicRpc = () => {
  rpc.get_public_cv = () => publicCvFromDb();
  rpc.cv_is_published = () => Boolean(db.cv_profiles[0]?.is_public);
};

async function mount(path: string) {
  const { default: App } = await import('../App');
  const { ThemeProvider } = await import('@/contexts/ThemeContext');
  const { LanguageProvider } = await import('@/contexts/LanguageContext');
  const { AuthProvider } = await import('@/contexts/AuthContext');
  await import('../services/i18n');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  return render(
    <QueryClientProvider client={qc}><ThemeProvider><LanguageProvider><AuthProvider>
      <MemoryRouter initialEntries={[path]}><Suspense fallback={null}><App /></Suspense></MemoryRouter>
    </AuthProvider></LanguageProvider></ThemeProvider></QueryClientProvider>,
  );
}
const change = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
async function login(email: string, password: string) {
  await mount('/login');
  await screen.findByLabelText('Email', undefined, T);
  change('Email', email); change('Mot de passe', password);
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
}
const preview = () => within(screen.getByRole('complementary', { name: 'Aperçu du CV' }));

describe('Studio CV — parcours administrateur', () => {
  it('profil → compétence → expérience → projet (coché/décoché) → titre → publication', async () => {
    await login('admin@joe.dev', 'secret123');
    await screen.findAllByText('Vue générale', undefined, T);
    fireEvent.click(await screen.findByText('CV & Profil professionnel', undefined, T));
    await screen.findByRole('heading', { name: 'CV & Profil professionnel' }, T);

    // Aucun profil : message dédié, aucune donnée inventée
    expect(await screen.findByText('Votre profil professionnel n’est pas encore configuré.', undefined, T)).toBeTruthy();

    // TEST 1 — profil
    fireEvent.change(await screen.findByLabelText('Prénom'), { target: { value: 'Joe' } });
    change('Nom', 'Dev');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(db.cv_profiles).toHaveLength(1), T);
    expect(db.cv_profiles[0].display_name).toBe('Joe Dev');
    expect(db.cv_profiles[0].is_public).toBe(false);
    expect(await preview().findByRole('heading', { level: 1, name: 'Joe Dev' }, T)).toBeTruthy();
    // synchro du site : nom + titre, pas d'email/téléphone masqués
    await waitFor(() => expect(db.settings.some((s) => s.key === 'identity.name' && s.value === 'Joe Dev')).toBe(true), T);
    expect(db.settings.some((s) => s.key === 'identity.email')).toBe(false);

    // TEST 2 — compétence
    fireEvent.click(screen.getByRole('tab', { name: 'Compétences' }));
    fireEvent.click(await screen.findByRole('button', { name: /Ajouter une compétence/ }));
    const sf = within(screen.getByRole('form', { name: 'Ajouter une compétence' }));
    fireEvent.change(sf.getByLabelText('Catégorie'), { target: { value: 'Frontend' } });
    fireEvent.change(sf.getByLabelText('Compétence'), { target: { value: 'React' } });
    fireEvent.click(sf.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(db.cv_skills).toHaveLength(1), T);
    expect(await preview().findByText('React', undefined, T)).toBeTruthy();
    expect(preview().queryByText(/%/)).toBeNull(); // jamais de pourcentage artificiel

    // TEST 3 — expérience
    fireEvent.click(screen.getByRole('tab', { name: 'Expériences' }));
    fireEvent.click(await screen.findByRole('button', { name: /Ajouter une expérience/ }));
    const ef = within(screen.getByRole('form', { name: 'Ajouter une expérience' }));
    fireEvent.change(ef.getByLabelText('Poste'), { target: { value: 'Développeur web' } });
    fireEvent.change(ef.getByLabelText(/Organisation/), { target: { value: 'Projet personnel' } });
    fireEvent.click(ef.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(db.cv_experiences).toHaveLength(1), T);
    expect(await preview().findByText('Développeur web', undefined, T)).toBeTruthy();

    // TEST 4/5/6 — projet existant, coché puis décoché
    fireEvent.click(screen.getByRole('tab', { name: 'Projets' }));
    const box = await screen.findByRole('checkbox', { name: 'Afficher dans mon CV' }, T);
    expect(preview().queryByText('Plateforme Joe')).toBeNull();
    fireEvent.click(box);
    await waitFor(() => expect(db.projects[0].show_in_cv).toBe(true), T);
    expect(await preview().findByText('Plateforme Joe', undefined, T)).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Afficher dans mon CV' }));
    await waitFor(() => expect(db.projects[0].show_in_cv).toBe(false), T);
    await waitFor(() => expect(preview().queryByText('Plateforme Joe')).toBeNull(), T);

    // TEST 7 — titre professionnel : l'aperçu suit la saisie
    fireEvent.click(screen.getByRole('tab', { name: 'Profil' }));
    change('Titre professionnel', 'Développeur web');
    expect(await preview().findByText('Développeur web', { selector: 'p' }, T)).toBeTruthy();

    // Publication
    fireEvent.click(screen.getByRole('tab', { name: 'Modèle et publication' }));
    expect(screen.getByText('CV publié : Non')).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/CV publié : la page \/cv/));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(db.cv_profiles[0].is_public).toBe(true), T);
    expect(db.cv_profiles[0].headline).toBe('Développeur web');
    expect(await screen.findByRole('link', { name: 'Voir mon CV public' }, T)).toBeTruthy();
  });

  it('validation : lien dangereux refusé, rien enregistré', async () => {
    await login('admin@joe.dev', 'secret123');
    fireEvent.click(await screen.findByText('CV & Profil professionnel', undefined, T));
    fireEvent.change(await screen.findByLabelText('Prénom'), { target: { value: 'Joe' } });
    change('GitHub', 'javascript:alert(1)');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect((await screen.findAllByText(/Lien invalide/, undefined, T)).length).toBeGreaterThan(0);
    expect(db.cv_profiles).toHaveLength(0);
  });

  it('PDF : échec → message demandé ; succès → fichier enregistré', async () => {
    await login('admin@joe.dev', 'secret123');
    fireEvent.click(await screen.findByText('CV & Profil professionnel', undefined, T));
    fireEvent.change(await screen.findByLabelText('Prénom'), { target: { value: 'Joe' } });
    pdfMock.fail = true;
    fireEvent.click(screen.getByRole('button', { name: /Télécharger PDF/ }));
    expect(await screen.findByText('Impossible de générer le PDF pour le moment. Réessayez.', undefined, T)).toBeTruthy();
    pdfMock.fail = false;
    fireEvent.click(screen.getByRole('button', { name: /Télécharger PDF/ }));
    await waitFor(() => expect(pdfMock.saved).toBe(1), T);
  });
});

describe('Accès par rôle', () => {
  it('visiteur non connecté : /studio/cv → connexion', async () => {
    await mount('/studio/cv');
    expect(await screen.findByRole('heading', { name: 'Connexion' }, T)).toBeTruthy();
  });

  it('apprenant connecté (non-admin) : /studio/cv inaccessible, redirigé vers son espace', async () => {
    await login('learner@joe.dev', 'learner123');
    await screen.findByText(/Bienvenue/, undefined, T);
    cleanup();
    await mount('/studio/cv');
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'CV & Profil professionnel' })).toBeNull(), T);
    expect(await screen.findByText(/Bienvenue/, undefined, T)).toBeTruthy();
  });
});

describe('Page publique /cv', () => {
  it('non publié : « Cette page CV n’est pas disponible. », aucune donnée, lien CV absent', async () => {
    wirePublicRpc();
    db.cv_profiles = [{ id: 'cv1', display_name: 'Secret Nom', first_name: 'S', last_name: 'N', headline: 'Titre privé', email: 'prive@x.io', show_email: true, is_public: false, links: [], template: 'minimal', updated_at: now }];
    await mount('/cv');
    expect(await screen.findByText('Cette page CV n’est pas disponible.', undefined, T)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Secret Nom|prive@x\.io|Titre privé/);
    expect(screen.queryByRole('link', { name: 'CV' })).toBeNull();
  });

  it('publié : contenu, date issue de la base, boutons, email masqué par défaut, lien CV dans la navbar', async () => {
    wirePublicRpc();
    db.cv_profiles = [{ id: 'cv1', first_name: 'Joe', last_name: 'Dev', display_name: 'Joe Dev', headline: 'Développeur • Formateur', email: 'prive@x.io', show_email: false, phone: '+243', show_phone: false, github: 'https://github.com/x', links: [], summary_short: '', summary_long: 'Je construis des applications web.', show_summary: true, show_services: false, show_qr: true, template: 'modern', is_public: true, updated_at: '2026-03-05T10:00:00Z' }];
    db.cv_skills = [{ id: 's1', category: 'Frontend', name: 'React', level: null, position: 0, is_visible: true }, { id: 's2', category: 'Frontend', name: 'Masquée', level: null, position: 1, is_visible: false }];
    await mount('/cv');
    expect(await screen.findByRole('heading', { level: 1, name: 'Joe Dev' }, T)).toBeTruthy();
    expect(screen.getByText(/CV mis à jour le 5 mars 2026/)).toBeTruthy();
    expect(screen.getByText('React')).toBeTruthy();
    expect(screen.queryByText('Masquée')).toBeNull();
    expect(document.body.textContent).not.toMatch(/prive@x\.io|\+243/);
    expect(screen.queryByText('Expériences')).toBeNull(); // sections vides non rendues
    expect(screen.getByRole('button', { name: /Télécharger le CV/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Voir le portfolio' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Partager mon CV/ })).toBeTruthy();
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(await within(nav).findByText('CV', undefined, T)).toBeTruthy();
    // téléchargement
    fireEvent.click(screen.getByRole('button', { name: /Télécharger le CV/ }));
    await waitFor(() => expect(pdfMock.saved).toBe(1), T);
  });

  it('erreur réseau : message + Réessayer, jamais d’écran noir', async () => {
    rpc.get_public_cv = () => { throw new Error('réseau'); };
    rpc.cv_is_published = () => false;
    await mount('/cv');
    expect(await screen.findByText('Impossible de charger le CV.', undefined, T)).toBeTruthy();
    rpc.get_public_cv = () => null;
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByText('Cette page CV n’est pas disponible.', undefined, T)).toBeTruthy();
  });

  it('accueil : « Voir mon CV » uniquement quand le CV est publié', async () => {
    wirePublicRpc();
    await mount('/');
    await screen.findByRole('heading', { level: 1, name: /Construire\. Apprendre\./ }, T);
    await waitFor(() => expect(rpcCalls).toContain('cv_is_published'), T);
    expect(screen.queryByText('Voir mon CV')).toBeNull();
    cleanup();
    db.cv_profiles = [{ id: 'cv1', display_name: 'Joe', is_public: true }];
    await mount('/');
    expect(await screen.findByText('Voir mon CV', undefined, T)).toBeTruthy();
  });
});
