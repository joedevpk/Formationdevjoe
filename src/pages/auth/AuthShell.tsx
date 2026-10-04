import { type ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';
import { Seo } from '@/components/ui/Seo';

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen supports-[height:100dvh]:min-h-dvh items-center justify-center px-4 py-10">
      <Seo title={title} description="Accède à ton espace JOE DEV CODES." noindex />
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="card p-7 sm:p-8">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-neutral-500">{footer}</div>}
      </div>
    </div>
  );
}
