// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { seed, installFakeSupabase, faults } from './fakeSupabase';
import { authUrl, homeFor, postAuthTarget, readRedirect, safeRedirect } from '@/lib/redirect';

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
beforeEach(() => { seed(); localStorage.clear(); });

/** Affiche l'URL courante : permet de vérifier où l'utilisateur atterrit réellement. */
function Probe() {
  const l = useLocation();
  return <div data-testid="loc">{l.pathname + l.search}</div>;
}
const here = () => screen.getByTestId('loc').textContent;

async function mount(path: string) {
  const { default: App } = await import('../App');
  const { ThemeProvider } = await import('@/contexts/ThemeContext');
  const { LanguageProvider } = await import('@/contexts/LanguageContext');
  const { AuthProvider } = await import('@/contexts/AuthContext');
  await import('../services/i18n');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  return render(
    <QueryClientProvider client={qc}><ThemeProvider><LanguageProvider><AuthProvider>
      <MemoryRouter initialEntries={[path]}><Probe /><Suspense fallback={null}><App /></Suspense></MemoryRouter>
    </AuthProvider></LanguageProvider></ThemeProvider></QueryClientProvider>,
  );
}

const T = { timeout: 8000 };
vi.setConfig({ testTimeout: 40000 });
const change = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

async function submitLogin(email: string, password: string) {
  await screen.findByLabelText('Email', undefined, T);
  change('Email', email);
  change('Mot de passe', password);
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
}
const LEARNER = ['learner@joe.dev', 'learner123'] as const;
const ADMIN = ['admin@joe.dev', 'secret123'] as const;
const header = () => screen.getByRole('banner');

describe('redirections : helpers', () => {
  it('safeRedirect refuse tout ce qui peut sortir du site ou boucler', () => {
    for (const bad of ['//evil.com', 'https://evil.com', 'javascript:alert(1)', '/\\evil.com', '/login', '/register?x=1', '/login/', '', null, undefined, 'app']) {
      expect(safeRedirect(bad as string | null | undefined)).toBeNull();
    }
    expect(safeRedirect('/app/formations')).toBe('/app/formations');
    expect(safeRedirect('/formations/react-ts?x=1#a')).toBe('/formations/react-ts?x=1#a');
  });
  it('authUrl garde le « / » lisible ; postAuthTarget : page précise > rôle', () => {
    expect(authUrl('/login', '/app/formations')).toBe('/login?redirect=/app/formations');
    expect(authUrl('/login', '//evil.com')).toBe('/login');
    expect(postAuthTarget({ role: 'LEARNER' }, null)).toBe('/app');
    expect(postAuthTarget({ role: 'ADMIN' }, null)).toBe('/studio');
    expect(postAuthTarget({ role: 'ADMIN' }, '/app')).toBe('/studio'); // « /app » seul = pas de page précise
    expect(postAuthTarget({ role: 'LEARNER' }, '/app/formations')).toBe('/app/formations');
    expect(homeFor({ role: 'INSTRUCTOR' })).toBe('/studio');
    expect(readRedirect('?redirect=/app/profil', null)).toBe('/app/profil');
    expect(readRedirect('', { from: '/formations/x' })).toBe('/formations/x'); // ancien format toujours accepté
    expect(readRedirect('?redirect=//evil.com', null)).toBeNull();
  });
});

describe('Test 1 — visiteur : / → Formations → Login → Connexion → /app', () => {
  it('arrive sur son espace avec « Bienvenue, Prénom »', async () => {
    await mount('/');
    await screen.findByRole('heading', { level: 1, name: /Construire\. Apprendre\./ }, T);
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Navigation principale' })).getByText('Formations'));
    await waitFor(() => expect(here()).toBe('/formations'), T);
    fireEvent.click(within(header()).getByText('Connexion'));
    await waitFor(() => expect(here()).toBe('/login'), T);
    await submitLogin(...LEARNER);
    await waitFor(() => expect(here()).toBe('/app'), T);
    expect(await screen.findByRole('heading', { name: 'Bienvenue, Alice' }, T)).toBeTruthy();
  });
});

describe('Test 2 — admin : /login → connexion → /studio', () => {
  it('redirige un ADMIN vers le Studio', async () => {
    await mount('/login');
    await submitLogin(...ADMIN);
    await waitFor(() => expect(here()).toBe('/studio'), T);
    expect((await screen.findAllByText('Vue générale', undefined, T)).length).toBeGreaterThan(0);
  });
});

