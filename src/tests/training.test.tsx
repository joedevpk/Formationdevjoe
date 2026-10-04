// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { db, now, rpc, seed, installFakeSupabase, nid } from './fakeSupabase';

beforeAll(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://fake.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  window.scrollTo = vi.fn() as never;
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
  class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  (globalThis as never as { IntersectionObserver: unknown }).IntersectionObserver = IO;
  installFakeSupabase();
});
afterEach(() => cleanup());
vi.setConfig({ testTimeout: 40000 });
const T = { timeout: 8000 };

const COURSE = {
  id: 'c-web', slug: 'sites-web', title: 'Création de sites web', short_description: 'Apprendre à créer des sites web en présentiel.', long_description: null, image_url: null,
  level: 'DEBUTANT', duration: '5 jours', price: null, currency: null, status: 'PUBLIEE', category: 'Web', objectives: ['Construire un site'], prerequisites: [], final_project: null,
  has_certificate: true, is_featured: false, coming_soon: false, delivery_mode: 'PRESENTIEL', materials: ['Ordinateur portable'], practical_info: 'Accueil dès 8h30.', trainer_name: 'Joe Formateur',
  position: 1, created_at: now, updated_at: now,
};
const SESSION = {
  id: 's-1', course_id: 'c-web', title: null, starts_on: '2026-11-15', ends_on: '2026-11-20', daily_start: '09:00:00', daily_end: '16:00:00', schedule_note: null, location: 'Kinshasa — Salle A', address: null,
  trainer_id: null, trainer_name: 'Joe Formateur', capacity: 10, status: 'OUVERT', min_attendance_pct: null, requires_final_validation: true, requires_final_project: false, requires_evaluation: false,
  list_status: 'PRIVEE', list_visibility: 'PARTICIPANTS', list_published_at: null, completed_at: null, created_at: now, updated_at: now,
};

beforeEach(() => {
  seed(); localStorage.clear();
  db.courses.push({ ...COURSE });
  db.training_sessions.push({ ...SESSION });
  db.course_modules.push({ id: 'm-web', course_id: 'c-web', title: 'HTML et CSS', description: null, position: 0, created_at: now, updated_at: now });
  rpc.training_seats = () => [{ session_id: 's-1', taken: 3 }];
});

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
const change = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('page /formations — formations présentielles', () => {
  it('affiche date, lieu, niveau, durée, places (issues de la base), statut, formateur', async () => {
    await mount('/formations');
    const card = await screen.findByRole('link', { name: /Création de sites web — formation présentielle/ }, T);
    const c = within(card);
    expect(c.getByText('Formation présentielle')).toBeTruthy();
    expect(c.getByText('Inscriptions ouvertes')).toBeTruthy();
    expect(c.getByText(/15–20 novembre/)).toBeTruthy();
    expect(c.getByText('Kinshasa — Salle A')).toBeTruthy();
    expect(c.getByText(/Débutant · 5 jours/)).toBeTruthy();
    expect(c.getByText('Joe Formateur')).toBeTruthy();
    expect(c.getByText(/7 places disponibles sur 10/)).toBeTruthy(); // 10 - 3 confirmées (agrégat serveur)
    expect(c.getByText('S’inscrire')).toBeTruthy();
  });

  it('formation complète : statut « Complet », aucun bouton d’inscription', async () => {
    rpc.training_seats = () => [{ session_id: 's-1', taken: 10 }];
    await mount('/formations');
    const card = await screen.findByRole('link', { name: /Création de sites web/ }, T);
    expect(within(card).getByText('Complet')).toBeTruthy();
    expect(within(card).queryByText('S’inscrire')).toBeNull();
    expect(within(card).getByText(/0 place disponible sur 10/)).toBeTruthy();
  });

  it('formation sans session : « Bientôt disponible », aucune date ni place inventée', async () => {
    db.training_sessions.length = 0;
    await mount('/formations');
    const card = await screen.findByRole('link', { name: /Création de sites web/ }, T);
    expect(within(card).getByText('Bientôt disponible')).toBeTruthy();
    expect(within(card).queryByText(/place/)).toBeNull();
    expect(within(card).queryByText(/novembre/)).toBeNull();
  });

  it('les formations EN_LIGNE existantes gardent leur carte d’origine', async () => {
    await mount('/formations');
    expect(await screen.findByText('React & TypeScript', undefined, T)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /React & TypeScript — formation présentielle/ })).toBeNull();
  });
});

