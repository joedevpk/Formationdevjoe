-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  JOE DEV CODES — MIGRATION COMPLÈTE EN UN SEUL COLLAGE                    ║
-- ║  Supabase > SQL Editor > New query > coller TOUT > Run                    ║
-- ║  (si Supabase demande une confirmation « destructive » : c'est normal,    ║
-- ║   le script remplace ses propres policies/triggers — confirmer)           ║
-- ║  Ordre : schéma → démo → témoignages → durcissement → CV → présentiel →   ║
-- ║          droits Data API → certificat manuel.  Relançable sans erreur.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ════════ PARTIE 1/8 : 20260930100000_joe_dev_codes_schema.sql ════════
/*
  # JOE DEV CODES — schéma complet

  Remplace intégralement l'ancien schéma institutionnel. À exécuter sur un projet Supabase NEUF
  (ou après suppression des anciennes tables : voir README, section « Migration depuis l'ancien prototype »).

  Rôles : ADMIN, INSTRUCTOR, LEARNER. Le rôle n'est JAMAIS choisi par le client :
  un trigger crée le profil en LEARNER, et un trigger empêche toute auto-promotion.
*/

create extension if not exists pgcrypto;

-- ───────────── Helpers ─────────────
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ───────────── Profiles ─────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  bio text,
  role text not null default 'LEARNER' check (role in ('ADMIN','INSTRUCTOR','LEARNER')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin(uid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role = 'ADMIN');
$$;

create or replace function public.is_staff(uid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role in ('ADMIN','INSTRUCTOR'));
$$;

revoke all on function public.is_admin(uuid) from public;
revoke all on function public.is_staff(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated;
grant execute on function public.is_staff(uuid) to anon, authenticated;

-- Création automatique du profil à l'inscription (toujours LEARNER)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (new.id, coalesce(new.email, ''), nullif(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'phone', ''), 'LEARNER')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Empêche un utilisateur de modifier son propre rôle (seul un ADMIN ou le SQL editor le peut)
create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_admin(auth.uid()) then
      raise exception 'Modification du rôle non autorisée';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists protect_profile_role_trg on public.profiles;
create trigger protect_profile_role_trg before update on public.profiles
  for each row execute function public.protect_profile_role();
drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- ───────────── Formations ─────────────
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_description text not null default '',
  long_description text,
  image_url text,
  level text not null default 'DEBUTANT' check (level in ('DEBUTANT','INTERMEDIAIRE','AVANCE')),
  duration text,
  price numeric(12,2),
  currency text default 'USD',
  status text not null default 'BROUILLON' check (status in ('BROUILLON','PUBLIEE','ARCHIVEE')),
  category text not null default 'Web',
  objectives text[] not null default '{}',
  prerequisites text[] not null default '{}',
  final_project text,
  has_certificate boolean not null default true,
  is_featured boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists course_modules_course_idx on public.course_modules(course_id, position);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  kind text not null default 'TEXTE' check (kind in ('TEXTE','VIDEO','CODE','QUIZ','EXERCICE','PROJET')),
  content text,
  video_url text,
  duration_minutes int,
  position int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lessons_course_idx on public.lessons(course_id, position);
create index if not exists lessons_module_idx on public.lessons(module_id, position);

create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  url text not null,
  kind text not null default 'Lien',
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','TERMINEE','ANNULEE')),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index if not exists lesson_progress_user_idx on public.lesson_progress(user_id, course_id);

-- ───────────── Portfolio ─────────────
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null default 'Web',
  summary text not null default '',
  image_url text,
  problem text,
  solution text,
  architecture text,
  features text[] not null default '{}',
  challenges text,
  results text,
  learned text,
  role text,
  status text not null default 'En cours',
  demo_url text,
  github_url text,
  video_url text,
  project_date date,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_technologies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  unique (project_id, name)
);

-- ───────────── Contenus ─────────────
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'HTML',
  kind text not null default 'Tutoriels',
  url text,
  content text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  category text not null default 'Tutoriels',
  image_url text,
  tags text[] not null default '{}',
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  starts_at timestamptz,
  duration text,
  format text not null default 'En ligne',
  location_url text,
  image_url text,
  status text not null default 'A_VENIR' check (status in ('A_VENIR','OUVERT','COMPLET','TERMINE','ANNULE')),
  capacity int,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workshop_registrations (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  icon text not null default 'Code2',
  position int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  avatar_url text,
  content text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 320),
  phone text,
  request_type text not null default 'Je veux apprendre',
  message text not null check (char_length(message) between 1 and 5000),
  status text not null default 'NOUVEAU' check (status in ('NOUVEAU','LU','TRAITE')),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('course','resource','article')),
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

create table if not exists public.settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  created_at timestamptz not null default now()
);

-- updated_at
do $$ declare t text; begin
  foreach t in array array['courses','course_modules','lessons','projects','resources','articles','workshops','services','testimonials','settings'] loop
    execute format('drop trigger if exists %I_updated on public.%I', t, t);
    execute format('create trigger %I_updated before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- Journal d'audit automatique (aucune edge function nécessaire)
create or replace function public.log_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare rid text;
begin
  if tg_op = 'DELETE' then rid := coalesce(to_jsonb(old)->>'id', to_jsonb(old)->>'key');
  else rid := coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'key'); end if;
  insert into public.audit_logs (user_id, action, entity, entity_id) values (auth.uid(), tg_op, tg_table_name, rid);
  return coalesce(new, old);
end; $$;

do $$ declare t text; begin
  foreach t in array array['courses','course_modules','lessons','projects','resources','articles','workshops','services','testimonials','settings'] loop
    execute format('drop trigger if exists %I_audit on public.%I', t, t);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.log_audit()', t, t);
  end loop;
end $$;

-- Terminer automatiquement une formation quand toutes ses leçons publiées sont validées + délivrer le certificat
create or replace function public.on_lesson_progress() returns trigger
language plpgsql security definer set search_path = public as $$
declare total int; done int; has_cert boolean;
begin
  select count(*) into total from public.lessons where course_id = new.course_id and is_published;
  select count(*) into done from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
    where lp.user_id = new.user_id and lp.course_id = new.course_id and l.is_published;
  if total > 0 and done >= total then
    update public.enrollments set status = 'TERMINEE', completed_at = now()
      where user_id = new.user_id and course_id = new.course_id and status = 'ACTIVE';
    select has_certificate into has_cert from public.courses where id = new.course_id;
    if coalesce(has_cert, false) then
      insert into public.certificates (user_id, course_id) values (new.user_id, new.course_id) on conflict do nothing;
    end if;
    insert into public.notifications (user_id, title, body)
      values (new.user_id, 'Formation terminée', 'Bravo, tu as terminé une formation. Retrouve ton certificat dans Mon espace.');
  end if;
  return new;
end; $$;
drop trigger if exists lesson_progress_done on public.lesson_progress;
create trigger lesson_progress_done after insert on public.lesson_progress
  for each row execute function public.on_lesson_progress();

-- ───────────── Row Level Security ─────────────
do $$ declare t text; begin
  foreach t in array array['profiles','courses','course_modules','lessons','lesson_resources','enrollments','lesson_progress','projects','project_technologies','resources','articles','workshops','workshop_registrations','services','testimonials','contact_messages','notifications','certificates','favorites','settings','audit_logs'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Migration relançable : on retire d'abord les policies existantes de ces tables (elles sont recréées ci-dessous).
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('profiles','courses','course_modules','lessons','lesson_resources','enrollments','lesson_progress','projects','project_technologies','resources','articles','workshops','workshop_registrations','services','testimonials','contact_messages','notifications','certificates','favorites','settings','audit_logs')
  loop execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename); end loop;
end $$;

