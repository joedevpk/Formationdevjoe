-- À coller dans Supabase > SQL Editor du projet RÉELLEMENT connecté (celui de VITE_SUPABASE_URL).
-- Lecture seule : ne modifie rien.

-- 1) Tables attendues : "present" = false  ->  migration non exécutée sur ce projet
with expected(t) as (values
  ('profiles'),('courses'),('course_modules'),('lessons'),('lesson_resources'),('enrollments'),
  ('lesson_progress'),('projects'),('project_technologies'),('resources'),('articles'),('workshops'),
  ('workshop_registrations'),('services'),('contact_messages'),('notifications'),('certificates'),
  ('favorites'),('settings'),('testimonials'),('audit_logs'))
select e.t as table_name,
       (select count(*) from information_schema.tables x where x.table_schema='public' and x.table_name=e.t) = 1 as present,
       coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=e.t), false) as rls_enabled
from expected e order by present, e.t;

-- 2) Colonnes de testimonials (attendu : id, name, role, avatar_url, content, is_published, created_at, updated_at)
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='testimonials' order by ordinal_position;

-- 3) Lecture publique : policies sur les tables consultées par le site public
select tablename, policyname, cmd from pg_policies
where schemaname='public' and tablename in ('courses','testimonials','projects','settings') order by tablename, policyname;

-- 4) Données publiées visibles (le seed doit avoir créé des formations PUBLIEE)
select (select count(*) from public.courses where status='PUBLIEE') as courses_publiees,
       (select count(*) from public.settings) as settings_rows;

-- 5) Après avoir créé/migré les tables, forcer PostgREST à recharger son cache (corrige un 404 persistant)
-- notify pgrst, 'reload schema';

-- Formations présentielles (migration 20261003100000)
select 'training_sessions' as t, to_regclass('public.training_sessions') is not null as ok
union all select 'training_registrations', to_regclass('public.training_registrations') is not null
union all select 'training_announcements', to_regclass('public.training_announcements') is not null
union all select 'training_attendance', to_regclass('public.training_attendance') is not null
union all select 'certificate_verifications', to_regclass('public.certificate_verifications') is not null
union all select 'verify_certificate()', to_regproc('public.verify_certificate') is not null;
