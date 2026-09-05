import { 
  Terminal, 
  Shield, 
  Search, 
  BookOpen, 
  Code, 
  Network, 
  Database,
  Lock,
  Globe,
  Server,
  LucideIcon
} from 'lucide-react';

export const iconMap: Record<string, LucideIcon> = {
  Terminal,
  Shield,
  Search,
  BookOpen,
  Code,
  Network,
  Database,
  Lock,
  Globe,
  Server
};

export const getIcon = (iconName: string): LucideIcon => {
  return iconMap[iconName] || BookOpen;
};