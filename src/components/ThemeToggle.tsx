import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-2 rounded-lg text-neon-green hover:bg-neon-green/10 hover:text-neon-green transition-colors border border-transparent hover:border-neon-green/20"
    >
      {isDark ? (
        <Sun className="w-5 h-5 transition-all duration-300 hover:rotate-45 hover:scale-110" />
      ) : (
        <Moon className="w-5 h-5 transition-all duration-300 hover:-rotate-12 hover:scale-110" />
      )}
    </button>
  );
}
