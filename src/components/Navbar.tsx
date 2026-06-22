import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { 
  Link2, 
  LayoutDashboard, 
  Shield, 
  LogOut, 
  ChevronDown, 
  User as UserIcon, 
  ChevronRight
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, logout, loginAsMockUser } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMockSelectorOpen, setIsMockSelectorOpen] = useState(false);

  const handleMockLogin = async (userId: string) => {
    try {
      await loginAsMockUser(userId);
      setIsMockSelectorOpen(false);
      onNavigate('dashboard');
    } catch (e) {
      alert("Falha no login simulado");
    }
  };

  const navItemClass = (view: string) => {
    const isActive = currentView === view;
    return `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
      isActive 
        ? 'text-primary bg-primary/10' 
        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-dark-card'
    }`;
  };

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

        {/* NAVEGAÇÃO PRINCIPAL */}
        <nav className="hidden md:flex items-center gap-2">
          <span 
            onClick={() => onNavigate('landing')}
            className={navItemClass('landing')}
          >
            Início
          </span>
          {user && (
            <span 
              onClick={() => onNavigate('dashboard')}
              className={navItemClass('dashboard')}
            >
              <LayoutDashboard className="h-4 w-4" />
              Painel
            </span>
          )}
          {user && user.role === 'admin' && (
            <span 
              onClick={() => onNavigate('admin')}
              className={navItemClass('admin')}
            >
              <Shield className="h-4 w-4" />
              Admin
            </span>
          )}
        </nav>

        {/* ÁREA DA DIREITA (Tema, Autenticação Mock e Dropdowns) */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* MENU SELETOR MOCK (Facilitador de testes locais) */}
          <div className="relative">
            <button
              onClick={() => setIsMockSelectorOpen(!isMockSelectorOpen)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-all cursor-pointer"
            >
              Simulador Auth
              <ChevronDown className="h-3 w-3" />
            </button>

            {isMockSelectorOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsMockSelectorOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl p-2 z-20">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider">
                    Simular Login como:
                  </div>
                  <button
                    onClick={() => handleMockLogin('usr_admin')}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium flex items-center justify-between"
                  >
                    <span>Administrador (Enterprise)</span>
                    <ChevronRight className="h-3 w-3 text-primary" />
                  </button>
                  <button
                    onClick={() => handleMockLogin('usr_user1')}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium flex items-center justify-between"
                  >
                    <span>Developer John (Plano Pro)</span>
                    <ChevronRight className="h-3 w-3 text-primary" />
                  </button>
                  <button
                    onClick={() => handleMockLogin('usr_user2')}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium flex items-center justify-between"
                  >
                    <span>Jane Silva (Plano Grátis)</span>
                    <ChevronRight className="h-3 w-3 text-primary" />
                  </button>
                  <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
                  <button
                    onClick={() => {
                      logout();
                      setIsMockSelectorOpen(false);
                      onNavigate('landing');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 font-medium"
                  >
                    Deslogar / Anônimo
                  </button>
                </div>
              </>
            )}
          </div>

          {/* PERFIL DE USUÁRIO */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-card hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <img
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                  alt={user.name}
                  className="h-7 w-7 rounded-lg object-cover"
                />
                <span className="hidden sm:block text-xs font-semibold text-neutral-800 dark:text-neutral-200 max-w-[100px] truncate">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
              </button>

              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl p-3 z-20">
                    {/* INFO DO USUÁRIO */}
                    <div className="flex items-center gap-3 p-2 mb-2 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">
                      <img
                        src={user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                        alt={user.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-grow">
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {user.name}
                        </h4>
                        <p className="text-[10px] text-neutral-400 dark:text-dark-text-muted truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 p-2 mb-2 bg-primary/5 rounded-xl border border-primary/10">
                      <div>
                        <span className="block text-[8px] text-neutral-400 dark:text-dark-text-muted uppercase font-bold">Plano</span>
                        <span className="text-xs font-extrabold text-primary uppercase">{user.plan}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-neutral-400 dark:text-dark-text-muted uppercase font-bold">Acesso</span>
                        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase">{user.role}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          onNavigate('dashboard');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                      >
                        <LayoutDashboard className="h-4 w-4 text-neutral-400" />
                        Meu Painel
                      </button>
                      
                      {user.role === 'admin' && (
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            onNavigate('admin');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                        >
                          <Shield className="h-4 w-4 text-neutral-400" />
                          Painel Admin
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          logout();
                          onNavigate('landing');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        Sair da Conta
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsMockSelectorOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 shadow-md shadow-neutral-950/10 transition-all cursor-pointer"
            >
              <UserIcon className="h-3.5 w-3.5" />
              Entrar
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
export default Navbar;
