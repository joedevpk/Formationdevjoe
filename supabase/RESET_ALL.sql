-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ JOE DEV CODES — RÉINITIALISATION TOTALE (SUPPRIME TOUTES LES DONNÉES) ║
-- ║ À n'exécuter QUE sur le projet Supabase dédié à JOE DEV CODES.        ║
-- ║ Ne touche pas à auth.users (les comptes de connexion restent).        ║
-- ╚════════════════════════════════════════════════════════════════════╝

-- 1) Trigger posé sur auth.users
drop trigger if exists on_auth_user_created on auth.users;

-- 2) Policies Storage créées par la migration (les buckets et fichiers ne sont pas supprimés)
drop policy if exists "public read media" on storage.objects;
drop policy if exists "auth read lesson files" on storage.objects;
drop policy if exists "staff write media" on storage.objects;
drop policy if exists "staff update media" on storage.objects;
drop policy if exists "staff delete media" on storage.objects;
drop policy if exists "avatars insert own" on storage.objects;
drop policy if exists "avatars update own" on storage.objects;
drop policy if exists "avatars delete own" on storage.objects;

-- 3) Tables (CASCADE supprime aussi leurs triggers, index et policies)
drop table if exists public.articles cascade;
drop table if exists public.audit_logs cascade;
drop table if exists public.certificate_verifications cascade;
drop table if exists public.certificates cascade;
drop table if exists public.contact_messages cascade;
drop table if exists public.course_modules cascade;
drop table if exists public.course_waitlist cascade;
drop table if exists public.courses cascade;
drop table if exists public.cv_achievements cascade;
drop table if exists public.cv_certifications cascade;
drop table if exists public.cv_education cascade;
drop table if exists public.cv_experiences cascade;
drop table if exists public.cv_languages cascade;
drop table if exists public.cv_profiles cascade;
drop table if exists public.cv_skills cascade;
drop table if exists public.enrollments cascade;
drop table if exists public.favorites cascade;
drop table if exists public.lesson_progress cascade;
drop table if exists public.lesson_resources cascade;
drop table if exists public.lessons cascade;
drop table if exists public.notification_preferences cascade;
drop table if exists public.notifications cascade;
drop table if exists public.profiles cascade;
drop table if exists public.project_technologies cascade;
drop table if exists public.projects cascade;
drop table if exists public.resources cascade;
drop table if exists public.services cascade;
drop table if exists public.settings cascade;
drop table if exists public.testimonials cascade;
drop table if exists public.training_announcements cascade;
drop table if exists public.training_attendance cascade;
drop table if exists public.training_registrations cascade;
drop table if exists public.training_sessions cascade;
drop table if exists public.workshop_registrations cascade;
drop table if exists public.workshops cascade;

-- 4) Fonctions
drop function if exists public._issue_certificate(uuid) cascade;
drop function if exists public._mark_attendance(uuid, date, text, text) cascade;
drop function if exists public._new_certificate_number() cascade;
drop function if exists public._training_eligibility(uuid) cascade;
drop function if exists public.announcement_before_write() cascade;
drop function if exists public.attendance_guard() cascade;
drop function if exists public.cancel_training_registration(uuid) cascade;
drop function if exists public.certificates_before_insert() cascade;
drop function if exists public.cv_is_published() cascade;
drop function if exists public.forbid_course_delete_with_certificates() cascade;
drop function if exists public.get_public_cv() cascade;
drop function if exists public.get_published_list(uuid) cascade;
drop function if exists public.get_session_roster(uuid) cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_admin(uuid) cascade;
drop function if exists public.is_session_staff(uuid, uuid) cascade;
drop function if exists public.is_staff(uuid) cascade;
drop function if exists public.is_training_participant(uuid, uuid, uuid) cascade;
drop function if exists public.issue_session_certificates(uuid) cascade;
drop function if exists public.log_audit() cascade;
drop function if exists public.notify_announcement_published() cascade;
drop function if exists public.notify_course_published() cascade;
drop function if exists public.notify_registration_status() cascade;
drop function if exists public.on_course_published() cascade;
drop function if exists public.on_lesson_progress() cascade;
drop function if exists public.protect_profile_role() cascade;
drop function if exists public.publish_session_list(uuid, text) cascade;
drop function if exists public.register_for_training_session(uuid, text, text, text) cascade;
drop function if exists public.registration_eligibility_changed() cascade;
drop function if exists public.registration_guard() cascade;
drop function if exists public.restore_certificate(uuid) cascade;
drop function if exists public.revoke_certificate(uuid, text) cascade;
drop function if exists public.session_before_update() cascade;
drop function if exists public.session_completed_issue() cascade;
drop function if exists public.set_attendance(uuid, date, text) cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.training_check_in(text, date) cascade;
drop function if exists public.training_eligibility(uuid) cascade;
drop function if exists public.training_seats(uuid[]) cascade;
drop function if exists public.unpublish_session_list(uuid) cascade;
drop function if exists public.verify_certificate(text) cascade;

notify pgrst, 'reload schema';
select 'RESET OK' as resultat, (select count(*) from information_schema.tables where table_schema='public') as tables_restantes_dans_public;
