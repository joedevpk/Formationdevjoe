import { useEffect, useState, type ComponentType } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun, X, LogOut, ExternalLink } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSignOut } from '@/lib/useSignOut';
import { cn, getInitials } from '@/utils';

export interface NavItem { to: string; label: string; icon: ComponentType<{ className?: string }>; end?: boolean; children?: NavItem[] }

export function DashboardLayout({ title, items }: { title: string; items: NavItem[] }) {
  const { theme, toggleTheme } = useTheme();
  const { profile } = useAuth();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  // Tiroir mobile : Échap le ferme et le fond ne défile plus tant qu'il est ouvert.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label={title}>
      {items.map((it) => it.children ? (
        <div key={it.label} className="mt-3">
          <p className="mb-1 flex items-center gap-2 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500"><it.icon className="h-3.5 w-3.5" aria-hidden="true" />{it.label}</p>
          {it.children.map((c) => (
            <NavLink key={c.to} to={c.to}
              className={({ isActive }) => cn('block rounded-xl py-2 pl-9 pr-3 text-sm font-medium transition-colors', isActive ? 'bg-primary-500/10 text-primary-700 dark:text-primary-300' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900')}>
              {c.label}
            </NavLink>
          ))}
        </div>
      ) : (
        <NavLink key={it.to} to={it.to} end={it.end}
          className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-primary-500/10 text-primary-700 dark:text-primary-300' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900')}>
          <it.icon className="h-4 w-4" aria-hidden="true" />{it.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen supports-[height:100dvh]:min-h-dvh bg-neutral-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-neutral-200 bg-white/85 px-4 backdrop-blur-xl dark:border-neutral-900 dark:bg-neutral-950/85 lg:pl-[17rem]">
        <button className="btn-ghost h-9 w-9 p-0 lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></button>
        <span className="font-display text-sm font-bold lg:text-base">{title}</span>
        <div className="flex items-center gap-1">
          <Link to="/" className="btn-ghost h-9 gap-1.5 px-3 text-xs"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />Site</Link>
          <button onClick={toggleTheme} className="btn-ghost h-9 w-9 p-0" aria-label="Changer de thème">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-neutral-200 bg-white p-4 dark:border-neutral-900 dark:bg-neutral-950 lg:flex">
        <Logo className="mb-6 px-1" />
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <UserBox name={profile?.full_name} email={profile?.email} onSignOut={() => void signOut()} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white p-4 dark:bg-neutral-950">
            <div className="mb-6 flex items-center justify-between"><Logo /><button onClick={() => setOpen(false)} aria-label="Fermer" className="btn-ghost h-9 w-9 p-0"><X className="h-5 w-5" /></button></div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
            <UserBox name={profile?.full_name} email={profile?.email} onSignOut={() => void signOut()} />
          </aside>
        </div>
      )}

      <main className="px-4 py-8 sm:px-6 lg:pl-[17rem] lg:pr-8">
        <div className="mx-auto max-w-6xl lg:pl-8">
          {/* Une page qui plante garde la sidebar et le menu ; l'erreur s'efface au changement de route (sans remonter les pages saines). */}
          <ErrorBoundary resetKey={pathname} variant="inline"><Outlet /></ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

function UserBox({ name, email, onSignOut }: { name?: string | null; email?: string; onSignOut: () => void }) {
  return (
    <div className="mt-4 flex items-center gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-900">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-xs font-bold text-primary-600 dark:text-primary-300">{getInitials(name)}</span>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{name || 'Utilisateur'}</p><p className="truncate text-xs text-neutral-500">{email}</p></div>
      <button onClick={onSignOut} className="btn-ghost h-9 w-9 p-0" aria-label="Déconnexion"><LogOut className="h-4 w-4" /></button>
    </div>
  );
}