-- profiles : chacun voit/modifie le sien ; le staff voit tout ; jamais de lecture publique
create policy profiles_select on public.profiles for select to authenticated using (auth.uid() = id or public.is_staff(auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_admin_all on public.profiles for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Contenus publics : lecture publique du publié, écriture réservée au staff (admin pour suppression)
create policy courses_read on public.courses for select using (status = 'PUBLIEE' or public.is_staff(auth.uid()));
create policy courses_write on public.courses for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy modules_read on public.course_modules for select using (
  exists (select 1 from public.courses c where c.id = course_id and (c.status = 'PUBLIEE' or public.is_staff(auth.uid()))));
create policy modules_write on public.course_modules for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy lessons_read on public.lessons for select using (
  (is_published and exists (select 1 from public.courses c where c.id = course_id and c.status = 'PUBLIEE')) or public.is_staff(auth.uid()));
create policy lessons_write on public.lessons for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy lesson_resources_read on public.lesson_resources for select to authenticated using (true);
create policy lesson_resources_write on public.lesson_resources for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy projects_read on public.projects for select using (is_published or public.is_staff(auth.uid()));
create policy projects_write on public.projects for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy project_tech_read on public.project_technologies for select using (
  exists (select 1 from public.projects p where p.id = project_id and (p.is_published or public.is_staff(auth.uid()))));
create policy project_tech_write on public.project_technologies for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy resources_read on public.resources for select using (is_published or public.is_staff(auth.uid()));
create policy resources_write on public.resources for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy articles_read on public.articles for select using (is_published or public.is_staff(auth.uid()));
create policy articles_write on public.articles for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy workshops_read on public.workshops for select using (is_published or public.is_staff(auth.uid()));
create policy workshops_write on public.workshops for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy services_read on public.services for select using (is_published or public.is_staff(auth.uid()));
create policy services_write on public.services for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy testimonials_read on public.testimonials for select using (is_published or public.is_staff(auth.uid()));
create policy testimonials_write on public.testimonials for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- settings : lecture publique (identité affichée sur le site), écriture admin
create policy settings_read on public.settings for select using (true);
create policy settings_write on public.settings for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Inscriptions / progression : données propres à l'apprenant
create policy enrollments_select on public.enrollments for select to authenticated using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy enrollments_insert on public.enrollments for insert to authenticated with check (
  auth.uid() = user_id and status = 'ACTIVE' and exists (select 1 from public.courses c where c.id = course_id and c.status = 'PUBLIEE'));
create policy enrollments_update_admin on public.enrollments for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy enrollments_delete on public.enrollments for delete to authenticated using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy progress_select on public.lesson_progress for select to authenticated using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy progress_insert on public.lesson_progress for insert to authenticated with check (
  auth.uid() = user_id and exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.course_id = lesson_progress.course_id));
create policy progress_delete on public.lesson_progress for delete to authenticated using (auth.uid() = user_id);

create policy certificates_select on public.certificates for select to authenticated using (auth.uid() = user_id or public.is_staff(auth.uid()));

create policy favorites_all on public.favorites for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy notifications_select on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy notifications_update on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notifications_delete on public.notifications for delete to authenticated using (auth.uid() = user_id);
create policy notifications_admin_insert on public.notifications for insert to authenticated with check (public.is_admin(auth.uid()));

-- Ateliers : inscription ouverte (visiteurs compris), lecture réservée au staff
create policy workshop_reg_insert on public.workshop_registrations for insert to anon, authenticated with check (
  char_length(name) between 1 and 200 and char_length(email) between 3 and 320
  and exists (select 1 from public.workshops w where w.id = workshop_id and w.is_published and w.status in ('A_VENIR','OUVERT')));
create policy workshop_reg_select on public.workshop_registrations for select to authenticated using (public.is_staff(auth.uid()) or auth.uid() = user_id);
create policy workshop_reg_delete on public.workshop_registrations for delete to authenticated using (public.is_admin(auth.uid()));

-- Messages de contact : privés (envoi public, lecture admin)
create policy contact_insert on public.contact_messages for insert to anon, authenticated with check (status = 'NOUVEAU');
create policy contact_select on public.contact_messages for select to authenticated using (public.is_admin(auth.uid()));
create policy contact_update on public.contact_messages for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy contact_delete on public.contact_messages for delete to authenticated using (public.is_admin(auth.uid()));

create policy audit_select on public.audit_logs for select to authenticated using (public.is_admin(auth.uid()));

-- ───────────── Storage ─────────────
insert into storage.buckets (id, name, public) values
  ('avatars','avatars',true), ('course-images','course-images',true), ('lesson-files','lesson-files',false),
  ('project-images','project-images',true), ('resource-files','resource-files',true),
  ('article-images','article-images',true), ('workshop-images','workshop-images',true)
on conflict (id) do nothing;

drop policy if exists "public read media" on storage.objects;
drop policy if exists "auth read lesson files" on storage.objects;
drop policy if exists "staff write media" on storage.objects;
drop policy if exists "staff update media" on storage.objects;
drop policy if exists "staff delete media" on storage.objects;
drop policy if exists "avatars insert own" on storage.objects;
drop policy if exists "avatars update own" on storage.objects;
drop policy if exists "avatars delete own" on storage.objects;

-- Lecture publique des buckets publics (par nom d'objet connu ; pas de listing général)
create policy "public read media" on storage.objects for select using (
  bucket_id in ('avatars','course-images','project-images','resource-files','article-images','workshop-images'));
create policy "auth read lesson files" on storage.objects for select to authenticated using (bucket_id = 'lesson-files');

-- Écriture : staff sur tous les buckets de contenu
create policy "staff write media" on storage.objects for insert to authenticated with check (
  bucket_id in ('course-images','lesson-files','project-images','resource-files','article-images','workshop-images') and public.is_staff(auth.uid()));
create policy "staff update media" on storage.objects for update to authenticated using (
  bucket_id in ('course-images','lesson-files','project-images','resource-files','article-images','workshop-images') and public.is_staff(auth.uid()));
create policy "staff delete media" on storage.objects for delete to authenticated using (
  bucket_id in ('course-images','lesson-files','project-images','resource-files','article-images','workshop-images') and public.is_staff(auth.uid()));

-- Avatars : chaque utilisateur dans son dossier <uid>/…
create policy "avatars insert own" on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars update own" on storage.objects for update to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars delete own" on storage.objects for delete to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ════════ PARTIE 2/8 : 20260930100100_seed_joe_dev_codes.sql ════════
-- JOE DEV CODES — données de démonstration (contenu pédagogique uniquement : aucune statistique, aucun client, aucun témoignage).

insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('creation-de-sites-web','Création de sites web','Comprendre le Web, construire des pages HTML/CSS/JS et publier ton propre site.','Une formation pour passer de « je consomme le web » à « je crée pour le web ». Tu apprends la structure d''une page, le style, le responsive, l''interactivité et la mise en ligne, avec un site réel comme fil rouge.','DEBUTANT','6 semaines','PUBLIEE','Web',array['Expliquer comment fonctionne le Web','Structurer et styliser une page responsive','Ajouter de l’interactivité avec JavaScript','Publier un site en ligne']::text[],array['Savoir utiliser un ordinateur','Aucune expérience de code requise']::text[],'Créer et publier son propre site web.',true,false,0) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='creation-de-sites-web'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Comprendre le Web','Client, serveur, navigateur, URL.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Comprendre le Web') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Comment fonctionne le Web ?','TEXTE','Le navigateur (client) demande une page à un serveur via une URL ; le serveur répond avec du HTML, du CSS et du JavaScript.

### À retenir
- Client / serveur
- Requête / réponse
- HTML = structure, CSS = style, JS = comportement',10,0),
('Ton éditeur et ton premier fichier','EXERCICE','Installe un éditeur de code, crée un dossier `mon-site` et un fichier `index.html` qui affiche ton prénom.',15,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='creation-de-sites-web'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'HTML : la structure','Balises, sémantique, formulaires.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='HTML : la structure') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Structure d’une page HTML','CODE','```html
<!doctype html>
<html lang="fr">
  <head><meta charset="UTF-8" /><title>Mon site</title></head>
  <body><h1>Bonjour</h1></body>
</html>
```',15,0),
('Titres, listes, liens, images','TEXTE','Utilise les balises sémantiques (`header`, `main`, `section`, `footer`) pour donner du sens à ta page.',15,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='creation-de-sites-web'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'CSS : le style et le responsive','Sélecteurs, Flexbox, Grid, media queries.',2 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='CSS : le style et le responsive') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Sélecteurs et box model','TEXTE','Chaque élément est une boîte : contenu, padding, bordure, marge.',20,0),
('Flexbox et Grid','CODE','```css
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }
```',25,1),
('Rendre une page responsive','EXERCICE','Adapte ta page pour mobile, tablette et desktop avec des media queries.',25,2)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='creation-de-sites-web'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'JavaScript : rendre la page vivante','Variables, DOM, événements, formulaires, API.',3 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='JavaScript : rendre la page vivante') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Variables, fonctions, conditions','CODE','```js
const prenom = "Awa";
function saluer(nom) { return `Bonjour ${nom}`; }
console.log(saluer(prenom));
```',25,0),
('Le DOM et les événements','CODE','```js
document.querySelector("button").addEventListener("click", () => alert("Salut !"));
```',25,1),
('Appeler une API avec fetch','CODE','Récupère des données JSON avec `fetch` et affiche-les dans la page.',25,2)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='creation-de-sites-web'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Publier ton site','Mise en ligne et projet final.',4 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Publier ton site') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Mettre son site en ligne','TEXTE','Héberge un site statique (Vercel, Render, GitHub Pages) depuis un dépôt Git.',15,0),
('Projet final : ton site','PROJET','Crée et publie ton site : présentation, au moins 3 sections, responsive, un formulaire de contact.',120,1)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('html-css','HTML & CSS','Les fondations du web : structurer et styliser de belles pages responsives.','Une formation courte et pratique pour maîtriser le HTML sémantique et le CSS moderne, avec des mini-projets à chaque étape.','DEBUTANT','3 semaines','PUBLIEE','HTML',array['Écrire du HTML sémantique','Maîtriser Flexbox et Grid','Créer des interfaces responsives']::text[],array['Aucun']::text[],'Une page de présentation personnelle responsive.',true,false,1) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='html-css'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'HTML','Structure et sémantique.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='HTML') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Balises essentielles','TEXTE','Titres, paragraphes, listes, liens, images, formulaires.',15,0),
('HTML sémantique','EXERCICE','Réécris une page « tout en div » avec des balises sémantiques.',20,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='html-css'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'CSS','Style, mise en page, responsive.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='CSS') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Couleurs, typographie, espacements','TEXTE','Construis une échelle de typographie et d’espacements cohérente.',20,0),
('Mise en page moderne','CODE','Flexbox pour l’alignement, Grid pour les grilles.',25,1),
('Mini-projet : page perso','PROJET','Une page de présentation responsive.',60,2)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('javascript','JavaScript','Apprendre à programmer pour le web : logique, DOM, événements et API.','De la première variable à une mini-application qui consomme une API : tu apprends à raisonner en programmeur.','DEBUTANT','5 semaines','PUBLIEE','JavaScript',array['Écrire de la logique en JavaScript','Manipuler le DOM','Consommer une API']::text[],array['HTML & CSS de base']::text[],'Une mini-application interactive connectée à une API.',true,false,2) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='javascript'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Les bases du langage','Variables, conditions, boucles, fonctions.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Les bases du langage') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Variables et types','CODE','`const`, `let`, nombres, chaînes, booléens.',20,0),
('Conditions et boucles','CODE','`if`, `for`, `while`, `map`, `filter`.',25,1),
('Fonctions','EXERCICE','Écris 5 petites fonctions utilitaires.',25,2)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='javascript'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Le navigateur','DOM, événements, API.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Le navigateur') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Sélectionner et modifier le DOM','CODE','`querySelector`, `textContent`, `classList`.',25,0),
('Événements et formulaires','CODE','Écouter un clic, valider un formulaire.',25,1),
('fetch et async/await','CODE','Appelle une API JSON et gère les erreurs.',30,2),
('Mini-projet : liste de tâches','PROJET','Ajouter, terminer et supprimer des tâches.',90,3)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('creation-applications-web','Création d’applications web','React, TypeScript, routing, formulaires, authentification et déploiement.','Tu passes du site à l’application : composants, état, routing, formulaires, données, authentification et déploiement.','INTERMEDIAIRE','8 semaines','PUBLIEE','React',array['Structurer une application React + TypeScript','Gérer état, routing et formulaires','Brancher une API et une authentification','Déployer']::text[],array['JavaScript','HTML & CSS']::text[],'Créer une application web complète.',true,false,3) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='creation-applications-web'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'React et TypeScript','Composants, props, état.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='React et TypeScript') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Penser en composants','TEXTE','Découper une interface en composants réutilisables.',20,0),
('Props, état, effets','CODE','```tsx
function Compteur() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
```',30,1),
('TypeScript pour React','CODE','Typer props, état et réponses d’API.',30,2)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='creation-applications-web'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Une vraie application','Routing, formulaires, données, auth.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Une vraie application') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Routing avec React Router','CODE','Routes publiques, routes protégées, paramètres d’URL.',25,0),
('Formulaires validés','CODE','React Hook Form + Zod.',30,1),
('Données et authentification','CODE','Lire/écrire des données, connecter des utilisateurs.',40,2),
('Projet final : application complète','PROJET','Une application avec auth, CRUD, routing et déploiement.',240,3)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('creation-plateformes','Création de plateformes numériques','Concevoir une vraie plateforme SaaS : utilisateurs, rôles, dashboard, sécurité.','Différence entre site, application et plateforme ; architecture, rôles, dashboard, base de données, notifications, recherche, stockage, sécurité et déploiement.','AVANCE','10 semaines','PUBLIEE','Plateformes',array['Distinguer site, application et plateforme','Concevoir rôles et permissions','Construire un dashboard avec CRUD','Sécuriser et déployer']::text[],array['React + TypeScript','Notions de base de données']::text[],'Construire une vraie plateforme SaaS.',true,false,4) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='creation-plateformes'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Penser plateforme','Architecture, utilisateurs et rôles.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Penser plateforme') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Site, application, plateforme','TEXTE','Un site présente, une application permet d’agir, une plateforme met en relation plusieurs types d’utilisateurs avec des rôles.',15,0),
('Modéliser utilisateurs et rôles','EXERCICE','Dessine les rôles, leurs droits et les tables associées.',30,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='creation-plateformes'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Construire le cœur','Dashboard, CRUD, sécurité.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Construire le cœur') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Dashboard et CRUD','CODE','Créer, lire, modifier, supprimer avec validation et confirmations.',45,0),
('Notifications, recherche, stockage','CODE','Ajouter les fonctions qui rendent une plateforme utilisable.',40,1),
('Sécurité et déploiement','TEXTE','RLS, variables d’environnement, logs.',25,2),
('Projet final : ta plateforme SaaS','PROJET','Une plateforme multi-rôles déployée.',300,3)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('python-debutants','Python pour débutants','Les bases de Python, l’automatisation et une première approche de l’IA.','Du premier `print` aux classes, avec des mini-projets d’automatisation et une introduction à l’IA.','DEBUTANT','5 semaines','PUBLIEE','Python',array['Écrire des programmes Python simples','Manipuler fichiers et données','Automatiser une tâche','Découvrir l’IA']::text[],array['Aucun']::text[],'Un script d’automatisation utile.',true,false,5) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='python-debutants'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Les bases','Variables, types, conditions, boucles, fonctions.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Les bases') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Installer Python et écrire son premier script','EXERCICE','```python
print("Bonjour Python")
```',20,0),
('Conditions, boucles, fonctions','CODE','```python
for i in range(3):
    print(i)
```',30,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='python-debutants'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Structures et projets','Listes, dictionnaires, fichiers, POO, automatisation.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Structures et projets') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Listes et dictionnaires','CODE','Stocker et parcourir des données.',25,0),
('Fichiers et exceptions','CODE','Lire un CSV, gérer les erreurs.',25,1),
('Introduction à l’automatisation et à l’IA','TEXTE','Automatiser une tâche répétitive et appeler un service d’IA.',25,2),
('Mini-projet : script d’automatisation','PROJET','Renomme ou trie des fichiers automatiquement.',90,3)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('supabase-de-zero-a-production','Supabase de zéro à une vraie application','PostgreSQL, Auth, Storage, Row Level Security et intégration React.','Tu crées un backend complet avec Supabase : tables, relations, SQL, authentification, stockage et sécurité par RLS, puis tu l’intègres à React.','INTERMEDIAIRE','6 semaines','PUBLIEE','Supabase',array['Modéliser une base PostgreSQL','Mettre en place Auth et Storage','Écrire des politiques RLS','Intégrer Supabase dans React']::text[],array['JavaScript','React (conseillé)']::text[],'Créer une application complète avec React + Supabase.',true,false,6) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='supabase-de-zero-a-production'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Base de données','Projet, tables, relations, SQL.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Base de données') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Créer un projet Supabase','TEXTE','Projet, URL publique, clé anon : ce qui va côté frontend et ce qui reste secret.',15,0),
('Tables, relations et SQL','CODE','Crée une table « notes » avec trois colonnes : un identifiant unique, l’utilisateur propriétaire (référence vers auth.users) et le texte de la note.',35,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='supabase-de-zero-a-production'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Sécurité et intégration','Auth, Storage, RLS, React.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Sécurité et intégration') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Authentification','CODE','Inscription, connexion, session.',30,0),
('Row Level Security','CODE','Active la Row Level Security sur la table « notes », puis ajoute une politique : chaque utilisateur ne peut lire et écrire que ses propres notes (auth.uid() = user_id).',40,1),
('Storage et politiques','CODE','Buckets, droits de lecture/écriture.',30,2),
('Projet final : React + Supabase','PROJET','Une application complète avec auth, données protégées et fichiers.',240,3)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('ia-pour-developpeurs','IA pour développeurs','Comprendre l’IA générative et l’intégrer proprement dans une application.','Modèles de langage, prompting, API d’IA, assistants, automatisation, bonnes pratiques, sécurité et limites.','INTERMEDIAIRE','5 semaines','PUBLIEE','IA',array['Comprendre l’IA générative','Écrire des prompts efficaces','Appeler une API d’IA côté serveur','Connaître les limites et risques']::text[],array['JavaScript','Notions d’API']::text[],'Créer une application web intégrant une fonctionnalité IA.',true,false,7) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='ia-pour-developpeurs'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Comprendre','Modèles, prompting, limites.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Comprendre') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Comment fonctionne un modèle de langage','TEXTE','Un modèle prédit la suite d’un texte : il peut se tromper avec aplomb. Toujours vérifier.',20,0),
('Prompting de base','EXERCICE','Contexte, tâche, contraintes, format de sortie.',25,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='ia-pour-developpeurs'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Intégrer','API, sécurité, application.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Intégrer') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Appeler une API d’IA depuis le serveur','CODE','Ne jamais exposer une clé d’API dans le frontend : passe par une fonction serveur (Edge Function).',35,0),
('Sécurité et limites','TEXTE','Données sensibles, injection de prompt, hallucinations.',20,1),
('Projet final : fonctionnalité IA','PROJET','Ajoute une fonctionnalité IA à une application web.',180,2)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('vibe-coding','Vibe Coding','Apprendre à construire plus vite avec l’IA sans devenir dépendant d’elle.','La formation phare. Le concept : le Vibe Coder Cultivé. L''objectif n''est pas de demander à l''IA de tout faire, mais de comprendre → concevoir → guider l''IA → vérifier → corriger → améliorer → déployer.','INTERMEDIAIRE','4 semaines','PUBLIEE','Vibe Coding',array['Transformer une idée en cahier des charges','Écrire de bons prompts et travailler par étapes','Lire, tester et corriger le code généré','Sécuriser et déployer']::text[],array['Bases du web (HTML/CSS/JS)','Curiosité']::text[],'Construire et déployer une application avec l’IA, en expliquant chaque choix.',true,true,8) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='vibe-coding'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Penser avant de prompter','Idée, besoin, cahier des charges.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Penser avant de prompter') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Le Vibe Coder Cultivé','TEXTE','comprendre → concevoir → guider l’IA → vérifier → corriger → améliorer → déployer.',15,0),
('De l’idée au cahier des charges','EXERCICE','Écris : problème, utilisateurs, fonctionnalités, contraintes, critères de réussite.',30,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='vibe-coding'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Guider l’IA','Prompts, outils, travail par étapes.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Guider l’IA') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Écrire un bon prompt','TEXTE','Contexte, objectif, contraintes, format attendu, exemple.',20,0),
('Claude, Bolt, Cursor : quand utiliser quoi','TEXTE','Chaque outil a ses forces ; choisis selon la tâche.',20,1),
('Travailler par petites étapes','EXERCICE','Une fonctionnalité = un prompt = un test.',30,2)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='vibe-coding'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Vérifier et livrer','Lire, tester, sécuriser, déployer.',2 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Vérifier et livrer') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Lire et comprendre le code généré','CODE','Relis chaque fichier : tu restes responsable du résultat.',30,0),
('Déboguer avec l’IA','EXERCICE','Donne le message d’erreur, le contexte et le comportement attendu.',30,1),
('Auditer, sécuriser, déployer','TEXTE','Demande un audit à l’IA puis vérifie toi-même secrets, droits et validations.',25,2),
('Projet final','PROJET','Une application construite avec l’IA, déployée, et documentée.',240,3)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('hebergement-deploiement','De localhost à Internet','Git, GitHub, variables d’environnement, Render, Vercel, domaines et HTTPS.','Mettre une vraie application en ligne, la surveiller et la maintenir.','INTERMEDIAIRE','3 semaines','PUBLIEE','Déploiement',array['Versionner avec Git/GitHub','Déployer frontend et backend','Configurer domaine et HTTPS','Lire les logs et corriger en production']::text[],array['Une application web simple']::text[],'Mettre une vraie application en ligne.',true,false,9) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='hebergement-deploiement'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Git et GitHub','Versionner et collaborer.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Git et GitHub') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Git : commit, branche, merge','CODE','```bash
git init
git add .
git commit -m "premier commit"
```',30,0),
('Publier sur GitHub','EXERCICE','Crée un dépôt et pousse ton projet.',20,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='hebergement-deploiement'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Mise en ligne','Build, variables, hébergeurs, domaine.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Mise en ligne') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Build et variables d’environnement','TEXTE','Seules les variables publiques vont dans le frontend.',20,0),
('Déployer sur Render ou Vercel','EXERCICE','Connecte le dépôt, configure build et variables.',40,1),
('Domaine, DNS, HTTPS','TEXTE','Pointer un domaine, vérifier le certificat.',25,2),
('Logs et erreurs de production','TEXTE','Lire les logs, reproduire, corriger, redéployer.',25,3)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('pitch-de-projet','Pitch ton projet avec impact','Problème, solution, business model, storytelling et questions du jury.','Pour les hackathons et les entrepreneurs : structurer un pitch clair et convaincant, avec le Pitch Lab pour générer ta structure.','DEBUTANT','2 semaines','PUBLIEE','Pitch',array['Formuler un problème et une cible','Présenter solution et innovation','Construire un business model simple','Répondre aux questions du jury']::text[],array['Une idée de projet']::text[],'Un pitch de 3 minutes avec support.',true,false,10) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='pitch-de-projet'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Construire le message','Problème, cible, solution.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Construire le message') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Identifier le vrai problème','TEXTE','Un bon pitch commence par un problème vécu par une cible précise.',20,0),
('Utiliser le Pitch Lab','EXERCICE','Renseigne problème, cible, solution, marché, business model, impact, prototype, puis génère ta structure.',25,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='pitch-de-projet'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Convaincre','Business model, storytelling, oral.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Convaincre') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Business model et marché','TEXTE','Qui paie, pourquoi, combien, comment vous gagnez de l’argent.',25,0),
('Storytelling et pitch deck','TEXTE','Une histoire, un fil conducteur, peu de texte par slide.',25,1),
('Pitch oral et questions du jury','EXERCICE','Entraîne-toi à 3 minutes chrono, prépare 5 questions difficiles.',40,2)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('creer-son-mvp','Créer son MVP','Définir, construire et tester un produit minimum viable.','Choisir la bonne fonctionnalité, prototyper, construire avec une stack simple, tester avec de vrais utilisateurs et itérer.','INTERMEDIAIRE','6 semaines','PUBLIEE','Entrepreneuriat',array['Cadrer un MVP','Prototyper et construire vite','Tester avec de vrais utilisateurs','Itérer']::text[],array['Une idée de produit','Notions de web']::text[],'Un MVP en ligne, testé par de vrais utilisateurs.',true,false,11) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='creer-son-mvp'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Cadrer','Problème, utilisateurs, périmètre.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Cadrer') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Qu’est-ce qu’un MVP ?','TEXTE','La plus petite version qui prouve que le problème est résolu.',15,0),
('Définir le périmètre','EXERCICE','Liste, trie et coupe jusqu’à une seule fonctionnalité centrale.',30,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='creer-son-mvp'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Construire et tester','Prototype, build, retours.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Construire et tester') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Prototyper','EXERCICE','Maquette cliquable ou page de démonstration.',40,0),
('Construire la version 1','PROJET','Mets en ligne ton MVP.',240,1),
('Tester et itérer','EXERCICE','Observe de vrais utilisateurs et note ce qui bloque.',40,2)
) as v(title,kind,content,minutes,pos);
insert into public.services (title,description,icon,position) select 'Site web','Un site clair, rapide et responsive, pensé pour présenter une activité ou un projet.','Globe',0 where not exists (select 1 from public.services where title='Site web');
insert into public.services (title,description,icon,position) select 'Application web','Une application sur mesure avec comptes utilisateurs, données et parcours complets.','AppWindow',1 where not exists (select 1 from public.services where title='Application web');
insert into public.services (title,description,icon,position) select 'Plateforme SaaS','Une plateforme multi-rôles avec dashboard, abonnements ou inscriptions, et administration.','Layers',2 where not exists (select 1 from public.services where title='Plateforme SaaS');
insert into public.services (title,description,icon,position) select 'Dashboard','Des tableaux de bord qui affichent vos vraies données, sans décor.','LayoutDashboard',3 where not exists (select 1 from public.services where title='Dashboard');
insert into public.services (title,description,icon,position) select 'Intégration Supabase','Base de données, authentification, stockage et sécurité RLS mises en place proprement.','Database',4 where not exists (select 1 from public.services where title='Intégration Supabase');
insert into public.services (title,description,icon,position) select 'Intégration IA','Assistants et fonctionnalités d’IA intégrés côté serveur, sans exposer de clés.','Bot',5 where not exists (select 1 from public.services where title='Intégration IA');
insert into public.services (title,description,icon,position) select 'Prototype MVP','Une première version utilisable pour tester votre idée avec de vrais utilisateurs.','Rocket',6 where not exists (select 1 from public.services where title='Prototype MVP');
insert into public.services (title,description,icon,position) select 'Accompagnement technique','Un regard technique sur votre projet : architecture, choix d’outils, revue de code.','Wrench',7 where not exists (select 1 from public.services where title='Accompagnement technique');
insert into public.services (title,description,icon,position) select 'Formation','Des formations pour particuliers, étudiants ou équipes, centrées sur des projets concrets.','GraduationCap',8 where not exists (select 1 from public.services where title='Formation');
insert into public.services (title,description,icon,position) select 'Workshop','Des sessions pratiques sur un thème précis : HTML/CSS, Supabase, IA, Vibe Coding, pitch.','Users',9 where not exists (select 1 from public.services where title='Workshop');
insert into public.workshops (slug,title,description,format,status) values ('workshop-html-css','Workshop HTML / CSS','Construire une page responsive de zéro en une session pratique.','En ligne','A_VENIR') on conflict (slug) do nothing;
insert into public.workshops (slug,title,description,format,status) values ('workshop-javascript','Workshop JavaScript','Logique, DOM et événements à travers un mini-projet.','En ligne','A_VENIR') on conflict (slug) do nothing;
insert into public.workshops (slug,title,description,format,status) values ('workshop-supabase','Workshop Supabase','Tables, Auth et RLS : sécuriser une application.','En ligne','A_VENIR') on conflict (slug) do nothing;
insert into public.workshops (slug,title,description,format,status) values ('workshop-ia','Workshop IA','Intégrer une fonctionnalité d’IA dans une application web.','En ligne','A_VENIR') on conflict (slug) do nothing;
insert into public.workshops (slug,title,description,format,status) values ('workshop-vibe-coding','Workshop Vibe Coding','Construire avec l’IA sans perdre la compréhension du code.','En ligne ou présentiel','A_VENIR') on conflict (slug) do nothing;
insert into public.workshops (slug,title,description,format,status) values ('session-pitch','Session Pitch','Structurer et répéter un pitch de projet.','En ligne ou présentiel','A_VENIR') on conflict (slug) do nothing;
insert into public.workshops (slug,title,description,format,status) values ('bootcamp-creation-d-application','Bootcamp création d’application','Du cahier des charges au déploiement, en équipe.','Présentiel ou hybride','A_VENIR') on conflict (slug) do nothing;
insert into public.workshops (slug,title,description,format,status) values ('live-debugging','Live debugging','Déboguer en direct de vrais problèmes d’apprenants.','En ligne','A_VENIR') on conflict (slug) do nothing;
insert into public.resources (title,description,category,kind) select 'Checklist : structure d’une page HTML','Les balises sémantiques essentielles et un squelette de page.','HTML','Cheatsheet' where not exists (select 1 from public.resources where title='Checklist : structure d’une page HTML');
insert into public.resources (title,description,category,kind) select 'Flexbox & Grid : aide-mémoire','Les propriétés à connaître pour aligner et disposer.','CSS','Cheatsheet' where not exists (select 1 from public.resources where title='Flexbox & Grid : aide-mémoire');
insert into public.resources (title,description,category,kind) select 'Snippets JavaScript du quotidien','fetch, DOM, tableaux : les patterns les plus utilisés.','JavaScript','Snippets' where not exists (select 1 from public.resources where title='Snippets JavaScript du quotidien');
insert into public.resources (title,description,category,kind) select 'Template : composant React + TypeScript','Un squelette typé de composant avec props et état.','React','Templates' where not exists (select 1 from public.resources where title='Template : composant React + TypeScript');
insert into public.resources (title,description,category,kind) select 'Guide : typer une application React','Props, état, événements et réponses d’API.','TypeScript','Tutoriels' where not exists (select 1 from public.resources where title='Guide : typer une application React');
insert into public.resources (title,description,category,kind) select 'Python : les structures de données','Listes, dictionnaires, ensembles, tuples.','Python','Cheatsheet' where not exists (select 1 from public.resources where title='Python : les structures de données');
insert into public.resources (title,description,category,kind) select 'Modèle de politiques RLS','Politiques types : propriétaire, admin, lecture publique.','Supabase','Templates' where not exists (select 1 from public.resources where title='Modèle de politiques RLS');
insert into public.resources (title,description,category,kind) select 'Bibliothèque de prompts pour développeurs','Expliquer du code, générer des tests, relire une fonction.','IA','Prompts' where not exists (select 1 from public.resources where title='Bibliothèque de prompts pour développeurs');
insert into public.resources (title,description,category,kind) select 'Prompts de Vibe Coding','Les prompts du Vibe Coding Lab, à adapter à ton projet.','Vibe Coding','Prompts' where not exists (select 1 from public.resources where title='Prompts de Vibe Coding');
insert into public.resources (title,description,category,kind) select 'Git/GitHub : commandes essentielles','init, add, commit, branch, merge, push.','Git/GitHub','Cheatsheet' where not exists (select 1 from public.resources where title='Git/GitHub : commandes essentielles');
insert into public.resources (title,description,category,kind) select 'Checklist de déploiement','Variables, build, routes, HTTPS, vérifications.','Déploiement','Templates' where not exists (select 1 from public.resources where title='Checklist de déploiement');
insert into public.resources (title,description,category,kind) select 'Canevas de business model','Un canevas simple pour cadrer son modèle.','Entrepreneuriat','Templates' where not exists (select 1 from public.resources where title='Canevas de business model');
insert into public.resources (title,description,category,kind) select 'Structure d’un pitch en 3 minutes','Le plan type d’un pitch de hackathon.','Pitch','Templates' where not exists (select 1 from public.resources where title='Structure d’un pitch en 3 minutes');
insert into public.projects (slug,title,category,summary,status,role,is_published) values ('agriflow-rdc','AgriFlow RDC','Plateformes','Plateforme agricole en RDC : marketplace, dashboard producteur, commandes, paiement et livraison.','En cours','Conception et développement',false) on conflict (slug) do nothing;
insert into public.project_technologies (project_id,name) select id,'React' from public.projects where slug='agriflow-rdc' on conflict do nothing;
insert into public.project_technologies (project_id,name) select id,'TypeScript' from public.projects where slug='agriflow-rdc' on conflict do nothing;
insert into public.project_technologies (project_id,name) select id,'Supabase' from public.projects where slug='agriflow-rdc' on conflict do nothing;
insert into public.project_technologies (project_id,name) select id,'CinetPay' from public.projects where slug='agriflow-rdc' on conflict do nothing;
insert into public.projects (slug,title,category,summary,status,role,is_published) values ('wedding-moments','Wedding Moments','Applications web','SaaS multi-couples d’invitations de mariage numériques, avec une page publique par couple.','En cours','Conception et développement',false) on conflict (slug) do nothing;
insert into public.project_technologies (project_id,name) select id,'React' from public.projects where slug='wedding-moments' on conflict do nothing;
insert into public.project_technologies (project_id,name) select id,'TypeScript' from public.projects where slug='wedding-moments' on conflict do nothing;
insert into public.project_technologies (project_id,name) select id,'Vite' from public.projects where slug='wedding-moments' on conflict do nothing;
insert into public.project_technologies (project_id,name) select id,'Tailwind CSS' from public.projects where slug='wedding-moments' on conflict do nothing;
insert into public.project_technologies (project_id,name) select id,'Supabase' from public.projects where slug='wedding-moments' on conflict do nothing;
insert into public.settings (key,value) values ('identity.name','JOE DEV CODES'),('identity.title','Développeur • Formateur • Étudiant • Entrepreneur') on conflict (key) do nothing;

-- ════════ PARTIE 3/8 : 20261001090000_testimonials_repair.sql ════════
/*
  # JOE DEV CODES — témoignages (correctif idempotent)

  Garantit que public.testimonials existe avec le schéma attendu par le frontend :
  id, name, role, avatar_url, content, is_published, created_at, updated_at.

  - Base neuve : la table est créée ici si elle manque.
  - Base initialisée avec l'ancien schéma (author_name / author_role) : colonnes renommées, avatar_url ajoutée.
  - Ré-exécutable sans erreur. Nécessite 20260930100000_joe_dev_codes_schema.sql (fonctions is_staff, set_updated_at, log_audit).
*/

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  avatar_url text,
  content text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='testimonials' and column_name='author_name')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='testimonials' and column_name='name') then
    alter table public.testimonials rename column author_name to name;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='testimonials' and column_name='author_role')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='testimonials' and column_name='role') then
    alter table public.testimonials rename column author_role to role;
  end if;
end $$;

alter table public.testimonials add column if not exists avatar_url text;

drop trigger if exists testimonials_updated on public.testimonials;
create trigger testimonials_updated before update on public.testimonials
  for each row execute function public.set_updated_at();

drop trigger if exists testimonials_audit on public.testimonials;
create trigger testimonials_audit after insert or update or delete on public.testimonials
  for each row execute function public.log_audit();

alter table public.testimonials enable row level security;

drop policy if exists testimonials_read on public.testimonials;
create policy testimonials_read on public.testimonials for select
  using (is_published or public.is_staff(auth.uid()));

drop policy if exists testimonials_write on public.testimonials;
create policy testimonials_write on public.testimonials for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.testimonials to authenticated;

-- Recharge le cache de schéma de PostgREST (évite un 404 résiduel juste après la migration)
notify pgrst, 'reload schema';

-- ════════ PARTIE 4/8 : 20261001100000_production_hardening.sql ════════
/*
  # JOE DEV CODES — passe de production

  1. Formations « bientôt disponibles » (courses.coming_soon) visibles publiquement sans être publiées.
  2. course_waitlist : « Me prévenir » (email uniquement, sans doublon, lecture réservée au staff).
  3. notification_preferences + notifications.dedupe_key (une même notification n'est jamais créée deux fois).
  4. Trigger de publication : BROUILLON → PUBLIEE crée les notifications in-app + journal d'audit.
     Les emails ne partent JAMAIS d'ici : voir l'Edge Function notify-course-published.
  5. Durcissement RLS (voir commentaires « RLS: » ci-dessous).

  Ré-exécutable. Nécessite 20260930100000_joe_dev_codes_schema.sql.
*/

-- ───────────── 1. Formations annoncées ─────────────
alter table public.courses add column if not exists coming_soon boolean not null default false;

-- ───────────── 2. Liste d'attente ─────────────
create table if not exists public.course_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 320 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  notified_at timestamptz
);
-- Empêche les doublons (insensible à la casse)
create unique index if not exists course_waitlist_unique on public.course_waitlist (course_id, lower(email));
create index if not exists course_waitlist_pending on public.course_waitlist (course_id) where notified_at is null;

-- ───────────── 3. Préférences et dé-duplication des notifications ─────────────
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  in_app_new_courses boolean not null default true,
  email_new_courses boolean not null default true,
  updated_at timestamptz not null default now()
);
drop trigger if exists notification_preferences_updated on public.notification_preferences;
create trigger notification_preferences_updated before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notifications add column if not exists dedupe_key text;
create unique index if not exists notifications_dedupe on public.notifications (user_id, dedupe_key) where dedupe_key is not null;

-- ───────────── 4. Publication d'une formation ─────────────
create or replace function public.on_course_published() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'PUBLIEE' and old.status is distinct from 'PUBLIEE' then
    -- Une formation publiée n'est plus « bientôt disponible »
    new.coming_soon := false;
  end if;
  return new;
end; $$;

drop trigger if exists courses_publish_before on public.courses;
create trigger courses_publish_before before update on public.courses
  for each row execute function public.on_course_published();

create or replace function public.notify_course_published() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'PUBLIEE' and old.status is distinct from 'PUBLIEE' then
    -- Notifications in-app : inscrits à la liste d'attente (comptes existants) + apprenants n'ayant pas désactivé l'option.
    -- dedupe_key + index unique : relancer ou re-publier ne crée jamais de doublon.
    insert into public.notifications (user_id, title, body, dedupe_key)
    select p.id,
           'Nouvelle formation disponible',
           '« ' || new.title || ' » est maintenant disponible. Tu peux t’y inscrire dès maintenant.',
           'course_published:' || new.id::text
    from public.profiles p
    left join public.notification_preferences np on np.user_id = p.id
    where p.role = 'LEARNER'
      and (
        coalesce(np.in_app_new_courses, true)
        or exists (select 1 from public.course_waitlist w where w.course_id = new.id and lower(w.email) = lower(p.email))
      )
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

    insert into public.audit_logs (user_id, action, entity, entity_id)
    values (auth.uid(), 'PUBLISH', 'courses', new.id::text);
  end if;
  return null;
end; $$;

drop trigger if exists courses_publish_after on public.courses;
create trigger courses_publish_after after update on public.courses
  for each row execute function public.notify_course_published();

-- ───────────── 5. RLS ─────────────
alter table public.course_waitlist enable row level security;
alter table public.notification_preferences enable row level security;

-- Policies existantes que ce fichier remplace (relançable)
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and (
      (tablename = 'course_waitlist') or (tablename = 'notification_preferences') or
      (tablename = 'courses' and policyname in ('courses_read','courses_write')) or
      (tablename = 'profiles' and policyname = 'profiles_select') or
      (tablename = 'lesson_resources') or
      (tablename = 'lesson_progress' and policyname = 'progress_insert') or
      (tablename = 'lesson_progress' and policyname = 'progress_select') or
      (tablename = 'enrollments' and policyname = 'enrollments_select') or
      (tablename = 'certificates' and policyname = 'certificates_select') or
      (tablename = 'settings' and policyname = 'settings_read') or
      (tablename = 'contact_messages' and policyname = 'contact_insert') or
      (tablename in ('projects','project_technologies','services','testimonials') and policyname like '%\_write') or
      (tablename in ('projects','services','testimonials') and policyname like '%\_read') or
      (tablename = 'project_technologies' and policyname = 'project_tech_read')
    )
  loop execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename); end loop;
end $$;

-- Formations : publiques si publiées OU annoncées ; jamais les archivées. Écriture : staff (admin + instructeur).
create policy courses_read on public.courses for select
  using ((status = 'PUBLIEE') or (coming_soon and status = 'BROUILLON') or public.is_staff(auth.uid()));
create policy courses_write on public.courses for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- RLS: un instructeur ne lit plus les données personnelles de tous les apprenants (profils, inscriptions,
-- progression, certificats). Seul l'ADMIN les voit. Chaque apprenant voit toujours les siennes.
create policy profiles_select on public.profiles for select to authenticated
  using (auth.uid() = id or public.is_admin(auth.uid()));
create policy enrollments_select on public.enrollments for select to authenticated
  using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy progress_select on public.lesson_progress for select to authenticated
  using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy certificates_select on public.certificates for select to authenticated
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- RLS: faille corrigée — on pouvait enregistrer la progression d'une leçon d'un AUTRE cours en la rattachant
-- à un cours où l'on est inscrit (et ainsi obtenir un certificat). La leçon doit appartenir au cours déclaré.
create policy progress_insert on public.lesson_progress for insert to authenticated with check (
  auth.uid() = user_id
  and exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.course_id = lesson_progress.course_id)
  and exists (select 1 from public.lessons l where l.id = lesson_progress.lesson_id and l.course_id = lesson_progress.course_id and l.is_published));

-- RLS: les ressources de leçon n'étaient lisibles par « tout utilisateur connecté », y compris pour des cours
-- non publiés ou auxquels il n'est pas inscrit. Désormais : staff ou inscrit au cours de la leçon.
create policy lesson_resources_read on public.lesson_resources for select to authenticated using (
  public.is_staff(auth.uid())
  or exists (select 1 from public.lessons l join public.enrollments e on e.course_id = l.course_id
             where l.id = lesson_resources.lesson_id and e.user_id = auth.uid()));
create policy lesson_resources_write on public.lesson_resources for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- RLS: settings était lisible en entier par le public. Seules les clés d'affichage du site le sont.
create policy settings_read on public.settings for select
  using (key like 'identity.%' or key like 'about.%' or key like 'site.%' or public.is_admin(auth.uid()));

-- RLS: portfolio, services, témoignages = vitrine gérée par l'ADMIN uniquement (pas l'instructeur).
create policy projects_read on public.projects for select using (is_published or public.is_admin(auth.uid()));
create policy projects_write on public.projects for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy project_tech_read on public.project_technologies for select using (
  exists (select 1 from public.projects p where p.id = project_id and (p.is_published or public.is_admin(auth.uid()))));
create policy project_tech_write on public.project_technologies for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy services_read on public.services for select using (is_published or public.is_admin(auth.uid()));
create policy services_write on public.services for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy testimonials_read on public.testimonials for select using (is_published or public.is_admin(auth.uid()));
create policy testimonials_write on public.testimonials for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Messages de contact : l'envoi public reste possible, avec validation de format côté base.
create policy contact_insert on public.contact_messages for insert to anon, authenticated with check (
  status = 'NOUVEAU' and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Liste d'attente : inscription ouverte (visiteurs compris) uniquement pour une formation annoncée ou non publiée ;
-- lecture/suppression réservées à l'ADMIN. Aucun SELECT public : on ne peut pas énumérer les emails.
create policy waitlist_insert on public.course_waitlist for insert to anon, authenticated with check (
  notified_at is null
  and exists (select 1 from public.courses c where c.id = course_id and c.status <> 'ARCHIVEE'));
create policy waitlist_select on public.course_waitlist for select to authenticated using (public.is_admin(auth.uid()));
create policy waitlist_delete on public.course_waitlist for delete to authenticated using (public.is_admin(auth.uid()));

-- Préférences : chacun gère les siennes
create policy notif_prefs_own on public.notification_preferences for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- RLS: un utilisateur ne peut pas non plus modifier l'email stocké dans son profil (il doit rester celui de auth.users).
create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    if new.role is distinct from old.role then raise exception 'Modification du rôle non autorisée'; end if;
    if new.email is distinct from old.email then raise exception 'Modification de l''email non autorisée'; end if;
  end if;
  return new;
end; $$;

-- Stockage : fichiers de leçons (bucket privé) lisibles par le staff ou les apprenants inscrits au cours.
-- Convention de nommage des objets : « <course_id>/<fichier> ». Téléchargement via URL signée (createSignedUrl).
drop policy if exists "auth read lesson files" on storage.objects;
create policy "auth read lesson files" on storage.objects for select to authenticated using (
  bucket_id = 'lesson-files' and (
    public.is_staff(auth.uid())
    or exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.course_id::text = (storage.foldername(name))[1])));

-- Droits de table : le rôle anon n'a besoin que de lire le contenu public et d'insérer contact / liste d'attente.
grant insert on public.course_waitlist to anon, authenticated;
grant select, delete on public.course_waitlist to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;

notify pgrst, 'reload schema';

-- Projets : trois états affichables (Disponible / En développement / Projet privé).
alter table public.projects alter column status set default 'En développement';
update public.projects set status = 'En développement' where status in ('En cours', 'Prototype');
update public.projects set status = 'Disponible' where status in ('Livré', 'Terminé');

-- Contact : champ « sujet » (le type de demande Apprendre / Créer un projet / Collaborer reste dans request_type).
alter table public.contact_messages add column if not exists subject text check (subject is null or char_length(subject) <= 200);
notify pgrst, 'reload schema';

-- ════════ PARTIE 5/8 : 20261001110000_cv_profile.sql ════════
/*
  # JOE DEV CODES — CV & profil professionnel

  Tables : cv_profiles (une seule ligne), cv_skills, cv_experiences, cv_education,
           cv_certifications, cv_achievements, cv_languages.
  Réutilisé : projects (+ show_in_cv / cv_position), courses (+ show_in_cv), services, settings.

  Sécurité (RLS) :
   - Écriture et lecture directe : ADMIN uniquement (is_admin). Ni anon, ni learner, ni instructor.
   - Le public ne lit JAMAIS ces tables. Il appelle public.get_public_cv() (SECURITY DEFINER) qui :
       * renvoie NULL si le CV n'est pas publié (is_public = false) ;
       * ne renvoie que les lignes is_visible, les projets is_published ET show_in_cv ;
       * n'inclut l'email / le téléphone que si show_email / show_phone sont activés.
   - Aucune clé service_role côté frontend.

  Ré-exécutable. Nécessite 20260930100000_joe_dev_codes_schema.sql (is_admin, set_updated_at).
*/

-- ───────────── Profil (une seule ligne) ─────────────
create table if not exists public.cv_profiles (
  id uuid primary key default gen_random_uuid(),
  first_name text not null default '' check (char_length(first_name) <= 100),
  last_name text not null default '' check (char_length(last_name) <= 100),
  display_name text not null default '' check (char_length(display_name) <= 150),
  photo_url text,
  headline text not null default 'Développeur • Formateur • Étudiant • Entrepreneur' check (char_length(headline) <= 200),
  location text,
  email text check (email is null or char_length(email) <= 320),
  phone text check (phone is null or char_length(phone) <= 40),
  website text,
  github text,
  linkedin text,
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 12),
  summary_short text not null default '' check (char_length(summary_short) <= 600),
  summary_long text not null default '' check (char_length(summary_long) <= 4000),
  show_summary boolean not null default true,
  show_email boolean not null default false,
  show_phone boolean not null default false,
  show_services boolean not null default false,
  show_qr boolean not null default true,
  template text not null default 'minimal' check (template in ('minimal','modern','executive','developer')),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Une seule ligne autorisée
create unique index if not exists cv_profiles_singleton on public.cv_profiles ((true));

-- ───────────── Sections ─────────────
create table if not exists public.cv_skills (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'Autres' check (char_length(category) between 1 and 80),
  name text not null check (char_length(name) between 1 and 80),
  level text check (level is null or char_length(level) <= 40),
  position int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cv_experiences (
  id uuid primary key default gen_random_uuid(),
  role text not null check (char_length(role) between 1 and 150),
  organization text not null default '' check (char_length(organization) <= 150),
  location text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text not null default '' check (char_length(description) <= 3000),
  achievements text[] not null default '{}',
  technologies text[] not null default '{}',
  position int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cv_education (
  id uuid primary key default gen_random_uuid(),
  institution text not null check (char_length(institution) between 1 and 200),
  degree text not null default '' check (char_length(degree) <= 200),
  field text,
  location text,
  start_date date,
  end_date date,
  description text not null default '' check (char_length(description) <= 2000),
  position int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cv_certifications (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  issuer text not null default '' check (char_length(issuer) <= 200),
  issued_on date,
  credential_id text,
  url text,
  description text not null default '' check (char_length(description) <= 1500),
  position int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cv_achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  event text,
  year int check (year is null or year between 1950 and 2100),
  description text not null default '' check (char_length(description) <= 2000),
  result text,
  url text,
  image_url text,
  position int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cv_languages (
  id uuid primary key default gen_random_uuid(),
  language text not null check (char_length(language) between 1 and 80),
  level text not null default '' check (char_length(level) <= 60),
  position int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────── Réutilisation de projects / courses ─────────────
alter table public.projects add column if not exists show_in_cv boolean not null default false;
alter table public.projects add column if not exists cv_position int not null default 0;
alter table public.courses add column if not exists show_in_cv boolean not null default false;

-- ───────────── Triggers updated_at ─────────────
do $$ declare t text; begin
  foreach t in array array['cv_profiles','cv_skills','cv_experiences','cv_education','cv_certifications','cv_achievements','cv_languages'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated', t);
  end loop;
end $$;

-- ───────────── RLS : ADMIN uniquement ─────────────
do $$ declare t text; r record; begin
  foreach t in array array['cv_profiles','cv_skills','cv_experiences','cv_education','cv_certifications','cv_achievements','cv_languages'] loop
    execute format('alter table public.%I enable row level security', t);
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', r.policyname, t);
    end loop;
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()))', t || '_admin', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ───────────── Lecture publique contrôlée ─────────────
-- Léger : sert à afficher/masquer les liens « CV » (navbar, accueil) sans charger le CV entier.
create or replace function public.cv_is_published() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_public from public.cv_profiles limit 1), false)
$$;

create or replace function public.get_public_cv() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  p public.cv_profiles;
  out jsonb;
  last_update timestamptz;
begin
  select * into p from public.cv_profiles limit 1;
  if not found or not p.is_public then return null; end if;

  select greatest(p.updated_at,
    coalesce((select max(updated_at) from public.cv_skills), p.updated_at),
    coalesce((select max(updated_at) from public.cv_experiences), p.updated_at),
    coalesce((select max(updated_at) from public.cv_education), p.updated_at),
    coalesce((select max(updated_at) from public.cv_certifications), p.updated_at),
    coalesce((select max(updated_at) from public.cv_achievements), p.updated_at),
    coalesce((select max(updated_at) from public.cv_languages), p.updated_at),
    coalesce((select max(updated_at) from public.projects where show_in_cv and is_published), p.updated_at))
  into last_update;

  out := jsonb_build_object(
    'profile', jsonb_build_object(
      'first_name', p.first_name, 'last_name', p.last_name, 'display_name', p.display_name,
      'photo_url', p.photo_url, 'headline', p.headline, 'location', p.location,
      'email', case when p.show_email then p.email else null end,
      'phone', case when p.show_phone then p.phone else null end,
      'website', p.website, 'github', p.github, 'linkedin', p.linkedin, 'links', p.links,
      'summary_short', case when p.show_summary then p.summary_short else '' end,
      'summary_long', case when p.show_summary then p.summary_long else '' end,
      'show_summary', p.show_summary, 'show_services', p.show_services, 'show_qr', p.show_qr,
      'template', p.template),
    'skills', coalesce((select jsonb_agg(to_jsonb(s) - 'created_at' - 'is_visible' order by s.position, s.created_at) from public.cv_skills s where s.is_visible), '[]'::jsonb),
    'experiences', coalesce((select jsonb_agg(to_jsonb(e) - 'created_at' - 'is_visible' order by e.position, e.start_date desc nulls last) from public.cv_experiences e where e.is_visible), '[]'::jsonb),
    'education', coalesce((select jsonb_agg(to_jsonb(e) - 'created_at' - 'is_visible' order by e.position, e.start_date desc nulls last) from public.cv_education e where e.is_visible), '[]'::jsonb),
    'certifications', coalesce((select jsonb_agg(to_jsonb(c) - 'created_at' - 'is_visible' order by c.position, c.issued_on desc nulls last) from public.cv_certifications c where c.is_visible), '[]'::jsonb),
    'achievements', coalesce((select jsonb_agg(to_jsonb(a) - 'created_at' - 'is_visible' order by a.position, a.year desc nulls last) from public.cv_achievements a where a.is_visible), '[]'::jsonb),
    'languages', coalesce((select jsonb_agg(to_jsonb(l) - 'created_at' - 'is_visible' order by l.position, l.created_at) from public.cv_languages l where l.is_visible), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pr.id, 'slug', pr.slug, 'title', pr.title, 'summary', pr.summary, 'role', pr.role, 'status', pr.status,
        'demo_url', pr.demo_url, 'github_url', pr.github_url, 'image_url', pr.image_url, 'results', pr.results,
        'technologies', coalesce((select jsonb_agg(t.name order by t.name) from public.project_technologies t where t.project_id = pr.id), '[]'::jsonb)
      ) order by pr.cv_position, pr.project_date desc nulls last, pr.created_at desc)
      from public.projects pr where pr.show_in_cv and pr.is_published), '[]'::jsonb),
    'trainer_courses', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'slug', c.slug, 'title', c.title, 'category', c.category, 'level', c.level) order by c.position, c.created_at)
      from public.courses c where c.show_in_cv and c.status = 'PUBLIEE'), '[]'::jsonb),
    'services', case when p.show_services then coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title) order by s.position, s.created_at)
      from public.services s where s.is_published), '[]'::jsonb) else '[]'::jsonb end,
    'updated_at', last_update
  );
  return out;
end $$;

revoke all on function public.get_public_cv() from public;
revoke all on function public.cv_is_published() from public;
grant execute on function public.get_public_cv() to anon, authenticated;
grant execute on function public.cv_is_published() to anon, authenticated;

notify pgrst, 'reload schema';

-- ════════ PARTIE 6/8 : 20261003100000_training_presentiel.sql ════════
/*
  # JOE DEV CODES — Formations PRÉSENTIELLES

  Principe : on ne crée pas un second système de formations.
   - `courses` reste la fiche d'une formation (catalogue) : on lui ajoute le mode (PRESENTIEL par défaut),
     le matériel nécessaire et les informations pratiques.
   - `training_sessions`      : une session présentielle (dates, lieu, horaires, capacité, statut, critères de certificat).
   - `training_registrations` : inscription d'un utilisateur à une session (statuts, validation, liste).
   - `training_announcements` : annonces (visibilité PUBLIC / PARTICIPANTS / FORMATEURS / ADMIN).
   - `training_attendance`    : présences par jour (écriture UNIQUEMENT côté serveur via fonctions).
   - `certificates` (existante) est ÉTENDUE : numéro unique JDC-AAAA-XXXXXX, instantané des informations,
     statut VALIDE / REVOQUE. `certificate_verifications` journalise les vérifications publiques.
   - `notifications` (existante) reçoit `link` et `kind` ; la dé-duplication `dedupe_key` est réutilisée.

  Sécurité :
   - RLS partout. Le public ne lit JAMAIS les inscriptions, présences ou certificats : il appelle
     verify_certificate(), get_published_list(), training_seats() (SECURITY DEFINER, champs minimaux).
   - Un participant ne peut pas s'inscrire hors fonction serveur, ni se déclarer présent, ni se valider.
   - Aucune clé service_role côté frontend.

  Ré-exécutable. Nécessite 20260930100000_joe_dev_codes_schema.sql et 20261001100000_production_hardening.sql.
*/

-- ───────────── 1. Extension de `courses` ─────────────
alter table public.courses add column if not exists delivery_mode text not null default 'PRESENTIEL'
  check (delivery_mode in ('PRESENTIEL','EN_LIGNE','HYBRIDE'));
alter table public.courses add column if not exists materials text[] not null default '{}';
alter table public.courses add column if not exists practical_info text;
alter table public.courses add column if not exists trainer_name text check (trainer_name is null or char_length(trainer_name) <= 150);

-- ───────────── 2. Notifications : lien + type ─────────────
alter table public.notifications add column if not exists link text check (link is null or (char_length(link) <= 300 and link like '/%'));
alter table public.notifications add column if not exists kind text check (kind is null or char_length(kind) <= 40);

-- ───────────── 3. Sessions ─────────────
create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text check (title is null or char_length(title) <= 200),
  starts_on date not null,
  ends_on date not null,
  daily_start time,
  daily_end time,
  schedule_note text check (schedule_note is null or char_length(schedule_note) <= 500),
  location text not null check (char_length(location) between 1 and 300),
  address text check (address is null or char_length(address) <= 500),
  trainer_id uuid references public.profiles(id) on delete set null,
  trainer_name text check (trainer_name is null or char_length(trainer_name) <= 150),
  capacity int not null check (capacity > 0 and capacity <= 100000),
  status text not null default 'BROUILLON'
    check (status in ('BROUILLON','BIENTOT','OUVERT','FERME','EN_COURS','TERMINEE','ANNULEE')),
  -- Conditions d'obtention du certificat, définies par l'administrateur (aucune règle arbitraire par défaut)
  min_attendance_pct int check (min_attendance_pct is null or min_attendance_pct between 1 and 100),
  requires_final_validation boolean not null default true,
  requires_final_project boolean not null default false,
  requires_evaluation boolean not null default false,
  -- Publication de la liste des participants
  list_status text not null default 'PRIVEE' check (list_status in ('PRIVEE','PUBLIEE')),
  list_visibility text not null default 'PARTICIPANTS' check (list_visibility in ('PUBLIC','PARTICIPANTS')),
  list_published_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (daily_start is null or daily_end is null or daily_end > daily_start)
);
create index if not exists training_sessions_course_idx on public.training_sessions(course_id, starts_on);
create index if not exists training_sessions_status_idx on public.training_sessions(status);
create index if not exists training_sessions_trainer_idx on public.training_sessions(trainer_id) where trainer_id is not null;

-- ───────────── 4. Inscriptions ─────────────
create table if not exists public.training_registrations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 320),
  phone text check (phone is null or char_length(phone) <= 40),
  status text not null default 'EN_ATTENTE' check (status in ('EN_ATTENTE','CONFIRMEE','REFUSEE','ANNULEE','PRESENT')),
  registered_at timestamptz not null default now(),
  status_changed_at timestamptz,
  listed boolean not null default false,
  validation_status text not null default 'A_VALIDER' check (validation_status in ('A_VALIDER','VALIDE','NON_VALIDE')),
  validated_at timestamptz,
  validated_by uuid references public.profiles(id) on delete set null,
  final_project_ok boolean not null default false,
  evaluation_ok boolean not null default false,
  -- Jeton secret du QR code de pointage (lisible par son propriétaire, utilisé par le staff côté serveur)
  checkin_token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, user_id)
);
create index if not exists training_registrations_session_idx on public.training_registrations(session_id, status);
create index if not exists training_registrations_user_idx on public.training_registrations(user_id);
create index if not exists training_registrations_course_idx on public.training_registrations(course_id);

-- ───────────── 5. Annonces ─────────────
create table if not exists public.training_announcements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  session_id uuid references public.training_sessions(id) on delete cascade,
  kind text not null default 'INFORMATION' check (kind in (
    'INFORMATION','CHANGEMENT_SALLE','CHANGEMENT_HORAIRE','RAPPEL','OUVERTURE_INSCRIPTIONS','FERMETURE_INSCRIPTIONS',
    'LISTE_PUBLIEE','MATERIEL','REPORT','ANNULATION','RESULTATS','CERTIFICATS')),
  title text not null check (char_length(title) between 1 and 200),
  content text not null check (char_length(content) between 1 and 5000),
  image_url text check (image_url is null or (char_length(image_url) <= 1000 and image_url ~* '^https?://')),
  visibility text not null default 'PARTICIPANTS' check (visibility in ('PUBLIC','PARTICIPANTS','FORMATEURS','ADMIN')),
  status text not null default 'BROUILLON' check (status in ('BROUILLON','PUBLIEE','ARCHIVEE')),
  published_at timestamptz,
  expires_at timestamptz,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- « Participants » n'a de sens que si on sait de quelle formation il s'agit
  check (visibility <> 'PARTICIPANTS' or course_id is not null)
);
create index if not exists training_announcements_course_idx on public.training_announcements(course_id, status);
create index if not exists training_announcements_session_idx on public.training_announcements(session_id) where session_id is not null;

-- ───────────── 6. Présences ─────────────
create table if not exists public.training_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  registration_id uuid not null references public.training_registrations(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('PRESENT','ABSENT','RETARD')),
  method text not null default 'MANUEL' check (method in ('MANUEL','QR')),
  marked_by uuid references public.profiles(id) on delete set null,
  marked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_id, attendance_date)
);
create index if not exists training_attendance_session_idx on public.training_attendance(session_id, attendance_date);

-- ───────────── 7. Certificats : extension de la table existante ─────────────
alter table public.certificates add column if not exists certificate_number text;
alter table public.certificates add column if not exists registration_id uuid references public.training_registrations(id) on delete set null;
alter table public.certificates add column if not exists session_id uuid references public.training_sessions(id) on delete set null;
alter table public.certificates add column if not exists status text not null default 'VALIDE' check (status in ('VALIDE','REVOQUE'));
alter table public.certificates add column if not exists revoked_at timestamptz;
alter table public.certificates add column if not exists revoked_reason text check (revoked_reason is null or char_length(revoked_reason) <= 500);
alter table public.certificates add column if not exists revoked_by uuid references public.profiles(id) on delete set null;
alter table public.certificates add column if not exists issued_by uuid references public.profiles(id) on delete set null;
-- Instantané : le certificat ne change plus si la formation ou le profil sont modifiés ensuite
alter table public.certificates add column if not exists holder_name text;
alter table public.certificates add column if not exists course_title text;
alter table public.certificates add column if not exists period_start date;
alter table public.certificates add column if not exists period_end date;
alter table public.certificates add column if not exists duration_label text;
alter table public.certificates add column if not exists location text;
alter table public.certificates add column if not exists trainer_name text;

-- (user_id, course_id) unique ne convient plus : un participant peut suivre deux sessions d'une même formation.
alter table public.certificates drop constraint if exists certificates_user_id_course_id_key;
create unique index if not exists certificates_online_unique on public.certificates(user_id, course_id) where registration_id is null;
create unique index if not exists certificates_registration_unique on public.certificates(registration_id) where registration_id is not null;
create index if not exists certificates_user_idx on public.certificates(user_id);
create index if not exists certificates_session_idx on public.certificates(session_id) where session_id is not null;

create table if not exists public.certificate_verifications (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  result text not null check (result in ('VALIDE','REVOQUE')),
  verified_at timestamptz not null default now()
);
create index if not exists certificate_verifications_cert_idx on public.certificate_verifications(certificate_id, verified_at desc);

-- ───────────── 8. Fonctions utilitaires ─────────────
-- Staff d'une session : l'ADMIN, ou l'instructeur désigné comme formateur de la session.
create or replace function public.is_session_staff(p_session uuid, uid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select public.is_admin(uid) or exists (
    select 1 from public.training_sessions s where s.id = p_session and s.trainer_id = uid and public.is_staff(uid));
$$;


-- Participant actif d'une formation (ou d'une session précise) : fonction SECURITY DEFINER pour que la politique
-- des annonces ne dépende pas des droits de lecture de l'appelant sur training_registrations (anon n'en a aucun).
create or replace function public.is_training_participant(p_course uuid, p_session uuid, uid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select uid is not null and exists (
    select 1 from public.training_registrations r
    where r.user_id = uid and r.status in ('EN_ATTENTE','CONFIRMEE','PRESENT')
      and ((p_session is not null and r.session_id = p_session) or (p_session is null and r.course_id = p_course)));
$$;

-- Numéro unique JDC-AAAA-XXXXXX (6 caractères d'un alphabet sans ambiguïté, tirés d'UUID aléatoires).
-- L'unicité est garantie par l'index unique ; la boucle ne sert qu'à éviter l'erreur en cas de collision.
create or replace function public._new_certificate_number() returns text
language plpgsql volatile set search_path = public as $$
declare alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code text; n text; i int; hex text;
begin
  loop
    code := ''; hex := replace(gen_random_uuid()::text, '-', '');
    for i in 0..5 loop
      code := code || substr(alphabet, 1 + (get_byte(decode(substr(hex, i * 2 + 1, 2), 'hex'), 0) % 32), 1);
    end loop;
    n := 'JDC-' || extract(year from now())::int::text || '-' || code;
    exit when not exists (select 1 from public.certificates where certificate_number = n);
  end loop;
  return n;
end $$;

create or replace function public.certificates_before_insert() returns trigger
language plpgsql set search_path = public as $$
declare c record; p record;
begin
  if new.certificate_number is null then new.certificate_number := public._new_certificate_number(); end if;
  -- Certificats créés par l'ancien parcours (leçons terminées) : on remplit l'instantané
  if new.course_title is null then select title, duration into c from public.courses where id = new.course_id; new.course_title := c.title; new.duration_label := coalesce(new.duration_label, c.duration); end if;
  if new.holder_name is null then select full_name into p from public.profiles where id = new.user_id; new.holder_name := nullif(trim(coalesce(p.full_name, '')), ''); end if;
  return new;
end $$;
drop trigger if exists certificates_before_insert_trg on public.certificates;
create trigger certificates_before_insert_trg before insert on public.certificates
  for each row execute function public.certificates_before_insert();

-- Rattrapage des certificats existants (aucune ligne supprimée) : numéro + instantané.
update public.certificates c set
  certificate_number = coalesce(c.certificate_number, public._new_certificate_number()),
  course_title = coalesce(c.course_title, (select title from public.courses x where x.id = c.course_id)),
  duration_label = coalesce(c.duration_label, (select duration from public.courses x where x.id = c.course_id)),
  holder_name = coalesce(c.holder_name, nullif(trim(coalesce((select full_name from public.profiles p where p.id = c.user_id), '')), ''))
where c.certificate_number is null or c.course_title is null;
alter table public.certificates alter column certificate_number set not null;
create unique index if not exists certificates_number_unique on public.certificates(certificate_number);

-- Une formation dont des certificats ont été délivrés ne peut pas être supprimée (on l'archive).
create or replace function public.forbid_course_delete_with_certificates() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.certificates where course_id = old.id) then
    raise exception 'COURSE_HAS_CERTIFICATES';
  end if;
  return old;
end $$;
drop trigger if exists courses_no_delete_with_certs on public.courses;
create trigger courses_no_delete_with_certs before delete on public.courses
  for each row execute function public.forbid_course_delete_with_certificates();

-- ───────────── 9. Triggers : cohérence des données ─────────────
-- Inscriptions : course_id vient toujours de la session ; identité immuable ; capacité vérifiée côté serveur.
create or replace function public.registration_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.training_sessions; taken int; was_confirmed boolean := false; was_valid boolean := false; status_moved boolean := false;
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id or new.session_id is distinct from old.session_id then
      raise exception 'IMMUTABLE_REGISTRATION';
    end if;
    was_confirmed := old.status in ('CONFIRMEE','PRESENT');
    was_valid := old.validation_status = 'VALIDE';
    status_moved := new.status is distinct from old.status;
  end if;
  -- Verrou de ligne : deux confirmations simultanées ne peuvent pas dépasser la capacité.
  select * into s from public.training_sessions where id = new.session_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  new.course_id := s.course_id;
  if new.status in ('CONFIRMEE','PRESENT') and not was_confirmed then
    select count(*) into taken from public.training_registrations
      where session_id = new.session_id and status in ('CONFIRMEE','PRESENT') and id is distinct from new.id;
    if taken >= s.capacity then raise exception 'SESSION_FULL'; end if;
  end if;
  if status_moved then new.status_changed_at := now(); end if;
  if new.validation_status = 'VALIDE' and not was_valid then
    new.validated_at := now(); new.validated_by := coalesce(auth.uid(), new.validated_by);
  end if;
  return new;
end $$;
drop trigger if exists training_registrations_guard on public.training_registrations;
create trigger training_registrations_guard before insert or update on public.training_registrations
  for each row execute function public.registration_guard();

-- Présences : session_id toujours déduit de l'inscription.
create or replace function public.attendance_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select session_id into new.session_id from public.training_registrations where id = new.registration_id;
  if new.session_id is null then raise exception 'REGISTRATION_NOT_FOUND'; end if;
  return new;
end $$;
drop trigger if exists training_attendance_guard on public.training_attendance;
create trigger training_attendance_guard before insert or update on public.training_attendance
  for each row execute function public.attendance_guard();

-- Sessions : date de clôture.
create or replace function public.session_before_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'TERMINEE' and old.status <> 'TERMINEE' then new.completed_at := now();
  elsif new.status <> 'TERMINEE' and old.status = 'TERMINEE' then new.completed_at := null; end if;
  return new;
end $$;
drop trigger if exists training_sessions_before_update_trg on public.training_sessions;
create trigger training_sessions_before_update_trg before update on public.training_sessions
  for each row execute function public.session_before_update();

-- Annonces : auteur et date de publication posés côté serveur.
create or replace function public.announcement_before_write() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.author_id is null then new.author_id := auth.uid(); end if;
  if new.status = 'PUBLIEE' and new.published_at is null then new.published_at := now(); end if;
  if new.session_id is not null and new.course_id is null then
    select course_id into new.course_id from public.training_sessions where id = new.session_id;
  end if;
  return new;
end $$;
drop trigger if exists training_announcements_before_write_trg on public.training_announcements;
create trigger training_announcements_before_write_trg before insert or update on public.training_announcements
  for each row execute function public.announcement_before_write();

-- updated_at + journal d'audit sur les nouvelles tables
do $$ declare t text; begin
  foreach t in array array['training_sessions','training_registrations','training_announcements','training_attendance'] loop
    execute format('drop trigger if exists %I_updated on public.%I', t, t);
    execute format('create trigger %I_updated before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
  foreach t in array array['training_sessions','training_registrations','training_announcements','certificates'] loop
    execute format('drop trigger if exists %I_audit on public.%I', t, t);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.log_audit()', t, t);
  end loop;
end $$;

-- ───────────── 10. Notifications automatiques ─────────────
-- Annonce publiée → notification in-app pour les inscrits concernés (une seule fois : dedupe_key).
-- AUCUN email n'est envoyé ici : l'envoi d'emails reste le rôle d'une Edge Function configurée.
create or replace function public.notify_announcement_published() returns trigger
language plpgsql security definer set search_path = public as $$
declare c_title text;
begin
  if new.status <> 'PUBLIEE' then return null; end if;
  if tg_op = 'UPDATE' then
    if old.status = 'PUBLIEE' then return null; end if;
  end if;
  if new.expires_at is not null and new.expires_at <= now() then return null; end if;
  if new.course_id is null then return null; end if;
  select title into c_title from public.courses where id = new.course_id;
  if new.visibility in ('PUBLIC','PARTICIPANTS') then
    insert into public.notifications (user_id, title, body, link, kind, dedupe_key)
    select distinct r.user_id, 'Nouvelle annonce',
           'Une nouvelle information a été publiée concernant votre formation ' || coalesce(c_title, '') || '.',
           '/app/annonces/' || new.id::text, 'ANNOUNCEMENT', 'announcement:' || new.id::text
    from public.training_registrations r
    where r.status in ('EN_ATTENTE','CONFIRMEE','PRESENT')
      and ((new.session_id is not null and r.session_id = new.session_id) or (new.session_id is null and r.course_id = new.course_id))
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  elsif new.visibility = 'FORMATEURS' then
    insert into public.notifications (user_id, title, body, link, kind, dedupe_key)
    select distinct s.trainer_id, 'Nouvelle annonce',
           'Une nouvelle information a été publiée concernant la formation ' || coalesce(c_title, '') || '.',
           '/app/annonces/' || new.id::text, 'ANNOUNCEMENT', 'announcement:' || new.id::text
    from public.training_sessions s
    where s.trainer_id is not null and ((new.session_id is not null and s.id = new.session_id) or (new.session_id is null and s.course_id = new.course_id))
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;
  return null;
end $$;
drop trigger if exists training_announcements_notify on public.training_announcements;
create trigger training_announcements_notify after insert or update on public.training_announcements
  for each row execute function public.notify_announcement_published();

-- Changement de statut d'inscription (confirmée / refusée) → notification au participant.
create or replace function public.notify_registration_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare c_title text;
begin
  if new.status is not distinct from old.status or new.status not in ('CONFIRMEE','REFUSEE') then return null; end if;
  select c.title into c_title from public.courses c where c.id = new.course_id;
  insert into public.notifications (user_id, title, body, link, kind, dedupe_key) values (
    new.user_id,
    case new.status when 'CONFIRMEE' then 'Inscription confirmée' else 'Inscription non retenue' end,
    case new.status when 'CONFIRMEE' then 'Votre inscription à la formation « ' || coalesce(c_title, '') || ' » est confirmée.'
                    else 'Votre inscription à la formation « ' || coalesce(c_title, '') || ' » n’a pas été retenue.' end,
    '/app/formations/inscriptions/' || new.id::text, 'REGISTRATION', 'registration:' || new.id::text || ':' || new.status)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  return null;
end $$;
drop trigger if exists training_registrations_notify on public.training_registrations;
create trigger training_registrations_notify after update on public.training_registrations
  for each row execute function public.notify_registration_status();

-- ───────────── 11. Éligibilité et émission des certificats ─────────────
-- Interne : applique les critères définis par l'administrateur sur la session. Aucune règle implicite.
create or replace function public._training_eligibility(p_reg uuid) returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare r public.training_registrations; s public.training_sessions;
  reasons text[] := '{}'; held int; attended int; pct numeric;
begin
  select * into r from public.training_registrations where id = p_reg;
  if not found then return jsonb_build_object('eligible', false, 'reasons', jsonb_build_array('NOT_FOUND')); end if;
  select * into s from public.training_sessions where id = r.session_id;
  select count(distinct a.attendance_date) into held from public.training_attendance a where a.session_id = s.id;
  select count(*) into attended from public.training_attendance a where a.registration_id = r.id and a.status in ('PRESENT','RETARD');
  pct := case when held = 0 then 0 else round(attended * 100.0 / held, 1) end;
  if r.status not in ('CONFIRMEE','PRESENT') then reasons := array_append(reasons, 'NOT_CONFIRMED'); end if;
  if s.status <> 'TERMINEE' then reasons := array_append(reasons, 'SESSION_NOT_COMPLETED'); end if;
  if r.validation_status = 'NON_VALIDE' then reasons := array_append(reasons, 'REJECTED');
  elsif s.requires_final_validation and r.validation_status <> 'VALIDE' then reasons := array_append(reasons, 'NOT_VALIDATED'); end if;
  if s.min_attendance_pct is not null and pct < s.min_attendance_pct then reasons := array_append(reasons, 'ATTENDANCE_BELOW_MIN'); end if;
  if s.requires_final_project and not r.final_project_ok then reasons := array_append(reasons, 'FINAL_PROJECT_MISSING'); end if;
  if s.requires_evaluation and not r.evaluation_ok then reasons := array_append(reasons, 'EVALUATION_MISSING'); end if;
  return jsonb_build_object('eligible', cardinality(reasons) = 0, 'reasons', to_jsonb(reasons),
    'attendance_pct', pct, 'held_days', held, 'attended_days', attended);
end $$;

-- Interne : émet le certificat d'une inscription si elle est éligible. Jamais de doublon (même révoqué).
create or replace function public._issue_certificate(p_reg uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare r public.training_registrations; s public.training_sessions; c public.courses; cid uuid; existing uuid;
begin
  select id into existing from public.certificates where registration_id = p_reg;
  if existing is not null then return existing; end if;
  if not (public._training_eligibility(p_reg)->>'eligible')::boolean then return null; end if;
  select * into r from public.training_registrations where id = p_reg;
  select * into s from public.training_sessions where id = r.session_id;
  select * into c from public.courses where id = s.course_id;
  insert into public.certificates (user_id, course_id, registration_id, session_id, issued_by, holder_name, course_title,
                                   period_start, period_end, duration_label, location, trainer_name)
  values (r.user_id, s.course_id, r.id, s.id, auth.uid(), r.first_name || ' ' || upper(r.last_name), c.title,
          s.starts_on, s.ends_on, c.duration, s.location, coalesce(s.trainer_name, c.trainer_name))
  on conflict do nothing
  returning id into cid;
  if cid is null then select id into cid from public.certificates where registration_id = p_reg; return cid; end if;
  insert into public.notifications (user_id, title, body, link, kind, dedupe_key) values (
    r.user_id, 'Votre certificat est disponible 🎓',
    'Votre certificat pour la formation « ' || c.title || ' » est maintenant disponible.',
    '/app/certificats/' || cid::text, 'CERTIFICATE', 'certificate:' || cid::text)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  return cid;
end $$;

-- Session terminée → émission automatique pour tous les participants éligibles.
create or replace function public.session_completed_issue() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.status = 'TERMINEE' and old.status <> 'TERMINEE' then
    for r in select id from public.training_registrations where session_id = new.id and status in ('CONFIRMEE','PRESENT') loop
      perform public._issue_certificate(r.id);
    end loop;
  end if;
  return null;
end $$;
drop trigger if exists training_sessions_completed_trg on public.training_sessions;
create trigger training_sessions_completed_trg after update on public.training_sessions
  for each row execute function public.session_completed_issue();

-- Participant validé (ou critère rempli) alors que la session est déjà terminée → émission automatique.
create or replace function public.registration_eligibility_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.validation_status is distinct from old.validation_status or new.final_project_ok is distinct from old.final_project_ok
      or new.evaluation_ok is distinct from old.evaluation_ok or new.status is distinct from old.status)
     and exists (select 1 from public.training_sessions s where s.id = new.session_id and s.status = 'TERMINEE') then
    perform public._issue_certificate(new.id);
  end if;
  return null;
end $$;
drop trigger if exists training_registrations_issue on public.training_registrations;
create trigger training_registrations_issue after update on public.training_registrations
  for each row execute function public.registration_eligibility_changed();

-- ───────────── 12. Fonctions exposées (RPC) ─────────────
-- Places confirmées par session (agrégat public : aucune donnée personnelle).
create or replace function public.training_seats(p_session_ids uuid[]) returns table(session_id uuid, taken int)
language sql security definer stable set search_path = public as $$
  select s.id, (select count(*)::int from public.training_registrations r where r.session_id = s.id and r.status in ('CONFIRMEE','PRESENT'))
  from public.training_sessions s join public.courses c on c.id = s.course_id
  where s.id = any(p_session_ids) and s.status <> 'BROUILLON' and c.status = 'PUBLIEE';
$$;

-- Inscription : seule voie pour un participant. L'email est celui du compte (jamais fourni par le client).
create or replace function public.register_for_training_session(p_session_id uuid, p_first_name text, p_last_name text, p_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s public.training_sessions; c public.courses; r public.training_registrations;
  fn text := trim(coalesce(p_first_name, '')); ln text := trim(coalesce(p_last_name, '')); ph text := nullif(trim(coalesce(p_phone, '')), '');
  mail text; taken int; rid uuid; had_reg boolean := false;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(fn) not between 1 and 100 or char_length(ln) not between 1 and 100 then raise exception 'INVALID_NAME'; end if;
  if ph is not null and char_length(ph) > 40 then raise exception 'INVALID_PHONE'; end if;
  select * into s from public.training_sessions where id = p_session_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  select * into c from public.courses where id = s.course_id;
  if c.status <> 'PUBLIEE' or s.status <> 'OUVERT' then raise exception 'NOT_OPEN'; end if;
  select email into mail from public.profiles where id = uid;
  if mail is null or mail = '' then raise exception 'AUTH_REQUIRED'; end if;
  select * into r from public.training_registrations where session_id = s.id and user_id = uid;
  had_reg := found;
  if had_reg then
    if r.status in ('EN_ATTENTE','CONFIRMEE','PRESENT') then raise exception 'ALREADY_REGISTERED'; end if;
    if r.status = 'REFUSEE' then raise exception 'REGISTRATION_REFUSED'; end if;
  end if;
  select count(*) into taken from public.training_registrations where session_id = s.id and status in ('CONFIRMEE','PRESENT');
  if taken >= s.capacity then raise exception 'SESSION_FULL'; end if;
  if had_reg then
    update public.training_registrations set status = 'EN_ATTENTE', first_name = fn, last_name = ln, phone = ph, email = mail,
      registered_at = now(), listed = false, validation_status = 'A_VALIDER'
      where id = r.id returning id into rid;
  else
    insert into public.training_registrations (session_id, course_id, user_id, first_name, last_name, email, phone)
      values (s.id, s.course_id, uid, fn, ln, mail, ph) returning id into rid;
  end if;
  return rid;
end $$;

-- Annulation par le participant (avant le début de la session).
create or replace function public.cancel_training_registration(p_registration_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.training_registrations; s public.training_sessions;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into r from public.training_registrations where id = p_registration_id;
  if not found or (r.user_id <> uid and not public.is_admin(uid)) then raise exception 'FORBIDDEN'; end if;
  select * into s from public.training_sessions where id = r.session_id;
  if r.status not in ('EN_ATTENTE','CONFIRMEE') or s.status not in ('BIENTOT','OUVERT','FERME') then raise exception 'CANNOT_CANCEL'; end if;
  update public.training_registrations set status = 'ANNULEE', listed = false where id = r.id;
end $$;

-- Liste des participants pointables (noms uniquement) pour l'admin ou le formateur de la session.
create or replace function public.get_session_roster(p_session_id uuid)
returns table(registration_id uuid, first_name text, last_name text, status text)
language plpgsql security definer stable set search_path = public as $$
begin
  if auth.uid() is null or not public.is_session_staff(p_session_id, auth.uid()) then raise exception 'FORBIDDEN'; end if;
  return query select r.id, r.first_name, r.last_name, r.status from public.training_registrations r
    where r.session_id = p_session_id and r.status in ('CONFIRMEE','PRESENT') order by r.last_name, r.first_name;
end $$;

create or replace function public._mark_attendance(p_reg uuid, p_date date, p_status text, p_method text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.training_registrations; s public.training_sessions;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into r from public.training_registrations where id = p_reg;
  if not found then raise exception 'REGISTRATION_NOT_FOUND'; end if;
  if not public.is_session_staff(r.session_id, auth.uid()) then raise exception 'FORBIDDEN'; end if;
  select * into s from public.training_sessions where id = r.session_id;
  if s.status in ('BROUILLON','ANNULEE') then raise exception 'SESSION_NOT_ACTIVE'; end if;
  if r.status not in ('CONFIRMEE','PRESENT') then raise exception 'NOT_CONFIRMED'; end if;
  if p_date is null or p_date < s.starts_on or p_date > s.ends_on then raise exception 'DATE_OUT_OF_RANGE'; end if;
  if p_status is null then
    delete from public.training_attendance where registration_id = r.id and attendance_date = p_date;
    return;
  end if;
  if p_status not in ('PRESENT','ABSENT','RETARD') then raise exception 'INVALID_STATUS'; end if;
  insert into public.training_attendance (session_id, registration_id, attendance_date, status, method, marked_by)
    values (r.session_id, r.id, p_date, p_status, p_method, auth.uid())
  on conflict (registration_id, attendance_date) do update
    set status = excluded.status, method = excluded.method, marked_by = excluded.marked_by, marked_at = now();
  if p_status in ('PRESENT','RETARD') and r.status = 'CONFIRMEE' then
    update public.training_registrations set status = 'PRESENT' where id = r.id;
  end if;
end $$;

-- Pointage manuel : present / absent / retard (p_status null = effacer).
create or replace function public.set_attendance(p_registration_id uuid, p_date date, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin perform public._mark_attendance(p_registration_id, p_date, p_status, 'MANUEL'); end $$;

-- Pointage par QR code : le jeton identifie le participant, la session est déduite côté serveur.
create or replace function public.training_check_in(p_token text, p_date date default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.training_registrations; d date := coalesce(p_date, current_date);
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into r from public.training_registrations where checkin_token = trim(coalesce(p_token, ''));
  if not found then raise exception 'INVALID_TOKEN'; end if;
  perform public._mark_attendance(r.id, d, 'PRESENT', 'QR');
  return jsonb_build_object('registration_id', r.id, 'session_id', r.session_id, 'first_name', r.first_name, 'last_name', r.last_name, 'date', d);
end $$;

-- Éligibilité d'une inscription (staff de la session ou propriétaire).
create or replace function public.training_eligibility(p_registration_id uuid) returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare r public.training_registrations;
begin
  select * into r from public.training_registrations where id = p_registration_id;
  if not found or auth.uid() is null or (r.user_id <> auth.uid() and not public.is_session_staff(r.session_id, auth.uid())) then
    raise exception 'FORBIDDEN';
  end if;
  return public._training_eligibility(p_registration_id);
end $$;

-- Émission (ou ré-émission idempotente) des certificats d'une session terminée.
create or replace function public.issue_session_certificates(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.training_sessions; r record; issued int := 0; existing int := 0; ineligible int := 0; before_id uuid; after_id uuid;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then raise exception 'FORBIDDEN'; end if;
  select * into s from public.training_sessions where id = p_session_id;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if s.status <> 'TERMINEE' then raise exception 'SESSION_NOT_COMPLETED'; end if;
  for r in select id from public.training_registrations where session_id = p_session_id and status in ('CONFIRMEE','PRESENT') loop
    select id into before_id from public.certificates where registration_id = r.id;
    after_id := public._issue_certificate(r.id);
    if before_id is not null then existing := existing + 1;
    elsif after_id is not null then issued := issued + 1;
    else ineligible := ineligible + 1; end if;
  end loop;
  return jsonb_build_object('issued', issued, 'already_issued', existing, 'ineligible', ineligible);
end $$;

create or replace function public.revoke_certificate(p_certificate_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then raise exception 'FORBIDDEN'; end if;
  update public.certificates set status = 'REVOQUE', revoked_at = now(), revoked_by = auth.uid(), revoked_reason = nullif(left(trim(coalesce(p_reason, '')), 500), '')
    where id = p_certificate_id and status = 'VALIDE';
  if not found then raise exception 'CERTIFICATE_NOT_FOUND'; end if;
end $$;

create or replace function public.restore_certificate(p_certificate_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then raise exception 'FORBIDDEN'; end if;
  update public.certificates set status = 'VALIDE', revoked_at = null, revoked_by = null, revoked_reason = null
    where id = p_certificate_id and status = 'REVOQUE';
  if not found then raise exception 'CERTIFICATE_NOT_FOUND'; end if;
end $$;

-- Vérification publique : uniquement des champs non sensibles (jamais email, téléphone, identifiants).
create or replace function public.verify_certificate(p_number text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.certificates; n text := upper(trim(coalesce(p_number, '')));
begin
  if n = '' or char_length(n) > 40 then return jsonb_build_object('found', false); end if;
  select * into c from public.certificates where certificate_number = n;
  if not found then return jsonb_build_object('found', false); end if;
  insert into public.certificate_verifications (certificate_id, result) values (c.id, c.status);
  if c.status = 'REVOQUE' then
    return jsonb_build_object('found', true, 'status', 'REVOQUE', 'certificate_number', c.certificate_number, 'revoked_at', c.revoked_at);
  end if;
  return jsonb_build_object('found', true, 'status', 'VALIDE', 'certificate_number', c.certificate_number,
    'holder_name', c.holder_name, 'course_title', c.course_title, 'period_start', c.period_start, 'period_end', c.period_end,
    'duration_label', c.duration_label, 'location', c.location, 'trainer_name', c.trainer_name, 'issued_at', c.issued_at);
end $$;

-- Publication de la liste des participants (publique ou réservée aux participants connectés).
create or replace function public.publish_session_list(p_session_id uuid, p_visibility text) returns void
language plpgsql security definer set search_path = public as $$
declare s public.training_sessions;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then raise exception 'FORBIDDEN'; end if;
  if p_visibility not in ('PUBLIC','PARTICIPANTS') then raise exception 'INVALID_VISIBILITY'; end if;
  select * into s from public.training_sessions where id = p_session_id;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if not exists (select 1 from public.training_registrations where session_id = p_session_id and listed and status not in ('ANNULEE','REFUSEE')) then
    raise exception 'EMPTY_LIST';
  end if;
  update public.training_sessions set list_status = 'PUBLIEE', list_visibility = p_visibility,
    list_published_at = coalesce(list_published_at, now()) where id = p_session_id;
  insert into public.notifications (user_id, title, body, link, kind, dedupe_key)
  select r.user_id, 'Liste des participants publiée',
         'La liste des participants de la formation « ' || c.title || ' » est publiée.',
         '/formations/' || c.slug || '/sessions/' || s.id::text || '/liste', 'LIST', 'list:' || s.id::text
  from public.training_registrations r join public.courses c on c.id = s.course_id
  where r.session_id = s.id and r.status in ('EN_ATTENTE','CONFIRMEE','PRESENT')
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
end $$;

create or replace function public.unpublish_session_list(p_session_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then raise exception 'FORBIDDEN'; end if;
  update public.training_sessions set list_status = 'PRIVEE', list_published_at = null where id = p_session_id;
end $$;

-- Lecture de la liste publiée : prénom + nom + numéro, rien d'autre (jamais email, téléphone, adresse…).
create or replace function public.get_published_list(p_session_id uuid) returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare s public.training_sessions; uid uuid := auth.uid(); allowed boolean; rows jsonb;
begin
  select s2.* into s from public.training_sessions s2 join public.courses c on c.id = s2.course_id
    where s2.id = p_session_id and s2.status <> 'BROUILLON' and c.status = 'PUBLIEE';
  if not found or s.list_status <> 'PUBLIEE' then return jsonb_build_object('access', 'NOT_PUBLISHED', 'rows', '[]'::jsonb); end if;
  if s.list_visibility = 'PUBLIC' then allowed := true;
  else
    if uid is null then return jsonb_build_object('access', 'LOGIN_REQUIRED', 'rows', '[]'::jsonb); end if;
    allowed := public.is_admin(uid) or exists (select 1 from public.training_registrations r
      where r.session_id = s.id and r.user_id = uid and r.status in ('EN_ATTENTE','CONFIRMEE','PRESENT'));
    if not allowed then return jsonb_build_object('access', 'FORBIDDEN', 'rows', '[]'::jsonb); end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('number', q.n, 'first_name', q.first_name, 'last_name', q.last_name) order by q.n), '[]'::jsonb)
    into rows from (
      select row_number() over (order by r.last_name, r.first_name, r.id) as n, r.first_name, r.last_name
      from public.training_registrations r where r.session_id = s.id and r.listed and r.status not in ('ANNULEE','REFUSEE')) q;
  return jsonb_build_object('access', s.list_visibility, 'rows', rows, 'published_at', s.list_published_at);
end $$;

-- ───────────── 13. Ancien parcours « leçons terminées » ─────────────
-- Un certificat n'est plus délivré automatiquement pour une formation PRÉSENTIELLE (il exige session terminée,
-- participation confirmée et critères remplis). Comportement inchangé pour les formations EN_LIGNE / HYBRIDE.
create or replace function public.on_lesson_progress() returns trigger
language plpgsql security definer set search_path = public as $$
declare total int; done int; has_cert boolean; mode text;
begin
  select count(*) into total from public.lessons where course_id = new.course_id and is_published;
  select count(*) into done from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
    where lp.user_id = new.user_id and lp.course_id = new.course_id and l.is_published;
  if total > 0 and done >= total then
    update public.enrollments set status = 'TERMINEE', completed_at = now()
      where user_id = new.user_id and course_id = new.course_id and status = 'ACTIVE';
    select has_certificate, delivery_mode into has_cert, mode from public.courses where id = new.course_id;
    if coalesce(has_cert, false) and coalesce(mode, 'PRESENTIEL') <> 'PRESENTIEL' then
      insert into public.certificates (user_id, course_id) values (new.user_id, new.course_id) on conflict do nothing;
      insert into public.notifications (user_id, title, body)
        values (new.user_id, 'Formation terminée', 'Bravo, tu as terminé une formation. Retrouve ton certificat dans Mon espace.');
    else
      insert into public.notifications (user_id, title, body)
        values (new.user_id, 'Supports terminés', 'Tu as parcouru tous les supports de cette formation.');
    end if;
  end if;
  return new;
end $$;

-- ───────────── 14. RLS ─────────────
alter table public.training_sessions enable row level security;
alter table public.training_registrations enable row level security;
alter table public.training_announcements enable row level security;
alter table public.training_attendance enable row level security;
alter table public.certificate_verifications enable row level security;

do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('training_sessions','training_registrations','training_announcements','training_attendance','certificate_verifications')
  loop execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename); end loop;
end $$;

-- Sessions : visibles publiquement (hors brouillon) pour une formation publiée ; gestion ADMIN.
create policy sessions_read on public.training_sessions for select using (
  public.is_staff(auth.uid())
  or (status <> 'BROUILLON' and exists (select 1 from public.courses c where c.id = course_id and c.status = 'PUBLIEE')));
create policy sessions_write on public.training_sessions for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Inscriptions : le participant voit les siennes, l'ADMIN gère tout. Création participant = fonction serveur uniquement.
create policy registrations_select on public.training_registrations for select to authenticated
  using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy registrations_admin_write on public.training_registrations for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Annonces : selon la visibilité.
create policy announcements_read on public.training_announcements for select using (
  public.is_admin(auth.uid())
  or (status = 'PUBLIEE' and (expires_at is null or expires_at > now()) and (
    visibility = 'PUBLIC'
    or (visibility = 'FORMATEURS' and public.is_staff(auth.uid()))
    or (visibility = 'PARTICIPANTS' and public.is_training_participant(course_id, session_id, auth.uid())))));
create policy announcements_write on public.training_announcements for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Présences : lecture seule (propriétaire ou staff de la session). AUCUNE politique d'écriture : seules les
-- fonctions serveur (set_attendance / training_check_in) écrivent, après vérification des droits.
create policy attendance_select on public.training_attendance for select to authenticated using (
  public.is_session_staff(session_id, auth.uid())
  or exists (select 1 from public.training_registrations r where r.id = registration_id and r.user_id = auth.uid()));

-- Certificats : lecture propriétaire / ADMIN (politique existante). Aucune écriture directe ; vérifications : ADMIN.
create policy cert_verifications_select on public.certificate_verifications for select to authenticated using (public.is_admin(auth.uid()));

-- ───────────── 15. Droits (défense en profondeur) ─────────────
revoke all on public.training_sessions, public.training_registrations, public.training_announcements,
  public.training_attendance, public.certificate_verifications from anon, authenticated;
grant select on public.training_sessions, public.training_announcements to anon, authenticated;
grant insert, update, delete on public.training_sessions, public.training_announcements to authenticated;
grant select, insert, update, delete on public.training_registrations to authenticated;
grant select on public.training_attendance, public.certificate_verifications to authenticated;
revoke all on public.certificates from anon;

-- Fonctions : par défaut aucune exécution publique ; on accorde explicitement.
do $$ declare f text; begin
  foreach f in array array[
    '_new_certificate_number()', '_training_eligibility(uuid)', '_issue_certificate(uuid)', '_mark_attendance(uuid,date,text,text)',
    'certificates_before_insert()', 'registration_guard()', 'attendance_guard()', 'session_before_update()', 'announcement_before_write()',
    'notify_announcement_published()', 'notify_registration_status()', 'session_completed_issue()', 'registration_eligibility_changed()',
    'forbid_course_delete_with_certificates()'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'register_for_training_session(uuid,text,text,text)', 'cancel_training_registration(uuid)', 'get_session_roster(uuid)',
    'set_attendance(uuid,date,text)', 'training_check_in(text,date)', 'training_eligibility(uuid)', 'issue_session_certificates(uuid)',
    'revoke_certificate(uuid,text)', 'restore_certificate(uuid)', 'publish_session_list(uuid,text)', 'unpublish_session_list(uuid)',
    'is_session_staff(uuid,uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['training_seats(uuid[])', 'verify_certificate(text)', 'get_published_list(uuid)', 'is_training_participant(uuid,uuid,uuid)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ════════ PARTIE 7/8 : 20261004090000_data_api_grants.sql ════════
/*
  # JOE DEV CODES — droits d'accès à l'API Data (GRANT explicites)

  Depuis le 30 mai 2026, les NOUVEAUX projets Supabase n'accordent plus automatiquement aux rôles
  anon / authenticated / service_role l'accès aux nouvelles tables du schéma public (et tous les projets
  existants à partir du 30 octobre 2026). Sans GRANT explicite, l'API répond 404 (« table introuvable dans le
  schéma ») ou 403 (« permission denied »), même si la table existe et que les policies RLS sont correctes.

  Principe : le GRANT donne le droit d'ATTEINDRE la table ; les policies RLS décident QUELLES LIGNES sont visibles.
  On accorde donc le strict nécessaire par rôle, en cohérence avec les policies déjà définies.

  Ré-exécutable. À lancer APRÈS toutes les autres migrations.
*/

grant usage on schema public to anon, authenticated, service_role;

-- ───────────── anon (visiteur non connecté) : lecture du contenu public uniquement ─────────────
-- (les policies RLS limitent aux contenus publiés ; settings est filtré sur les clés identity.* / about.* / site.*)
grant select on
  public.courses, public.course_modules, public.lessons, public.projects, public.project_technologies,
  public.resources, public.articles, public.workshops, public.services, public.testimonials, public.settings,
  public.training_sessions, public.training_announcements
to anon;

-- Envois publics (formulaire de contact, inscription à un atelier, « Me prévenir »)
grant insert on public.contact_messages, public.workshop_registrations, public.course_waitlist to anon;

-- ───────────── authenticated (connecté) : les policies RLS décident des lignes ─────────────
grant select, insert, update, delete on
  public.profiles, public.courses, public.course_modules, public.lessons, public.lesson_resources,
  public.projects, public.project_technologies, public.resources, public.articles, public.workshops,
  public.services, public.testimonials, public.settings, public.enrollments, public.favorites,
  public.notifications, public.contact_messages,
  public.training_sessions, public.training_registrations, public.training_announcements,
  public.cv_profiles, public.cv_skills, public.cv_experiences, public.cv_education,
  public.cv_certifications, public.cv_achievements, public.cv_languages
to authenticated;

grant select, insert, delete on public.lesson_progress, public.workshop_registrations, public.course_waitlist to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;

-- Lecture seule : les écritures passent par des fonctions serveur (certificats, présences) ou les triggers
grant select on public.certificates, public.audit_logs, public.certificate_verifications, public.training_attendance to authenticated;

-- ───────────── service_role (Edge Functions, jamais exposé au navigateur) ─────────────
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

notify pgrst, 'reload schema';

-- ════════ PARTIE 8/8 : 20261004100000_manual_certificates.sql ════════
/*
  # JOE DEV CODES — certificat créé manuellement par l'administrateur + liste d'attente prévenue

  1. admin_issue_certificate() : l'ADMIN délivre un certificat à n'importe quel apprenant, avec ou sans session,
     sans exigence d'éligibilité (cas : formation faite hors plateforme, régularisation, exception).
     - Numéro JDC-AAAA-XXXXXX unique généré côté serveur (trigger existant), jamais saisi par le client.
     - Instantané des informations (nom, formation, période, lieu, formateur), champs facultatifs complétés
       depuis la session / la formation si laissés vides.
     - Marqué issue_mode = 'MANUEL' (+ motif interne) ; vérifiable publiquement comme les autres.
     - Pas de doublon : un seul certificat par inscription, par (apprenant, session) ou par (apprenant, formation) sans session.
  2. Quand une session passe à « Inscriptions ouvertes », les personnes en liste d'attente « Me prévenir »
     qui ont un compte reçoivent une notification (une seule fois). Les emails restent le rôle d'une Edge Function.

  Ré-exécutable. Nécessite les migrations précédentes (training_presentiel, data_api_grants).
*/

alter table public.certificates add column if not exists issue_mode text not null default 'AUTO' check (issue_mode in ('AUTO','MANUEL'));
alter table public.certificates add column if not exists manual_reason text check (manual_reason is null or char_length(manual_reason) <= 500);

-- Un certificat « hors session » reste unique par (apprenant, formation) ; avec session : unique par (apprenant, session).
drop index if exists public.certificates_online_unique;
create unique index if not exists certificates_online_unique on public.certificates(user_id, course_id) where registration_id is null and session_id is null;
create unique index if not exists certificates_manual_session_unique on public.certificates(user_id, session_id) where registration_id is null and session_id is not null;

create or replace function public.admin_issue_certificate(
  p_user_id uuid, p_course_id uuid, p_session_id uuid default null, p_holder_name text default null,
  p_period_start date default null, p_period_end date default null, p_duration_label text default null,
  p_location text default null, p_trainer_name text default null, p_issued_on date default null, p_reason text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  pr public.profiles; c public.courses; r public.training_registrations; s public.training_sessions;
  have_session boolean := false; have_reg boolean := false;
  holder text; cid uuid; issued timestamptz;
  v_start date; v_end date; v_loc text; v_trainer text; v_duration text; v_reg uuid;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then raise exception 'FORBIDDEN'; end if;
  select * into pr from public.profiles where id = p_user_id;
  if not found then raise exception 'LEARNER_NOT_FOUND'; end if;
  select * into c from public.courses where id = p_course_id;
  if not found then raise exception 'COURSE_NOT_FOUND'; end if;

  if p_session_id is not null then
    select * into s from public.training_sessions where id = p_session_id;
    if not found or s.course_id <> p_course_id then raise exception 'SESSION_NOT_FOUND'; end if;
    have_session := true;
    select * into r from public.training_registrations where session_id = p_session_id and user_id = p_user_id;
    have_reg := found;
    if have_reg then
      v_reg := r.id;
      if exists (select 1 from public.certificates where registration_id = r.id) then raise exception 'CERTIFICATE_EXISTS'; end if;
    end if;
  end if;

  holder := nullif(trim(coalesce(p_holder_name, '')), '');
  if holder is null and have_reg then holder := trim(r.first_name || ' ' || upper(r.last_name)); end if;
  if holder is null then holder := nullif(trim(coalesce(pr.full_name, '')), ''); end if;
  if holder is null or char_length(holder) > 150 then raise exception 'HOLDER_NAME_REQUIRED'; end if;

  v_start := p_period_start;
  v_end := p_period_end;
  v_loc := nullif(left(trim(coalesce(p_location, '')), 300), '');
  v_trainer := nullif(left(trim(coalesce(p_trainer_name, '')), 150), '');
  v_duration := nullif(left(trim(coalesce(p_duration_label, '')), 100), '');
  if have_session then
    v_start := coalesce(v_start, s.starts_on);
    v_end := coalesce(v_end, s.ends_on);
    v_loc := coalesce(v_loc, s.location);
    v_trainer := coalesce(v_trainer, s.trainer_name);
  end if;
  v_trainer := coalesce(v_trainer, c.trainer_name);
  v_duration := coalesce(v_duration, c.duration);
  if v_start is not null and v_end is not null and v_end < v_start then raise exception 'INVALID_DATE'; end if;
  if p_issued_on is not null and p_issued_on > current_date + 1 then raise exception 'INVALID_DATE'; end if;
  issued := case when p_issued_on is null then now() else p_issued_on::timestamptz end;

  begin
    insert into public.certificates (user_id, course_id, registration_id, session_id, issued_by, issued_at, holder_name, course_title,
                                     period_start, period_end, duration_label, location, trainer_name, issue_mode, manual_reason)
    values (p_user_id, p_course_id, v_reg, p_session_id, auth.uid(), issued, holder, c.title,
            v_start, v_end, v_duration, v_loc, v_trainer, 'MANUEL', nullif(left(trim(coalesce(p_reason, '')), 500), ''))
    returning id into cid;
  exception when unique_violation then
    raise exception 'CERTIFICATE_EXISTS';
  end;

  insert into public.notifications (user_id, title, body, link, kind, dedupe_key) values (
    p_user_id, 'Votre certificat est disponible 🎓',
    'Votre certificat pour la formation « ' || c.title || ' » est maintenant disponible.',
    '/app/certificats/' || cid::text, 'CERTIFICATE', 'certificate:' || cid::text)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

  return cid;
end $$;

revoke all on function public.admin_issue_certificate(uuid, uuid, uuid, text, date, date, text, text, text, date, text) from public, anon;
grant execute on function public.admin_issue_certificate(uuid, uuid, uuid, text, date, date, text, text, text, date, text) to authenticated, service_role;

-- ───────────── Liste d'attente : prévenir quand une session ouvre ses inscriptions ─────────────
create or replace function public.notify_waitlist_session_open() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.courses;
begin
  if new.status <> 'OUVERT' then return null; end if;
  if tg_op = 'UPDATE' and old.status = 'OUVERT' then return null; end if;
  select * into c from public.courses where id = new.course_id;
  if not found then return null; end if;
  insert into public.notifications (user_id, title, body, link, kind, dedupe_key)
  select distinct p.id, 'Les inscriptions sont ouvertes',
         'Une session de la formation « ' || c.title || ' » ouvre ses inscriptions. Tu peux t’inscrire dès maintenant.',
         '/formations/' || c.slug, 'SESSION_OPEN', 'session_open:' || new.id::text
  from public.course_waitlist w join public.profiles p on lower(p.email) = lower(w.email)
  where w.course_id = new.course_id
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  update public.course_waitlist set notified_at = now()
   where course_id = new.course_id and notified_at is null and lower(email) in (select lower(email) from public.profiles);
  return null;
end $$;

drop trigger if exists training_sessions_notify_waitlist on public.training_sessions;
create trigger training_sessions_notify_waitlist after insert or update on public.training_sessions
  for each row execute function public.notify_waitlist_session_open();
revoke all on function public.notify_waitlist_session_open() from public, anon, authenticated;

notify pgrst, 'reload schema';

-- ════════ VÉRIFICATION FINALE (le résultat s'affiche dans l'éditeur) ════════
select
  'MIGRATION OK' as resultat,
  (select count(*) from public.courses) as formations,
  (select count(*) from information_schema.tables where table_schema = 'public'
     and table_name in ('training_sessions','training_registrations','training_announcements','training_attendance','certificate_verifications','cv_profiles','course_waitlist')) as tables_nouvelles_sur_7,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('verify_certificate','register_for_training_session','issue_session_certificates','get_public_cv','publish_session_list','admin_issue_certificate')) as fonctions_cles_sur_6,
  has_table_privilege('authenticated', 'public.profiles', 'select') as droit_profiles_ok,
  has_table_privilege('anon', 'public.courses', 'select') as droit_courses_anon_ok;
