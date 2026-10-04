# JOE DEV CODES

**Développeur • Formateur • Étudiant • Entrepreneur** — *Apprendre. Construire. Innover.*

Portfolio + Academy + Project Lab + Creator Studio.
Stack : React 18, TypeScript, Vite, Tailwind CSS, Supabase, React Router, Framer Motion, Lucide, React Hook Form, Zod, i18next, TanStack Query.

## Démarrage

```bash
npm install
cp .env.example .env      # renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm run dev
```

Sans variables Supabase, le site public reste consultable (catalogue de démonstration intégré) ; l'authentification, le formulaire de contact et le Studio affichent un message clair.

Vérifications : `npm run lint` • `npm run typecheck` • `npm run build`

## Base de données (nouveau projet Supabase recommandé)

Dans l'éditeur SQL de Supabase, exécuter dans l'ordre :

Ordre d'exécution = ordre des horodatages (ne pas en sauter) :

1. `20260930100000_joe_dev_codes_schema.sql` — tables, triggers, RLS, buckets Storage
2. `20260930100100_seed_joe_dev_codes.sql` — 12 formations (modules + leçons), services, workshops, ressources
3. `20261001090000_testimonials_repair.sql` — témoignages, RLS, rechargement du cache PostgREST
4. `20261001100000_production_hardening.sql` — liste d'attente, formations « bientôt disponibles », notifications dédoublonnées, `notification_preferences`, durcissement RLS
5. `20261001110000_cv_profile.sql` — CV & profil professionnel : tables `cv_*`, `get_public_cv()` / `cv_is_published()`
6. `20261003100000_training_presentiel.sql` — **formations présentielles** : sessions, inscriptions, annonces, présences, certificats vérifiables

