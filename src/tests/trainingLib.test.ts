// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { CertificatePdfDocument } from '@/lib/training/pdf/CertificatePdf';
import { displaySessionStatus, formatPeriod, sessionDays, trainingError } from '@/lib/training/format';
import { attendanceStats } from '@/lib/training/api';
import type { Certificate } from '@/types';

const cert: Certificate = {
  id: 'c1', user_id: 'u1', course_id: 'co1', code: 'X', issued_at: '2026-11-21T10:00:00Z', certificate_number: 'JDC-2026-ABC234', status: 'VALIDE', registration_id: 'r1', session_id: 's1',
  holder_name: 'Alice MUKENDI', course_title: 'Création de sites web', period_start: '2026-11-15', period_end: '2026-11-20', duration_label: '5 jours', location: 'Kinshasa — Salle A', trainer_name: 'Joe Formateur',
};

describe('format', () => {
  it('périodes sans décalage de fuseau', () => {
    expect(formatPeriod('2026-11-15', '2026-11-20')).toBe('15–20 novembre 2026');
    expect(formatPeriod('2026-11-28', '2026-12-02')).toBe('28 novembre – 2 décembre 2026');
    expect(formatPeriod('2026-11-15', '2026-11-15')).toBe('15 novembre 2026');
    expect(sessionDays({ starts_on: '2026-11-15', ends_on: '2026-11-17' })).toEqual(['2026-11-15', '2026-11-16', '2026-11-17']);
  });
  it('statuts affichés : dérivés des données, jamais inventés', () => {
    expect(displaySessionStatus({ status: 'OUVERT', capacity: 10 }, 9)).toMatchObject({ label: 'Inscriptions ouvertes', canRegister: true });
    expect(displaySessionStatus({ status: 'OUVERT', capacity: 10 }, 10)).toMatchObject({ label: 'Complet', canRegister: false });
    for (const [s, l] of [['BIENTOT', 'Bientôt disponible'], ['EN_COURS', 'En cours'], ['TERMINEE', 'Terminée'], ['ANNULEE', 'Annulée']] as const) expect(displaySessionStatus({ status: s, capacity: 10 }, 0).label).toBe(l);
  });
  it('erreurs serveur → messages lisibles', () => {
    expect(trainingError(new Error('SESSION_FULL'))).toBe('Cette session est complète.');
    expect(trainingError(new Error('boom: relation x does not exist'))).not.toMatch(/relation/);
    expect(trainingError(new TypeError('Failed to fetch'))).toMatch(/Connexion/);
  });
  it('présence : retard compté présent, calculée sur les jours pointés', () => {
    const rows = [
      { id: '1', session_id: 's', registration_id: 'a', attendance_date: '2026-11-15', status: 'PRESENT', method: 'QR', marked_at: '' },
      { id: '2', session_id: 's', registration_id: 'a', attendance_date: '2026-11-16', status: 'RETARD', method: 'MANUEL', marked_at: '' },
      { id: '3', session_id: 's', registration_id: 'b', attendance_date: '2026-11-15', status: 'ABSENT', method: 'MANUEL', marked_at: '' },
      { id: '4', session_id: 's', registration_id: 'b', attendance_date: '2026-11-16', status: 'ABSENT', method: 'MANUEL', marked_at: '' },
    ] as never;
    expect(attendanceStats(rows, 'a', 's')).toEqual({ held: 2, attended: 2, pct: 100 });
    expect(attendanceStats(rows, 'b', 's').pct).toBe(0);
    expect(attendanceStats([], 'a', 's').pct).toBeNull();
  });
});

describe('certificat PDF', () => {
  async function render(c = cert, qr?: string | null) {
    return renderToBuffer(createElement(CertificatePdfDocument, { certificate: c, qr, verifyUrl: 'https://exemple.test/verify-certificate/JDC-2026-ABC234' }) as never);
  }
  it('PDF valide, A4 paysage, une seule page, léger', async () => {
    const buf = await render();
    mkdirSync('/tmp/certout', { recursive: true });
    writeFileSync('/tmp/certout/certificat.pdf', buf);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    const s = buf.toString('latin1');
    expect(s).toContain('841.89'); // largeur A4 paysage en points
    expect(s).toContain('595.28');
    expect((s.match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBe(1);
    expect(buf.length).toBeLessThan(120_000);
  });
  it('QR code réel intégré (image) et texte sélectionnable', async () => {
    const QR = await import('qrcode');
    const qr = await QR.toDataURL('https://exemple.test/verify-certificate/JDC-2026-ABC234', { margin: 1, width: 360 });
    const withQr = await render(cert, qr);
    const without = await render(cert, null);
    expect(withQr.length).toBeGreaterThan(without.length);
    mkdirSync('/tmp/certout', { recursive: true });
    writeFileSync('/tmp/certout/certificat-qr.pdf', withQr);
    let text = '';
    try { text = execFileSync('pdftotext', ['/tmp/certout/certificat-qr.pdf', '-'], { encoding: 'utf8' }); } catch { return; } // poppler absent : on s'arrête là
    for (const t of ['JOE DEV CODES', 'CERTIFICAT', 'DE FORMATION', 'DÉCERNÉ PAR JOE DEV CODES', 'Alice Mukendi', 'Création de sites web', 'JDC-2026-ABC234', 'Kinshasa', 'Joe Formateur', 'LE FORMATEUR', 'LE RESPONSABLE', 'FAIT À']) expect(text.replace(/\s+/g, ' ')).toContain(t);
    expect(text).not.toMatch(/accr[ée]dit|ISO|reconnu/i); // aucune accréditation inventée
  });
  it('caractères hors police et nom très long : pas de plantage, toujours une page', async () => {
    const buf = await render({ ...cert, holder_name: 'Jean-Baptiste 🚀 MUKENDI wa Kabongo Tshilumba', course_title: 'Développement d’applications web et mobiles avec React, Supabase et déploiement continu — niveau avancé' });
    expect((buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBe(1);
  });
});
