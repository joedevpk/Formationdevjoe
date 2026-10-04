import {
  AppWindow, Bot, Braces, Cloud, Code2, Database, Globe, GraduationCap, Layers, Layout, LayoutDashboard, Mic, Rocket, Sparkles, Terminal, Users, Wrench,
  type LucideIcon,
} from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  AppWindow, Bot, Braces, Cloud, Code2, Database, Globe, GraduationCap, Layers, Layout, LayoutDashboard, Mic, Rocket, Sparkles, Terminal, Users, Wrench,
};

export const iconNames = Object.keys(icons);

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = icons[name] ?? Code2;
  return <Cmp className={className} aria-hidden="true" />;
}

const categoryIcons: Record<string, string> = {
  Web: 'Globe', HTML: 'Layout', JavaScript: 'Braces', React: 'AppWindow', Plateformes: 'Layers', Python: 'Terminal',
  Supabase: 'Database', IA: 'Bot', 'Vibe Coding': 'Sparkles', Déploiement: 'Cloud', Pitch: 'Mic', Entrepreneuriat: 'Rocket',
};
export function categoryIcon(category: string): string {
  return categoryIcons[category] ?? 'Code2';
}
