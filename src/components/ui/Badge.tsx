import { type ReactNode } from 'react';
import { cn } from '@/utils';

const variants = { primary: 'badge-primary', success: 'badge-success', warning: 'badge-warning', error: 'badge-error', neutral: 'badge-neutral' };

export function Badge({ children, variant = 'primary', className }: { children: ReactNode; variant?: keyof typeof variants; className?: string }) {
  return <span className={cn(variants[variant], className)}>{children}</span>;
}