describe('fiche publique d’une formation présentielle', () => {
  it('sections demandées + inscription : visiteur → connexion → inscription → suivi du statut', async () => {
    rpc.register_for_training_session = (a: { p_session_id: string; p_first_name: string; p_last_name: string; p_phone: string | null }) => {
      const id = nid();
      db.training_registrations.push({
        id, session_id: a.p_session_id, course_id: 'c-web', user_id: 'learner-1', first_name: a.p_first_name, last_name: a.p_last_name, email: 'learner@joe.dev', phone: a.p_phone,
        status: 'EN_ATTENTE', registered_at: now, listed: false, validation_status: 'A_VALIDER', validated_at: null, final_project_ok: false, evaluation_ok: false, checkin_token: 'tok',
        training_sessions: { ...SESSION }, courses: { title: COURSE.title, slug: COURSE.slug, image_url: null, duration: '5 jours', trainer_name: 'Joe Formateur', materials: COURSE.materials, practical_info: COURSE.practical_info, level: 'DEBUTANT' },
      });
      return id;
    };
    await mount('/formations/sites-web');
    expect((await screen.findAllByText('Formation présentielle', undefined, T)).length).toBeGreaterThan(0);
    for (const h of ['Objectifs', 'Programme', 'Informations pratiques', 'Matériel nécessaire']) expect(screen.getAllByText(h).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ordinateur portable/)).toBeTruthy();
    expect(screen.getByText('Accueil dès 8h30.')).toBeTruthy();
    fireEvent.click(await screen.findByText('Se connecter', undefined, T));
    await screen.findByLabelText('Email', undefined, T);
    change('Email', 'learner@joe.dev'); change('Mot de passe', 'learner123');
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    // retour sur la fiche : formulaire pré-rempli, e-mail du compte en lecture seule
    fireEvent.click(await screen.findByRole('button', { name: 'S’inscrire à cette session' }, T));
    expect((screen.getByLabelText('Email du compte') as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByLabelText('Prénom') as HTMLInputElement).value).toBe('Alice');
    change('Téléphone (facultatif)', '+243810000000');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer mon inscription' }));
    expect(await screen.findByRole('heading', { name: 'Votre inscription' }, T)).toBeTruthy();
    expect(screen.getByText('Création de sites web')).toBeTruthy();
    expect(screen.getByText('15–20 novembre 2026')).toBeTruthy();
    expect(screen.getByText('Inscription en attente de confirmation')).toBeTruthy();
    expect(db.training_registrations).toHaveLength(1);
  });

  it('erreur serveur « SESSION_FULL » : message lisible, aucun détail technique', async () => {
    rpc.register_for_training_session = () => { throw new Error('x'); };
    // la fausse base renvoie 500 si la fonction lève ; on simule l'erreur métier en renvoyant un code PostgREST
    const orig = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/rpc/register_for_training_session')) return new Response(JSON.stringify({ code: 'P0001', message: 'SESSION_FULL' }), { status: 400, headers: { 'content-type': 'application/json' } });
      return orig(input, init);
    }) as typeof fetch;
    try {
      await mount('/formations/sites-web');
      fireEvent.click(await screen.findByText('Se connecter', undefined, T));
      await screen.findByLabelText('Email', undefined, T);
      change('Email', 'learner@joe.dev'); change('Mot de passe', 'learner123');
      fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
      fireEvent.click(await screen.findByRole('button', { name: 'S’inscrire à cette session' }, T));
      fireEvent.click(screen.getByRole('button', { name: 'Confirmer mon inscription' }));
      expect(await screen.findByText('Cette session est complète.', undefined, T)).toBeTruthy();
      expect(document.body.textContent).not.toMatch(/P0001|SESSION_FULL|PostgrestError/);
    } finally { globalThis.fetch = orig; }
  });
});

describe('vérification publique /verify-certificate/:numéro', () => {
  const valid = { found: true, status: 'VALIDE', certificate_number: 'JDC-2026-ABC234', holder_name: 'Alice MUKENDI', course_title: 'Création de sites web', period_start: '2026-11-15', period_end: '2026-11-20', duration_label: '5 jours', location: 'Kinshasa', issued_at: '2026-11-21T10:00:00Z' };
  it('certificat valide : « Certificat vérifié », VALIDE, champs attendus, aucune donnée privée', async () => {
    rpc.verify_certificate = () => valid;
    await mount('/verify-certificate/JDC-2026-ABC234');
    expect(await screen.findByRole('heading', { name: 'Certificat vérifié' }, T)).toBeTruthy();
    expect(screen.getByText('VALIDE')).toBeTruthy();
    for (const t of ['Alice MUKENDI', 'Création de sites web', '15–20 novembre 2026', '5 jours', 'Kinshasa', 'JDC-2026-ABC234']) expect(screen.getByText(t)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/@|\+243/);
  });
  it('certificat révoqué : « CERTIFICAT RÉVOQUÉ » sans info personnelle', async () => {
    rpc.verify_certificate = () => ({ found: true, status: 'REVOQUE', certificate_number: 'JDC-2026-ABC234', revoked_at: now });
    await mount('/verify-certificate/JDC-2026-ABC234');
    expect(await screen.findByRole('heading', { name: 'CERTIFICAT RÉVOQUÉ' }, T)).toBeTruthy();
    expect(screen.queryByText('Alice MUKENDI')).toBeNull();
    expect(screen.queryByText('Certificat vérifié')).toBeNull();
  });
  it('numéro inconnu : message clair', async () => {
    rpc.verify_certificate = () => ({ found: false });
    await mount('/verify-certificate/JDC-2026-ZZZZZZ');
    expect(await screen.findByRole('heading', { name: 'Certificat introuvable' }, T)).toBeTruthy();
  });
  it('erreur réseau : message + bouton Réessayer', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => { if (String(input).includes('/rpc/verify_certificate')) throw new TypeError('Failed to fetch'); return orig(input, init); }) as typeof fetch;
    try {
      await mount('/verify-certificate/JDC-2026-ABC234');
      expect(await screen.findByText('Vérification momentanément indisponible.', undefined, T)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
    } finally { globalThis.fetch = orig; }
  });
});

