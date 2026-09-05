import { PathColor } from './learningPaths';

interface PathColorClasses {
  bg: string;
  border: string;
  text: string;
}

const PATH_COLOR_MAP: Record<PathColor, PathColorClasses> = {
  'neon-green': { bg: 'bg-green-400/10', border: 'border-green-400/30', text: 'text-green-400' },
  'neon-blue': { bg: 'bg-blue-400/10', border: 'border-blue-400/30', text: 'text-blue-400' },
  'neon-purple': { bg: 'bg-purple-400/10', border: 'border-purple-400/30', text: 'text-purple-400' },
  'yellow-400': { bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', text: 'text-yellow-400' },
};

export function getPathColorClasses(color: PathColor): PathColorClasses {
  return PATH_COLOR_MAP[color] || PATH_COLOR_MAP['neon-green'];
}
