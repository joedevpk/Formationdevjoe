// Contenu JOE DEV CODES — catalogue pédagogique de démonstration.
// Ce fichier sert (1) de source pour supabase/migrations/…_seed_joe_dev_codes.sql
// (scripts/generate-seed.mjs) et (2) de secours d'affichage si la base est vide.
// Aucun chiffre, client, témoignage ou date n'est inventé.

export type SeedLesson = { title: string; kind: 'TEXTE' | 'VIDEO' | 'CODE' | 'QUIZ' | 'EXERCICE' | 'PROJET'; minutes: number; content: string };
export type SeedModule = { title: string; description: string; lessons: SeedLesson[] };
export type SeedCourse = {
  slug: string; title: string; short: string; long: string; category: string;
  level: 'DEBUTANT' | 'INTERMEDIAIRE' | 'AVANCE'; duration: string; icon: string; featured?: boolean;
  objectives: string[]; prerequisites: string[]; finalProject: string; program: string[];
  modules: SeedModule[];
};

const L = (title: string, kind: SeedLesson['kind'], minutes: number, content: string): SeedLesson => ({ title, kind, minutes, content });

export const courses: SeedCourse[] = [
  {
    slug: 'creation-de-sites-web', title: 'Création de sites web', category: 'Web', level: 'DEBUTANT', duration: '6 semaines', icon: 'Globe',
    short: 'Comprendre le Web, construire des pages HTML/CSS/JS et publier ton propre site.',
    long: "Une formation pour passer de « je consomme le web » à « je crée pour le web ». Tu apprends la structure d'une page, le style, le responsive, l'interactivité et la mise en ligne, avec un site réel comme fil rouge.",
    objectives: ['Expliquer comment fonctionne le Web', 'Structurer et styliser une page responsive', 'Ajouter de l’interactivité avec JavaScript', 'Publier un site en ligne'],
    prerequisites: ['Savoir utiliser un ordinateur', 'Aucune expérience de code requise'],
    finalProject: 'Créer et publier son propre site web.',
    program: ['Fonctionnement du Web', 'HTML', 'Structure d’une page', 'CSS', 'Responsive design', 'Flexbox', 'Grid', 'Animations', 'JavaScript', 'DOM', 'Événements', 'Formulaires', 'API', 'Publication d’un site'],
    modules: [
      { title: 'Comprendre le Web', description: 'Client, serveur, navigateur, URL.', lessons: [L('Comment fonctionne le Web ?', 'TEXTE', 10, "Le navigateur (client) demande une page à un serveur via une URL ; le serveur répond avec du HTML, du CSS et du JavaScript.\n\n### À retenir\n- Client / serveur\n- Requête / réponse\n- HTML = structure, CSS = style, JS = comportement"), L('Ton éditeur et ton premier fichier', 'EXERCICE', 15, 'Installe un éditeur de code, crée un dossier `mon-site` et un fichier `index.html` qui affiche ton prénom.')] },
      { title: 'HTML : la structure', description: 'Balises, sémantique, formulaires.', lessons: [L('Structure d’une page HTML', 'CODE', 15, '```html\n<!doctype html>\n<html lang="fr">\n  <head><meta charset="UTF-8" /><title>Mon site</title></head>\n  <body><h1>Bonjour</h1></body>\n</html>\n```'), L('Titres, listes, liens, images', 'TEXTE', 15, 'Utilise les balises sémantiques (`header`, `main`, `section`, `footer`) pour donner du sens à ta page.')] },
      { title: 'CSS : le style et le responsive', description: 'Sélecteurs, Flexbox, Grid, media queries.', lessons: [L('Sélecteurs et box model', 'TEXTE', 20, 'Chaque élément est une boîte : contenu, padding, bordure, marge.'), L('Flexbox et Grid', 'CODE', 25, '```css\n.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }\n```'), L('Rendre une page responsive', 'EXERCICE', 25, 'Adapte ta page pour mobile, tablette et desktop avec des media queries.')] },
      { title: 'JavaScript : rendre la page vivante', description: 'Variables, DOM, événements, formulaires, API.', lessons: [L('Variables, fonctions, conditions', 'CODE', 25, '```js\nconst prenom = "Awa";\nfunction saluer(nom) { return `Bonjour ${nom}`; }\nconsole.log(saluer(prenom));\n```'), L('Le DOM et les événements', 'CODE', 25, '```js\ndocument.querySelector("button").addEventListener("click", () => alert("Salut !"));\n```'), L('Appeler une API avec fetch', 'CODE', 25, 'Récupère des données JSON avec `fetch` et affiche-les dans la page.')] },
      { title: 'Publier ton site', description: 'Mise en ligne et projet final.', lessons: [L('Mettre son site en ligne', 'TEXTE', 15, 'Héberge un site statique (Vercel, Render, GitHub Pages) depuis un dépôt Git.'), L('Projet final : ton site', 'PROJET', 120, 'Crée et publie ton site : présentation, au moins 3 sections, responsive, un formulaire de contact.')] },
    ],
  },
  {
    slug: 'html-css', title: 'HTML & CSS', category: 'HTML', level: 'DEBUTANT', duration: '3 semaines', icon: 'Layout',
    short: 'Les fondations du web : structurer et styliser de belles pages responsives.',
    long: 'Une formation courte et pratique pour maîtriser le HTML sémantique et le CSS moderne, avec des mini-projets à chaque étape.',
    objectives: ['Écrire du HTML sémantique', 'Maîtriser Flexbox et Grid', 'Créer des interfaces responsives'], prerequisites: ['Aucun'],
    finalProject: 'Une page de présentation personnelle responsive.',
    program: ['HTML', 'CSS', 'Responsive Design', 'Mini-projets'],
    modules: [
      { title: 'HTML', description: 'Structure et sémantique.', lessons: [L('Balises essentielles', 'TEXTE', 15, 'Titres, paragraphes, listes, liens, images, formulaires.'), L('HTML sémantique', 'EXERCICE', 20, 'Réécris une page « tout en div » avec des balises sémantiques.')] },
      { title: 'CSS', description: 'Style, mise en page, responsive.', lessons: [L('Couleurs, typographie, espacements', 'TEXTE', 20, 'Construis une échelle de typographie et d’espacements cohérente.'), L('Mise en page moderne', 'CODE', 25, 'Flexbox pour l’alignement, Grid pour les grilles.'), L('Mini-projet : page perso', 'PROJET', 60, 'Une page de présentation responsive.')] },
    ],
  },
  {
    slug: 'javascript', title: 'JavaScript', category: 'JavaScript', level: 'DEBUTANT', duration: '5 semaines', icon: 'Braces',
    short: 'Apprendre à programmer pour le web : logique, DOM, événements et API.',
    long: 'De la première variable à une mini-application qui consomme une API : tu apprends à raisonner en programmeur.',
    objectives: ['Écrire de la logique en JavaScript', 'Manipuler le DOM', 'Consommer une API'], prerequisites: ['HTML & CSS de base'],
    finalProject: 'Une mini-application interactive connectée à une API.',
    program: ['Variables et types', 'Conditions et boucles', 'Fonctions', 'Tableaux et objets', 'DOM', 'Événements', 'Asynchrone', 'API', 'Mini-projets'],
    modules: [
      { title: 'Les bases du langage', description: 'Variables, conditions, boucles, fonctions.', lessons: [L('Variables et types', 'CODE', 20, '`const`, `let`, nombres, chaînes, booléens.'), L('Conditions et boucles', 'CODE', 25, '`if`, `for`, `while`, `map`, `filter`.'), L('Fonctions', 'EXERCICE', 25, 'Écris 5 petites fonctions utilitaires.')] },
      { title: 'Le navigateur', description: 'DOM, événements, API.', lessons: [L('Sélectionner et modifier le DOM', 'CODE', 25, '`querySelector`, `textContent`, `classList`.'), L('Événements et formulaires', 'CODE', 25, 'Écouter un clic, valider un formulaire.'), L('fetch et async/await', 'CODE', 30, 'Appelle une API JSON et gère les erreurs.'), L('Mini-projet : liste de tâches', 'PROJET', 90, 'Ajouter, terminer et supprimer des tâches.')] },
    ],
  },
  {
    slug: 'creation-applications-web', title: 'Création d’applications web', category: 'React', level: 'INTERMEDIAIRE', duration: '8 semaines', icon: 'AppWindow',
    short: 'React, TypeScript, routing, formulaires, authentification et déploiement.',
    long: 'Tu passes du site à l’application : composants, état, routing, formulaires, données, authentification et déploiement.',
    objectives: ['Structurer une application React + TypeScript', 'Gérer état, routing et formulaires', 'Brancher une API et une authentification', 'Déployer'], prerequisites: ['JavaScript', 'HTML & CSS'],
    finalProject: 'Créer une application web complète.',
    program: ['Architecture frontend', 'React', 'TypeScript', 'Composants', 'État', 'Routing', 'Formulaires', 'API', 'Authentification', 'Gestion des données', 'Architecture d’application', 'Déploiement'],
    modules: [
      { title: 'React et TypeScript', description: 'Composants, props, état.', lessons: [L('Penser en composants', 'TEXTE', 20, 'Découper une interface en composants réutilisables.'), L('Props, état, effets', 'CODE', 30, '```tsx\nfunction Compteur() {\n  const [n, setN] = useState(0);\n  return <button onClick={() => setN(n + 1)}>{n}</button>;\n}\n```'), L('TypeScript pour React', 'CODE', 30, 'Typer props, état et réponses d’API.')] },
      { title: 'Une vraie application', description: 'Routing, formulaires, données, auth.', lessons: [L('Routing avec React Router', 'CODE', 25, 'Routes publiques, routes protégées, paramètres d’URL.'), L('Formulaires validés', 'CODE', 30, 'React Hook Form + Zod.'), L('Données et authentification', 'CODE', 40, 'Lire/écrire des données, connecter des utilisateurs.'), L('Projet final : application complète', 'PROJET', 240, 'Une application avec auth, CRUD, routing et déploiement.')] },
    ],
  },
  {
    slug: 'creation-plateformes', title: 'Création de plateformes numériques', category: 'Plateformes', level: 'AVANCE', duration: '10 semaines', icon: 'Layers',
    short: 'Concevoir une vraie plateforme SaaS : utilisateurs, rôles, dashboard, sécurité.',
    long: 'Différence entre site, application et plateforme ; architecture, rôles, dashboard, base de données, notifications, recherche, stockage, sécurité et déploiement.',
    objectives: ['Distinguer site, application et plateforme', 'Concevoir rôles et permissions', 'Construire un dashboard avec CRUD', 'Sécuriser et déployer'], prerequisites: ['React + TypeScript', 'Notions de base de données'],
    finalProject: 'Construire une vraie plateforme SaaS.',
    program: ['Site / application / plateforme', 'Architecture', 'Utilisateurs', 'Rôles', 'Authentification', 'Dashboard', 'Base de données', 'CRUD', 'Notifications', 'Recherche', 'Stockage', 'Sécurité', 'Déploiement'],
    modules: [
      { title: 'Penser plateforme', description: 'Architecture, utilisateurs et rôles.', lessons: [L('Site, application, plateforme', 'TEXTE', 15, 'Un site présente, une application permet d’agir, une plateforme met en relation plusieurs types d’utilisateurs avec des rôles.'), L('Modéliser utilisateurs et rôles', 'EXERCICE', 30, 'Dessine les rôles, leurs droits et les tables associées.')] },
      { title: 'Construire le cœur', description: 'Dashboard, CRUD, sécurité.', lessons: [L('Dashboard et CRUD', 'CODE', 45, 'Créer, lire, modifier, supprimer avec validation et confirmations.'), L('Notifications, recherche, stockage', 'CODE', 40, 'Ajouter les fonctions qui rendent une plateforme utilisable.'), L('Sécurité et déploiement', 'TEXTE', 25, 'RLS, variables d’environnement, logs.'), L('Projet final : ta plateforme SaaS', 'PROJET', 300, 'Une plateforme multi-rôles déployée.')] },
    ],
  },
  {
    slug: 'python-debutants', title: 'Python pour débutants', category: 'Python', level: 'DEBUTANT', duration: '5 semaines', icon: 'Terminal',
    short: 'Les bases de Python, l’automatisation et une première approche de l’IA.',
    long: 'Du premier `print` aux classes, avec des mini-projets d’automatisation et une introduction à l’IA.',
    objectives: ['Écrire des programmes Python simples', 'Manipuler fichiers et données', 'Automatiser une tâche', 'Découvrir l’IA'], prerequisites: ['Aucun'],
    finalProject: 'Un script d’automatisation utile.',
    program: ['Installation', 'Variables', 'Types', 'Conditions', 'Boucles', 'Fonctions', 'Listes', 'Dictionnaires', 'Fichiers', 'Exceptions', 'Modules', 'POO', 'Mini-projets', 'Introduction à l’automatisation', 'Introduction à l’IA'],
    modules: [
      { title: 'Les bases', description: 'Variables, types, conditions, boucles, fonctions.', lessons: [L('Installer Python et écrire son premier script', 'EXERCICE', 20, '```python\nprint("Bonjour Python")\n```'), L('Conditions, boucles, fonctions', 'CODE', 30, '```python\nfor i in range(3):\n    print(i)\n```')] },
      { title: 'Structures et projets', description: 'Listes, dictionnaires, fichiers, POO, automatisation.', lessons: [L('Listes et dictionnaires', 'CODE', 25, 'Stocker et parcourir des données.'), L('Fichiers et exceptions', 'CODE', 25, 'Lire un CSV, gérer les erreurs.'), L('Introduction à l’automatisation et à l’IA', 'TEXTE', 25, 'Automatiser une tâche répétitive et appeler un service d’IA.'), L('Mini-projet : script d’automatisation', 'PROJET', 90, 'Renomme ou trie des fichiers automatiquement.')] },
    ],
  },
  {
    slug: 'supabase-de-zero-a-production', title: 'Supabase de zéro à une vraie application', category: 'Supabase', level: 'INTERMEDIAIRE', duration: '6 semaines', icon: 'Database',
    short: 'PostgreSQL, Auth, Storage, Row Level Security et intégration React.',
    long: 'Tu crées un backend complet avec Supabase : tables, relations, SQL, authentification, stockage et sécurité par RLS, puis tu l’intègres à React.',
    objectives: ['Modéliser une base PostgreSQL', 'Mettre en place Auth et Storage', 'Écrire des politiques RLS', 'Intégrer Supabase dans React'], prerequisites: ['JavaScript', 'React (conseillé)'],
    finalProject: 'Créer une application complète avec React + Supabase.',
    program: ['Création d’un projet', 'PostgreSQL', 'Tables', 'Relations', 'SQL', 'CRUD', 'Auth', 'Storage', 'Row Level Security', 'Rôles', 'Politiques', 'API', 'Intégration React', 'Gestion des erreurs', 'Sécurité', 'Déploiement'],
    modules: [
      { title: 'Base de données', description: 'Projet, tables, relations, SQL.', lessons: [L('Créer un projet Supabase', 'TEXTE', 15, 'Projet, URL publique, clé anon : ce qui va côté frontend et ce qui reste secret.'), L('Tables, relations et SQL', 'CODE', 35, '```sql\ncreate table notes (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users, body text);\n```')] },
      { title: 'Sécurité et intégration', description: 'Auth, Storage, RLS, React.', lessons: [L('Authentification', 'CODE', 30, 'Inscription, connexion, session.'), L('Row Level Security', 'CODE', 40, '```sql\nalter table notes enable row level security;\ncreate policy "own notes" on notes for all using (auth.uid() = user_id);\n```'), L('Storage et politiques', 'CODE', 30, 'Buckets, droits de lecture/écriture.'), L('Projet final : React + Supabase', 'PROJET', 240, 'Une application complète avec auth, données protégées et fichiers.')] },
    ],
  },
  {
    slug: 'ia-pour-developpeurs', title: 'IA pour développeurs', category: 'IA', level: 'INTERMEDIAIRE', duration: '5 semaines', icon: 'Bot',
    short: 'Comprendre l’IA générative et l’intégrer proprement dans une application.',
    long: 'Modèles de langage, prompting, API d’IA, assistants, automatisation, bonnes pratiques, sécurité et limites.',
    objectives: ['Comprendre l’IA générative', 'Écrire des prompts efficaces', 'Appeler une API d’IA côté serveur', 'Connaître les limites et risques'], prerequisites: ['JavaScript', 'Notions d’API'],
    finalProject: 'Créer une application web intégrant une fonctionnalité IA.',
    program: ['Comprendre l’IA', 'IA générative', 'Modèles de langage', 'Prompting', 'API IA', 'Intégration dans une application', 'Assistants intelligents', 'Génération de contenu', 'Analyse de données', 'Automatisation', 'Bonnes pratiques', 'Sécurité', 'Limites de l’IA'],
    modules: [
      { title: 'Comprendre', description: 'Modèles, prompting, limites.', lessons: [L('Comment fonctionne un modèle de langage', 'TEXTE', 20, 'Un modèle prédit la suite d’un texte : il peut se tromper avec aplomb. Toujours vérifier.'), L('Prompting de base', 'EXERCICE', 25, 'Contexte, tâche, contraintes, format de sortie.')] },
      { title: 'Intégrer', description: 'API, sécurité, application.', lessons: [L('Appeler une API d’IA depuis le serveur', 'CODE', 35, 'Ne jamais exposer une clé d’API dans le frontend : passe par une fonction serveur (Edge Function).'), L('Sécurité et limites', 'TEXTE', 20, 'Données sensibles, injection de prompt, hallucinations.'), L('Projet final : fonctionnalité IA', 'PROJET', 180, 'Ajoute une fonctionnalité IA à une application web.')] },
    ],
  },
  {
    slug: 'vibe-coding', title: 'Vibe Coding', category: 'Vibe Coding', level: 'INTERMEDIAIRE', duration: '4 semaines', icon: 'Sparkles', featured: true,
    short: 'Apprendre à construire plus vite avec l’IA sans devenir dépendant d’elle.',
    long: "La formation phare. Le concept : le Vibe Coder Cultivé. L'objectif n'est pas de demander à l'IA de tout faire, mais de comprendre → concevoir → guider l'IA → vérifier → corriger → améliorer → déployer.",
    objectives: ['Transformer une idée en cahier des charges', 'Écrire de bons prompts et travailler par étapes', 'Lire, tester et corriger le code généré', 'Sécuriser et déployer'], prerequisites: ['Bases du web (HTML/CSS/JS)', 'Curiosité'],
    finalProject: 'Construire et déployer une application avec l’IA, en expliquant chaque choix.',
    program: ['Comprendre une idée', 'Cahier des charges', 'Écrire un bon prompt', 'Travailler avec Claude', 'Travailler avec Bolt', 'Travailler avec Cursor', 'Générer du code', 'Lire le code généré', 'Détecter les erreurs', 'Corriger les bugs', 'Améliorer une interface', 'Demander un audit à l’IA', 'Travailler par étapes', 'Tester', 'Sécuriser', 'Déployer'],
    modules: [
      { title: 'Penser avant de prompter', description: 'Idée, besoin, cahier des charges.', lessons: [L('Le Vibe Coder Cultivé', 'TEXTE', 15, 'comprendre → concevoir → guider l’IA → vérifier → corriger → améliorer → déployer.'), L('De l’idée au cahier des charges', 'EXERCICE', 30, 'Écris : problème, utilisateurs, fonctionnalités, contraintes, critères de réussite.')] },
      { title: 'Guider l’IA', description: 'Prompts, outils, travail par étapes.', lessons: [L('Écrire un bon prompt', 'TEXTE', 20, 'Contexte, objectif, contraintes, format attendu, exemple.'), L('Claude, Bolt, Cursor : quand utiliser quoi', 'TEXTE', 20, 'Chaque outil a ses forces ; choisis selon la tâche.'), L('Travailler par petites étapes', 'EXERCICE', 30, 'Une fonctionnalité = un prompt = un test.')] },
      { title: 'Vérifier et livrer', description: 'Lire, tester, sécuriser, déployer.', lessons: [L('Lire et comprendre le code généré', 'CODE', 30, 'Relis chaque fichier : tu restes responsable du résultat.'), L('Déboguer avec l’IA', 'EXERCICE', 30, 'Donne le message d’erreur, le contexte et le comportement attendu.'), L('Auditer, sécuriser, déployer', 'TEXTE', 25, 'Demande un audit à l’IA puis vérifie toi-même secrets, droits et validations.'), L('Projet final', 'PROJET', 240, 'Une application construite avec l’IA, déployée, et documentée.')] },
    ],
  },
  {
    slug: 'hebergement-deploiement', title: 'De localhost à Internet', category: 'Déploiement', level: 'INTERMEDIAIRE', duration: '3 semaines', icon: 'Cloud',
    short: 'Git, GitHub, variables d’environnement, Render, Vercel, domaines et HTTPS.',
    long: 'Mettre une vraie application en ligne, la surveiller et la maintenir.',
    objectives: ['Versionner avec Git/GitHub', 'Déployer frontend et backend', 'Configurer domaine et HTTPS', 'Lire les logs et corriger en production'], prerequisites: ['Une application web simple'],
    finalProject: 'Mettre une vraie application en ligne.',
    program: ['Git', 'GitHub', 'Repositories', 'Variables d’environnement', 'Build', 'Déploiement frontend', 'Déploiement backend', 'Supabase', 'Render', 'Vercel', 'Domaines', 'DNS', 'HTTPS', 'Logs', 'Erreurs de production', 'Maintenance'],
    modules: [
      { title: 'Git et GitHub', description: 'Versionner et collaborer.', lessons: [L('Git : commit, branche, merge', 'CODE', 30, '```bash\ngit init\ngit add .\ngit commit -m "premier commit"\n```'), L('Publier sur GitHub', 'EXERCICE', 20, 'Crée un dépôt et pousse ton projet.')] },
      { title: 'Mise en ligne', description: 'Build, variables, hébergeurs, domaine.', lessons: [L('Build et variables d’environnement', 'TEXTE', 20, 'Seules les variables publiques vont dans le frontend.'), L('Déployer sur Render ou Vercel', 'EXERCICE', 40, 'Connecte le dépôt, configure build et variables.'), L('Domaine, DNS, HTTPS', 'TEXTE', 25, 'Pointer un domaine, vérifier le certificat.'), L('Logs et erreurs de production', 'TEXTE', 25, 'Lire les logs, reproduire, corriger, redéployer.')] },
    ],
  },
  {
    slug: 'pitch-de-projet', title: 'Pitch ton projet avec impact', category: 'Pitch', level: 'DEBUTANT', duration: '2 semaines', icon: 'Mic',
    short: 'Problème, solution, business model, storytelling et questions du jury.',
    long: 'Pour les hackathons et les entrepreneurs : structurer un pitch clair et convaincant, avec le Pitch Lab pour générer ta structure.',
    objectives: ['Formuler un problème et une cible', 'Présenter solution et innovation', 'Construire un business model simple', 'Répondre aux questions du jury'], prerequisites: ['Une idée de projet'],
    finalProject: 'Un pitch de 3 minutes avec support.',
    program: ['Identifier le problème', 'Définir la cible', 'Présenter la solution', 'Expliquer l’innovation', 'Démontrer le prototype', 'Business model', 'Marché', 'Concurrence', 'Avantage', 'Modèle économique', 'Impact', 'Traction', 'Storytelling', 'Pitch deck', 'Pitch oral', 'Questions du jury'],
    modules: [
      { title: 'Construire le message', description: 'Problème, cible, solution.', lessons: [L('Identifier le vrai problème', 'TEXTE', 20, 'Un bon pitch commence par un problème vécu par une cible précise.'), L('Utiliser le Pitch Lab', 'EXERCICE', 25, 'Renseigne problème, cible, solution, marché, business model, impact, prototype, puis génère ta structure.')] },
      { title: 'Convaincre', description: 'Business model, storytelling, oral.', lessons: [L('Business model et marché', 'TEXTE', 25, 'Qui paie, pourquoi, combien, comment vous gagnez de l’argent.'), L('Storytelling et pitch deck', 'TEXTE', 25, 'Une histoire, un fil conducteur, peu de texte par slide.'), L('Pitch oral et questions du jury', 'EXERCICE', 40, 'Entraîne-toi à 3 minutes chrono, prépare 5 questions difficiles.')] },
    ],
  },
  {
    slug: 'creer-son-mvp', title: 'Créer son MVP', category: 'Entrepreneuriat', level: 'INTERMEDIAIRE', duration: '6 semaines', icon: 'Rocket',
    short: 'Définir, construire et tester un produit minimum viable.',
    long: 'Choisir la bonne fonctionnalité, prototyper, construire avec une stack simple, tester avec de vrais utilisateurs et itérer.',
    objectives: ['Cadrer un MVP', 'Prototyper et construire vite', 'Tester avec de vrais utilisateurs', 'Itérer'], prerequisites: ['Une idée de produit', 'Notions de web'],
    finalProject: 'Un MVP en ligne, testé par de vrais utilisateurs.',
    program: ['Problème', 'Utilisateurs', 'Fonctionnalité clé', 'Prototype', 'Construction', 'Test', 'Itération', 'Lancement'],
    modules: [
      { title: 'Cadrer', description: 'Problème, utilisateurs, périmètre.', lessons: [L('Qu’est-ce qu’un MVP ?', 'TEXTE', 15, 'La plus petite version qui prouve que le problème est résolu.'), L('Définir le périmètre', 'EXERCICE', 30, 'Liste, trie et coupe jusqu’à une seule fonctionnalité centrale.')] },
      { title: 'Construire et tester', description: 'Prototype, build, retours.', lessons: [L('Prototyper', 'EXERCICE', 40, 'Maquette cliquable ou page de démonstration.'), L('Construire la version 1', 'PROJET', 240, 'Mets en ligne ton MVP.'), L('Tester et itérer', 'EXERCICE', 40, 'Observe de vrais utilisateurs et note ce qui bloque.')] },
    ],
  },
];

