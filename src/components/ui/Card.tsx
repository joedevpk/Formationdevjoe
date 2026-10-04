import { type ReactNode } from 'react';
import { cn } from '@/utils';

export function Card({ children, className, hover, onClick }: { children: ReactNode; className?: string; hover?: boolean; onClick?: () => void }) {
  return <div onClick={onClick} className={cn(hover ? 'card-hover' : 'card', className)}>{children}</div>;
}
