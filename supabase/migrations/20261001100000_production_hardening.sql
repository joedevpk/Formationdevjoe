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