export const categoriesCourses = ['Web', 'HTML', 'JavaScript', 'React', 'Plateformes', 'Python', 'Supabase', 'IA', 'Vibe Coding', 'Déploiement', 'Pitch', 'Entrepreneuriat'];

export const roadmap = [
  { level: 1, title: 'Culture numérique', text: 'Comprendre internet, les outils et le métier.' },
  { level: 2, title: 'HTML + CSS', text: 'Structurer et styliser des pages.' },
  { level: 3, title: 'JavaScript', text: 'Donner vie aux interfaces.' },
  { level: 4, title: 'React / TypeScript', text: 'Construire des applications.' },
  { level: 5, title: 'Supabase', text: 'Base de données, auth, sécurité.' },
  { level: 6, title: 'IA', text: 'Intégrer l’IA dans ses produits.' },
  { level: 7, title: 'Vibe Coding', text: 'Construire plus vite en restant maître du code.' },
  { level: 8, title: 'Applications et plateformes', text: 'Rôles, dashboards, SaaS.' },
  { level: 9, title: 'Déploiement', text: 'Mettre en ligne et maintenir.' },
  { level: 10, title: 'Projet réel', text: 'Résoudre un vrai problème.' },
  { level: 11, title: 'Pitch', text: 'Présenter avec impact.' },
  { level: 12, title: 'Entrepreneuriat', text: 'Faire vivre un produit.' },
];

