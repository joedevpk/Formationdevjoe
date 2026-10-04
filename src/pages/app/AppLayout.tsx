import { LayoutDashboard, BookOpen, TrendingUp, FolderKanban, Award, Bell, UserRound } from 'lucide-react';
import { DashboardLayout, type NavItem } from '@/components/layouts/DashboardLayout';

const items: NavItem[] = [
  { to: '/app', label: 'Accueil', icon: LayoutDashboard, end: true },
  { to: '/app/formations', label: 'Mes formations', icon: BookOpen },
  { to: '/app/progression', label: 'Ma progression', icon: TrendingUp },
  { to: '/app/projets', label: 'Mes projets', icon: FolderKanban },
  { to: '/app/certificats', label: 'Mes certificats', icon: Award },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/profil', label: 'Mon profil', icon: UserRound },
];

export default function AppLayout() {
  return <DashboardLayout title="Mon espace" items={items} />;
}
