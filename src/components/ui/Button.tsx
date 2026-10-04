import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: () => void;
  to?: string;
  href?: string;
}

const variants = { primary: 'btn-primary', secondary: 'btn-secondary', outline: 'btn-outline', ghost: 'btn-ghost', danger: 'btn-danger' };
const sizes = { sm: 'px-3.5 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base' };

export function Button({ children, variant = 'primary', size = 'md', className, type = 'button', disabled, onClick, to, href }: ButtonProps) {
  const cls = cn(variants[variant], sizes[size], className);
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>;
  return <button type={type} disabled={disabled} onClick={onClick} className={cls}>{children}</button>;
}
