/*
  # JOE DEV CODES — droits d'accès à l'API Data (GRANT explicites)

  Depuis le 30 mai 2026, les NOUVEAUX projets Supabase n'accordent plus automatiquement aux rôles
  anon / authenticated / service_role l'accès aux nouvelles tables du schéma public (et tous les projets
  existants à partir du 30 octobre 2026). Sans GRANT explicite, l'API répond 404 (« table introuvable dans le
  schéma ») ou 403 (« permission denied »), même si la table existe et que les policies RLS sont correctes.

  Principe : le GRANT donne le droit d'ATTEINDRE la table ; les policies RLS décident QUELLES LIGNES sont visibles.
  On accorde donc le strict nécessaire par rôle, en cohérence avec les policies déjà définies.

  Ré-exécutable. À lancer APRÈS toutes les autres migrations.
*/

grant usage on schema public to anon, authenticated, service_role;

-- ───────────── anon (visiteur non connecté) : lecture du contenu public uniquement ─────────────
-- (les policies RLS limitent aux contenus publiés ; settings est filtré sur les clés identity.* / about.* / site.*)
grant select on
  public.courses, public.course_modules, public.lessons, public.projects, public.project_technologies,
  public.resources, public.articles, public.workshops, public.services, public.testimonials, public.settings,
  public.training_sessions, public.training_announcements
to anon;

-- Envois publics (formulaire de contact, inscription à un atelier, « Me prévenir »)
grant insert on public.contact_messages, public.workshop_registrations, public.course_waitlist to anon;

-- ───────────── authenticated (connecté) : les policies RLS décident des lignes ─────────────
grant select, insert, update, delete on
  public.profiles, public.courses, public.course_modules, public.lessons, public.lesson_resources,
  public.projects, public.project_technologies, public.resources, public.articles, public.workshops,
  public.services, public.testimonials, public.settings, public.enrollments, public.favorites,
  public.notifications, public.contact_messages,
  public.training_sessions, public.training_registrations, public.training_announcements,
  public.cv_profiles, public.cv_skills, public.cv_experiences, public.cv_education,
  public.cv_certifications, public.cv_achievements, public.cv_languages
to authenticated;

grant select, insert, delete on public.lesson_progress, public.workshop_registrations, public.course_waitlist to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;

-- Lecture seule : les écritures passent par des fonctions serveur (certificats, présences) ou les triggers
grant select on public.certificates, public.audit_logs, public.certificate_verifications, public.training_attendance to authenticated;

-- ───────────── service_role (Edge Functions, jamais exposé au navigateur) ─────────────
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

notify pgrst, 'reload schema';
