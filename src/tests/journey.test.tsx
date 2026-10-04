// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { db, fnCalls, seed, installFakeSupabase } from './fakeSupabase';

beforeAll(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://fake.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  window.scrollTo = vi.fn() as never;
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
  class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  (globalThis as never as { IntersectionObserver: unknown }).IntersectionObserver = IO;
  window.confirm = () => true;

  installFakeSupabase();
});

afterEach(() => cleanup());
beforeEach(() => { seed(); localStorage.clear(); fnCalls.length = 0; });

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
const T = { timeout: 8000 };
vi.setConfig({ testTimeout: 40000 });
const change = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('parcours VISITEUR → APPRENANT', () => {
  it('accueil : hero, navbar simplifiée, formations, bientôt disponible', async () => {
    await mount('/');
    expect(await screen.findByRole('heading', { level: 1, name: /Construire\. Apprendre\./ })).toBeTruthy();
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    for (const l of ['Accueil', 'Formations', 'Projets', 'À propos', 'Ressources', 'Plus']) expect(within(nav).getByText(l)).toBeTruthy();
    expect(within(nav).queryByText('Contact')).toBeNull(); // dans « Plus »
    // « Commencer » existe aussi dans le CTA final de la page : on cible l'en-tête.
    const header = screen.getByRole('banner');
    expect(within(header).getByText('Connexion')).toBeTruthy();
    expect(within(header).getByText('Commencer')).toBeTruthy();
    expect(await screen.findByText('Plateforme Joe')).toBeTruthy();
    expect(screen.getByText('En développement')).toBeTruthy();
    fireEvent.click(within(nav).getByText('Plus'));
    expect(screen.getAllByText('Vibe Coding').length).toBeGreaterThan(0);
    fireEvent.click(within(nav).getByText('Formations'));
    expect(await screen.findByText('IA avancée', undefined, T)).toBeTruthy();
    expect(screen.getAllByText('Bientôt disponible').some((el) => el.tagName === 'SPAN')).toBe(true);
  });

  it('formation « bientôt » : liste d’attente sans doublon, aucun faux bouton d’inscription', async () => {
    const { unmount } = await mount('/formations/ia-avancee');
    expect(await screen.findByText('Cette formation arrive bientôt.', undefined, T)).toBeTruthy();
    expect(screen.queryByText(/M’inscrire à cette formation|Commencer le cours/)).toBeNull();
    change('Email', 'Visiteur@Example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Me prévenir' }));
    expect(await screen.findByText(/Adresse enregistrée\. Ce n’est pas encore une inscription/, undefined, T)).toBeTruthy();
    expect(db.course_waitlist).toHaveLength(1);
    unmount(); cleanup();
    await mount('/formations/ia-avancee');
    await screen.findByText('Cette formation arrive bientôt.', undefined, T);
    change('Email', 'visiteur@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Me prévenir' }));
    expect(await screen.findByText(/Adresse enregistrée/, undefined, T)).toBeTruthy();
    expect(db.course_waitlist).toHaveLength(1);
  });

  it('connexion refusée : message lisible, jamais « AuthApiError »', async () => {
    await mount('/login');
    await screen.findByLabelText('Email', undefined, T);
    change('Email', 'nobody@x.io'); change('Mot de passe', 'wrongpass');
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByText('Email ou mot de passe incorrect.', undefined, T)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/AuthApiError|Invalid login/);
  });

  it('inscription → /app → inscription à la formation → cours → progression', async () => {
    await mount('/formations/react-ts');
    fireEvent.click(await screen.findByText('Créer un compte pour commencer', undefined, T));
    fireEvent.change(await screen.findByLabelText('Prénom'), { target: { value: 'Camille' } });
    change('Nom', 'Durand'); change('Email', 'camille@example.com');
    fireEvent.change(document.getElementById('password') as HTMLInputElement, { target: { value: 'motdepasse1' } });
    change('Confirmer le mot de passe', 'motdepasse1');
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    // retour sur la fiche formation (state.from) avec bouton d'inscription
    fireEvent.click(await screen.findByRole('button', { name: /M’inscrire à cette formation/ }, T));
    // lecteur de cours
    expect(await screen.findByText('Premier composant', undefined, T)).toBeTruthy();
    expect(db.enrollments).toHaveLength(1);
    fireEvent.click(await screen.findByRole('button', { name: /Marquer/ }));
    await waitFor(() => expect(db.lesson_progress).toHaveLength(1), T);
  });
});

describe('parcours ADMIN', () => {
  it('connexion → Studio → créer formation → module → leçon → publier', async () => {
    await mount('/login');
    await screen.findByLabelText('Email', undefined, T);
    change('Email', 'admin@joe.dev'); change('Mot de passe', 'secret123');
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect((await screen.findAllByText('Vue générale', undefined, T)).length).toBeGreaterThan(0);
    const side = screen.getAllByText('Contenu')[0];
    expect(side).toBeTruthy();
    expect(screen.queryByText('Modules')).toBeNull();

    // Studio → Formations → Nouvelle formation
    fireEvent.click(screen.getAllByText('Formations')[0]);
    await screen.findByRole('heading', { name: 'Formations' }, T);
    fireEvent.click(await screen.findByText('Nouvelle formation', undefined, T));
    await screen.findByLabelText('Titre', undefined, T);
    change('Titre', 'Supabase pour débutants');
    change('Description courte', 'Créer un backend complet avec Supabase.');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer et continuer' }));
    await waitFor(() => expect(db.courses.some((c) => c.slug === 'supabase-pour-debutants')).toBe(true), T);
    fireEvent.click(await screen.findByRole('button', { name: 'Enregistrer et continuer' })); // étape 2 → 3

    // Modules et leçons
    await screen.findByLabelText('Nouveau module', undefined, T);
    change('Nouveau module', 'Premiers pas');
    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter le module' }));
    fireEvent.click(await screen.findByText('+ Ajouter une leçon', undefined, T));
    await screen.findByLabelText('Titre de la leçon', undefined, T);
    change('Titre de la leçon', 'Créer un projet');
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter la leçon' }));
    await waitFor(() => expect(db.lessons.filter((l) => l.title === 'Créer un projet')).toHaveLength(1), T);

    // Publication (étapes 4 puis 5)
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Suivant' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Publier' }));
    expect(await screen.findByText('Vous êtes sur le point de publier cette formation.')).toBeTruthy();
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Publier' }));
    await waitFor(() => expect(db.courses.find((c) => c.slug === 'supabase-pour-debutants')?.status).toBe('PUBLIEE'), T);
    // Pas d'email « simulé » : fonction non déployée → message honnête
    expect(await screen.findByText('Notifications email non configurées.', undefined, T)).toBeTruthy();
    expect(fnCalls).toContain('/functions/v1/notify-course-published');
  });
});
