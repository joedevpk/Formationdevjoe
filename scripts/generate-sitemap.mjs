// Post-build : si SITE_URL est défini (ex. https://joe-dev-codes.onrender.com) :
//  - génère dist/sitemap.xml et référence le sitemap dans dist/robots.txt ;
//  - rend absolues les URLs Open Graph / Twitter de dist/index.html (les robots de partage n'exécutent pas le JavaScript).
// Sans SITE_URL, le script ne fait rien et ne bloque jamais le build.
import { writeFileSync, readFileSync, appendFileSync, existsSync } from 'node:fs';

const site = (process.env.SITE_URL || '').replace(/\/$/, '');
if (!site || !existsSync('dist')) process.exit(0);

const routes = ['/', '/a-propos', '/formations', '/parcours', '/projets', '/vibe-coding', '/ressources', '/articles',
  '/workshops', '/services', '/contact', '/cv', '/mentions-legales', '/confidentialite'];
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
  .map((r) => `  <url><loc>${site}${r}</loc></url>`).join('\n')}\n</urlset>\n`;
writeFileSync('dist/sitemap.xml', xml);
if (existsSync('dist/robots.txt')) appendFileSync('dist/robots.txt', `\nSitemap: ${site}/sitemap.xml\n`);

const htmlPath = 'dist/index.html';
if (existsSync(htmlPath)) {
  const html = readFileSync(htmlPath, 'utf8')
    .replace(/(property="og:image" content=")\/(og-image\.png")/, `$1${site}/$2`)
    .replace(/(name="twitter:image" content=")\/(og-image\.png")/, `$1${site}/$2`)
    .replace(/(property="og:url" content=")[^"]*"/, `$1${site}/"`);
  writeFileSync(htmlPath, html);
}
console.log('sitemap.xml + URLs sociales absolues générés pour', site);