export const tracks = [
  { key: 'DEBUTANT', title: 'Débutant', tagline: 'De zéro à ton premier site.', duration: 'Durée indicative : 2 à 3 mois', skills: ['HTML', 'CSS', 'JavaScript de base', 'Publication'], courses: ['creation-de-sites-web', 'html-css', 'javascript'], project: 'Ton premier site publié' },
  { key: 'CREATEUR', title: 'Créateur', tagline: 'Du site à l’application.', duration: 'Durée indicative : 3 à 4 mois', skills: ['React', 'TypeScript', 'Supabase', 'Déploiement'], courses: ['creation-applications-web', 'supabase-de-zero-a-production', 'hebergement-deploiement'], project: 'Une application complète en ligne' },
  { key: 'BUILDER', title: 'Builder', tagline: 'De l’application à la plateforme et au produit.', duration: 'Durée indicative : 4 à 6 mois', skills: ['Plateformes SaaS', 'IA', 'Vibe Coding', 'Pitch', 'MVP'], courses: ['creation-plateformes', 'ia-pour-developpeurs', 'vibe-coding', 'pitch-de-projet', 'creer-son-mvp'], project: 'Un produit numérique présenté et déployé' },
];

export const pipeline = ['Idée', 'Problème', 'Recherche', 'Conception', 'Prototype', 'Vibe Coding', 'Développement', 'Supabase', 'IA', 'Test', 'Déploiement', 'Pitch', 'Produit'];

