// Polices standard PDF (Times / Helvetica) : aucun téléchargement, texte sélectionnable, rendu identique partout.
const ALLOWED = /[^\u0020-\u007E\u00A0-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2022\u2026\u20AC\u2122\n]/g;
export const pdfSafe = (s: string | null | undefined): string => (s ?? '').replace(/\u202f|\u2009/g, ' ').replace(ALLOWED, '');


export const certDate = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

