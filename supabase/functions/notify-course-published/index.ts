// Edge Function « notify-course-published » — envoie les emails « formation disponible ».
// Appelée par le Studio (utilisateur ADMIN/INSTRUCTOR connecté) juste après la publication d'une formation.
//
// Honnêteté d'abord :
//  - Sans RESEND_API_KEY + MAIL_FROM, la fonction répond { configured: false } et N'ENVOIE RIEN ; aucun notified_at n'est posé.
//  - notified_at n'est renseigné QUE pour les emails réellement acceptés par le fournisseur → jamais deux envois au même inscrit.
//  - Les notifications in-app sont créées par le trigger SQL notify_course_published (pas ici).
//
// Secrets : supabase secrets set RESEND_API_KEY=… MAIL_FROM="JOE DEV CODES <no-reply@votre-domaine>" SITE_URL=https://…
// (SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement par Supabase.)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!url || !serviceKey) return json({ error: 'Configuration serveur incomplète' }, 500);

  // 1) Appelant authentifié et membre du staff
  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'Non autorisé' }, 401);
  const userRes = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: auth, apikey: anonKey } });
  if (!userRes.ok) return json({ error: 'Non autorisé' }, 401);
  const user = await userRes.json() as { id: string };
  const admin = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
  const roleRes = await fetch(`${url}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(user.id)}`, { headers: admin });
  const role = ((await roleRes.json()) as { role: string }[])[0]?.role;
  if (role !== 'ADMIN' && role !== 'INSTRUCTOR') return json({ error: 'Accès refusé' }, 403);

  // 2) Entrée
  let body: { course_id?: string };
  try { body = await req.json(); } catch { return json({ error: 'Requête invalide' }, 400); }
  const courseId = String(body.course_id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(courseId)) return json({ error: 'course_id invalide' }, 400);

  // 3) La formation doit être réellement publiée (on ne prévient jamais pour un brouillon)
  const cRes = await fetch(`${url}/rest/v1/courses?select=title,slug,status&id=eq.${courseId}`, { headers: admin });
  const course = ((await cRes.json()) as { title: string; slug: string; status: string }[])[0];
  if (!course) return json({ error: 'Formation introuvable' }, 404);
  if (course.status !== 'PUBLIEE') return json({ error: 'La formation n’est pas publiée' }, 409);

  // 4) Fournisseur d'email configuré ?
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('MAIL_FROM');
  if (!apiKey || !from) return json({ configured: false, sent: 0 });

  const siteUrl = (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '');
  const link = siteUrl ? `${siteUrl}/formations/${course.slug}` : '';

  // 5) Inscrits en attente, pas encore prévenus
  const wRes = await fetch(`${url}/rest/v1/course_waitlist?select=id,email&course_id=eq.${courseId}&notified_at=is.null&limit=200`, { headers: admin });
  const waiting = (await wRes.json()) as { id: string; email: string }[];

  let sent = 0, failed = 0;
  for (const w of waiting) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [w.email],
        subject: `« ${course.title} » est disponible`,
        html: `<p>Bonjour,</p><p>La formation <strong>${esc(course.title)}</strong> est maintenant disponible sur JOE DEV CODES.</p>${link ? `<p><a href="${esc(link)}">Voir la formation</a></p>` : ''}<p>Vous recevez ce message car vous avez demandé à être prévenu.</p>`,
      }),
    });
    if (r.ok) {
      sent++;
      await fetch(`${url}/rest/v1/course_waitlist?id=eq.${w.id}`, { method: 'PATCH', headers: admin, body: JSON.stringify({ notified_at: new Date().toISOString() }) });
    } else failed++;
  }
  return json({ configured: true, sent, failed });
});
