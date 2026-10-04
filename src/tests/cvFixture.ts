import type { CvData } from '@/lib/cv/types';

/** Données de TEST uniquement (jamais utilisées dans l'application). */
export const sampleCv = (over: Partial<CvData['profile']> = {}): CvData => ({
  profile: { first_name: 'Prénom', last_name: 'Test', display_name: 'Prénom Test', photo_url: null, headline: 'Développeur • Formateur • Étudiant • Entrepreneur', location: 'Ville, Pays', email: 'test@example.com', phone: null, website: null, github: 'https://github.com/exemple', linkedin: null, links: [], summary_short: 'Court.', summary_long: 'Premier paragraphe du profil de test.\n\nSecond paragraphe avec des accents : é è à ç œ — « guillemets ».', show_summary: true, show_services: true, show_qr: true, template: 'minimal', ...over },
  skills: [
    { id: 's1', category: 'Frontend', name: 'React', level: null, position: 0 }, { id: 's2', category: 'Frontend', name: 'TypeScript', level: 'Intermédiaire', position: 1 },
    { id: 's3', category: 'Database', name: 'PostgreSQL', level: null, position: 2 },
  ],
  experiences: [{ id: 'e1', role: 'Poste de test', organization: 'Organisation test', location: null, start_date: '2023-03-01', end_date: null, is_current: true, description: 'Description de test.', achievements: ['Réalisation de test A', 'Réalisation de test B'], technologies: ['React', 'Supabase'], position: 0 }],
  education: [{ id: 'd1', institution: 'Établissement de test', degree: 'Licence', field: 'Informatique de gestion', location: 'Ville', start_date: null, end_date: null, description: '', position: 0 }],
  certifications: [{ id: 'c1', name: 'Certification de test', issuer: 'Organisme de test', issued_on: '2024-06-01', credential_id: 'ABC-123', url: 'https://example.com/verify', description: '', position: 0 }],
  achievements: [{ id: 'a1', title: 'Réalisation de test', event: 'Événement de test', year: 2025, description: 'Détail.', result: 'Résultat de test', url: null, image_url: null, position: 0 }],
  languages: [{ id: 'l1', language: 'Français', level: 'Courant', position: 0 }],
  projects: [{ id: 'p1', slug: 'projet-test', title: 'Projet de test', summary: 'Résumé du projet de test.', role: 'Développeur', status: 'En développement', demo_url: 'https://example.com', github_url: 'https://github.com/exemple/projet', image_url: null, results: null, technologies: ['React', 'TypeScript'] }],
  trainer_courses: [{ id: 'f1', slug: 'formation-test', title: 'Formation de test', category: 'React', level: 'DEBUTANT' }],
  services: [{ id: 'sv1', title: 'Service de test' }],
  updated_at: '2026-10-01T10:00:00Z',
});