describe('redirection intelligente et utilisateur déjà connecté', () => {
  it('/app/formations sans session → /login?redirect=… puis retour sur /app/formations (pas /app)', async () => {
    await mount('/app/formations');
    await waitFor(() => expect(here()).toBe('/login?redirect=/app/formations'), T);
    await submitLogin(...LEARNER);
    await waitFor(() => expect(here()).toBe('/app/formations'), T);
  });

  it('un utilisateur déjà connecté qui ouvre /login ou /register est renvoyé vers son espace', async () => {
    await mount('/login');
    await submitLogin(...LEARNER);
    await waitFor(() => expect(here()).toBe('/app'), T);
    cleanup();
    await mount('/login');
    await waitFor(() => expect(here()).toBe('/app'), T);
    cleanup();
    await mount('/register');
    await waitFor(() => expect(here()).toBe('/app'), T);
  });

  it('un admin déjà connecté qui ouvre /login arrive sur /studio', async () => {
    await mount('/login');
    await submitLogin(...ADMIN);
    await waitFor(() => expect(here()).toBe('/studio'), T);
    cleanup();
    await mount('/login');
    await waitFor(() => expect(here()).toBe('/studio'), T);
  });

  it('un redirect malveillant est ignoré', async () => {
    await mount('/login?redirect=//evil.com');
    await submitLogin(...LEARNER);
    await waitFor(() => expect(here()).toBe('/app'), T);
  });
});

describe('profil non chargé : jamais de redirection sur null ni de page vide', () => {
  it('panne passagère : une nouvelle tentative automatique suffit, on arrive sur /app', async () => {
    faults.profiles = 1; // la 1re lecture du profil échoue, la 2e réussit
    await mount('/login');
    await submitLogin(...LEARNER);
    await waitFor(() => expect(here()).toBe('/app'), T);
    expect(screen.queryByText('Impossible de charger votre espace')).toBeNull();
  });

  it('panne durable : message explicite + « Réessayer » (plus de connexion « muette »)', async () => {
    faults.profiles = -1;
    await mount('/login');
    await submitLogin(...LEARNER);
    expect(await screen.findByText('Impossible de charger votre espace', undefined, T)).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(here()).toBe('/login'); // pas de boucle login ↔ /app
    faults.profiles = 0; // le service revient
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(here()).toBe('/app'), T);
    expect(await screen.findByRole('heading', { name: 'Bienvenue, Alice' }, T)).toBeTruthy();
  });

  it('page protégée + profil indisponible : écran d’erreur, pas de page blanche, déconnexion possible', async () => {
    await mount('/login');
    await submitLogin(...LEARNER);
    await waitFor(() => expect(here()).toBe('/app'), T);
    cleanup();
    faults.profiles = -1;
    await mount('/app/formations');
    expect(await screen.findByText('Impossible de charger votre espace', undefined, T)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    await waitFor(() => expect(here()).toBe('/'), T);
  });
});

describe('Test 3 & navbar connectée', () => {
  it('apprenant : Dashboard, Notifications, Profil, Déconnexion — pas de Studio', async () => {
    await mount('/login');
    await submitLogin(...LEARNER);
    await waitFor(() => expect(here()).toBe('/app'), T);
    cleanup();
    await mount('/');
    const h = await waitFor(() => { const el = header(); within(el).getByRole('link', { name: 'Dashboard' }); return el; }, T);
    expect(within(h).getByRole('link', { name: 'Notifications' }).getAttribute('href')).toBe('/app/notifications');
    expect(within(h).getByRole('link', { name: 'Profil' }).getAttribute('href')).toBe('/app/profil');
    expect(within(h).getByRole('button', { name: 'Déconnexion' })).toBeTruthy();
    expect(within(h).queryByRole('link', { name: 'Studio' })).toBeNull();
    expect(within(h).queryByText('Connexion')).toBeNull();
    fireEvent.click(within(h).getByRole('link', { name: 'Dashboard' }));
    await waitFor(() => expect(here()).toBe('/app'), T);
    // espace : navigation interne
    for (const [label, path] of [['Mes formations', '/app/formations'], ['Mes projets', '/app/projets'], ['Notifications', '/app/notifications'], ['Mon profil', '/app/profil']] as const) {
      fireEvent.click(within(screen.getByRole('navigation', { name: 'Mon espace' })).getByText(label));
      await waitFor(() => expect(here()).toBe(path), T);
    }
  });

  it('admin : Dashboard + Studio', async () => {
    await mount('/login');
    await submitLogin(...ADMIN);
    await waitFor(() => expect(here()).toBe('/studio'), T);
    cleanup();
    await mount('/');
    await waitFor(() => within(header()).getByRole('link', { name: 'Studio' }), T);
    expect(within(header()).getByRole('link', { name: 'Dashboard' })).toBeTruthy();
  });
});

