import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(localStorage.getItem('lang') === 'en' ? 'en-GB' : 'fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(localStorage.getItem('lang') === 'en' ? 'en-GB' : 'fr-FR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function slugify(text: string): string {
  return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trim() + '…';
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return 'JD';
  return name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

/** Transforme "a, b, c" en tableau propre. */
export function splitList(value: string): string[] {
  return value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
}

/** N'accepte que des URLs http(s) — évite les liens javascript: saisis en base. */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}