describe('liste publiée des participants', () => {
  it('liste : numéro, prénom, nom uniquement', async () => {
    rpc.get_published_list = () => ({ access: 'PUBLIC', rows: [{ number: 1, first_name: 'Alice', last_name: 'Mukendi' }, { number: 2, first_name: 'Carine', last_name: 'Ilunga' }] });
    await mount('/formations/sites-web/sessions/s-1/liste');
    expect(await screen.findByText('Mukendi', undefined, T)).toBeTruthy();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['N°', 'Prénom', 'Nom']);
    expect(document.body.textContent).not.toMatch(/@|\+243/);
  });
  it('liste réservée : invite à se connecter ; liste non publiée : message', async () => {
    rpc.get_published_list = () => ({ access: 'LOGIN_REQUIRED', rows: [] });
    const { unmount } = await mount('/formations/sites-web/sessions/s-1/liste');
    expect(await screen.findByText('Cette liste est réservée aux participants connectés.', undefined, T)).toBeTruthy();
    unmount(); cleanup();
    rpc.get_published_list = () => ({ access: 'NOT_PUBLISHED', rows: [] });
    await mount('/formations/sites-web/sessions/s-1/liste');
    expect(await screen.findByText('Cette liste n’est pas publiée.', undefined, T)).toBeTruthy();
  });
});

describe('espace participant', () => {
  async function loginLearner(path: string) {
    await mount('/login');
    await screen.findByLabelText('Email', undefined, T);
    change('Email', 'learner@joe.dev'); change('Mot de passe', 'learner123');
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    await screen.findAllByText('Mon espace', undefined, T);
    return path;
  }
  it('/app/certificats : numéro, Voir, Télécharger PDF, Vérifier, Partager', async () => {
    db.certificates.push({ id: 'cert-1', user_id: 'learner-1', course_id: 'c-web', code: 'X', issued_at: now, certificate_number: 'JDC-2026-ABC234', status: 'VALIDE', registration_id: 'r1', session_id: 's-1', holder_name: 'Alice APPRENANTE', course_title: 'Création de sites web', period_start: '2026-11-15', period_end: '2026-11-20', duration_label: '5 jours', location: 'Kinshasa', trainer_name: 'Joe Formateur' });
    await loginLearner('/app/certificats');
    fireEvent.click((await screen.findAllByText('Mes certificats', undefined, T))[0]);
    expect(await screen.findByText('JDC-2026-ABC234', undefined, T)).toBeTruthy();
    for (const b of ['Voir', 'Télécharger PDF', 'Vérifier', 'Partager']) expect(screen.getByText(b)).toBeTruthy();
  });
});

describe('Studio — sessions (ADMIN)', () => {
  it('résumé réel d’une session ; confirmation d’une inscription', async () => {
    db.training_registrations.push({ id: 'r-1', session_id: 's-1', course_id: 'c-web', user_id: 'learner-1', first_name: 'Alice', last_name: 'Mukendi', email: 'learner@joe.dev', phone: null, status: 'EN_ATTENTE', registered_at: now, listed: false, validation_status: 'A_VALIDER', validated_at: null, final_project_ok: false, evaluation_ok: false, checkin_token: 't' });
    await mount('/login');
    await screen.findByLabelText('Email', undefined, T);
    change('Email', 'admin@joe.dev'); change('Mot de passe', 'secret123');
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    fireEvent.click((await screen.findAllByText('Sessions', undefined, T))[0]);
    expect(await screen.findByRole('heading', { name: 'Sessions de formation' }, T)).toBeTruthy();
    const card = (await screen.findByText('Création de sites web', undefined, T)).closest('li') as HTMLElement;
    expect(within(card).getByText('Inscriptions ouvertes')).toBeTruthy();
    expect(within(card).getByText('0 / 10')).toBeTruthy(); // confirmées / capacité — comptées dans la base, pas inventées
    fireEvent.click(within(card).getByText('Gérer la session'));
    fireEvent.click(await screen.findByRole('tab', { name: 'Participants' }, T));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmer' }, T));
    await waitFor(() => expect(db.training_registrations[0].status).toBe('CONFIRMEE'), T);
  });
});