describe('Test 6 — déconnexion', () => {
  it('/app → Déconnexion → / ; /app est de nouveau protégé', async () => {
    await mount('/login');
    await submitLogin(...LEARNER);
    await waitFor(() => expect(here()).toBe('/app'), T);
    await screen.findByRole('heading', { name: 'Bienvenue, Alice' }, T);
    fireEvent.click(screen.getByRole('button', { name: 'Déconnexion' }));
    await waitFor(() => expect(here()).toBe('/'), T);
    // plus aucun état utilisateur affiché
    await waitFor(() => within(header()).getByText('Connexion'), T);
    expect(within(header()).queryByRole('link', { name: 'Dashboard' })).toBeNull();
    // session purgée côté navigateur
    expect(Object.keys(localStorage).filter((k) => k.includes('auth-token'))).toHaveLength(0);
    // « recharger » sur /app : retour à la connexion
    cleanup();
    await mount('/app');
    await waitFor(() => expect(here()).toBe('/login?redirect=/app'), T);
  });

  it('déconnexion depuis la navbar du site', async () => {
    await mount('/login');
    await submitLogin(...LEARNER);
    await waitFor(() => expect(here()).toBe('/app'), T);
    cleanup();
    await mount('/formations');
    await waitFor(() => within(header()).getByRole('button', { name: 'Déconnexion' }), T);
    fireEvent.click(within(header()).getByRole('button', { name: 'Déconnexion' }));
    await waitFor(() => expect(here()).toBe('/'), T);
    await waitFor(() => within(header()).getByText('Commencer'), T);
  });
});

describe('Tests 4 & 5 — menu mobile', () => {
  const openMenu = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Ouvrir le menu' }));
    return screen.findByRole('dialog', { name: 'Menu principal' }, T);
  };

  it('le tiroir est rendu hors du <header> (le backdrop-filter du header le coinçait) et bloque le scroll', async () => {
    await mount('/');
    const dialog = await openMenu();
    expect(dialog.closest('header')).toBeNull();
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(document.body.style.overflow).toBe('hidden');
    for (const l of ['Accueil', 'Formations', 'Projets', 'À propos', 'Ressources', 'Vibe Coding', 'Parcours', 'Workshops', 'Services', 'Contact']) {
      expect(within(dialog).getByRole('link', { name: l })).toBeTruthy();
    }
    expect(within(dialog).getByRole('link', { name: 'Connexion' })).toBeTruthy();
    expect(within(dialog).getByRole('link', { name: 'Commencer' })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fermer le menu' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), T);
    expect(document.body.style.overflow).toBe('');
  });

  it('Test 4 : ouvrir → Formations → le menu se ferme → page Formations', async () => {
    await mount('/');
    const dialog = await openMenu();
    fireEvent.click(within(dialog).getByRole('link', { name: 'Formations' }));
    await waitFor(() => expect(here()).toBe('/formations'), T);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), T);
  });

  it('Test 5 : ouvrir → Vibe Coding → navigation correcte → menu fermé', async () => {
    await mount('/');
    const dialog = await openMenu();
    fireEvent.click(within(dialog).getByRole('link', { name: 'Vibe Coding' }));
    await waitFor(() => expect(here()).toBe('/vibe-coding'), T);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), T);
  });

  it('se ferme aussi avec Échap, en cliquant en dehors, et si on clique la page courante', async () => {
    await mount('/formations');
    let dialog = await openMenu();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), T);

    dialog = await openMenu();
    fireEvent.click(dialog.previousElementSibling as Element); // fond
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), T);

    dialog = await openMenu();
    fireEvent.click(within(dialog).getByRole('link', { name: 'Formations' })); // même route : pathname inchangé
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), T);
    expect(here()).toBe('/formations');
  });

  it('connecté : Mon espace, Profil, Déconnexion (et Studio pour un admin)', async () => {
    await mount('/login');
    await submitLogin(...ADMIN);
    await waitFor(() => expect(here()).toBe('/studio'), T);
    cleanup();
    await mount('/');
    const dialog = await openMenu();
    expect(await within(dialog).findByRole('link', { name: 'Mon espace' }, T)).toBeTruthy();
    expect(within(dialog).getByRole('link', { name: 'Studio' })).toBeTruthy();
    expect(within(dialog).getByRole('link', { name: 'Profil' })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Déconnexion' }));
    await waitFor(() => expect(here()).toBe('/'), T);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), T);
    await waitFor(() => within(header()).getByText('Connexion'), T);
  });
});

