import { useWorldStore } from '../store/useWorldStore';

export function ThemeToggle() {
  const theme = useWorldStore((s) => s.theme);
  const toggleTheme = useWorldStore((s) => s.toggleTheme);

  return (
    <button
      onClick={toggleTheme}
      className="absolute top-3 right-36 z-10 panel-glass px-3 py-1.5 rounded-lg text-sm hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      data-testid="theme-toggle"
    >
      {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
    </button>
  );
}
