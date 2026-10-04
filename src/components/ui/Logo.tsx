import { Link } from 'react-router-dom';
import { cn } from '@/utils';

/** Logo typographique : « JDC » en monogramme, « JOE.DEV » en mot-symbole. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-950 font-mono text-[11px] font-bold tracking-tight text-transparent dark:bg-white', className)}>
      <span className="bg-gradient-to-br from-primary-400 to-accent-400 bg-clip-text">JDC</span>
    </span>
  );
}

export function Logo({ to = '/', compact = false, className }: { to?: string; compact?: boolean; className?: string }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5', className)} aria-label="JOE DEV CODES — accueil">
      <LogoMark />
      {!compact && (
        <span className="font-display text-base font-extrabold tracking-tight">
          JOE<span className="text-primary-500">.</span>DEV
          <span className="ml-1 hidden font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500 sm:inline">codes</span>
        </span>
      )}
    </Link>
  );
}