describe('menu « Plus » (desktop)', () => {
  it('contient uniquement les routes existantes, se ferme au clic et navigue', async () => {
    await mount('/');
    const nav = await screen.findByRole('navigation', { name: 'Navigation principale' });
    fireEvent.click(within(nav).getByText('Plus'));
    const menu = nav.querySelector('#nav-more') as HTMLElement;
    expect(within(menu).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/vibe-coding', '/parcours', '/workshops', '/services', '/contact']);
    fireEvent.click(within(menu).getByText('Vibe Coding'));
    await waitFor(() => expect(here()).toBe('/vibe-coding'), T);
    expect(nav.querySelector('#nav-more')).toBeNull();
    // clic en dehors
    fireEvent.click(within(nav).getByText('Plus'));
    expect(nav.querySelector('#nav-more')).toBeTruthy();
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(nav.querySelector('#nav-more')).toBeNull(), T);
  });
});

describe('Test 7 — routes inconnues et pages publiques', () => {
  it('/test-inexistant → 404 → Accueil', async () => {
    await mount('/test-inexistant');
    expect(await screen.findByRole('heading', { level: 1, name: 'Cette page n’existe pas.' }, T)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Voir les formations' }).getAttribute('href')).toBe('/formations');
    fireEvent.click(screen.getByRole('link', { name: 'Retour à l’accueil' }));
    await waitFor(() => expect(here()).toBe('/'), T);
    expect(await screen.findByRole('heading', { level: 1, name: /Construire\. Apprendre\./ }, T)).toBeTruthy();
  });

  it('/app/inexistant ne donne pas un écran blanc', async () => {
    await mount('/app/inexistant');
    expect(await screen.findByRole('heading', { level: 1, name: 'Cette page n’existe pas.' }, T)).toBeTruthy();
  });

  it.each(['/', '/formations', '/projets', '/a-propos', '/ressources', '/vibe-coding', '/parcours', '/workshops', '/services', '/contact', '/mentions-legales', '/confidentialite'])(
    '%s : la page se charge avec navbar et footer, sans 404',
    async (path) => {
      await mount(path);
      await screen.findByRole('heading', { level: 1 }, T);
      expect(screen.queryByText('Cette page n’existe pas.')).toBeNull();
      expect(screen.getByRole('banner')).toBeTruthy();
      expect(screen.getByRole('contentinfo')).toBeTruthy();
    },
  );

  it('le footer ne contient que des liens vers des routes existantes (aucun doublon factice)', async () => {
    await mount('/');
    const footer = await screen.findByRole('contentinfo', undefined, T);
    const internal = within(footer).getAllByRole('link').map((a) => a.getAttribute('href')).filter((h): h is string => Boolean(h) && h!.startsWith('/'));
    for (const fake of ['HTML/CSS', 'JavaScript', 'Supabase', 'IA']) expect(within(footer).queryByRole('link', { name: fake })).toBeNull(); // anciens liens factices, tous vers /formations
    for (const h of internal) expect(['/', '/formations', '/projets', '/ressources', '/a-propos', '/cv', '/vibe-coding', '/parcours', '/workshops', '/services', '/contact', '/mentions-legales', '/confidentialite']).toContain(h);
  });

  it('accueil : Formations réelles, Projets, Parcours, À propos et CTA final avec leurs boutons', async () => {
    await mount('/');
    await screen.findByRole('heading', { name: 'Formations présentielles', level: 2 }, T);
    expect(screen.getByRole('link', { name: 'Voir toutes les formations' }).getAttribute('href')).toBe('/formations');
    expect(await screen.findByText('Plateforme Joe', undefined, T)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Tous les projets' }).getAttribute('href')).toBe('/projets');
    expect(screen.getByRole('link', { name: 'Voir les parcours' }).getAttribute('href')).toBe('/parcours');
    expect(screen.getByRole('link', { name: 'En savoir plus' }).getAttribute('href')).toBe('/a-propos');
    expect(screen.getByRole('heading', { name: 'Une idée à transformer en projet ?' })).toBeTruthy();
  });
});
