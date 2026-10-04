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
