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
