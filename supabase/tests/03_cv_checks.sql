-- CV : visibilité publique, champs privés, rôles. Réutilise les utilisateurs de 01_rls_checks.sql (admin / alice learner / inst).
\pset pager off
\echo === CV
insert into public.cv_profiles (first_name,last_name,display_name,headline,email,phone,github,summary_short,summary_long,show_email,show_phone,is_public,template)
values ('Joe','Dev','Joe Dev','Développeur • Formateur','joe@secret.io','+243000','https://github.com/x','Court','Long',false,false,false,'modern');
insert into public.cv_skills(category,name,position,is_visible) values ('Frontend','React',0,true),('Frontend','SecretSkill',1,false);
insert into public.cv_experiences(role,organization,is_visible) values ('Dev','Org',true),('Poste masqué','Org2',false);
insert into public.cv_languages(language,level) values ('Français','Courant');
update public.projects set show_in_cv=false;
insert into public.projects(slug,title,summary,category,is_published,show_in_cv,results) values
 ('cv-ok','Projet CV','Résumé','Web',true,true,'Résultat réel'),
 ('cv-off','Projet hors CV','x','Web',true,false,null),
 ('cv-draft','Projet brouillon','x','Web',false,true,null);
update public.courses set show_in_cv=true where slug='a';
update public.courses set show_in_cv=true where slug='secret';  -- brouillon : ne doit jamais sortir

create or replace function pub_cv() returns jsonb language plpgsql as $f$
declare r jsonb; begin set local role anon; perform set_config('request.jwt.claim.sub','',true);
  select public.get_public_cv() into r; reset role; return r; end $f$;

select 'PASS' as res, 'CV non publié : get_public_cv() = NULL pour anon' as test where pub_cv() is null
union all select 'FAIL','CV non publié exposé' where pub_cv() is not null;

update public.cv_profiles set is_public = true;
select case when pub_cv() is not null then 'PASS' else 'FAIL' end, 'CV publié : visible pour anon';
select case when pub_cv()->'profile'->>'email' is null and pub_cv()->'profile'->>'phone' is null then 'PASS' else 'FAIL' end, 'email/téléphone masqués tant que show_email/show_phone = false';
select case when jsonb_array_length(pub_cv()->'skills') = 1 and pub_cv()->'skills'->0->>'name' = 'React' then 'PASS' else 'FAIL' end, 'compétence masquée absente du CV public';
select case when jsonb_array_length(pub_cv()->'experiences') = 1 then 'PASS' else 'FAIL' end, 'expérience masquée absente';
select case when jsonb_array_length(pub_cv()->'projects') = 1 and pub_cv()->'projects'->0->>'slug' = 'cv-ok' then 'PASS' else 'FAIL' end, 'projets : seulement publié + show_in_cv';
select case when jsonb_array_length(pub_cv()->'trainer_courses') = 1 and pub_cv()->'trainer_courses'->0->>'slug' = 'a' then 'PASS' else 'FAIL' end, 'formateur : seule la formation PUBLIÉE cochée apparaît';
select case when jsonb_array_length(pub_cv()->'services') = 0 then 'PASS' else 'FAIL' end, 'services masqués par défaut (show_services = false)';
select case when pub_cv()->>'updated_at' is not null then 'PASS' else 'FAIL' end, 'date de mise à jour issue de la base';

update public.cv_profiles set show_email = true, show_phone = true, show_services = true;
insert into public.services(title,description,is_published) values ('Développement web','x',true),('Service brouillon','x',false);
select case when pub_cv()->'profile'->>'email' = 'joe@secret.io' and pub_cv()->'profile'->>'phone' = '+243000' then 'PASS' else 'FAIL' end, 'email/téléphone visibles quand activés';
select case when exists (select 1 from jsonb_array_elements(pub_cv()->'services') x where x->>'title' = 'Développement web')
  and not exists (select 1 from jsonb_array_elements(pub_cv()->'services') x where x->>'title' = 'Service brouillon') then 'PASS' else 'FAIL' end, 'services : publiés visibles, brouillon absent (quand activés)';

update public.projects set show_in_cv = false where slug = 'cv-ok';
select case when jsonb_array_length(pub_cv()->'projects') = 0 then 'PASS' else 'FAIL' end, 'décocher « Afficher dans mon CV » retire le projet';

