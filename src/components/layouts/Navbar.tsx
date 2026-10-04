import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bell, ChevronDown, LogOut, Menu, Moon, Sun, UserRound, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCvPublished } from '@/lib/cv/queries';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useSignOut } from '@/lib/useSignOut';
import { cn, getInitials } from '@/utils';

/** Liens principaux : uniquement des routes qui existent dans App.tsx. */
const primary = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/formations', label: 'Formations' },
  { to: '/projets', label: 'Projets' },
  { to: '/a-propos', label: 'À propos' },
  { to: '/ressources', label: 'Ressources' },
];

const more = [
  { to: '/vibe-coding', label: 'Vibe Coding' },
  { to: '/parcours', label: 'Parcours' },
  { to: '/workshops', label: 'Workshops' },
  { to: '/services', label: 'Services' },
  { to: '/contact', label: 'Contact' },
];

/** La navigation complète tient à partir de 1280 px ; en dessous (mobile, tablette) : tiroir. */
const DESKTOP_QUERY = '(min-width: 1280px)';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { profile, isStaff } = useAuth();
  const signOut = useSignOut();
  const reduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const moreRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Le lien CV n'apparaît que si le CV est publié (sinon il mènerait à une page indisponible).
  const cvPublished = useCvPublished().data === true;

  const closeAll = useCallback(() => {
    setOpen(false);
    setMoreOpen(false);
  }, []);

  // Fermeture automatique après navigation
  useEffect(() => { closeAll(); }, [pathname, closeAll]);

  // Le tiroir n'a plus de sens en affichage desktop : on le referme (rotation, redimensionnement).
  useEffect(() => { if (isDesktop) setOpen(false); }, [isDesktop]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Verrouille le scroll du fond tant que le tiroir est ouvert et donne le focus au bouton de fermeture.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  // Échap ferme les menus ; un appui en dehors ferme « Plus » (souris, stylet et tactile).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (open) toggleRef.current?.focus();
      closeAll();
    };
    const onPointer = (e: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, closeAll]);

  // Le focus clavier reste dans le tiroir tant qu'il est ouvert.
  const trapFocus = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Tab' || !drawerRef.current) return;
    const items = drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const moreActive = more.some((m) => pathname === m.to || pathname.startsWith(m.to + '/'));
  const motionDuration = reduceMotion ? 0 : 0.2;

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn('rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
      isActive ? 'bg-neutral-100 text-neutral-950 dark:bg-neutral-800 dark:text-white' : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white');

  const drawerLink = (big: boolean) => ({ isActive }: { isActive: boolean }) =>
    cn(big ? 'border-b border-neutral-100 py-3.5 font-display text-xl font-bold dark:border-neutral-900' : 'py-2.5 text-base font-medium text-neutral-700 dark:text-neutral-300',
      isActive && 'text-primary-600 dark:text-primary-300');

  const iconBtn = 'btn-ghost h-9 w-9 p-0';

  const drawer = (
    <AnimatePresence>
      {open && (
        <motion.div key="mobile-drawer" className="fixed inset-0 z-[60] xl:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: motionDuration }}>
          {/* Fond : un appui en dehors du panneau ferme le menu ; il bloque aussi toute interaction avec la page derrière. */}
          <div className="absolute inset-0 bg-black/55" onClick={closeAll} aria-hidden="true" />
          <motion.aside
            id="mobile-menu" ref={drawerRef} role="dialog" aria-modal="true" aria-label="Menu principal" onKeyDown={trapFocus}
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: motionDuration, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 flex w-[min(88vw,22rem)] flex-col overflow-y-auto overscroll-contain bg-white shadow-2xl dark:bg-neutral-950">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-100 px-4 dark:border-neutral-900">
              <Logo />
              <button ref={closeRef} type="button" onClick={closeAll} className="btn-ghost h-10 w-10 p-0" aria-label="Fermer le menu"><X className="h-5 w-5" aria-hidden="true" /></button>
            </div>

            <nav className="flex flex-col px-5 pt-3" aria-label="Navigation mobile">
              {primary.map((l) => <NavLink key={l.to} to={l.to} end={l.end} onClick={closeAll} className={drawerLink(true)}>{l.label}</NavLink>)}
              <p className="mb-1 mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">Plus</p>
              {more.map((m) => <NavLink key={m.to} to={m.to} onClick={closeAll} className={drawerLink(false)}>{m.label}</NavLink>)}
              {cvPublished && <NavLink to="/cv" onClick={closeAll} className={(s) => cn(drawerLink(true)(s), 'mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-900')}>CV</NavLink>}
            </nav>

            <div className="mt-auto flex flex-col gap-3 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8">
              {profile ? (
                <>
                  <Link to="/app" onClick={closeAll} className="btn-primary py-3.5 text-base">Mon espace</Link>
                  {isStaff && <Link to="/studio" onClick={closeAll} className="btn-outline py-3.5 text-base">Studio</Link>}
                  <div className="grid grid-cols-2 gap-3">
                    <Link to="/app/profil" onClick={closeAll} className="btn-ghost py-3 text-sm">Profil</Link>
                    <Link to="/app/notifications" onClick={closeAll} className="btn-ghost py-3 text-sm">Notifications</Link>
                  </div>
                  <button type="button" onClick={() => { closeAll(); void signOut(); }} className="btn-ghost py-3 text-sm text-neutral-500"><LogOut className="h-4 w-4" aria-hidden="true" />Déconnexion</button>
                </>
              ) : (
                <>
                  <Link to="/register" onClick={closeAll} className="btn-primary py-3.5 text-base">Commencer</Link>
                  <Link to="/login" onClick={closeAll} className="btn-outline py-3.5 text-base">Connexion</Link>
                </>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <header className={cn('sticky top-0 z-50 border-b bg-white/90 backdrop-blur-xl transition-[border-color,box-shadow] dark:bg-neutral-950/90',
      scrolled || open ? 'border-neutral-200 shadow-sm dark:border-neutral-800' : 'border-transparent')}>
      <div className={cn('section-container flex items-center justify-between gap-3 transition-[height] duration-200', scrolled ? 'h-14' : 'h-16')}>
        <div className="flex min-w-0 items-center gap-2">
          <button ref={toggleRef} type="button" onClick={() => setOpen((o) => !o)} className="btn-ghost h-10 w-10 shrink-0 p-0 xl:hidden"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open} aria-controls="mobile-menu">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <Logo />
        </div>

        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Navigation principale">
          {primary.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>{l.label}</NavLink>)}
          <div className="relative" ref={moreRef}>
            <button type="button" aria-haspopup="true" aria-expanded={moreOpen} aria-controls="nav-more" onClick={() => setMoreOpen((o) => !o)}
              className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                moreActive || moreOpen ? 'bg-neutral-100 text-neutral-950 dark:bg-neutral-800 dark:text-white' : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white')}>
              Plus <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', moreOpen && 'rotate-180')} aria-hidden="true" />
            </button>
            {moreOpen && (
              <ul id="nav-more" className="absolute right-0 top-full z-10 mt-2 w-52 rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                {more.map((m) => (
                  <li key={m.to}>
                    {/* Clic : le menu se ferme immédiatement (même si l'on est déjà sur cette page), puis la navigation se fait. */}
                    <NavLink to={m.to} onClick={() => setMoreOpen(false)} className={({ isActive }) => cn('block rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800', isActive && 'text-primary-600 dark:text-primary-300')}>{m.label}</NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {cvPublished && <NavLink to="/cv" className={linkCls}>CV</NavLink>}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={toggleTheme} className={iconBtn} aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}>
            {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          </button>
          <div className="hidden items-center gap-1.5 xl:flex">
            {profile ? (
              <>
                <Link to="/app" className="btn-primary px-4 py-2">Dashboard</Link>
                {isStaff && <Link to="/studio" className="btn-outline px-4 py-2">Studio</Link>}
                <Link to="/app/notifications" className={iconBtn} aria-label="Notifications" title="Notifications"><Bell className="h-4 w-4" aria-hidden="true" /></Link>
                <Link to="/app/profil" className="btn-ghost h-9 w-9 p-0 text-[11px] font-bold" aria-label="Profil" title="Profil">{profile.full_name ? getInitials(profile.full_name) : <UserRound className="h-4 w-4" aria-hidden="true" />}</Link>
                <button type="button" onClick={() => void signOut()} className={iconBtn} aria-label="Déconnexion" title="Déconnexion"><LogOut className="h-4 w-4" aria-hidden="true" /></button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost px-3 py-2">Connexion</Link>
                <Link to="/register" className="btn-primary px-4 py-2">Commencer</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/*
        Le tiroir est rendu dans <body> (portail), PAS dans <header> : ce <header> a un backdrop-filter, et un ancêtre avec
        backdrop-filter devient le bloc conteneur des descendants `position: fixed` → le tiroir se réduisait à la hauteur de la barre.
      */}
      {typeof document !== 'undefined' && createPortal(drawer, document.body)}
    </header>
  );
}
