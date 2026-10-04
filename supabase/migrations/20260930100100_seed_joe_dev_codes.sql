-- JOE DEV CODES — données de démonstration (contenu pédagogique uniquement : aucune statistique, aucun client, aucun témoignage).

insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('creation-de-sites-web','Création de sites web','Comprendre le Web, construire des pages HTML/CSS/JS et publier ton propre site.','Une formation pour passer de « je consomme le web » à « je crée pour le web ». Tu apprends la structure d''une page, le style, le responsive, l''interactivité et la mise en ligne, avec un site réel comme fil rouge.','DEBUTANT','6 semaines','PUBLIEE','Web',array['Expliquer comment fonctionne le Web','Structurer et styliser une page responsive','Ajouter de l’interactivité avec JavaScript','Publier un site en ligne']::text[],array['Savoir utiliser un ordinateur','Aucune expérience de code requise']::text[],'Créer et publier son propre site web.',true,false,0) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='creation-de-sites-web'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Comprendre le Web','Client, serveur, navigateur, URL.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Comprendre le Web') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Comment fonctionne le Web ?','TEXTE','Le navigateur (client) demande une page à un serveur via une URL ; le serveur répond avec du HTML, du CSS et du JavaScript.

### À retenir
- Client / serveur
- Requête / réponse
- HTML = structure, CSS = style, JS = comportement',10,0),
('Ton éditeur et ton premier fichier','EXERCICE','Installe un éditeur de code, crée un dossier `mon-site` et un fichier `index.html` qui affiche ton prénom.',15,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='creation-de-sites-web'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'HTML : la structure','Balises, sémantique, formulaires.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='HTML : la structure') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Structure d’une page HTML','CODE','```html
<!doctype html>
<html lang="fr">
  <head><meta charset="UTF-8" /><title>Mon site</title></head>
  <body><h1>Bonjour</h1></body>
</html>
```',15,0),
('Titres, listes, liens, images','TEXTE','Utilise les balises sémantiques (`header`, `main`, `section`, `footer`) pour donner du sens à ta page.',15,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='creation-de-sites-web'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'CSS : le style et le responsive','Sélecteurs, Flexbox, Grid, media queries.',2 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='CSS : le style et le responsive') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Sélecteurs et box model','TEXTE','Chaque élément est une boîte : contenu, padding, bordure, marge.',20,0),
('Flexbox et Grid','CODE','```css
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }
```',25,1),
('Rendre une page responsive','EXERCICE','Adapte ta page pour mobile, tablette et desktop avec des media queries.',25,2)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='creation-de-sites-web'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'JavaScript : rendre la page vivante','Variables, DOM, événements, formulaires, API.',3 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='JavaScript : rendre la page vivante') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Variables, fonctions, conditions','CODE','```js
const prenom = "Awa";
function saluer(nom) { return `Bonjour ${nom}`; }
console.log(saluer(prenom));
```',25,0),
('Le DOM et les événements','CODE','```js
document.querySelector("button").addEventListener("click", () => alert("Salut !"));
```',25,1),
('Appeler une API avec fetch','CODE','Récupère des données JSON avec `fetch` et affiche-les dans la page.',25,2)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='creation-de-sites-web'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Publier ton site','Mise en ligne et projet final.',4 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Publier ton site') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Mettre son site en ligne','TEXTE','Héberge un site statique (Vercel, Render, GitHub Pages) depuis un dépôt Git.',15,0),
('Projet final : ton site','PROJET','Crée et publie ton site : présentation, au moins 3 sections, responsive, un formulaire de contact.',120,1)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('html-css','HTML & CSS','Les fondations du web : structurer et styliser de belles pages responsives.','Une formation courte et pratique pour maîtriser le HTML sémantique et le CSS moderne, avec des mini-projets à chaque étape.','DEBUTANT','3 semaines','PUBLIEE','HTML',array['Écrire du HTML sémantique','Maîtriser Flexbox et Grid','Créer des interfaces responsives']::text[],array['Aucun']::text[],'Une page de présentation personnelle responsive.',true,false,1) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='html-css'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'HTML','Structure et sémantique.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='HTML') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Balises essentielles','TEXTE','Titres, paragraphes, listes, liens, images, formulaires.',15,0),
('HTML sémantique','EXERCICE','Réécris une page « tout en div » avec des balises sémantiques.',20,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='html-css'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'CSS','Style, mise en page, responsive.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='CSS') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Couleurs, typographie, espacements','TEXTE','Construis une échelle de typographie et d’espacements cohérente.',20,0),
('Mise en page moderne','CODE','Flexbox pour l’alignement, Grid pour les grilles.',25,1),
('Mini-projet : page perso','PROJET','Une page de présentation responsive.',60,2)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('javascript','JavaScript','Apprendre à programmer pour le web : logique, DOM, événements et API.','De la première variable à une mini-application qui consomme une API : tu apprends à raisonner en programmeur.','DEBUTANT','5 semaines','PUBLIEE','JavaScript',array['Écrire de la logique en JavaScript','Manipuler le DOM','Consommer une API']::text[],array['HTML & CSS de base']::text[],'Une mini-application interactive connectée à une API.',true,false,2) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='javascript'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Les bases du langage','Variables, conditions, boucles, fonctions.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Les bases du langage') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Variables et types','CODE','`const`, `let`, nombres, chaînes, booléens.',20,0),
('Conditions et boucles','CODE','`if`, `for`, `while`, `map`, `filter`.',25,1),
('Fonctions','EXERCICE','Écris 5 petites fonctions utilitaires.',25,2)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='javascript'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Le navigateur','DOM, événements, API.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Le navigateur') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Sélectionner et modifier le DOM','CODE','`querySelector`, `textContent`, `classList`.',25,0),
('Événements et formulaires','CODE','Écouter un clic, valider un formulaire.',25,1),
('fetch et async/await','CODE','Appelle une API JSON et gère les erreurs.',30,2),
('Mini-projet : liste de tâches','PROJET','Ajouter, terminer et supprimer des tâches.',90,3)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('creation-applications-web','Création d’applications web','React, TypeScript, routing, formulaires, authentification et déploiement.','Tu passes du site à l’application : composants, état, routing, formulaires, données, authentification et déploiement.','INTERMEDIAIRE','8 semaines','PUBLIEE','React',array['Structurer une application React + TypeScript','Gérer état, routing et formulaires','Brancher une API et une authentification','Déployer']::text[],array['JavaScript','HTML & CSS']::text[],'Créer une application web complète.',true,false,3) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='creation-applications-web'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'React et TypeScript','Composants, props, état.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='React et TypeScript') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Penser en composants','TEXTE','Découper une interface en composants réutilisables.',20,0),
('Props, état, effets','CODE','```tsx
function Compteur() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
```',30,1),
('TypeScript pour React','CODE','Typer props, état et réponses d’API.',30,2)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='creation-applications-web'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Une vraie application','Routing, formulaires, données, auth.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Une vraie application') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Routing avec React Router','CODE','Routes publiques, routes protégées, paramètres d’URL.',25,0),
('Formulaires validés','CODE','React Hook Form + Zod.',30,1),
('Données et authentification','CODE','Lire/écrire des données, connecter des utilisateurs.',40,2),
('Projet final : application complète','PROJET','Une application avec auth, CRUD, routing et déploiement.',240,3)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('creation-plateformes','Création de plateformes numériques','Concevoir une vraie plateforme SaaS : utilisateurs, rôles, dashboard, sécurité.','Différence entre site, application et plateforme ; architecture, rôles, dashboard, base de données, notifications, recherche, stockage, sécurité et déploiement.','AVANCE','10 semaines','PUBLIEE','Plateformes',array['Distinguer site, application et plateforme','Concevoir rôles et permissions','Construire un dashboard avec CRUD','Sécuriser et déployer']::text[],array['React + TypeScript','Notions de base de données']::text[],'Construire une vraie plateforme SaaS.',true,false,4) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='creation-plateformes'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Penser plateforme','Architecture, utilisateurs et rôles.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Penser plateforme') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Site, application, plateforme','TEXTE','Un site présente, une application permet d’agir, une plateforme met en relation plusieurs types d’utilisateurs avec des rôles.',15,0),
('Modéliser utilisateurs et rôles','EXERCICE','Dessine les rôles, leurs droits et les tables associées.',30,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='creation-plateformes'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Construire le cœur','Dashboard, CRUD, sécurité.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Construire le cœur') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Dashboard et CRUD','CODE','Créer, lire, modifier, supprimer avec validation et confirmations.',45,0),
('Notifications, recherche, stockage','CODE','Ajouter les fonctions qui rendent une plateforme utilisable.',40,1),
('Sécurité et déploiement','TEXTE','RLS, variables d’environnement, logs.',25,2),
('Projet final : ta plateforme SaaS','PROJET','Une plateforme multi-rôles déployée.',300,3)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('python-debutants','Python pour débutants','Les bases de Python, l’automatisation et une première approche de l’IA.','Du premier `print` aux classes, avec des mini-projets d’automatisation et une introduction à l’IA.','DEBUTANT','5 semaines','PUBLIEE','Python',array['Écrire des programmes Python simples','Manipuler fichiers et données','Automatiser une tâche','Découvrir l’IA']::text[],array['Aucun']::text[],'Un script d’automatisation utile.',true,false,5) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='python-debutants'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Les bases','Variables, types, conditions, boucles, fonctions.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Les bases') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Installer Python et écrire son premier script','EXERCICE','```python
print("Bonjour Python")
```',20,0),
('Conditions, boucles, fonctions','CODE','```python
for i in range(3):
    print(i)
