import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db/DatabaseClient';
import type { User } from '../db/DatabaseClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAsMockUser: (userId: string) => Promise<void>;
  logout: () => void;
  triggerOAuth: (provider: 'google' | 'github') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carregar sessão salva ao inicializar
    const savedUserId = localStorage.getItem('samack_user_id');
    const loadSession = async () => {
      if (savedUserId) {
        try {
          const u = await db.getCurrentUser(savedUserId);
          if (u && u.status === 'active') {
            setUser(u);
          } else {
            localStorage.removeItem('samack_user_id');
            localStorage.removeItem('samack_token');
          }
        } catch (e) {
          console.error("Erro ao carregar sessão:", e);
        }
      }
      setIsLoading(false);
    };
    loadSession();
  }, []);

  const loginAsMockUser = async (userId: string) => {
    setIsLoading(true);
    try {
      const u = await db.getCurrentUser(userId);
      if (u) {
        if (u.status === 'blocked') {
          throw new Error('Sua conta está bloqueada pelo administrador.');
        }
        setUser(u);
        localStorage.setItem('samack_user_id', u.id);
        localStorage.setItem('samack_token', 'mock_jwt_token_for_' + u.id);
      }
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('samack_user_id');
    localStorage.removeItem('samack_token');
  };

  const triggerOAuth = (provider: 'google' | 'github') => {
    const apiEndpoint = import.meta.env.VITE_API_URL || '';
    if (apiEndpoint) {
      // Em produção, redireciona para a API de autenticação do Worker
      window.location.href = `${apiEndpoint}/api/auth/${provider}`;
    } else {
      // No modo Mock, simula a autenticação com sucesso
      alert(`[Mock Mode] Simulando redirecionamento de login via ${provider}. Escolha um perfil no menu de testes do cabeçalho.`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginAsMockUser,
        logout,
        triggerOAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
