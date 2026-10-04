-- Parcours complet « formations présentielles » sur un vrai PostgreSQL, avec les vrais rôles anon / authenticated.
-- Chaque contrôle affiche « NOTICE:  PASS … » ou « NOTICE:  FAIL … ». Lancer via : bash scripts/test-db.sh
\set ON_ERROR_STOP off
\pset pager off

-- ───────────── Utilitaires de test ─────────────
create or replace function t(label text, sql text, who text, uid text, expect_ok boolean) returns void language plpgsql as $f$
declare r text; ok boolean := true;
begin
  execute format('set local role %I', who);
  perform set_config('request.jwt.claim.sub', coalesce(uid,''), true);
  begin execute sql; exception when others then ok := false; r := sqlerrm; end;
  reset role;
  raise notice '% % — %', case when ok = expect_ok then 'PASS' else 'FAIL' end, label, coalesce(r, 'ok');
end $f$;

-- Doit échouer avec un message contenant `msg`
create or replace function te(label text, sql text, who text, uid text, msg text) returns void language plpgsql as $f$
declare r text; ok boolean := true;
begin
  execute format('set local role %I', who);
  perform set_config('request.jwt.claim.sub', coalesce(uid,''), true);
  begin execute sql; exception when others then ok := false; r := sqlerrm; end;
  reset role;
  raise notice '% % — %', case when (not ok) and r like '%'||msg||'%' then 'PASS' else 'FAIL' end, label, coalesce(r, 'aucune erreur');
end $f$;

create or replace function cnt(label text, sql text, who text, uid text, expected bigint) returns void language plpgsql as $f$
declare n bigint;
begin
  execute format('set local role %I', who);
  perform set_config('request.jwt.claim.sub', coalesce(uid,''), true);
  execute 'select count(*) from (' || sql || ') q' into n;
  reset role;
  raise notice '% % — %=%', case when n = expected then 'PASS' else 'FAIL' end, label, n, expected;
end $f$;

-- Nombre de lignes affectées par un UPDATE/DELETE (0 = bloqué par la RLS)
create or replace function aff(label text, sql text, who text, uid text, expected bigint) returns void language plpgsql as $f$
declare n bigint := -1; r text;
begin
  execute format('set local role %I', who);
  perform set_config('request.jwt.claim.sub', coalesce(uid,''), true);
  begin execute sql; get diagnostics n = row_count; exception when others then r := sqlerrm; end;
  reset role;
  raise notice '% % — %=% %', case when n = expected then 'PASS' else 'FAIL' end, label, n, expected, coalesce(r, '');
end $f$;

create or replace function jx(sql text, who text, uid text) returns jsonb language plpgsql as $f$
declare j jsonb;
begin
  execute format('set local role %I', who);
  perform set_config('request.jwt.claim.sub', coalesce(uid,''), true);
  execute sql into j;
  reset role;
  return j;
end $f$;

create or replace function chk(label text, cond boolean) returns void language plpgsql as $f$
begin raise notice '% %', case when coalesce(cond, false) then 'PASS' else 'FAIL' end, label; end $f$;

-- Aides de lecture (superuser) : identifiants dynamiques
create or replace function test_reg(p_email text, p_session uuid default null) returns uuid language sql as $$
  select id from public.training_registrations where email = p_email and (p_session is null or session_id = p_session) order by registered_at limit 1 $$;
create or replace function test_tok(p_email text) returns text language sql as $$ select checkin_token from public.training_registrations where email = p_email limit 1 $$;
create or replace function test_cert_no(p_email text) returns text language sql as $$
  select c.certificate_number from public.certificates c join public.training_registrations r on r.id = c.registration_id where r.email = p_email $$;

\echo === JEU DE DONNÉES
insert into auth.users (id,email,raw_user_meta_data) values
 ('a1000000-0000-4000-8000-000000000001','tadmin@joe.dev','{"full_name":"Admin Test"}'),
 ('a2000000-0000-4000-8000-000000000002','ttrainer@joe.dev','{"full_name":"Trainer Test"}'),
 ('b1000000-0000-4000-8000-000000000001','p1@x.io','{"full_name":"Alice Mukendi"}'),
 ('b2000000-0000-4000-8000-000000000002','p2@x.io','{"full_name":"Bob Kabila"}'),
 ('b3000000-0000-4000-8000-000000000003','p3@x.io','{"full_name":"Carine Ilunga"}'),
 ('b4000000-0000-4000-8000-000000000004','p4@x.io','{"full_name":"David Tshisekedi"}'),
 ('c1000000-0000-4000-8000-000000000001','outsider@x.io','{"full_name":"Eve Externe"}');
update public.profiles set role = 'ADMIN' where email = 'tadmin@joe.dev';
update public.profiles set role = 'INSTRUCTOR' where email = 'ttrainer@joe.dev';

insert into public.courses (id,slug,title,short_description,category,status,duration,trainer_name) values
 ('e1000000-0000-4000-8000-0000000000a1','sites-web','Création de sites web','Formation présentielle en création de sites web.','Web','PUBLIEE','5 jours','Joe Formateur'),
 ('e2000000-0000-4000-8000-0000000000b2','brouillon','Formation brouillon','Formation non publiée pour test.','Web','BROUILLON',null,null);
select chk('mode par défaut des formations = PRESENTIEL', (select delivery_mode from public.courses where slug = 'sites-web') = 'PRESENTIEL');

