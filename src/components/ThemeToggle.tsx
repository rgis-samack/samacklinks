import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    // Verificar preferência anterior
    const savedTheme = localStorage.getItem('samack_theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // Verificar preferência do sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      localStorage.setItem('samack_theme', 'dark');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      localStorage.setItem('samack_theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-lg border border-neutral-200 dark:border-dark-border text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-dark-card hover:text-neutral-900 dark:hover:text-white transition-all cursor-pointer focus:outline-none"
      title={isDark ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
      aria-label="Alternar tema"
      id="theme-toggle-btn"
    >
      {isDark ? (
        <Sun className="h-5 w-5 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="h-5 w-5 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
};
export default ThemeToggle;
