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
