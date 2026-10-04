// Régénère supabase/migrations/20260930100100_seed_joe_dev_codes.sql depuis src/data/catalog.ts
// Usage : npx tsx scripts/generate-seed.mjs
import { writeFileSync } from 'node:fs';
import { courses, servicesSeed, workshopsSeed, resourcesSeed, projectsSeed } from '../src/data/catalog.ts';

const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => `array[${a.map(q).join(',')}]::text[]`;
const out = ['-- JOE DEV CODES — données de démonstration (contenu pédagogique uniquement : aucune statistique, aucun client, aucun témoignage).', ''];

courses.forEach((c, i) => {
  out.push(`insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values (${q(c.slug)},${q(c.title)},${q(c.short)},${q(c.long)},${q(c.level)},${q(c.duration)},'PUBLIEE',${q(c.category)},${arr(c.objectives)},${arr(c.prerequisites)},${q(c.finalProject)},true,${c.featured ? 'true' : 'false'},${i}) on conflict (slug) do nothing;`);
  c.modules.forEach((m, mi) => {
    out.push(`with c as (select id from public.courses where slug=${q(c.slug)}), m as (
  insert into public.course_modules (course_id,title,description,position) select id,${q(m.title)},${q(m.description)},${mi} from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title=${q(m.title)}) returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
${m.lessons.map((l, li) => `(${q(l.title)},${q(l.kind)},${q(l.content)},${l.minutes},${li})`).join(',\n')}
) as v(title,kind,content,minutes,pos);`);
  });
});

servicesSeed.forEach((s, i) => out.push(`insert into public.services (title,description,icon,position) select ${q(s.title)},${q(s.description)},${q(s.icon)},${i} where not exists (select 1 from public.services where title=${q(s.title)});`));
workshopsSeed.forEach((w) => out.push(`insert into public.workshops (slug,title,description,format,status) values (${q(w.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))},${q(w.title)},${q(w.description)},${q(w.format)},'A_VENIR') on conflict (slug) do nothing;`));
resourcesSeed.forEach((r) => out.push(`insert into public.resources (title,description,category,kind) select ${q(r.title)},${q(r.description)},${q(r.category)},${q(r.kind)} where not exists (select 1 from public.resources where title=${q(r.title)});`));
projectsSeed.forEach((p) => {
  out.push(`insert into public.projects (slug,title,category,summary,status,role,is_published) values (${q(p.slug)},${q(p.title)},${q(p.category)},${q(p.summary)},${q(p.status)},${q(p.role)},false) on conflict (slug) do nothing;`);
  p.technologies.forEach((t) => out.push(`insert into public.project_technologies (project_id,name) select id,${q(t)} from public.projects where slug=${q(p.slug)} on conflict do nothing;`));
});
out.push(`insert into public.settings (key,value) values ('identity.name','JOE DEV CODES'),('identity.title','Développeur • Formateur • Étudiant • Entrepreneur') on conflict (key) do nothing;`);
writeFileSync('supabase/migrations/20260930100100_seed_joe_dev_codes.sql', out.join('\n') + '\n');
console.log('seed généré');
