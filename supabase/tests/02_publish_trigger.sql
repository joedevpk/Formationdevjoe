-- À exécuter après 01_rls_checks.sql (réutilise ses données). Publication : notifications ciblées, sans doublon.
\pset pager off
\echo --- le brouillon secret est-il visible pour anon ?
set role anon; select count(*) as secret_visible from public.courses where slug='secret'; select count(*) as seed_visibles from public.courses; reset role;
\echo --- settings pour anon (attendu 1 clé identity.*, pas private.token)
set role anon; select key from public.settings where key in ('identity.email','private.token'); reset role;
\echo === PUBLICATION
-- Bob se désabonne des alertes in-app
insert into public.notification_preferences(user_id,in_app_new_courses,email_new_courses) values ('c0000000-0000-4000-8000-000000000003', false, false);
-- Alice est sur la liste d'attente avec son email (compte existant)
insert into public.course_waitlist(course_id,email) values ('e0000000-0000-4000-8000-0000000000c3','alice@x.io');
select 'avant' as etape, (select count(*) from public.notifications) as notifs, (select coming_soon from public.courses where slug='soon') as coming_soon;
update public.courses set status='PUBLIEE' where slug='soon';
select 'apres publication' as etape, (select count(*) from public.notifications where dedupe_key like 'course_published:%') as notifs_publish,
       (select string_agg(p.email, ',' order by p.email) from public.notifications n join public.profiles p on p.id=n.user_id where n.dedupe_key like 'course_published:%') as destinataires,
       (select coming_soon from public.courses where slug='soon') as coming_soon,
       (select count(*) from public.audit_logs where action='PUBLISH') as audit_publish;
-- Repasser en brouillon puis re-publier : aucune notification en double
update public.courses set status='BROUILLON' where slug='soon';
update public.courses set status='PUBLIEE' where slug='soon';
select 'apres re-publication' as etape, (select count(*) from public.notifications where dedupe_key like 'course_published:%') as notifs_publish;
-- Mise à jour sans changement de statut : rien
update public.courses set title='Cours Bientôt v2' where slug='soon';
select 'apres simple edition' as etape, (select count(*) from public.notifications where dedupe_key like 'course_published:%') as notifs_publish;
