-- Vérifications RLS/RBAC sur un vrai PostgreSQL. Chaque ligne doit afficher PASS.
-- Lancer via : bash scripts/test-db.sh
\set ON_ERROR_STOP off
\pset pager off
-- Jeux de données : 1 admin, 2 apprenants, 1 formation publiée A (1 leçon), 1 formation B (1 leçon), 1 annoncée
insert into auth.users (id,email,raw_user_meta_data) values
 ('a0000000-0000-4000-8000-000000000001','admin@joe.dev','{"full_name":"Joe Admin"}'),
 ('b0000000-0000-4000-8000-000000000002','alice@x.io','{"full_name":"Alice"}'),
 ('c0000000-0000-4000-8000-000000000003','bob@x.io','{"full_name":"Bob"}'),
 ('d0000000-0000-4000-8000-000000000004','inst@x.io','{"full_name":"Inst"}');
select id, email, role from public.profiles where email in ('admin@joe.dev','alice@x.io') order by email;
update public.profiles set role='ADMIN' where email='admin@joe.dev';
update public.profiles set role='INSTRUCTOR' where email='inst@x.io';
insert into public.courses (id,slug,title,short_description,category,status) values
 ('e0000000-0000-4000-8000-0000000000a1','a','Cours A','Description A suffisante','Web','PUBLIEE'),
 ('e0000000-0000-4000-8000-0000000000b2','b','Cours B','Description B suffisante','Web','PUBLIEE'),
 ('e0000000-0000-4000-8000-0000000000c3','soon','Cours Bientôt','Description C suffisante','IA','BROUILLON'),
 ('e0000000-0000-4000-8000-0000000000d4','secret','Cours Secret','Description D suffisante','IA','BROUILLON');
update public.courses set coming_soon=true where slug='soon';
insert into public.course_modules (id,course_id,title) values ('f0000000-0000-4000-8000-0000000000a1','e0000000-0000-4000-8000-0000000000a1','M'),('f0000000-0000-4000-8000-0000000000b2','e0000000-0000-4000-8000-0000000000b2','M');
insert into public.lessons (id,module_id,course_id,title,is_published) values
 ('10000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-0000000000a1','e0000000-0000-4000-8000-0000000000a1','L-A',true),
 ('10000000-0000-4000-8000-0000000000b2','f0000000-0000-4000-8000-0000000000b2','e0000000-0000-4000-8000-0000000000b2','L-B',true);
insert into public.lesson_resources (lesson_id,title,url) values ('10000000-0000-4000-8000-0000000000b2','Res B','https://x.io');
insert into public.contact_messages(name,email,message) values ('Zed','zed@x.io','message privé');
insert into public.enrollments(user_id,course_id) values ('b0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-0000000000a1');

create or replace function t(label text, sql text, who text, uid text, expect_ok boolean) returns void language plpgsql as $f$
declare r text; ok boolean := true; n bigint;
begin
  execute format('set local role %I', who);
  perform set_config('request.jwt.claim.sub', coalesce(uid,''), true);
  begin execute sql; get diagnostics n = row_count; exception when others then ok := false; r := sqlerrm; end;
  reset role;
  raise notice '% % — %', case when ok = expect_ok then 'PASS' else 'FAIL' end, label, coalesce(r, 'rows='||n);
end $f$;
-- NB: les SELECT « bloqués par RLS » ne lèvent pas d'erreur : on compte les lignes via des fonctions dédiées.
create or replace function cnt(label text, sql text, who text, uid text, expected bigint) returns void language plpgsql as $f$
declare n bigint;
begin
  execute format('set local role %I', who);
  perform set_config('request.jwt.claim.sub', coalesce(uid,''), true);
  execute 'select count(*) from (' || sql || ') q' into n;
  reset role;
  raise notice '% % — %=%', case when n = expected then 'PASS' else 'FAIL' end, label, n, expected;
end $f$;

