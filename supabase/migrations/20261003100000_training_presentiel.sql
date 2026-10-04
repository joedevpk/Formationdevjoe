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
