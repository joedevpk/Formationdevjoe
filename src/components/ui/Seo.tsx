import { useEffect } from 'react';

const SITE = 'JOE DEV CODES';
const DEFAULT_TITLE = `${SITE} — Développeur, Formateur & Entrepreneur`;
const DEFAULT_DESC = 'Je construis des produits numériques et je partage les compétences pour apprendre à les construire. Formations web, IA, Supabase et Vibe Coding, projets et ressources.';
const DEFAULT_IMAGE = '/og-image.png';

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

const abs = (u: string) => (/^https?:\/\//.test(u) ? u : window.location.origin + (u.startsWith('/') ? u : '/' + u));

/** Title, description, Open Graph, Twitter et canonical par page (SPA). Chaque page passe son propre titre. */
/** `rawTitle` : titre complet tel quel (sans suffixe de marque), pour les pages qui ont un titre éditorial précis. */
export function Seo({ title, rawTitle, description, image, noindex }: { title?: string; rawTitle?: string; description?: string; image?: string; noindex?: boolean }) {
  useEffect(() => {
    const full = rawTitle ?? (title ? `${title} — ${SITE}` : DEFAULT_TITLE);
    const desc = description ?? DEFAULT_DESC;
    const img = abs(image ?? DEFAULT_IMAGE);
    const url = window.location.origin + window.location.pathname;
    document.title = full;
    setMeta('name', 'description', desc);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', SITE);
    setMeta('property', 'og:title', full);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', img);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', full);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', img);
    setCanonical(url);
  }, [title, rawTitle, description, image, noindex]);
  return null;
}

/** Données structurées JSON-LD. Le contenu ne doit refléter que des informations réellement présentes sur la page. */
export function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  useEffect(() => {
    if (!data) return;
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.dataset.cv = 'true';
    el.text = JSON.stringify(data);
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [data]);
  return null;
}
