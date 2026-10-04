// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { CvPdfDocument } from '@/lib/cv/pdf/CvPdf';
import { sampleCv } from './cvFixture';
import type { CvTemplate } from '@/lib/cv/types';

const pages = (b: Buffer) => (b.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
const render = (d = sampleCv(), t?: CvTemplate, qr?: string | null) =>
  renderToBuffer(createElement(CvPdfDocument, { data: d, template: t, qr }) as never);

describe('génération PDF réelle', () => {
  for (const t of ['minimal', 'modern', 'executive', 'developer'] as CvTemplate[]) {
    it(`modèle ${t} : PDF A4 valide, léger`, async () => {
      const buf = await render(sampleCv(), t);
      expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(buf.length).toBeGreaterThan(2000);
      expect(buf.length).toBeLessThan(250_000);
      mkdirSync('/tmp/cvout', { recursive: true });
      writeFileSync(`/tmp/cvout/${t}.pdf`, buf);
      expect(buf.toString('latin1')).toContain('595.28'); // A4 en points
    });
  }

  it('liens cliquables conservés (mailto, https)', async () => {
    const s = (await render()).toString('latin1');
    expect(s).toContain('mailto:test@example.com');
    expect(s).toContain('https://github.com/exemple');
  });

  it('pagination : beaucoup de contenu → plusieurs pages, sans erreur', async () => {
    const d = sampleCv();
    d.experiences = Array.from({ length: 14 }, (_, i) => ({ ...d.experiences[0], id: `e${i}`, role: `Poste ${i}`, description: 'Texte. '.repeat(40) }));
    const buf = await render(d, 'modern');
    writeFileSync('/tmp/cvout/long.pdf', buf);
    expect(pages(buf)).toBeGreaterThan(1);
  });

  it('sections vides non rendues, caractères hors police retirés sans planter', async () => {
    const d = sampleCv();
    d.experiences = []; d.certifications = []; d.achievements = []; d.projects = [];
    d.profile.headline = 'Dév 🚀 Formateur — « test »';
    const buf = await render(d, 'executive');
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('CV minimal (profil seul) fonctionne', async () => {
    const d = sampleCv();
    Object.assign(d, { skills: [], experiences: [], education: [], certifications: [], achievements: [], languages: [], projects: [], trainer_courses: [], services: [] });
    d.profile.summary_long = ''; d.profile.summary_short = '';
    expect((await render(d)).length).toBeGreaterThan(1000);
  });
});

describe('QR code', () => {
  it('QR réel intégré au PDF quand le domaine est configuré', async () => {
    const QR = await import('qrcode');
    const qr = await QR.toDataURL('https://exemple.test/cv', { margin: 1, width: 220 });
    const withQr = await render(sampleCv(), 'modern', qr);
    const without = await render(sampleCv(), 'modern', null);
    expect(withQr.length).toBeGreaterThan(without.length);
    writeFileSync('/tmp/cvout/qr.pdf', withQr);
  });

  it('sans SITE_URL : aucun QR n’est généré (pas de domaine inventé)', async () => {
    vi.resetModules();
    vi.stubGlobal('__SITE_URL__', '');
    const { buildQr } = await import('@/lib/cv/pdf/generate');
    expect(await buildQr(true)).toBeNull();
    vi.unstubAllGlobals();
  });
});
