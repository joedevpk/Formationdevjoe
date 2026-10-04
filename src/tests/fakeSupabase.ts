// Faux backend Supabase en mémoire (REST + Auth + RPC) pour les tests d'interface. Aucun réseau réel.
export type Row = Record<string, unknown>;
export const now = new Date().toISOString();
export const db: Record<string, Row[]> = {};
export const fnCalls: string[] = [];
/** Pannes simulées : `profiles` = nombre de lectures du profil à faire échouer (500) ; -1 = échec permanent. */
export const faults = { profiles: 0 };
export const rpcCalls: string[] = [];
let uid = 100;
export const nid = () => `00000000-0000-4000-8000-${String(++uid).padStart(12, '0')}`;
/** Fonctions RPC simulées, fournies par chaque test. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const rpc: Record<string, (args?: any) => unknown> = {};


export const COURSE_BASE = { level: 'DEBUTANT', objectives: ['Comprendre React'], prerequisites: ['JavaScript'], has_certificate: true, is_featured: false, position: 0, created_at: now, updated_at: now, category: 'React', price: null, currency: null, image_url: null, duration: '4 semaines', long_description: null, final_project: 'Une app', coming_soon: false, delivery_mode: 'EN_LIGNE', materials: [], practical_info: null, trainer_name: null };
export function seed() {
  faults.profiles = 0;
  Object.keys(db).forEach((k) => delete db[k]);
  db.courses = [
    { ...COURSE_BASE, id: 'c-react', slug: 'react-ts', title: 'React & TypeScript', short_description: 'Construire des interfaces avec React.', status: 'PUBLIEE' },
    { ...COURSE_BASE, id: 'c-ia', slug: 'ia-avancee', title: 'IA avancée', short_description: 'Aller plus loin avec l’IA.', status: 'BROUILLON', coming_soon: true, category: 'IA' },
  ];
  db.course_modules = [{ id: 'm1', course_id: 'c-react', title: 'Bases', description: null, position: 0, created_at: now, updated_at: now }];
  db.lessons = [{ id: 'l1', module_id: 'm1', course_id: 'c-react', title: 'Premier composant', kind: 'TEXTE', content: 'Contenu', video_url: null, duration_minutes: 10, position: 0, is_published: true, created_at: now, updated_at: now }];
  db.projects = [{ id: 'p1', slug: 'joe-app', title: 'Plateforme Joe', summary: 'Une vraie plateforme.', category: 'Web', status: 'En développement', is_published: true, show_in_cv: false, cv_position: 0, role: null, results: null, demo_url: null, github_url: null, is_featured: false, image_url: null, features: [], project_technologies: [{ name: 'React' }], created_at: now }];
  for (const t of ['profiles', 'settings', 'testimonials', 'enrollments', 'lesson_progress', 'notifications', 'course_waitlist', 'contact_messages', 'notification_preferences', 'certificates', 'favorites']) db[t] = [];
  for (const t of ['training_sessions', 'training_registrations', 'training_announcements', 'training_attendance', 'certificate_verifications']) db[t] = [];
  for (const t of ['cv_profiles', 'cv_skills', 'cv_experiences', 'cv_education', 'cv_certifications', 'cv_achievements', 'cv_languages', 'services']) db[t] = [];
  db.profiles = [
    { id: 'admin-1', email: 'admin@joe.dev', full_name: 'Joe Admin', role: 'ADMIN', created_at: now, updated_at: now },
    { id: 'learner-1', email: 'learner@joe.dev', full_name: 'Alice Apprenante', role: 'LEARNER', created_at: now, updated_at: now },
  ];
  db.notifications = [{ id: 'n0', user_id: 'x', title: 'x', body: null, is_read: false, created_at: now }];
}

export const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });
function session(user: Row) {
  return { access_token: `tok-${String(user.id)}`, refresh_token: 'ref', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: now, identities: [{ id: '1' }], ...user } };
}
function match(row: Row, params: URLSearchParams) {
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue;
    if (k === 'or') { const parts = v.replace(/^\(|\)$/g, '').split(','); if (!parts.some((p) => { const [f, , val] = p.split('.'); return String(row[f]) === val; })) return false; continue; }
    if (v.startsWith('eq.')) { if (String(row[k]) !== v.slice(3)) return false; }
    else if (v.startsWith('neq.')) { if (String(row[k]) === v.slice(4)) return false; }
    else if (v.startsWith('in.')) { if (!v.slice(4, -1).split(',').includes(String(row[k]))) return false; }
    else if (v === 'is.null') { if (row[k] != null) return false; }
  }
  return true;
}


export function installFakeSupabase() {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const u = new URL(String(input));
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const accept = new Headers(init?.headers).get('accept') ?? '';

    if (u.pathname === '/auth/v1/token') {
      if (body?.email === 'admin@joe.dev' && body?.password === 'secret123') return json(session({ id: 'admin-1', email: 'admin@joe.dev' }));
      if (body?.email === 'learner@joe.dev' && body?.password === 'learner123') return json(session({ id: 'learner-1', email: 'learner@joe.dev' }));
      return json({ code: 'invalid_credentials', message: 'Invalid login credentials' }, 400);
    }
    if (u.pathname === '/auth/v1/signup') {
      const id = nid();
      db.profiles.push({ id, email: body.email, full_name: body.data?.full_name ?? '', role: 'LEARNER', created_at: now, updated_at: now });
      return json(session({ id, email: body.email, user_metadata: body.data }));
    }
    if (u.pathname === '/auth/v1/user') {
      const t = new Headers(init?.headers).get('authorization') ?? '';
      const m2 = /tok-([\w-]+)/.exec(t);
      return m2 ? json(session({ id: m2[1], email: m2[1] === 'admin-1' ? 'admin@joe.dev' : 'learner@joe.dev' }).user) : json({ code: 'bad_jwt' }, 401);
    }
    if (u.pathname === '/auth/v1/logout') return new Response(null, { status: 204 });
    if (u.pathname.startsWith('/functions/v1/')) { fnCalls.push(u.pathname); return json({ error: 'not deployed' }, 404); }

    const rp = u.pathname.match(/^\/rest\/v1\/rpc\/(\w+)/);
    if (rp) { rpcCalls.push(rp[1]); const fn = rpc[rp[1]]; return fn ? json(fn(body)) : json({ code: 'PGRST202', message: 'no function' }, 404); }
    const m = u.pathname.match(/^\/rest\/v1\/(\w+)/);
    if (!m) return json({}, 404);
    const table = m[1];
    if (table === 'profiles' && method === 'GET' && faults.profiles !== 0) {
      if (faults.profiles > 0) faults.profiles -= 1;
      return json({ code: 'XX000', message: 'simulated outage' }, 500);
    }
    const rows = db[table];
    if (!rows) return json({ code: 'PGRST205', message: 'no table' }, 404);
    const wantsObject = accept.includes('vnd.pgrst.object');

    if (method === 'POST') {
      const list = Array.isArray(body) ? body : [body];
      const out: Row[] = [];
      for (const r of list) {
        if (table === 'course_waitlist' && rows.some((x) => x.course_id === r.course_id && String(x.email).toLowerCase() === String(r.email).toLowerCase())) return json({ code: '23505', message: 'duplicate key' }, 409);
        if (table === 'courses' && rows.some((x) => x.slug === r.slug)) return json({ code: '23505', message: 'duplicate' }, 409);
        if (table === 'enrollments' && rows.some((x) => x.user_id === r.user_id && x.course_id === r.course_id)) { if (u.searchParams.get('on_conflict')) continue; return json({ code: '23505' }, 409); }
        const row = { id: nid(), created_at: now, updated_at: now, status: 'ACTIVE', ...r };
        rows.push(row); out.push(row);
      }
      return json(wantsObject ? out[0] : out, 201);
    }
    if (method === 'PATCH') {
      const hit = rows.filter((r) => match(r, u.searchParams));
      hit.forEach((r) => Object.assign(r, body));
      return json(wantsObject ? hit[0] : hit);
    }
    if (method === 'DELETE') {
      const keep = rows.filter((r) => !match(r, u.searchParams));
      rows.length = 0; rows.push(...keep);
      return new Response(null, { status: 204 });
    }
    const hit = rows.filter((r) => match(r, u.searchParams));
    if (method === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': `0-0/${hit.length}` } });
    if (wantsObject) return hit[0] ? json(hit[0]) : json({ code: 'PGRST116', message: 'no rows' }, 406);
    return json(hit);
  }) as typeof fetch;
}