export const vibeSteps = ['Prompt', 'Architecture', 'Code', 'Test', 'Debug', 'Amélioration', 'Déploiement'];

export const vibeScenarios = [
  { key: 'landing', title: 'Créer une landing page', prompt: "Tu es un développeur front-end senior. Crée une landing page responsive en React + Tailwind pour [produit]. Sections : hero, bénéfices, preuve sociale (vide si je n'en ai pas), FAQ, appel à l'action. Pas de faux chiffres. Explique la structure des composants avant de coder.", check: ['Responsive réel', 'Aucun faux contenu', 'Accessibilité de base'] },
  { key: 'dashboard', title: 'Créer un dashboard', prompt: "Crée un dashboard d'administration React + TypeScript : menu latéral, cartes de statistiques branchées sur de vraies données (afficher 0 sinon), tableau avec recherche et filtres. Propose d'abord l'architecture des dossiers.", check: ['États loading / vide / erreur', 'Données réelles', 'Types stricts'] },
  { key: 'crud', title: 'Créer une application CRUD', prompt: "Construis un CRUD complet pour l'entité [entité] : liste, création, édition, suppression avec confirmation, validation Zod, messages d'erreur. Fais-le étape par étape et attends ma validation entre chaque étape.", check: ['Validation côté client ET base', 'Confirmation de suppression', 'Gestion d’erreurs'] },
  { key: 'supabase', title: 'Connecter Supabase', prompt: "Je veux connecter une app React à Supabase. Donne le schéma SQL (UUID, created_at), les politiques RLS, et le client TypeScript utilisant uniquement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY. Ne mets jamais de clé secrète dans le frontend.", check: ['RLS activée sur chaque table', 'Aucune clé secrète côté client', 'Politiques testées'] },
  { key: 'auth', title: 'Ajouter une authentification', prompt: "Ajoute inscription, connexion, mot de passe oublié et routes protégées avec Supabase Auth. Les rôles ne doivent jamais être choisis par le client. Explique le flux de session.", check: ['Rôle attribué côté base', 'Routes protégées', 'Gestion de la session expirée'] },
  { key: 'ai', title: 'Intégrer une API IA', prompt: "Ajoute une fonctionnalité IA à mon application. La clé d'API doit rester côté serveur (Edge Function). Affiche 'Assistant IA non configuré.' si aucune clé n'est définie. Prévois limites, erreurs et coût.", check: ['Clé uniquement côté serveur', 'État non configuré propre', 'Gestion des erreurs et limites'] },
  { key: 'deploy', title: 'Déployer une application', prompt: "Prépare le déploiement d'une app Vite + React sur Render : build npm run build, dossier dist, variables d'environnement, réécriture SPA vers index.html, checklist de vérification après mise en ligne.", check: ['Variables définies sur l’hébergeur', 'Réécriture SPA', 'Test de toutes les routes'] },
];