7. `20261004090000_data_api_grants.sql` — **GRANT explicites** (obligatoires sur les projets Supabase récents : sans eux l'API répond 404/403 sur toutes les tables)

8. `20261004100000_manual_certificates.sql` — **certificat créé manuellement par l'admin** (`admin_issue_certificate`) + notification de la liste d'attente quand une session ouvre

Raccourci : `supabase/ALL_MIGRATIONS.sql` contient ces 8 fichiers dans cet ordre. Si la migration est déjà passée mais que l'application affiche 404/403, exécuter `supabase/FIX_GRANTS_ET_PROFILS.sql` (GRANT + profils manquants).

Les migrations sont relançables. **Un 404 sur `/rest/v1/courses`, `/projects`, `/settings` ou `/testimonials` signifie que ces migrations n'ont pas été exécutées sur le projet pointé par `VITE_SUPABASE_URL`.** Exécute `supabase/verify_schema.sql` dans l'éditeur SQL de CE projet pour voir précisément ce qui manque. Si les tables existent mais que le 404 persiste, lance `notify pgrst, 'reload schema';`.

> **Migration depuis l'ancien prototype** : ce schéma ne conserve aucune table ministérielle. Utilise un projet Supabase neuf, ou supprime d'abord les anciennes tables/politiques (`drop table … cascade`) avant d'exécuter le schéma. Les anciennes données ne sont pas migrées.

### Créer le premier administrateur

Les inscriptions créent toujours un compte `LEARNER` (le rôle n'est jamais choisi par le client ; un trigger bloque l'auto-promotion). Après ta première inscription, dans l'éditeur SQL :

```sql
update public.profiles set role = 'ADMIN' where email = 'ton-email@exemple.com';
```

Tu accèdes alors à `/studio`. Depuis *Studio → Apprenants* tu peux promouvoir un `INSTRUCTOR`.

### Données initiales
Seul le **contenu pédagogique** est fourni. Les projets du portfolio sont créés **non publiés** (AgriFlow RDC, Wedding Moments) : complète-les puis publie-les depuis *Studio → Projets*. Aucune statistique, aucun témoignage, aucun client, aucune date n'est inventé. Les compteurs du Studio affichent `0` tant qu'il n'y a rien.

## Identité et réseaux sociaux
*Studio → Paramètres* : nom, titre, bio, photo, localisation, email, téléphone, réseaux, CV, parcours (page À propos). Un réseau laissé vide est masqué dans le footer.

## Sécurité
- Seules `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (publiques) sont utilisées côté frontend. **Aucune clé secrète dans le code.**
- RLS activée sur toutes les tables : l'apprenant ne voit que ses inscriptions/progression/notifications ; les contenus publiés sont publics ; l'écriture est réservée au staff ; les messages de contact et les profils ne sont jamais publics.
- Le rendu des leçons/articles n'injecte aucun HTML brut ; les URLs saisies sont filtrées (`http(s)` uniquement).

## IA (optionnel)
L'assistant passe par l'Edge Function `supabase/functions/ai-assistant`. Pour l'activer :

```bash
supabase functions deploy ai-assistant
supabase secrets set AI_API_KEY=… AI_MODEL=…
```
Sans secrets, l'interface affiche « Assistant IA non configuré. »

## CV & profil professionnel
- **Studio → CV & Profil professionnel** (ADMIN uniquement) : identité, profil, compétences, expériences, formation, projets, certifications, réalisations, langues, modèle et publication. Aperçu mis à jour en direct.
- **Une seule source de données** : les projets viennent de la table `projects` (case « Afficher dans mon CV »), les formations de `courses` (« activité de formateur »), les services de `services`. Nom, titre, photo et liens sont aussi synchronisés vers le site (`settings`). Email et téléphone ne sont synchronisés que s'ils sont affichés dans le CV.
- **Page publique `/cv`** : accessible seulement si « CV publié » est activé. Les visiteurs ne lisent jamais les tables `cv_*` : ils appellent `get_public_cv()` qui ne renvoie que le contenu visible et publié.
- **PDF réel** (`@react-pdf/renderer`, chargé uniquement au clic) : A4, texte sélectionnable, liens cliquables, 4 modèles. Le **QR code** vers `/cv` n'est généré que si `SITE_URL` est défini au build (jamais de faux domaine).

## Notifications de publication
- **In-app** : créées automatiquement par un trigger SQL quand une formation passe à `PUBLIEE` (une seule fois par personne grâce à `notifications.dedupe_key`).
- **Email** : Edge Function `supabase/functions/notify-course-published`. Elle n'envoie rien tant que `RESEND_API_KEY` et `MAIL_FROM` ne sont pas définis (`supabase secrets set …`) ; le Studio affiche alors « Notifications email non configurées. ». Déploiement : `supabase functions deploy notify-course-published`.

## Tests
- `npm test` : parcours visiteur → inscription → cours → progression, et admin → création → publication (faux backend en mémoire, jsdom).
- `npm run test:db` : migrations + RLS + triggers sur un PostgreSQL **local jetable** (jamais sur ton projet Supabase). Voir `scripts/test-db.sh`.

## Déploiement sur Render
- Type : **Static Site** (ou `render.yaml` fourni)
- Build command : `npm install && npm run build`
- Publish directory : `dist`
- Rewrite : `/*` → `/index.html` (déjà dans `render.yaml` et `public/_redirects`)
- Variables : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, et optionnellement `SITE_URL` (génère `sitemap.xml`)
- Supabase → Authentication → URL Configuration : ajouter l'URL Render dans *Site URL* / *Redirect URLs*.

## Routes
Public : `/`, `/a-propos`, `/apprendre`, `/formations(/:slug)`, `/parcours`, `/projets(/:slug)`, `/vibe-coding`, `/idee-au-produit`, `/pitch-lab`, `/ressources`, `/articles(/:slug)`, `/workshops(/:slug)`, `/services`, `/contact`, `/login`, `/register`, `/mot-de-passe-oublie`
Apprenant : `/app`, `/app/formations(/:slug)`, `/app/progression`, `/app/projets`, `/app/ressources`, `/app/certificats`, `/app/favoris`, `/app/notifications`, `/app/profil`
Studio : `/studio` + formations, modules, lecons, apprenants, inscriptions, projets, articles, ressources, workshops, messages, services, temoignages, analytics, parametres

## Photos officielles (direction artistique)
14 photos personnelles dans `photos-originals/`, optimisées par `python3 scripts/process_photos.py` (Pillow) → `public/photos/*.webp` (480 / 800 / 1080 px selon la résolution native) + `src/data/photos.ts` (texte alternatif, points focaux mobile/desktop, aperçu flou LQIP).
Retouches globales uniquement (contraste doux, tons sombres, netteté) : aucune modification des visages, aucune image générée, aucun agrandissement artificiel.
Composants : `Photo` (srcset, `object-fit: cover`, point focal par photo, lazy-loading, fondu, parallax léger désactivé si « réduire les animations »), `PhotoCard`, `Evolution`, `FinalCta`.

| Emplacement | Photo |
|---|---|
| Hero (accueil) — assis avec l'ordinateur portable, toujours affiché (non remplacé par la photo des Paramètres) | p08 |
| Portrait « Derrière JOE DEV CODES » + page À propos | p06 |
| Entrepreneuriat (accueil) | p02 + p07 |
| Parcours (triptyque « mon évolution ») | p13, p05, p04 |
| Formations (bandeau pédagogie) | p09 |
| Vibe Coding (hero) | p08 |
| Projets (coulisses) | p03 + p14 |
| Workshops (bandeau + vignette) | p01 + p10 |
| Contact | p11 |
| Section finale (accueil, À propos, Formations, Parcours, Projets) | p12 |

Pour changer une photo : remplacer `photos-originals/pNN.jpg`, ajuster `META` / `CROPS` dans le script, le relancer. La photo saisie dans Studio → Paramètres → Identité remplace le portrait de la page À propos ; le hero de l'accueil reste la photo p08.


## Formations présentielles (sessions, inscriptions, annonces, présences, certificats)

**Principe : aucun second système.** `courses` reste la fiche d'une formation (nouveau : `delivery_mode` = `PRESENTIEL` par défaut, `materials`, `practical_info`, `trainer_name`). Les formations `EN_LIGNE` existantes gardent exactement leur parcours (leçons, progression, certificat à la fin des leçons). `certificates` et `notifications` sont **étendues** (pas dupliquées).

| Table | Rôle |
|---|---|
| `training_sessions` | session présentielle : dates, horaires, lieu, capacité, statut, **conditions du certificat** (présence min., validation finale, projet, évaluation), publication de la liste |
| `training_registrations` | inscription (EN_ATTENTE / CONFIRMEE / REFUSEE / ANNULEE / PRESENT), validation, jeton QR de pointage |
| `training_announcements` | annonces, visibilité PUBLIC / PARTICIPANTS / FORMATEURS / ADMIN, expiration |
| `training_attendance` | présences par jour (PRESENT / ABSENT / RETARD) |
| `certificates` (étendue) | numéro `JDC-AAAA-XXXXXX` unique, instantané (nom, formation, dates, lieu, formateur), statut VALIDE / REVOQUE |
| `certificate_verifications` | journal des vérifications publiques |

### Sécurité (RLS + fonctions serveur)
- Le **public** ne lit jamais les inscriptions, présences ou certificats. Il utilise `verify_certificate()`, `get_published_list()`, `training_seats()` (champs minimaux : jamais email/téléphone).
- Un participant ne peut **ni s'inscrire hors fonction serveur** (`register_for_training_session` : capacité, doublons, email du compte), **ni se confirmer, se valider, se déclarer présent ou fabriquer un certificat**. Les présences ne s'écrivent que via `set_attendance` / `training_check_in` (droits vérifiés côté base : ADMIN ou formateur désigné de la session).
- La capacité est contrôlée côté base avec verrou (aucun dépassement possible en concurrence).
- Une formation ayant des certificats ne peut pas être supprimée (archive-la).
- Aucune clé `service_role` côté frontend.

### Workflow Studio (ADMIN)
Studio → *Formations présentielles* : Formation → **Sessions** (créer, ouvrir les inscriptions) → **Inscriptions** (confirmer/refuser) → onglet *Liste* (sélectionner, publier publiquement ou pour les participants connectés) → **Annonces** → **Présences** → *Terminer la formation* → valider les participants → certificats générés automatiquement (+ notification) → **Certificats** (PDF, révocation).
Les conditions du certificat sont celles que tu définis dans la session : **aucune règle n'est imposée par défaut**.

### Notifications et emails
Les notifications sont **in-app** (déduplication par `dedupe_key`). **Aucun email n'est envoyé** pour les annonces, listes ou certificats : l'interface ne prétend jamais le contraire. Seule l'Edge Function existante `notify-course-published` envoie des emails (si configurée).

### QR codes
- *Certificat* : QR vers `/verify-certificate/<numéro>` (domaine `SITE_URL` si défini, sinon domaine courant).
- *Pointage* : le participant confirmé voit son QR dans `/app/formations/inscriptions/:id` ; le formateur le scanne avec l'appareil photo de son téléphone **connecté au Studio** → `/studio/pointage/:jeton` enregistre la présence côté serveur.

### Pages
Public : `/formations`, `/formations/:slug` (sessions + inscription), `/formations/:slug/sessions/:id/liste`, `/verify-certificate/:numéro`.
Participant : `/app/formations` (section *Mes formations*), `/app/formations/inscriptions/:id`, `/app/annonces/:id`, `/app/certificats(/:id)`.
Studio : `/studio/sessions(/:id)`, `/studio/inscriptions`, `/studio/annonces`, `/studio/presences`, `/studio/certificats`, `/studio/pointage/:jeton`.

### Tests
`npm test` (45 tests : parcours UI + PDF réel du certificat) et `npm run test:db` (226 contrôles SQL sur un PostgreSQL jetable, dont `04_training_checks.sql` : parcours complet, formation complète, annulation, non-éligible, certificat déjà généré, révoqué, accès non autorisés, accès direct aux tables privées).


## Accueil et CV — dernières évolutions
- **Hero de l'accueil** : photo p08 (Joe assis avec son ordinateur portable).
- **Accueil → section « Formations présentielles »** : cartes `TrainingCard` (badge PRÉSENTIEL, date, lieu, niveau, statut, places) alimentées par les sessions réelles de Supabase ; une formation sans session affiche « Bientôt disponible », jamais une fausse date. Les formations `EN_LIGNE` conservent leur carte habituelle.
- **CV (fonctionnalités conservées intégralement)** : nouvel indicateur **Qualité du CV** dans *Studio → CV → Modèle et publication* (10 critères calculés uniquement à partir du contenu réellement saisi, avec accès direct à l'onglet à compléter) + badge dans l'en-tête ; la page publique `/cv` ajoute les raccourcis *Mes formations* et *Me contacter*.


## Inscriptions : pourquoi un visiteur voit « Me prévenir » au lieu de « S'inscrire »
Une session n'est visible (et l'inscription possible) que si **la formation est publiée** ET **la session n'est pas en brouillon** (idéalement « Inscriptions ouvertes »). Sinon le visiteur voit la liste d'attente « Me prévenir », qui n'est **pas** une inscription : elle enregistre seulement un email (Studio → Sessions → « Liste d'attente »). Les nouvelles sessions sont désormais créées « Inscriptions ouvertes » par défaut, et le Studio affiche une alerte si la formation n'est pas publiée.

## Certificats manuels
Studio → Certificats → **Créer un certificat** (admin) ou, dans la gestion d'une session, bouton **Certificat manuel** sur un participant confirmé. Numéro unique serveur, vérification publique identique, badge « Manuel » dans la liste.


## Certificat premium (design)
Bande bleue diagonale avec liserés dorés, sceau doré « </> », titre CERTIFICAT / DE FORMATION, nom et formation en écriture calligraphique, lignes « Animée par », « Fait à », « Le », deux signatures, QR code de vérification et numéro unique. Le même dessin (`src/lib/training/certArt.ts`) alimente l'aperçu écran (`CertificateSheet.tsx`) et le PDF A4 paysage (`pdf/CertificatePdf.tsx`, texte sélectionnable). Police calligraphique : sous-ensemble latin de TeX Gyre Chorus (`public/fonts/jdc-script.ttf`, GUST Font License, voir `LICENSE-TeXGyreChorus.txt`). Le certificat reste présenté honnêtement comme « Certificat de formation délivré par JOE DEV CODES » : aucune accréditation ni reconnaissance officielle n'est mentionnée.
