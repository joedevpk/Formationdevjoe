import { LayoutDashboard, Layers, Users, FolderKanban, Library, Mail, Bell, Settings, FileText, CalendarDays, ClipboardCheck } from 'lucide-react';
import { DashboardLayout, type NavItem } from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';

const content = (isAdmin: boolean): NavItem[] => [
  { to: '/studio/formations', label: 'Formations', icon: Layers },
  { to: '/studio/articles', label: 'Articles', icon: Layers },
  { to: '/studio/workshops', label: 'Workshops', icon: Layers },
  ...(isAdmin ? [{ to: '/studio/services', label: 'Services', icon: Layers }, { to: '/studio/temoignages', label: 'Témoignages', icon: Layers }] : []),
];

export default function StudioLayout() {
  const { isAdmin } = useAuth();
  // L'instructeur ne voit que le contenu pédagogique ; apprenants, messages, paramètres… sont réservés à l'ADMIN (aussi côté RLS).
  const items: NavItem[] = [
    { to: '/studio', label: 'Vue générale', icon: LayoutDashboard, end: true },
    { to: '/studio/formations', label: 'Contenu', icon: Layers, children: content(isAdmin) },
    ...(isAdmin ? [{ to: '/studio/sessions', label: 'Formations présentielles', icon: CalendarDays, children: [
      { to: '/studio/formations', label: 'Toutes les formations', icon: Layers },
      { to: '/studio/sessions', label: 'Sessions', icon: CalendarDays },
      { to: '/studio/inscriptions', label: 'Inscriptions', icon: Users },
      { to: '/studio/annonces', label: 'Annonces', icon: Bell },
      { to: '/studio/presences', label: 'Présences', icon: ClipboardCheck },
      { to: '/studio/certificats', label: 'Certificats', icon: Layers },
    ] }] : [{ to: '/studio/presences', label: 'Présences', icon: ClipboardCheck }]),
    ...(isAdmin ? [{ to: '/studio/apprenants', label: 'Apprenants', icon: Users }] : []),
    ...(isAdmin ? [{ to: '/studio/projets', label: 'Projets', icon: FolderKanban }] : []),
    { to: '/studio/ressources', label: 'Ressources', icon: Library },
    ...(isAdmin ? [
      { to: '/studio/messages', label: 'Messages', icon: Mail },
      { to: '/studio/notifications', label: 'Notifications', icon: Bell },
      { to: '/studio/cv', label: 'CV & Profil professionnel', icon: FileText },
      { to: '/studio/parametres', label: 'Paramètres', icon: Settings },
    ] : []),
  ];
  return <DashboardLayout title="JOE DEV STUDIO" items={items} />;
}