\echo === LECTURE PUBLIQUE
select cnt('anon voit la formation annoncée', 'select 1 from public.courses where slug = ''soon''', 'anon', null, 1);
select cnt('anon ne voit PAS le brouillon non annoncé', 'select 1 from public.courses where slug = ''secret''', 'anon', null, 0);
select cnt('anon ne voit pas les messages de contact', 'select 1 from public.contact_messages', 'anon', null, 0);
select cnt('anon ne lit pas la liste d''attente', 'select 1 from public.course_waitlist', 'anon', null, 0);
select cnt('anon ne voit pas les profils', 'select 1 from public.profiles', 'anon', null, 0);
select cnt('anon ne voit pas les ressources de leçon', 'select 1 from public.lesson_resources', 'anon', null, 0);
\echo === CONTACT & LISTE D'ATTENTE
select t('anon peut envoyer un message de contact', $$insert into public.contact_messages(name,email,subject,message) values ('N','n@x.io','Sujet','Bonjour')$$, 'anon', null, true);
select t('anon : email de contact invalide refusé', $$insert into public.contact_messages(name,email,message) values ('N','pas-un-email','Bonjour')$$, 'anon', null, false);
select t('anon peut s''inscrire à la liste d''attente', $$insert into public.course_waitlist(course_id,email) values ('e0000000-0000-4000-8000-0000000000c3','Visiteur@X.io')$$, 'anon', null, true);
select t('doublon (casse différente) refusé', $$insert into public.course_waitlist(course_id,email) values ('e0000000-0000-4000-8000-0000000000c3','visiteur@x.io')$$, 'anon', null, false);
select t('anon ne peut pas forger notified_at', $$insert into public.course_waitlist(course_id,email,notified_at) values ('e0000000-0000-4000-8000-0000000000c3','forge@x.io',now())$$, 'anon', null, false);
select t('email waitlist invalide refusé', $$insert into public.course_waitlist(course_id,email) values ('e0000000-0000-4000-8000-0000000000c3','nope')$$, 'anon', null, false);
\echo === ESCALADE DE RÔLE / DONNÉES D'AUTRUI
select t('learner ne peut pas devenir ADMIN', $$update public.profiles set role='ADMIN' where id='b0000000-0000-4000-8000-000000000002'$$, 'authenticated', 'b0000000-0000-4000-8000-000000000002', false);
select t('learner ne peut pas changer son email de profil', $$update public.profiles set email='x@y.z' where id='b0000000-0000-4000-8000-000000000002'$$, 'authenticated', 'b0000000-0000-4000-8000-000000000002', false);
select t('learner peut modifier son nom', $$update public.profiles set full_name='Alice B' where id='b0000000-0000-4000-8000-000000000002'$$, 'authenticated', 'b0000000-0000-4000-8000-000000000002', true);
select cnt('learner ne voit que son profil', 'select 1 from public.profiles', 'authenticated', 'b0000000-0000-4000-8000-000000000002', 1);
select cnt('instructeur ne voit pas les profils des apprenants', 'select 1 from public.profiles', 'authenticated', 'd0000000-0000-4000-8000-000000000004', 1);
select cnt('admin voit tous les profils', 'select 1 from public.profiles', 'authenticated', 'a0000000-0000-4000-8000-000000000001', 4);
select cnt('Bob ne voit pas l''inscription d''Alice', 'select 1 from public.enrollments', 'authenticated', 'c0000000-0000-4000-8000-000000000003', 0);
select cnt('Alice voit la sienne', 'select 1 from public.enrollments', 'authenticated', 'b0000000-0000-4000-8000-000000000002', 1);
select cnt('learner ne voit aucun message de contact', 'select 1 from public.contact_messages', 'authenticated', 'b0000000-0000-4000-8000-000000000002', 0);
select cnt('instructeur ne voit pas les messages de contact', 'select 1 from public.contact_messages', 'authenticated', 'd0000000-0000-4000-8000-000000000004', 0);
select cnt('admin voit les messages', 'select 1 from public.contact_messages', 'authenticated', 'a0000000-0000-4000-8000-000000000001', 2);
select cnt('learner ne voit pas audit_logs', 'select 1 from public.audit_logs', 'authenticated', 'b0000000-0000-4000-8000-000000000002', 0);
select t('learner ne peut pas créer une formation', $$insert into public.courses(slug,title,short_description,category) values ('hack','Hack','Description assez longue','Web')$$, 'authenticated', 'b0000000-0000-4000-8000-000000000002', false);
select t('instructeur peut créer une formation', $$insert into public.courses(slug,title,short_description,category) values ('inst-c','Inst C','Description assez longue','Web')$$, 'authenticated', 'd0000000-0000-4000-8000-000000000004', true);
select t('instructeur ne peut pas créer de projet (admin only)', $$insert into public.projects(slug,title,summary,category) values ('p','P','S','Web')$$, 'authenticated', 'd0000000-0000-4000-8000-000000000004', false);
\echo === FAILLE PROGRESSION CROISÉE (corrigée)
select cnt('Alice : ressources du cours B (non inscrite) invisibles', 'select 1 from public.lesson_resources', 'authenticated', 'b0000000-0000-4000-8000-000000000002', 0);
-- Ancien parcours « leçons terminées → certificat » : conservé pour les formations EN_LIGNE / HYBRIDE (une formation PRESENTIEL exige session terminée + validation, voir 04_training_checks.sql)
update public.courses set delivery_mode = 'EN_LIGNE' where slug = 'a';
select t('Alice : progression de sa leçon A OK', $$insert into public.lesson_progress(user_id,course_id,lesson_id) values ('b0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-0000000000a1','10000000-0000-4000-8000-0000000000a1')$$, 'authenticated', 'b0000000-0000-4000-8000-000000000002', true);
select t('Alice : leçon du cours B rattachée au cours A refusée', $$insert into public.lesson_progress(user_id,course_id,lesson_id) values ('b0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-0000000000a1','10000000-0000-4000-8000-0000000000b2')$$, 'authenticated', 'b0000000-0000-4000-8000-000000000002', false);
select t('Alice : progression au nom de Bob refusée', $$insert into public.lesson_progress(user_id,course_id,lesson_id) values ('c0000000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-0000000000a1','10000000-0000-4000-8000-0000000000a1')$$, 'authenticated', 'b0000000-0000-4000-8000-000000000002', false);
select t('Alice : inscription à un cours non publié refusée', $$insert into public.enrollments(user_id,course_id) values ('b0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-0000000000d4')$$, 'authenticated', 'b0000000-0000-4000-8000-000000000002', false);
select t('Alice : inscription à une formation « bientôt » refusée', $$insert into public.enrollments(user_id,course_id) values ('b0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-0000000000c3')$$, 'authenticated', 'b0000000-0000-4000-8000-000000000002', false);
select cnt('Alice a terminé le cours A → certificat généré', 'select 1 from public.certificates', 'authenticated', 'b0000000-0000-4000-8000-000000000002', 1);
\echo === SETTINGS
insert into public.settings(key,value) values ('identity.email','joe@x.io'),('private.token','secret');
select cnt('anon ne lit PAS une clé privée', 'select 1 from public.settings where key = ''private.token''', 'anon', null, 0);
select cnt('anon lit les clés publiques identity.*', 'select 1 from public.settings where key = ''identity.email''', 'anon', null, 1);
select cnt('admin lit tout (clé privée incluse)', 'select 1 from public.settings where key = ''private.token''', 'authenticated', 'a0000000-0000-4000-8000-000000000001', 1);