\echo === SESSIONS : création et visibilité
select t('admin crée une session', $$insert into public.training_sessions (id,course_id,starts_on,ends_on,location,capacity,status,min_attendance_pct)
  values ('51000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-0000000000a1', current_date, current_date + 2, 'Kinshasa — Salle A', 2, 'OUVERT', 50)$$,
  'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select t('learner ne peut pas créer de session', $$insert into public.training_sessions (course_id,starts_on,ends_on,location,capacity) values ('e1000000-0000-4000-8000-0000000000a1', current_date, current_date, 'X', 5)$$,
  'authenticated', 'b1000000-0000-4000-8000-000000000001', false);
select t('instructeur ne peut pas créer de session (admin seulement)', $$insert into public.training_sessions (course_id,starts_on,ends_on,location,capacity) values ('e1000000-0000-4000-8000-0000000000a1', current_date, current_date, 'X', 5)$$,
  'authenticated', 'a2000000-0000-4000-8000-000000000002', false);
select t('anon ne peut pas créer de session', $$insert into public.training_sessions (course_id,starts_on,ends_on,location,capacity) values ('e1000000-0000-4000-8000-0000000000a1', current_date, current_date, 'X', 5)$$, 'anon', null, false);
select te('capacité > 0 exigée', $$insert into public.training_sessions (course_id,starts_on,ends_on,location,capacity) values ('e1000000-0000-4000-8000-0000000000a1', current_date, current_date, 'X', 0)$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', 'check');
select te('date de fin avant le début refusée', $$insert into public.training_sessions (course_id,starts_on,ends_on,location,capacity) values ('e1000000-0000-4000-8000-0000000000a1', current_date, current_date - 1, 'X', 5)$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', 'check');
insert into public.training_sessions (id,course_id,starts_on,ends_on,location,capacity,status) values
 ('50000000-0000-4000-8000-000000000000','e1000000-0000-4000-8000-0000000000a1', current_date + 30, current_date + 32, 'Brouillon', 10, 'BROUILLON'),
 ('5d000000-0000-4000-8000-0000000000d4','e2000000-0000-4000-8000-0000000000b2', current_date + 30, current_date + 32, 'Cours non publié', 10, 'OUVERT');
select cnt('anon voit la session ouverte', 'select 1 from public.training_sessions where id = ''51000000-0000-4000-8000-000000000001''', 'anon', null, 1);
select cnt('anon ne voit pas la session brouillon', 'select 1 from public.training_sessions where id = ''50000000-0000-4000-8000-000000000000''', 'anon', null, 0);
select cnt('anon ne voit pas la session d''une formation non publiée', 'select 1 from public.training_sessions where id = ''5d000000-0000-4000-8000-0000000000d4''', 'anon', null, 0);
select cnt('anon : places via training_seats (session ouverte)', 'select 1 from public.training_seats(array[''51000000-0000-4000-8000-000000000001''::uuid])', 'anon', null, 1);
select cnt('anon : training_seats ignore le brouillon', 'select 1 from public.training_seats(array[''50000000-0000-4000-8000-000000000000''::uuid])', 'anon', null, 0);

\echo === INSCRIPTIONS
select te('anon ne peut pas s''inscrire (fonction réservée aux connectés)', $$select public.register_for_training_session('51000000-0000-4000-8000-000000000001','A','B',null)$$, 'anon', null, 'permission denied');
select t('P1 s''inscrit via la fonction serveur', $$select public.register_for_training_session('51000000-0000-4000-8000-000000000001','Alice','Mukendi','+243000000')$$, 'authenticated', 'b1000000-0000-4000-8000-000000000001', true);
select chk('inscription créée EN_ATTENTE, email = celui du compte', (select status = 'EN_ATTENTE' and email = 'p1@x.io' and course_id = 'e1000000-0000-4000-8000-0000000000a1' from public.training_registrations where user_id = 'b1000000-0000-4000-8000-000000000001'));
select te('doublon refusé (déjà inscrit)', $$select public.register_for_training_session('51000000-0000-4000-8000-000000000001','Alice','Mukendi',null)$$, 'authenticated', 'b1000000-0000-4000-8000-000000000001', 'ALREADY_REGISTERED');
select te('nom vide refusé', $$select public.register_for_training_session('51000000-0000-4000-8000-000000000001','  ','Mukendi',null)$$, 'authenticated', 'b2000000-0000-4000-8000-000000000002', 'INVALID_NAME');
select te('session brouillon : inscription impossible', $$select public.register_for_training_session('50000000-0000-4000-8000-000000000000','Bob','Kabila',null)$$, 'authenticated', 'b2000000-0000-4000-8000-000000000002', 'NOT_OPEN');
select te('formation non publiée : inscription impossible', $$select public.register_for_training_session('5d000000-0000-4000-8000-0000000000d4','Bob','Kabila',null)$$, 'authenticated', 'b2000000-0000-4000-8000-000000000002', 'NOT_OPEN');
select te('P1 ne peut pas insérer directement une inscription (RLS)', $$insert into public.training_registrations (session_id,course_id,user_id,first_name,last_name,email,status) values ('51000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-0000000000a1','b1000000-0000-4000-8000-000000000001','H','H','p1@x.io','CONFIRMEE')$$, 'authenticated', 'b1000000-0000-4000-8000-000000000001', 'row-level security');
select aff('P1 ne peut pas se confirmer lui-même (UPDATE bloqué)', $$update public.training_registrations set status = 'CONFIRMEE' where email = 'p1@x.io'$$, 'authenticated', 'b1000000-0000-4000-8000-000000000001', 0);
select aff('P1 ne peut pas se valider lui-même', $$update public.training_registrations set validation_status = 'VALIDE' where email = 'p1@x.io'$$, 'authenticated', 'b1000000-0000-4000-8000-000000000001', 0);
select t('P2 s''inscrit', $$select public.register_for_training_session('51000000-0000-4000-8000-000000000001','Bob','Kabila',null)$$, 'authenticated', 'b2000000-0000-4000-8000-000000000002', true);
select t('P3 s''inscrit', $$select public.register_for_training_session('51000000-0000-4000-8000-000000000001','Carine','Ilunga','0811')$$, 'authenticated', 'b3000000-0000-4000-8000-000000000003', true);
select cnt('P1 ne voit que sa propre inscription', 'select 1 from public.training_registrations', 'authenticated', 'b1000000-0000-4000-8000-000000000001', 1);
select cnt('un externe connecté ne voit aucune inscription', 'select 1 from public.training_registrations', 'authenticated', 'c1000000-0000-4000-8000-000000000001', 0);
select te('anon : SELECT direct inscriptions → permission refusée', 'select * from public.training_registrations', 'anon', null, 'permission denied');
select cnt('admin voit toutes les inscriptions', 'select 1 from public.training_registrations', 'authenticated', 'a1000000-0000-4000-8000-000000000001', 3);
select cnt('instructeur ne voit pas les données personnelles des inscrits', 'select 1 from public.training_registrations', 'authenticated', 'a2000000-0000-4000-8000-000000000002', 0);

\echo === CAPACITÉ (formation complète)
select t('admin confirme P1', $$update public.training_registrations set status = 'CONFIRMEE' where email = 'p1@x.io'$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select chk('notification « Inscription confirmée » créée pour P1', exists (select 1 from public.notifications where user_id = 'b1000000-0000-4000-8000-000000000001' and title = 'Inscription confirmée' and link like '/app/formations/inscriptions/%'));
select t('admin confirme P2', $$update public.training_registrations set status = 'CONFIRMEE' where email = 'p2@x.io'$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select te('capacité 2 atteinte : confirmer P3 est refusé', $$update public.training_registrations set status = 'CONFIRMEE' where email = 'p3@x.io'$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', 'SESSION_FULL');
select te('session complète : P4 ne peut plus s''inscrire', $$select public.register_for_training_session('51000000-0000-4000-8000-000000000001','David','T',null)$$, 'authenticated', 'b4000000-0000-4000-8000-000000000004', 'SESSION_FULL');
select chk('training_seats compte 2 places prises', (select taken from public.training_seats(array['51000000-0000-4000-8000-000000000001'::uuid])) = 2);
select te('P3 ne peut pas annuler l''inscription d''un autre', format($$select public.cancel_training_registration(%L)$$, test_reg('p2@x.io')), 'authenticated', 'b3000000-0000-4000-8000-000000000003', 'FORBIDDEN');
select t('P2 annule son inscription', format($$select public.cancel_training_registration(%L)$$, test_reg('p2@x.io')), 'authenticated', 'b2000000-0000-4000-8000-000000000002', true);
select chk('inscription de P2 = ANNULEE', (select status from public.training_registrations where email = 'p2@x.io') = 'ANNULEE');
select te('P2 : annuler deux fois refusé', format($$select public.cancel_training_registration(%L)$$, test_reg('p2@x.io')), 'authenticated', 'b2000000-0000-4000-8000-000000000002', 'CANNOT_CANCEL');
select t('place libérée : admin peut maintenant confirmer P3', $$update public.training_registrations set status = 'CONFIRMEE' where email = 'p3@x.io'$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select te('P2 se réinscrit alors que la session est de nouveau pleine', $$select public.register_for_training_session('51000000-0000-4000-8000-000000000001','Bob','Kabila',null)$$, 'authenticated', 'b2000000-0000-4000-8000-000000000002', 'SESSION_FULL');
select te('identité d''une inscription immuable (user_id)', $$update public.training_registrations set user_id = 'b4000000-0000-4000-8000-000000000004' where email = 'p1@x.io'$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', 'IMMUTABLE');

\echo === ANNONCES, VISIBILITÉ ET NOTIFICATIONS
select t('admin publie une annonce PARTICIPANTS (session)', $$insert into public.training_announcements (id,course_id,session_id,kind,title,content,visibility,status)
  values ('a0000000-0000-4000-8000-0000000000a1','e1000000-0000-4000-8000-0000000000a1','51000000-0000-4000-8000-000000000001','CHANGEMENT_SALLE','Changement de salle','La session aura lieu en salle B.','PARTICIPANTS','PUBLIEE')$$,
  'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select chk('auteur et date de publication posés côté serveur', (select author_id = 'a1000000-0000-4000-8000-000000000001' and published_at is not null from public.training_announcements where id = 'a0000000-0000-4000-8000-0000000000a1'));
select cnt('notification créée pour P1 (inscrit)', 'select 1 from public.notifications where user_id = ''b1000000-0000-4000-8000-000000000001'' and kind = ''ANNOUNCEMENT''', 'authenticated', 'b1000000-0000-4000-8000-000000000001', 1);
select cnt('notification créée pour P3 (inscrit)', 'select 1 from public.notifications where user_id = ''b3000000-0000-4000-8000-000000000003'' and kind = ''ANNOUNCEMENT''', 'authenticated', 'b3000000-0000-4000-8000-000000000003', 1);
select cnt('aucune notification pour P2 (inscription annulée)', 'select 1 from public.notifications where user_id = ''b2000000-0000-4000-8000-000000000002'' and kind = ''ANNOUNCEMENT''', 'authenticated', 'b2000000-0000-4000-8000-000000000002', 0);
select cnt('aucune notification pour un non-inscrit', 'select 1 from public.notifications where user_id = ''c1000000-0000-4000-8000-000000000001'' and kind = ''ANNOUNCEMENT''', 'authenticated', 'c1000000-0000-4000-8000-000000000001', 0);
select chk('texte de la notification conforme', (select body from public.notifications where user_id = 'b1000000-0000-4000-8000-000000000001' and kind = 'ANNOUNCEMENT') = 'Une nouvelle information a été publiée concernant votre formation Création de sites web.');
update public.training_announcements set title = 'Changement de salle (mise à jour)' where id = 'a0000000-0000-4000-8000-0000000000a1';
select chk('re-sauvegarder une annonce ne crée pas de seconde notification', (select count(*) from public.notifications where user_id = 'b1000000-0000-4000-8000-000000000001' and kind = 'ANNOUNCEMENT') = 1);
select cnt('P1 voit l''annonce PARTICIPANTS', 'select 1 from public.training_announcements', 'authenticated', 'b1000000-0000-4000-8000-000000000001', 1);
select cnt('P2 (annulé) ne voit pas l''annonce PARTICIPANTS', 'select 1 from public.training_announcements', 'authenticated', 'b2000000-0000-4000-8000-000000000002', 0);
select cnt('un externe ne voit pas l''annonce PARTICIPANTS', 'select 1 from public.training_announcements', 'authenticated', 'c1000000-0000-4000-8000-000000000001', 0);
select cnt('anon ne voit pas l''annonce PARTICIPANTS', 'select 1 from public.training_announcements', 'anon', null, 0);
insert into public.training_announcements (course_id,kind,title,content,visibility,status) values
 ('e1000000-0000-4000-8000-0000000000a1','OUVERTURE_INSCRIPTIONS','Inscriptions ouvertes','Annonce publique.','PUBLIC','PUBLIEE'),
 ('e1000000-0000-4000-8000-0000000000a1','INFORMATION','Brouillon public','Pas encore publiée.','PUBLIC','BROUILLON'),
 ('e1000000-0000-4000-8000-0000000000a1','INFORMATION','Expirée','Annonce expirée.','PUBLIC','PUBLIEE'),
 ('e1000000-0000-4000-8000-0000000000a1','INFORMATION','Note formateurs','Pour les formateurs.','FORMATEURS','PUBLIEE'),
 ('e1000000-0000-4000-8000-0000000000a1','INFORMATION','Note admin','Réservée admin.','ADMIN','PUBLIEE');
update public.training_announcements set expires_at = now() - interval '1 day' where title = 'Expirée';
select cnt('anon voit uniquement l''annonce PUBLIC publiée non expirée', 'select 1 from public.training_announcements', 'anon', null, 1);
select cnt('P1 voit PARTICIPANTS + PUBLIC (pas FORMATEURS/ADMIN/brouillon/expirée)', 'select 1 from public.training_announcements', 'authenticated', 'b1000000-0000-4000-8000-000000000001', 2);
select cnt('formateur voit PUBLIC + FORMATEURS', 'select 1 from public.training_announcements', 'authenticated', 'a2000000-0000-4000-8000-000000000002', 2);
select cnt('admin voit toutes les annonces (6)', 'select 1 from public.training_announcements', 'authenticated', 'a1000000-0000-4000-8000-000000000001', 6);
select t('learner ne peut pas créer d''annonce', $$insert into public.training_announcements (course_id,title,content,visibility) values ('e1000000-0000-4000-8000-0000000000a1','x','y','PUBLIC')$$, 'authenticated', 'b1000000-0000-4000-8000-000000000001', false);
select te('annonce PARTICIPANTS sans formation refusée', $$insert into public.training_announcements (title,content,visibility) values ('x','y','PARTICIPANTS')$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', 'check');
select te('image d''annonce : seule une URL http(s) est acceptée', $$insert into public.training_announcements (course_id,title,content,visibility,image_url) values ('e1000000-0000-4000-8000-0000000000a1','x','y','PUBLIC','javascript:alert(1)')$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', 'check');

\echo === PRÉSENCES (écriture serveur uniquement)
update public.training_sessions set trainer_id = 'a2000000-0000-4000-8000-000000000002', trainer_name = 'Trainer Test' where id = '51000000-0000-4000-8000-000000000001';
select cnt('formateur : roster = participants confirmés (P1, P3)', 'select 1 from public.get_session_roster(''51000000-0000-4000-8000-000000000001'')', 'authenticated', 'a2000000-0000-4000-8000-000000000002', 2);
select chk('roster : seulement id, prénom, nom, statut (pas d''email ni de téléphone)',
  (select array_agg(k order by k) from jsonb_object_keys(jx($$select to_jsonb(r) from public.get_session_roster('51000000-0000-4000-8000-000000000001') r limit 1$$, 'authenticated', 'a2000000-0000-4000-8000-000000000002')) k) = array['first_name','last_name','registration_id','status']);
select te('participant ne peut pas lire le roster', $$select * from public.get_session_roster('51000000-0000-4000-8000-000000000001')$$, 'authenticated', 'b1000000-0000-4000-8000-000000000001', 'FORBIDDEN');
select te('externe ne peut pas pointer', format($$select public.set_attendance(%L, current_date, 'PRESENT')$$, test_reg('p1@x.io')), 'authenticated', 'c1000000-0000-4000-8000-000000000001', 'FORBIDDEN');
select te('P1 ne peut pas se déclarer présent (fonction)', format($$select public.set_attendance(%L, current_date, 'PRESENT')$$, test_reg('p1@x.io')), 'authenticated', 'b1000000-0000-4000-8000-000000000001', 'FORBIDDEN');
select te('P1 ne peut pas se déclarer présent (INSERT direct)', format($$insert into public.training_attendance (session_id,registration_id,attendance_date,status) values ('51000000-0000-4000-8000-000000000001', %L, current_date, 'PRESENT')$$, test_reg('p1@x.io')), 'authenticated', 'b1000000-0000-4000-8000-000000000001', 'permission denied');
select te('anon ne peut pas utiliser le QR de pointage', format($$select public.training_check_in(%L, current_date)$$, test_tok('p1@x.io')), 'anon', null, 'permission denied');
select te('P1 ne peut pas pointer avec son propre QR', format($$select public.training_check_in(%L, current_date)$$, test_tok('p1@x.io')), 'authenticated', 'b1000000-0000-4000-8000-000000000001', 'FORBIDDEN');
select te('jeton QR invalide refusé', $$select public.training_check_in('nimportequoi', current_date)$$, 'authenticated', 'a2000000-0000-4000-8000-000000000002', 'INVALID_TOKEN');
select t('formateur pointe P1 PRESENT (jour 1) par QR', format($$select public.training_check_in(%L, current_date)$$, test_tok('p1@x.io')), 'authenticated', 'a2000000-0000-4000-8000-000000000002', true);
select t('QR rejoué : idempotent (pas de doublon)', format($$select public.training_check_in(%L, current_date)$$, test_tok('p1@x.io')), 'authenticated', 'a2000000-0000-4000-8000-000000000002', true);
select chk('une seule ligne de présence pour P1 / jour 1', (select count(*) from public.training_attendance where registration_id = test_reg('p1@x.io')) = 1);
select chk('P1 passe automatiquement à PRESENT après son pointage', (select status from public.training_registrations where email = 'p1@x.io') = 'PRESENT');
select t('formateur pointe P1 RETARD jour 2 (manuel)', format($$select public.set_attendance(%L, current_date + 1, 'RETARD')$$, test_reg('p1@x.io')), 'authenticated', 'a2000000-0000-4000-8000-000000000002', true);
select t('admin pointe P3 ABSENT jour 1', format($$select public.set_attendance(%L, current_date, 'ABSENT')$$, test_reg('p3@x.io')), 'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select t('admin pointe P3 ABSENT jour 2', format($$select public.set_attendance(%L, current_date + 1, 'ABSENT')$$, test_reg('p3@x.io')), 'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select te('date hors session refusée', format($$select public.set_attendance(%L, current_date + 10, 'PRESENT')$$, test_reg('p1@x.io')), 'authenticated', 'a1000000-0000-4000-8000-000000000001', 'DATE_OUT_OF_RANGE');
select te('inscription annulée : pointage refusé', format($$select public.set_attendance(%L, current_date, 'PRESENT')$$, test_reg('p2@x.io')), 'authenticated', 'a1000000-0000-4000-8000-000000000001', 'NOT_CONFIRMED');
select cnt('P1 voit sa propre présence (2 jours)', 'select 1 from public.training_attendance', 'authenticated', 'b1000000-0000-4000-8000-000000000001', 2);
select cnt('P3 ne voit que ses propres présences (2)', 'select 1 from public.training_attendance', 'authenticated', 'b3000000-0000-4000-8000-000000000003', 2);
select cnt('externe ne voit aucune présence', 'select 1 from public.training_attendance', 'authenticated', 'c1000000-0000-4000-8000-000000000001', 0);
select te('un participant ne peut pas modifier une présence (aucun droit d''écriture)', $$update public.training_attendance set status = 'PRESENT'$$, 'authenticated', 'b3000000-0000-4000-8000-000000000003', 'permission denied');
select aff('formateur ne modifie pas la session (RLS)', $$update public.training_sessions set capacity = 99 where id = '51000000-0000-4000-8000-000000000001'$$, 'authenticated', 'a2000000-0000-4000-8000-000000000002', 0);

\echo === PUBLICATION DE LA LISTE
select te('publication impossible sans participant sélectionné', $$select public.publish_session_list('51000000-0000-4000-8000-000000000001', 'PARTICIPANTS')$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', 'EMPTY_LIST');
select t('admin sélectionne P1 et P3', $$update public.training_registrations set listed = true where email in ('p1@x.io','p3@x.io')$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select cnt('avant publication : liste privée (NOT_PUBLISHED, 0 ligne)', 'select 1 from jsonb_array_elements(public.get_published_list(''51000000-0000-4000-8000-000000000001'')->''rows'')', 'anon', null, 0);
select chk('avant publication : access = NOT_PUBLISHED', jx($$select public.get_published_list('51000000-0000-4000-8000-000000000001')$$, 'anon', null)->>'access' = 'NOT_PUBLISHED');
select te('P1 ne peut pas publier la liste', $$select public.publish_session_list('51000000-0000-4000-8000-000000000001', 'PUBLIC')$$, 'authenticated', 'b1000000-0000-4000-8000-000000000001', 'FORBIDDEN');
select te('visibilité invalide refusée', $$select public.publish_session_list('51000000-0000-4000-8000-000000000001', 'TOUS')$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', 'INVALID_VISIBILITY');
select t('admin publie la liste (réservée aux participants)', $$select public.publish_session_list('51000000-0000-4000-8000-000000000001', 'PARTICIPANTS')$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select chk('session : liste_status = PUBLIEE', (select list_status = 'PUBLIEE' and list_visibility = 'PARTICIPANTS' from public.training_sessions where id = '51000000-0000-4000-8000-000000000001'));
select chk('anon : LOGIN_REQUIRED', jx($$select public.get_published_list('51000000-0000-4000-8000-000000000001')$$, 'anon', null)->>'access' = 'LOGIN_REQUIRED');
select chk('externe connecté : FORBIDDEN', jx($$select public.get_published_list('51000000-0000-4000-8000-000000000001')$$, 'authenticated', 'c1000000-0000-4000-8000-000000000001')->>'access' = 'FORBIDDEN');
select chk('participant : voit 2 noms', jsonb_array_length(jx($$select public.get_published_list('51000000-0000-4000-8000-000000000001')$$, 'authenticated', 'b1000000-0000-4000-8000-000000000001')->'rows') = 2);
select chk('liste : uniquement numéro, prénom, nom (aucune donnée privée)',
  (select array_agg(k order by k) from (select distinct jsonb_object_keys(e) k from jsonb_array_elements(jx($$select public.get_published_list('51000000-0000-4000-8000-000000000001')$$, 'authenticated', 'b1000000-0000-4000-8000-000000000001')->'rows') e) q) = array['first_name','last_name','number']);
select chk('liste : aucun email ni téléphone dans la réponse', jx($$select public.get_published_list('51000000-0000-4000-8000-000000000001')$$, 'authenticated', 'b1000000-0000-4000-8000-000000000001')::text !~ '(@|0811|\+243)');
select chk('notification « liste publiée » pour un inscrit actif', exists (select 1 from public.notifications where user_id = 'b1000000-0000-4000-8000-000000000001' and kind = 'LIST'));
select t('admin passe la liste en PUBLIC', $$select public.publish_session_list('51000000-0000-4000-8000-000000000001', 'PUBLIC')$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select chk('liste publique : anon voit 2 noms', jsonb_array_length(jx($$select public.get_published_list('51000000-0000-4000-8000-000000000001')$$, 'anon', null)->'rows') = 2);
select chk('liste publique : aucune donnée privée pour anon', jx($$select public.get_published_list('51000000-0000-4000-8000-000000000001')$$, 'anon', null)::text !~ '(@|0811|\+243)');
select t('admin dépublie la liste', $$select public.unpublish_session_list('51000000-0000-4000-8000-000000000001')$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select chk('après dépublication : NOT_PUBLISHED', jx($$select public.get_published_list('51000000-0000-4000-8000-000000000001')$$, 'anon', null)->>'access' = 'NOT_PUBLISHED');

\echo === FIN DE FORMATION ET CERTIFICATS
select te('certificats impossibles avant la fin de la formation', $$select public.issue_session_certificates('51000000-0000-4000-8000-000000000001')$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', 'SESSION_NOT_COMPLETED');
select aff('learner ne peut pas terminer une session', $$update public.training_sessions set status = 'TERMINEE' where id = '51000000-0000-4000-8000-000000000001'$$, 'authenticated', 'b1000000-0000-4000-8000-000000000001', 0);
select t('admin termine la session', $$update public.training_sessions set status = 'TERMINEE' where id = '51000000-0000-4000-8000-000000000001'$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select chk('completed_at renseigné', (select completed_at is not null from public.training_sessions where id = '51000000-0000-4000-8000-000000000001'));
select chk('aucun certificat tant que les participants ne sont pas validés', (select count(*) from public.certificates where session_id = '51000000-0000-4000-8000-000000000001') = 0);
select chk('P1 non éligible : NOT_VALIDATED', (public._training_eligibility(test_reg('p1@x.io'))->'reasons') ? 'NOT_VALIDATED');
select chk('P2 (annulé) non éligible : NOT_CONFIRMED', (public._training_eligibility(test_reg('p2@x.io'))->'reasons') ? 'NOT_CONFIRMED');
select aff('P1 ne peut pas se valider lui-même après la fin', $$update public.training_registrations set validation_status = 'VALIDE' where email = 'p1@x.io'$$, 'authenticated', 'b1000000-0000-4000-8000-000000000001', 0);
select t('admin valide P1 → certificat généré automatiquement', $$update public.training_registrations set validation_status = 'VALIDE' where email = 'p1@x.io'$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select chk('certificat P1 créé (1)', (select count(*) from public.certificates c join public.training_registrations r on r.id = c.registration_id where r.email = 'p1@x.io') = 1);
select chk('numéro au format JDC-AAAA-XXXXXX', test_cert_no('p1@x.io') ~ '^JDC-[0-9]{4}-[A-HJ-NP-Z2-9]{6}$');
select chk('UUID interne distinct du numéro', (select id::text <> certificate_number from public.certificates where certificate_number = test_cert_no('p1@x.io')));
select chk('instantané : nom, formation, dates, lieu, formateur, durée',
  (select holder_name = 'Alice MUKENDI' and course_title = 'Création de sites web' and period_start = current_date and period_end = current_date + 2
          and location = 'Kinshasa — Salle A' and trainer_name = 'Trainer Test' and duration_label = '5 jours' and status = 'VALIDE'
   from public.certificates where certificate_number = test_cert_no('p1@x.io')));
select chk('notification « Votre certificat est disponible » avec lien', exists (select 1 from public.notifications where user_id = 'b1000000-0000-4000-8000-000000000001' and kind = 'CERTIFICATE' and link like '/app/certificats/%'));
select t('admin valide P3 (mais présence 0 %)', $$update public.training_registrations set validation_status = 'VALIDE' where email = 'p3@x.io'$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select chk('P3 : présence insuffisante → pas de certificat', (select count(*) from public.certificates c join public.training_registrations r on r.id = c.registration_id where r.email = 'p3@x.io') = 0);
select chk('P3 : raison ATTENDANCE_BELOW_MIN', (public._training_eligibility(test_reg('p3@x.io'))->'reasons') ? 'ATTENDANCE_BELOW_MIN');
select chk('P1 : présence 100 % (retard compté présent)', (public._training_eligibility(test_reg('p1@x.io'))->>'attendance_pct')::numeric = 100);
select chk('issue_session_certificates : 1er appel = 0 nouveau (P1 déjà émis, P3 inéligible)',
  (jx($$select public.issue_session_certificates('51000000-0000-4000-8000-000000000001')$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001')->>'issued')::int = 0);
select chk('aucun doublon après ré-émission (1 certificat)', (select count(*) from public.certificates where session_id = '51000000-0000-4000-8000-000000000001') = 1);
select te('P1 ne peut pas déclencher l''émission', $$select public.issue_session_certificates('51000000-0000-4000-8000-000000000001')$$, 'authenticated', 'b1000000-0000-4000-8000-000000000001', 'FORBIDDEN');
select t('admin : critère de présence assoupli à 0 → P3 devient éligible', $$update public.training_sessions set min_attendance_pct = null where id = '51000000-0000-4000-8000-000000000001'$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select chk('issue_session_certificates : P3 reçoit son certificat, P1 déjà émis',
  (jx($$select public.issue_session_certificates('51000000-0000-4000-8000-000000000001')$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001') ->> 'issued')::int = 1);
select chk('2 certificats au total, aucun doublon', (select count(*) from public.certificates where session_id = '51000000-0000-4000-8000-000000000001') = 2);
select chk('ré-émission suivante : 0 nouveau, 2 déjà émis',
  (select (j->>'issued')::int = 0 and (j->>'already_issued')::int = 2 from (select jx($$select public.issue_session_certificates('51000000-0000-4000-8000-000000000001')$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001') j) q));
select cnt('P1 voit son certificat', 'select 1 from public.certificates', 'authenticated', 'b1000000-0000-4000-8000-000000000001', 1);
select cnt('externe ne voit aucun certificat', 'select 1 from public.certificates', 'authenticated', 'c1000000-0000-4000-8000-000000000001', 0);
select cnt('admin voit les 2 certificats de la session', 'select 1 from public.certificates where session_id = ''51000000-0000-4000-8000-000000000001''', 'authenticated', 'a1000000-0000-4000-8000-000000000001', 2);
select te('anon : SELECT direct certificats → permission refusée', 'select * from public.certificates', 'anon', null, 'permission denied');
select te('P1 ne peut pas fabriquer un certificat (INSERT direct)', $$insert into public.certificates (user_id, course_id, certificate_number) values ('b1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-0000000000a1','JDC-2026-FORGED')$$, 'authenticated', 'b1000000-0000-4000-8000-000000000001', 'row-level security');
select aff('P1 ne peut pas modifier son certificat', $$update public.certificates set holder_name = 'Autre'$$, 'authenticated', 'b1000000-0000-4000-8000-000000000001', 0);
select te('numéro de certificat unique (index)', format($$insert into public.certificates (user_id, course_id, certificate_number, registration_id) values ('b4000000-0000-4000-8000-000000000004','e1000000-0000-4000-8000-0000000000a1', %L, null)$$, test_cert_no('p1@x.io')), 'postgres', null, 'duplicate key');
select cnt('certificats : 2 numéros distincts', 'select distinct certificate_number from public.certificates where session_id = ''51000000-0000-4000-8000-000000000001''', 'authenticated', 'a1000000-0000-4000-8000-000000000001', 2);

\echo === VÉRIFICATION PUBLIQUE, RÉVOCATION
select chk('anon : certificat vérifié VALIDE', jx(format($$select public.verify_certificate(%L)$$, test_cert_no('p1@x.io')), 'anon', null)->>'status' = 'VALIDE');
select chk('vérification : nom, formation, lieu, dates, durée, numéro, date de délivrance',
  (select j ?& array['holder_name','course_title','location','period_start','period_end','duration_label','certificate_number','issued_at'] from (select jx(format($$select public.verify_certificate(%L)$$, test_cert_no('p1@x.io')), 'anon', null) j) q));
select chk('vérification : aucune donnée privée (email, téléphone, ids)', jx(format($$select public.verify_certificate(%L)$$, test_cert_no('p1@x.io')), 'anon', null)::text !~ '(p1@x\.io|\+243|user_id|registration_id|b1000000)');
select chk('numéro insensible à la casse et aux espaces', jx(format($$select public.verify_certificate(%L)$$, ' ' || lower(test_cert_no('p1@x.io')) || ' '), 'anon', null)->>'status' = 'VALIDE');
select chk('numéro inconnu : found = false', (jx($$select public.verify_certificate('JDC-2026-ZZZZZZ')$$, 'anon', null)->>'found')::boolean = false);
select chk('entrée vide / trop longue : found = false', (jx($$select public.verify_certificate('')$$, 'anon', null)->>'found')::boolean = false and (jx(format($$select public.verify_certificate(%L)$$, repeat('A', 80)), 'anon', null)->>'found')::boolean = false);
select chk('injection SQL dans le numéro : sans effet', (jx($$select public.verify_certificate('x'' or ''1''=''1')$$, 'anon', null)->>'found')::boolean = false);
select te('learner ne peut pas révoquer', format($$select public.revoke_certificate(%L, 'test')$$, (select id from public.certificates where certificate_number = test_cert_no('p1@x.io'))), 'authenticated', 'b1000000-0000-4000-8000-000000000001', 'FORBIDDEN');
select te('anon ne peut pas révoquer', format($$select public.revoke_certificate(%L, 'test')$$, (select id from public.certificates where certificate_number = test_cert_no('p1@x.io'))), 'anon', null, 'permission denied');
select t('admin révoque le certificat de P1', format($$select public.revoke_certificate(%L, 'Erreur de saisie')$$, (select id from public.certificates where certificate_number = test_cert_no('p1@x.io'))), 'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select chk('révoqué : status = REVOQUE', jx(format($$select public.verify_certificate(%L)$$, test_cert_no('p1@x.io')), 'anon', null)->>'status' = 'REVOQUE');
select chk('révoqué : aucune information personnelle exposée', not (jx(format($$select public.verify_certificate(%L)$$, test_cert_no('p1@x.io')), 'anon', null) ?| array['holder_name','course_title','location']));
select chk('révoqué : un nouvel appel d''émission ne ré-émet pas', (select count(*) from public.certificates where registration_id = test_reg('p1@x.io')) = 1
  and (public._issue_certificate(test_reg('p1@x.io'))) = (select id from public.certificates where registration_id = test_reg('p1@x.io')));
select t('admin rétablit le certificat', format($$select public.restore_certificate(%L)$$, (select id from public.certificates where certificate_number = test_cert_no('p1@x.io'))), 'authenticated', 'a1000000-0000-4000-8000-000000000001', true);
select chk('rétabli : VALIDE de nouveau', jx(format($$select public.verify_certificate(%L)$$, test_cert_no('p1@x.io')), 'anon', null)->>'status' = 'VALIDE');
select cnt('admin voit le journal des vérifications (≥ 5)', 'select 1 from public.certificate_verifications', 'authenticated', 'a1000000-0000-4000-8000-000000000001', (select count(*) from public.certificate_verifications));
select cnt('P1 ne voit pas le journal des vérifications', 'select 1 from public.certificate_verifications', 'authenticated', 'b1000000-0000-4000-8000-000000000001', 0);
select chk('journal : seules les vérifications de certificats existants sont enregistrées', (select count(*) from public.certificate_verifications) between 5 and 8);

\echo === INTÉGRITÉ : suppression, ancien parcours en ligne
select te('formation avec certificats : suppression refusée', $$delete from public.courses where id = 'e1000000-0000-4000-8000-0000000000a1'$$, 'authenticated', 'a1000000-0000-4000-8000-000000000001', 'COURSE_HAS_CERTIFICATES');
select chk('les certificats existent toujours', (select count(*) from public.certificates where course_id = 'e1000000-0000-4000-8000-0000000000a1') = 2);
insert into public.courses (id,slug,title,short_description,category,status,delivery_mode,has_certificate) values
 ('e3000000-0000-4000-8000-0000000000c3','en-ligne','Cours en ligne','Cours entièrement en ligne pour test.','Web','PUBLIEE','EN_LIGNE', true),
 ('e4000000-0000-4000-8000-0000000000c4','pres-lecons','Présentiel avec supports','Présentiel avec supports en ligne pour test.','Web','PUBLIEE','PRESENTIEL', true);
insert into public.course_modules (id,course_id,title) values ('f3000000-0000-4000-8000-0000000000c3','e3000000-0000-4000-8000-0000000000c3','M'),('f4000000-0000-4000-8000-0000000000c4','e4000000-0000-4000-8000-0000000000c4','M');
insert into public.lessons (id,module_id,course_id,title,is_published) values
 ('13000000-0000-4000-8000-0000000000c3','f3000000-0000-4000-8000-0000000000c3','e3000000-0000-4000-8000-0000000000c3','L',true),
 ('14000000-0000-4000-8000-0000000000c4','f4000000-0000-4000-8000-0000000000c4','e4000000-0000-4000-8000-0000000000c4','L',true);
insert into public.enrollments (user_id,course_id) values ('b4000000-0000-4000-8000-000000000004','e3000000-0000-4000-8000-0000000000c3'),('b4000000-0000-4000-8000-000000000004','e4000000-0000-4000-8000-0000000000c4');
insert into public.lesson_progress (user_id,course_id,lesson_id) values
 ('b4000000-0000-4000-8000-000000000004','e3000000-0000-4000-8000-0000000000c3','13000000-0000-4000-8000-0000000000c3'),
 ('b4000000-0000-4000-8000-000000000004','e4000000-0000-4000-8000-0000000000c4','14000000-0000-4000-8000-0000000000c4');
select chk('formation EN_LIGNE : l''ancien parcours délivre toujours un certificat (numéro JDC attribué)', exists (select 1 from public.certificates where user_id = 'b4000000-0000-4000-8000-000000000004' and course_id = 'e3000000-0000-4000-8000-0000000000c3' and certificate_number ~ '^JDC-[0-9]{4}-'));
select chk('formation PRESENTIEL : terminer les leçons ne délivre PAS de certificat', not exists (select 1 from public.certificates where user_id = 'b4000000-0000-4000-8000-000000000004' and course_id = 'e4000000-0000-4000-8000-0000000000c4'));
select chk('formation PRESENTIEL : l''inscription aux supports est bien marquée terminée', (select status from public.enrollments where user_id = 'b4000000-0000-4000-8000-000000000004' and course_id = 'e4000000-0000-4000-8000-0000000000c4') = 'TERMINEE');

\echo === EXÉCUTION DES FONCTIONS INTERNES PAR LE PUBLIC
select te('anon ne peut pas appeler _issue_certificate', format($$select public._issue_certificate(%L)$$, test_reg('p3@x.io')), 'anon', null, 'permission denied');
select te('un participant ne peut pas appeler _issue_certificate', format($$select public._issue_certificate(%L)$$, test_reg('p3@x.io')), 'authenticated', 'b3000000-0000-4000-8000-000000000003', 'permission denied');
select te('un participant ne peut pas appeler _mark_attendance', format($$select public._mark_attendance(%L, current_date, 'PRESENT', 'MANUEL')$$, test_reg('p3@x.io')), 'authenticated', 'b3000000-0000-4000-8000-000000000003', 'permission denied');

drop function test_reg(text, uuid); drop function test_tok(text); drop function test_cert_no(text);