```',30,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='python-debutants'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Structures et projets','Listes, dictionnaires, fichiers, POO, automatisation.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Structures et projets') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Listes et dictionnaires','CODE','Stocker et parcourir des données.',25,0),
('Fichiers et exceptions','CODE','Lire un CSV, gérer les erreurs.',25,1),
('Introduction à l’automatisation et à l’IA','TEXTE','Automatiser une tâche répétitive et appeler un service d’IA.',25,2),
('Mini-projet : script d’automatisation','PROJET','Renomme ou trie des fichiers automatiquement.',90,3)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('supabase-de-zero-a-production','Supabase de zéro à une vraie application','PostgreSQL, Auth, Storage, Row Level Security et intégration React.','Tu crées un backend complet avec Supabase : tables, relations, SQL, authentification, stockage et sécurité par RLS, puis tu l’intègres à React.','INTERMEDIAIRE','6 semaines','PUBLIEE','Supabase',array['Modéliser une base PostgreSQL','Mettre en place Auth et Storage','Écrire des politiques RLS','Intégrer Supabase dans React']::text[],array['JavaScript','React (conseillé)']::text[],'Créer une application complète avec React + Supabase.',true,false,6) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='supabase-de-zero-a-production'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Base de données','Projet, tables, relations, SQL.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Base de données') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Créer un projet Supabase','TEXTE','Projet, URL publique, clé anon : ce qui va côté frontend et ce qui reste secret.',15,0),
('Tables, relations et SQL','CODE','Crée une table « notes » avec trois colonnes : un identifiant unique, l’utilisateur propriétaire (référence vers auth.users) et le texte de la note.',35,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='supabase-de-zero-a-production'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Sécurité et intégration','Auth, Storage, RLS, React.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Sécurité et intégration') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Authentification','CODE','Inscription, connexion, session.',30,0),
('Row Level Security','CODE','Active la Row Level Security sur la table « notes », puis ajoute une politique : chaque utilisateur ne peut lire et écrire que ses propres notes (auth.uid() = user_id).',40,1),
('Storage et politiques','CODE','Buckets, droits de lecture/écriture.',30,2),
('Projet final : React + Supabase','PROJET','Une application complète avec auth, données protégées et fichiers.',240,3)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('ia-pour-developpeurs','IA pour développeurs','Comprendre l’IA générative et l’intégrer proprement dans une application.','Modèles de langage, prompting, API d’IA, assistants, automatisation, bonnes pratiques, sécurité et limites.','INTERMEDIAIRE','5 semaines','PUBLIEE','IA',array['Comprendre l’IA générative','Écrire des prompts efficaces','Appeler une API d’IA côté serveur','Connaître les limites et risques']::text[],array['JavaScript','Notions d’API']::text[],'Créer une application web intégrant une fonctionnalité IA.',true,false,7) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='ia-pour-developpeurs'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Comprendre','Modèles, prompting, limites.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Comprendre') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Comment fonctionne un modèle de langage','TEXTE','Un modèle prédit la suite d’un texte : il peut se tromper avec aplomb. Toujours vérifier.',20,0),
('Prompting de base','EXERCICE','Contexte, tâche, contraintes, format de sortie.',25,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='ia-pour-developpeurs'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Intégrer','API, sécurité, application.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Intégrer') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Appeler une API d’IA depuis le serveur','CODE','Ne jamais exposer une clé d’API dans le frontend : passe par une fonction serveur (Edge Function).',35,0),
('Sécurité et limites','TEXTE','Données sensibles, injection de prompt, hallucinations.',20,1),
('Projet final : fonctionnalité IA','PROJET','Ajoute une fonctionnalité IA à une application web.',180,2)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('vibe-coding','Vibe Coding','Apprendre à construire plus vite avec l’IA sans devenir dépendant d’elle.','La formation phare. Le concept : le Vibe Coder Cultivé. L''objectif n''est pas de demander à l''IA de tout faire, mais de comprendre → concevoir → guider l''IA → vérifier → corriger → améliorer → déployer.','INTERMEDIAIRE','4 semaines','PUBLIEE','Vibe Coding',array['Transformer une idée en cahier des charges','Écrire de bons prompts et travailler par étapes','Lire, tester et corriger le code généré','Sécuriser et déployer']::text[],array['Bases du web (HTML/CSS/JS)','Curiosité']::text[],'Construire et déployer une application avec l’IA, en expliquant chaque choix.',true,true,8) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='vibe-coding'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Penser avant de prompter','Idée, besoin, cahier des charges.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Penser avant de prompter') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Le Vibe Coder Cultivé','TEXTE','comprendre → concevoir → guider l’IA → vérifier → corriger → améliorer → déployer.',15,0),
('De l’idée au cahier des charges','EXERCICE','Écris : problème, utilisateurs, fonctionnalités, contraintes, critères de réussite.',30,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='vibe-coding'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Guider l’IA','Prompts, outils, travail par étapes.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Guider l’IA') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Écrire un bon prompt','TEXTE','Contexte, objectif, contraintes, format attendu, exemple.',20,0),
('Claude, Bolt, Cursor : quand utiliser quoi','TEXTE','Chaque outil a ses forces ; choisis selon la tâche.',20,1),
('Travailler par petites étapes','EXERCICE','Une fonctionnalité = un prompt = un test.',30,2)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='vibe-coding'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Vérifier et livrer','Lire, tester, sécuriser, déployer.',2 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Vérifier et livrer') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Lire et comprendre le code généré','CODE','Relis chaque fichier : tu restes responsable du résultat.',30,0),
('Déboguer avec l’IA','EXERCICE','Donne le message d’erreur, le contexte et le comportement attendu.',30,1),
('Auditer, sécuriser, déployer','TEXTE','Demande un audit à l’IA puis vérifie toi-même secrets, droits et validations.',25,2),
('Projet final','PROJET','Une application construite avec l’IA, déployée, et documentée.',240,3)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('hebergement-deploiement','De localhost à Internet','Git, GitHub, variables d’environnement, Render, Vercel, domaines et HTTPS.','Mettre une vraie application en ligne, la surveiller et la maintenir.','INTERMEDIAIRE','3 semaines','PUBLIEE','Déploiement',array['Versionner avec Git/GitHub','Déployer frontend et backend','Configurer domaine et HTTPS','Lire les logs et corriger en production']::text[],array['Une application web simple']::text[],'Mettre une vraie application en ligne.',true,false,9) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='hebergement-deploiement'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Git et GitHub','Versionner et collaborer.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Git et GitHub') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Git : commit, branche, merge','CODE','```bash
git init
git add .
git commit -m "premier commit"
```',30,0),
('Publier sur GitHub','EXERCICE','Crée un dépôt et pousse ton projet.',20,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='hebergement-deploiement'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Mise en ligne','Build, variables, hébergeurs, domaine.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Mise en ligne') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Build et variables d’environnement','TEXTE','Seules les variables publiques vont dans le frontend.',20,0),
('Déployer sur Render ou Vercel','EXERCICE','Connecte le dépôt, configure build et variables.',40,1),
('Domaine, DNS, HTTPS','TEXTE','Pointer un domaine, vérifier le certificat.',25,2),
('Logs et erreurs de production','TEXTE','Lire les logs, reproduire, corriger, redéployer.',25,3)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('pitch-de-projet','Pitch ton projet avec impact','Problème, solution, business model, storytelling et questions du jury.','Pour les hackathons et les entrepreneurs : structurer un pitch clair et convaincant, avec le Pitch Lab pour générer ta structure.','DEBUTANT','2 semaines','PUBLIEE','Pitch',array['Formuler un problème et une cible','Présenter solution et innovation','Construire un business model simple','Répondre aux questions du jury']::text[],array['Une idée de projet']::text[],'Un pitch de 3 minutes avec support.',true,false,10) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='pitch-de-projet'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Construire le message','Problème, cible, solution.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Construire le message') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Identifier le vrai problème','TEXTE','Un bon pitch commence par un problème vécu par une cible précise.',20,0),
('Utiliser le Pitch Lab','EXERCICE','Renseigne problème, cible, solution, marché, business model, impact, prototype, puis génère ta structure.',25,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='pitch-de-projet'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Convaincre','Business model, storytelling, oral.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Convaincre') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Business model et marché','TEXTE','Qui paie, pourquoi, combien, comment vous gagnez de l’argent.',25,0),
('Storytelling et pitch deck','TEXTE','Une histoire, un fil conducteur, peu de texte par slide.',25,1),
('Pitch oral et questions du jury','EXERCICE','Entraîne-toi à 3 minutes chrono, prépare 5 questions difficiles.',40,2)
) as v(title,kind,content,minutes,pos);
insert into public.courses (slug,title,short_description,long_description,level,duration,status,category,objectives,prerequisites,final_project,has_certificate,is_featured,position)
values ('creer-son-mvp','Créer son MVP','Définir, construire et tester un produit minimum viable.','Choisir la bonne fonctionnalité, prototyper, construire avec une stack simple, tester avec de vrais utilisateurs et itérer.','INTERMEDIAIRE','6 semaines','PUBLIEE','Entrepreneuriat',array['Cadrer un MVP','Prototyper et construire vite','Tester avec de vrais utilisateurs','Itérer']::text[],array['Une idée de produit','Notions de web']::text[],'Un MVP en ligne, testé par de vrais utilisateurs.',true,false,11) on conflict (slug) do nothing;
with c as (select id from public.courses where slug='creer-son-mvp'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Cadrer','Problème, utilisateurs, périmètre.',0 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Cadrer') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Qu’est-ce qu’un MVP ?','TEXTE','La plus petite version qui prouve que le problème est résolu.',15,0),
('Définir le périmètre','EXERCICE','Liste, trie et coupe jusqu’à une seule fonctionnalité centrale.',30,1)
) as v(title,kind,content,minutes,pos);
with c as (select id from public.courses where slug='creer-son-mvp'), m as (
  insert into public.course_modules (course_id,title,description,position) select id,'Construire et tester','Prototype, build, retours.',1 from c
  where not exists (select 1 from public.course_modules cm where cm.course_id=c.id and cm.title='Construire et tester') returning id, course_id)
insert into public.lessons (module_id,course_id,title,kind,content,duration_minutes,position)
select m.id, m.course_id, v.title, v.kind, v.content, v.minutes, v.pos from m cross join (values
('Prototyper','EXERCICE','Maquette cliquable ou page de démonstration.',40,0),
('Construire la version 1','PROJET','Mets en ligne ton MVP.',240,1),
('Tester et itérer','EXERCICE','Observe de vrais utilisateurs et note ce qui bloque.',40,2)
) as v(title,kind,content,minutes,pos);
insert into public.services (title,description,icon,position) select 'Site web','Un site clair, rapide et responsive, pensé pour présenter une activité ou un projet.','Globe',0 where not exists (select 1 from public.services where title='Site web');
insert into public.services (title,description,icon,position) select 'Application web','Une application sur mesure avec comptes utilisateurs, données et parcours complets.','AppWindow',1 where not exists (select 1 from public.services where title='Application web');
insert into public.services (title,description,icon,position) select 'Plateforme SaaS','Une plateforme multi-rôles avec dashboard, abonnements ou inscriptions, et administration.','Layers',2 where not exists (select 1 from public.services where title='Plateforme SaaS');
insert into public.services (title,description,icon,position) select 'Dashboard','Des tableaux de bord qui affichent vos vraies données, sans décor.','LayoutDashboard',3 where not exists (select 1 from public.services where title='Dashboard');
insert into public.services (title,description,icon,position) select 'Intégration Supabase','Base de données, authentification, stockage et sécurité RLS mises en place proprement.','Database',4 where not exists (select 1 from public.services where title='Intégration Supabase');
insert into public.services (title,description,icon,position) select 'Intégration IA','Assistants et fonctionnalités d’IA intégrés côté serveur, sans exposer de clés.','Bot',5 where not exists (select 1 from public.services where title='Intégration IA');
insert into public.services (title,description,icon,position) select 'Prototype MVP','Une première version utilisable pour tester votre idée avec de vrais utilisateurs.','Rocket',6 where not exists (select 1 from public.services where title='Prototype MVP');
insert into public.services (title,description,icon,position) select 'Accompagnement technique','Un regard technique sur votre projet : architecture, choix d’outils, revue de code.','Wrench',7 where not exists (select 1 from public.services where title='Accompagnement technique');
insert into public.services (title,description,icon,position) select 'Formation','Des formations pour particuliers, étudiants ou équipes, centrées sur des projets concrets.','GraduationCap',8 where not exists (select 1 from public.services where title='Formation');
insert into public.services (title,description,icon,position) select 'Workshop','Des sessions pratiques sur un thème précis : HTML/CSS, Supabase, IA, Vibe Coding, pitch.','Users',9 where not exists (select 1 from public.services where title='Workshop');
insert into public.workshops (slug,title,description,format,status) values ('workshop-html-css','Workshop HTML / CSS','Construire une page responsive de zéro en une session pratique.','En ligne','A_VENIR') on conflict (slug) do nothing;
insert into public.workshops (slug,title,description,format,status) values ('workshop-javascript','Workshop JavaScript','Logique, DOM et événements à travers un mini-projet.','En ligne','A_VENIR') on conflict (slug) do nothing;
insert into public.workshops (slug,title,description,format,status) values ('workshop-supabase','Workshop Supabase','Tables, Auth et RLS : sécuriser une application.','En ligne','A_VENIR') on conflict (slug) do nothing;
insert into public.workshops (slug,title,description,format,status) values ('workshop-ia','Workshop IA','Intégrer une fonctionnalité d’IA dans une application web.','En ligne','A_VENIR') on conflict (slug) do nothing;
insert into public.workshops (slug,title,description,format,status) values ('workshop-vibe-coding','Workshop Vibe Coding','Construire avec l’IA sans perdre la compréhension du code.','En ligne ou présentiel','A_VENIR') on conflict (slug) do nothing;
insert into public.workshops (slug,title,description,format,status) values ('session-pitch','Session Pitch','Structurer et répéter un pitch de projet.','En ligne ou présentiel','A_VENIR') on conflict (slug) do nothing;
insert into public.workshops (slug,title,description,format,status) values ('bootcamp-creation-d-application','Bootcamp création d’application','Du cahier des charges au déploiement, en équipe.','Présentiel ou hybride','A_VENIR') on conflict (slug) do nothing;
insert into public.workshops (slug,title,description,format,status) values ('live-debugging','Live debugging','Déboguer en direct de vrais problèmes d’apprenants.','En ligne','A_VENIR') on conflict (slug) do nothing;
insert into public.resources (title,description,category,kind) select 'Checklist : structure d’une page HTML','Les balises sémantiques essentielles et un squelette de page.','HTML','Cheatsheet' where not exists (select 1 from public.resources where title='Checklist : structure d’une page HTML');
insert into public.resources (title,description,category,kind) select 'Flexbox & Grid : aide-mémoire','Les propriétés à connaître pour aligner et disposer.','CSS','Cheatsheet' where not exists (select 1 from public.resources where title='Flexbox & Grid : aide-mémoire');
insert into public.resources (title,description,category,kind) select 'Snippets JavaScript du quotidien','fetch, DOM, tableaux : les patterns les plus utilisés.','JavaScript','Snippets' where not exists (select 1 from public.resources where title='Snippets JavaScript du quotidien');
insert into public.resources (title,description,category,kind) select 'Template : composant React + TypeScript','Un squelette typé de composant avec props et état.','React','Templates' where not exists (select 1 from public.resources where title='Template : composant React + TypeScript');
insert into public.resources (title,description,category,kind) select 'Guide : typer une application React','Props, état, événements et réponses d’API.','TypeScript','Tutoriels' where not exists (select 1 from public.resources where title='Guide : typer une application React');
insert into public.resources (title,description,category,kind) select 'Python : les structures de données','Listes, dictionnaires, ensembles, tuples.','Python','Cheatsheet' where not exists (select 1 from public.resources where title='Python : les structures de données');
insert into public.resources (title,description,category,kind) select 'Modèle de politiques RLS','Politiques types : propriétaire, admin, lecture publique.','Supabase','Templates' where not exists (select 1 from public.resources where title='Modèle de politiques RLS');
insert into public.resources (title,description,category,kind) select 'Bibliothèque de prompts pour développeurs','Expliquer du code, générer des tests, relire une fonction.','IA','Prompts' where not exists (select 1 from public.resources where title='Bibliothèque de prompts pour développeurs');
insert into public.resources (title,description,category,kind) select 'Prompts de Vibe Coding','Les prompts du Vibe Coding Lab, à adapter à ton projet.','Vibe Coding','Prompts' where not exists (select 1 from public.resources where title='Prompts de Vibe Coding');
insert into public.resources (title,description,category,kind) select 'Git/GitHub : commandes essentielles','init, add, commit, branch, merge, push.','Git/GitHub','Cheatsheet' where not exists (select 1 from public.resources where title='Git/GitHub : commandes essentielles');
insert into public.resources (title,description,category,kind) select 'Checklist de déploiement','Variables, build, routes, HTTPS, vérifications.','Déploiement','Templates' where not exists (select 1 from public.resources where title='Checklist de déploiement');
insert into public.resources (title,description,category,kind) select 'Canevas de business model','Un canevas simple pour cadrer son modèle.','Entrepreneuriat','Templates' where not exists (select 1 from public.resources where title='Canevas de business model');
insert into public.resources (title,description,category,kind) select 'Structure d’un pitch en 3 minutes','Le plan type d’un pitch de hackathon.','Pitch','Templates' where not exists (select 1 from public.resources where title='Structure d’un pitch en 3 minutes');
insert into public.projects (slug,title,category,summary,status,role,is_published) values ('agriflow-rdc','AgriFlow RDC','Plateformes','Plateforme agricole en RDC : marketplace, dashboard producteur, commandes, paiement et livraison.','En cours','Conception et développement',false) on conflict (slug) do nothing;
insert into public.project_technologies (project_id,name) select id,'React' from public.projects where slug='agriflow-rdc' on conflict do nothing;
insert into public.project_technologies (project_id,name) select id,'TypeScript' from public.projects where slug='agriflow-rdc' on conflict do nothing;
insert into public.project_technologies (project_id,name) select id,'Supabase' from public.projects where slug='agriflow-rdc' on conflict do nothing;
insert into public.project_technologies (project_id,name) select id,'CinetPay' from public.projects where slug='agriflow-rdc' on conflict do nothing;
insert into public.projects (slug,title,category,summary,status,role,is_published) values ('wedding-moments','Wedding Moments','Applications web','SaaS multi-couples d’invitations de mariage numériques, avec une page publique par couple.','En cours','Conception et développement',false) on conflict (slug) do nothing;
insert into public.project_technologies (project_id,name) select id,'React' from public.projects where slug='wedding-moments' on conflict do nothing;
insert into public.project_technologies (project_id,name) select id,'TypeScript' from public.projects where slug='wedding-moments' on conflict do nothing;
insert into public.project_technologies (project_id,name) select id,'Vite' from public.projects where slug='wedding-moments' on conflict do nothing;
insert into public.project_technologies (project_id,name) select id,'Tailwind CSS' from public.projects where slug='wedding-moments' on conflict do nothing;
insert into public.project_technologies (project_id,name) select id,'Supabase' from public.projects where slug='wedding-moments' on conflict do nothing;
insert into public.settings (key,value) values ('identity.name','JOE DEV CODES'),('identity.title','Développeur • Formateur • Étudiant • Entrepreneur') on conflict (key) do nothing;