export const servicesSeed = [
  { title: 'Site web', icon: 'Globe', description: 'Un site clair, rapide et responsive, pensé pour présenter une activité ou un projet.' },
  { title: 'Application web', icon: 'AppWindow', description: 'Une application sur mesure avec comptes utilisateurs, données et parcours complets.' },
  { title: 'Plateforme SaaS', icon: 'Layers', description: 'Une plateforme multi-rôles avec dashboard, abonnements ou inscriptions, et administration.' },
  { title: 'Dashboard', icon: 'LayoutDashboard', description: 'Des tableaux de bord qui affichent vos vraies données, sans décor.' },
  { title: 'Intégration Supabase', icon: 'Database', description: 'Base de données, authentification, stockage et sécurité RLS mises en place proprement.' },
  { title: 'Intégration IA', icon: 'Bot', description: 'Assistants et fonctionnalités d’IA intégrés côté serveur, sans exposer de clés.' },
  { title: 'Prototype MVP', icon: 'Rocket', description: 'Une première version utilisable pour tester votre idée avec de vrais utilisateurs.' },
  { title: 'Accompagnement technique', icon: 'Wrench', description: 'Un regard technique sur votre projet : architecture, choix d’outils, revue de code.' },
  { title: 'Formation', icon: 'GraduationCap', description: 'Des formations pour particuliers, étudiants ou équipes, centrées sur des projets concrets.' },
  { title: 'Workshop', icon: 'Users', description: 'Des sessions pratiques sur un thème précis : HTML/CSS, Supabase, IA, Vibe Coding, pitch.' },
];

