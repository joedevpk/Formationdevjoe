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
