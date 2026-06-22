import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { Link2, Settings } from 'lucide-react';

interface NavbarProps {
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 dark:border-dark-border bg-white/80 dark:bg-dark-bg/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* LOGO E NOME */}
        <div 
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2.5 cursor-pointer group"
          id="logo-brand"
        >
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <Link2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-neutral-900 dark:text-white">
              SAMACK
            </span>
            <span className="hidden sm:block text-[10px] text-primary font-semibold tracking-wider uppercase -mt-1">
              Shortener
            </span>
          </div>
        </div>

        {/* NAVEGAÇÃO / AÇÕES DA DIREITA */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>

      </div>
    </header>
  );
};

export default Navbar;
