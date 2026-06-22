import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './components/Toast';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { PublicStats } from './components/PublicStats';
import { SecurityView } from './components/SecurityView';
import { db } from './db/DatabaseClient';
import type { Link as DbLink } from './db/DatabaseClient';
import { detectBrowser, detectOS, detectDevice, detectReferrer } from './utils/helpers';

const AppContent: React.FC = () => {
  const { toast } = useToast();
  
  // Estado de Navegação / Roteamento
  const [currentView, setCurrentView] = useState('landing'); // landing, stats, password, expired, disabled
  const [routeSlug, setRouteSlug] = useState('');
  const [activeLink, setActiveLink] = useState<DbLink | null>(null);



  // Analisador de Hash para Roteamento Dinâmico
  const parseHash = async () => {
    const hash = window.location.hash || '#/';
    
    if (hash === '#/') {
      setCurrentView('landing');
      setRouteSlug('');
      setActiveLink(null);
      return;
    }

    if (hash.startsWith('#/stats/')) {
      const slug = hash.replace('#/stats/', '');
      setCurrentView('stats');
      setRouteSlug(slug);
      setActiveLink(null);
      return;
    }

    if (hash.startsWith('#/password/')) {
      const slug = hash.replace('#/password/', '');
      const link = await db.getLinkBySlug(slug);
      if (link) {
        setCurrentView('password');
        setRouteSlug(slug);
        setActiveLink(link);
      } else {
        toast.error('Link não encontrado', 'A URL segura solicitada não existe.');
        window.location.hash = '#/';
      }
      return;
    }

    if (hash === '#/expired') {
      setCurrentView('expired');
      setRouteSlug('');
      return;
    }

    if (hash === '#/disabled') {
      setCurrentView('disabled');
      setRouteSlug('');
      return;
    }

    // Fluxo de redirecionamento para atalhos: "#/slug-do-link"
    if (hash.startsWith('#/')) {
      const slug = hash.replace('#/', '');
      
      // Ignorar hashes que sejam rotas parciais ou inválidas
      if (!slug || slug.includes('/') || slug === 'index.html') {
        setCurrentView('landing');
        return;
      }

      try {
        const link = await db.getLinkBySlug(slug);
        
        if (!link) {
          toast.error('Link não encontrado', `O atalho "/${slug}" não foi cadastrado ou foi excluído.`);
          window.location.hash = '#/';
          return;
        }

        // Verificar segurança e regras
        if (link.status === 'disabled') {
          setCurrentView('disabled');
          setActiveLink(link);
          return;
        }

        const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
        if (isExpired) {
          setCurrentView('expired');
          setActiveLink(link);
          return;
        }

        if (link.password) {
          setCurrentView('password');
          setRouteSlug(slug);
          setActiveLink(link);
          return;
        }

        // Tudo certo: Registrar o clique e redirecionar!
        await executeRedirection(link);

      } catch (err: any) {
        console.error(err);
        toast.error('Erro de redirecionamento', err.message);
        window.location.hash = '#/';
      }
    }
  };

  const executeRedirection = async (link: DbLink) => {
    try {
      // Simular países e cidades aleatórias no clique mockado para gráficos ricos
      const countries = ['Brasil', 'EUA', 'Portugal', 'Espanha', 'Angola', 'Argentina'];
      const citiesMap: Record<string, string[]> = {
        'Brasil': ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Porto Alegre', 'Salvador'],
        'EUA': ['New York', 'San Francisco', 'Miami', 'Boston'],
        'Portugal': ['Lisboa', 'Porto', 'Braga'],
        'Espanha': ['Madrid', 'Barcelona'],
        'Angola': ['Luanda'],
        'Argentina': ['Buenos Aires']
      };
      
      const randomCountry = countries[Math.floor(Math.random() * countries.length)];
      const cities = citiesMap[randomCountry] || ['Outra'];
      const randomCity = cities[Math.floor(Math.random() * cities.length)];

      await db.registerClick({
        linkId: link.id,
        country: randomCountry,
        city: randomCity,
        browser: detectBrowser(),
        os: detectOS(),
        device: detectDevice(),
        referrer: detectReferrer()
      });

      toast.info('Redirecionando...', `Encaminhando para ${link.originalUrl}`, 800);
      
      // Executar redirecionamento
      setTimeout(() => {
        window.location.href = link.originalUrl;
      }, 300);

    } catch (e: any) {
      console.error("Erro ao registrar estatísticas de clique:", e);
      // Redireciona mesmo assim caso falhe o analytics
      window.location.href = link.originalUrl;
    }
  };

  useEffect(() => {
    // Log do banco ativo para debug do usuário no console do navegador
    console.log("SAMACK - Banco de dados ativo:", db.isMock() ? "LOCAL (LocalStorage / Offline)" : "NUVEM (Supabase / Online)");
    
    // Escutar mudanças no Hash da URL
    window.addEventListener('hashchange', parseHash);
    // Executar análise na carga inicial da página
    parseHash();

    return () => {
      window.removeEventListener('hashchange', parseHash);
    };
  }, []);

  const navigateTo = (view: string, slug = '') => {
    if (view === 'landing') {
      window.location.hash = '#/';
    } else if (view === 'stats') {
      window.location.hash = `#/stats/${slug}`;
    } else {
      window.location.hash = `#/${view}`;
    }
  };

  const handlePasswordSuccess = (url: string) => {
    window.location.href = url;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-bg text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
      
      {/* Exibir Navbar apenas se não estiver em tela de redirecionamento bloqueado/senha */}
      {currentView !== 'password' && currentView !== 'expired' && currentView !== 'disabled' && (
        <Navbar 
          onNavigate={navigateTo} 
        />
      )}

      {/* RENDERIZADOR DE ROTAS */}
      <div className="flex-grow flex flex-col">
        {currentView === 'landing' && (
          <LandingPage 
            onNavigate={navigateTo} 
          />
        )}
        
        {currentView === 'stats' && <PublicStats slug={routeSlug} onNavigate={navigateTo} />}
        
        {currentView === 'password' && (
          <SecurityView
            type="password"
            link={activeLink}
            onSuccessRedirect={handlePasswordSuccess}
            onNavigate={navigateTo}
          />
        )}

        {currentView === 'expired' && (
          <SecurityView
            type="expired"
            link={activeLink}
            onSuccessRedirect={handlePasswordSuccess}
            onNavigate={navigateTo}
          />
        )}

        {currentView === 'disabled' && (
          <SecurityView
            type="disabled"
            link={activeLink}
            onSuccessRedirect={handlePasswordSuccess}
            onNavigate={navigateTo}
          />
        )}
      </div>

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