select case when public.cv_is_published() then 'PASS' else 'FAIL' end, 'cv_is_published() = true';
update public.cv_profiles set is_public = false;
select case when pub_cv() is null and not public.cv_is_published() then 'PASS' else 'FAIL' end, 'dépublier → NULL immédiatement';
update public.cv_profiles set is_public = true;

-- Accès direct aux tables
create or replace function direct(label text, sql text, who text, uid text, expect_ok boolean) returns text language plpgsql as $f$
declare ok boolean := true; n bigint; begin
  execute format('set local role %I', who); perform set_config('request.jwt.claim.sub', coalesce(uid,''), true);
  begin execute sql; get diagnostics n = row_count; exception when others then ok := false; end;
  reset role;
  return case when ok = expect_ok then 'PASS' else 'FAIL' end; end $f$;
create or replace function seen(sql text, who text, uid text) returns bigint language plpgsql as $f$
declare n bigint; begin
  execute format('set local role %I', who); perform set_config('request.jwt.claim.sub', coalesce(uid,''), true);
  begin execute 'select count(*) from (' || sql || ') q' into n; exception when others then n := -1; end;
  reset role; return n; end $f$;

select case when seen('select 1 from public.cv_profiles','anon',null) = -1 then 'PASS' else 'FAIL' end, 'anon : SELECT direct sur cv_profiles refusé (permission)';
select case when seen('select 1 from public.cv_skills','anon',null) = -1 then 'PASS' else 'FAIL' end, 'anon : SELECT direct sur cv_skills refusé';
select case when seen('select 1 from public.cv_profiles','authenticated','b0000000-0000-4000-8000-000000000002') = 0 then 'PASS' else 'FAIL' end, 'learner : ne voit aucune ligne cv_profiles';
select case when seen('select 1 from public.cv_skills','authenticated','d0000000-0000-4000-8000-000000000004') = 0 then 'PASS' else 'FAIL' end, 'instructeur : ne voit aucune compétence (masquée comprise)';
select case when seen('select 1 from public.cv_skills','authenticated','a0000000-0000-4000-8000-000000000001') = 2 then 'PASS' else 'FAIL' end, 'admin : voit toutes les compétences (2)';
select direct('learner ne modifie pas le CV', $$update public.cv_profiles set headline='piraté'$$, 'authenticated','b0000000-0000-4000-8000-000000000002', true) || ' ' ||
  case when (select headline from public.cv_profiles) <> 'piraté' then 'learner : UPDATE sans effet' else 'learner a modifié le CV !' end;
select case when direct('learner INSERT cv_skills', $$insert into public.cv_skills(name) values ('hack')$$, 'authenticated','b0000000-0000-4000-8000-000000000002', false) = 'PASS' then 'PASS' else 'FAIL' end, 'learner : INSERT cv_skills refusé';
select case when direct('instructeur INSERT cv_skills', $$insert into public.cv_skills(name) values ('hack')$$, 'authenticated','d0000000-0000-4000-8000-000000000004', false) = 'PASS' then 'PASS' else 'FAIL' end, 'instructeur : INSERT cv_skills refusé';
select case when direct('anon INSERT cv_skills', $$insert into public.cv_skills(name) values ('hack')$$, 'anon', null, false) = 'PASS' then 'PASS' else 'FAIL' end, 'anon : INSERT cv_skills refusé';
select case when direct('admin INSERT cv_skills', $$insert into public.cv_skills(category,name) values ('Tools','Git')$$, 'authenticated','a0000000-0000-4000-8000-000000000001', true) = 'PASS' then 'PASS' else 'FAIL' end, 'admin : INSERT cv_skills autorisé';
select case when direct('2e profil CV', $$insert into public.cv_profiles(first_name) values ('Autre')$$, 'authenticated','a0000000-0000-4000-8000-000000000001', false) = 'PASS' then 'PASS' else 'FAIL' end, 'une seule ligne cv_profiles autorisée (même pour admin)';
select case when direct('template invalide', $$update public.cv_profiles set template='flashy'$$, 'authenticated','a0000000-0000-4000-8000-000000000001', false) = 'PASS' then 'PASS' else 'FAIL' end, 'template inconnu refusé';
select case when direct('learner execute RPC', $$select public.get_public_cv()$$, 'authenticated','b0000000-0000-4000-8000-000000000002', true) = 'PASS' then 'PASS' else 'FAIL' end, 'learner peut lire le CV PUBLIÉ via la RPC (comme tout visiteur)';