export const workshopsSeed = [
  { title: 'Workshop HTML / CSS', format: 'En ligne', description: 'Construire une page responsive de zéro en une session pratique.' },
  { title: 'Workshop JavaScript', format: 'En ligne', description: 'Logique, DOM et événements à travers un mini-projet.' },
  { title: 'Workshop Supabase', format: 'En ligne', description: 'Tables, Auth et RLS : sécuriser une application.' },
  { title: 'Workshop IA', format: 'En ligne', description: 'Intégrer une fonctionnalité d’IA dans une application web.' },
  { title: 'Workshop Vibe Coding', format: 'En ligne ou présentiel', description: 'Construire avec l’IA sans perdre la compréhension du code.' },
  { title: 'Session Pitch', format: 'En ligne ou présentiel', description: 'Structurer et répéter un pitch de projet.' },
  { title: 'Bootcamp création d’application', format: 'Présentiel ou hybride', description: 'Du cahier des charges au déploiement, en équipe.' },
  { title: 'Live debugging', format: 'En ligne', description: 'Déboguer en direct de vrais problèmes d’apprenants.' },
];

export const resourcesSeed = [
  { title: 'Checklist : structure d’une page HTML', category: 'HTML', kind: 'Cheatsheet', description: 'Les balises sémantiques essentielles et un squelette de page.' },
  { title: 'Flexbox & Grid : aide-mémoire', category: 'CSS', kind: 'Cheatsheet', description: 'Les propriétés à connaître pour aligner et disposer.' },
  { title: 'Snippets JavaScript du quotidien', category: 'JavaScript', kind: 'Snippets', description: 'fetch, DOM, tableaux : les patterns les plus utilisés.' },
  { title: 'Template : composant React + TypeScript', category: 'React', kind: 'Templates', description: 'Un squelette typé de composant avec props et état.' },
  { title: 'Guide : typer une application React', category: 'TypeScript', kind: 'Tutoriels', description: 'Props, état, événements et réponses d’API.' },
  { title: 'Python : les structures de données', category: 'Python', kind: 'Cheatsheet', description: 'Listes, dictionnaires, ensembles, tuples.' },
  { title: 'Modèle de politiques RLS', category: 'Supabase', kind: 'Templates', description: 'Politiques types : propriétaire, admin, lecture publique.' },
  { title: 'Bibliothèque de prompts pour développeurs', category: 'IA', kind: 'Prompts', description: 'Expliquer du code, générer des tests, relire une fonction.' },
  { title: 'Prompts de Vibe Coding', category: 'Vibe Coding', kind: 'Prompts', description: 'Les prompts du Vibe Coding Lab, à adapter à ton projet.' },
  { title: 'Git/GitHub : commandes essentielles', category: 'Git/GitHub', kind: 'Cheatsheet', description: 'init, add, commit, branch, merge, push.' },
  { title: 'Checklist de déploiement', category: 'Déploiement', kind: 'Templates', description: 'Variables, build, routes, HTTPS, vérifications.' },
  { title: 'Canevas de business model', category: 'Entrepreneuriat', kind: 'Templates', description: 'Un canevas simple pour cadrer son modèle.' },
  { title: 'Structure d’un pitch en 3 minutes', category: 'Pitch', kind: 'Templates', description: 'Le plan type d’un pitch de hackathon.' },
];

export const projectsSeed = [
  { slug: 'agriflow-rdc', title: 'AgriFlow RDC', category: 'Plateformes', summary: 'Plateforme agricole en RDC : marketplace, dashboard producteur, commandes, paiement et livraison.', technologies: ['React', 'TypeScript', 'Supabase', 'CinetPay'], status: 'En cours', role: 'Conception et développement' },
  { slug: 'wedding-moments', title: 'Wedding Moments', category: 'Applications web', summary: 'SaaS multi-couples d’invitations de mariage numériques, avec une page publique par couple.', technologies: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Supabase'], status: 'En cours', role: 'Conception et développement' },
];

export const projectCategories = ['Web', 'Applications', 'IA', 'Supabase', 'Vibe Coding', 'Smart City', 'Éducation', 'Entrepreneuriat', 'Hackathons', 'Plateformes', 'Applications web'];
export const resourceCategories = ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'Python', 'Supabase', 'IA', 'Vibe Coding', 'Git/GitHub', 'Déploiement', 'Entrepreneuriat', 'Pitch'];
export const resourceKinds = ['Tutoriels', 'Cheatsheet', 'Prompts', 'Templates', 'Snippets', 'Vidéos', 'Articles', 'Livres', 'Outils'];
