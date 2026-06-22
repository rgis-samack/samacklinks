import React, { useState } from 'react';
import { useToast } from './Toast';
import type { Link as DbLink } from '../db/DatabaseClient';
import { 
  Lock, 
  Unlock, 
  CalendarOff, 
  ShieldAlert, 
  Home,
  AlertTriangle
} from 'lucide-react';

interface SecurityViewProps {
  type: 'password' | 'expired' | 'disabled';
  link: DbLink | null;
  onSuccessRedirect: (url: string) => void;
  onNavigate: (view: string) => void;
}

export const SecurityView: React.FC<SecurityViewProps> = ({ type, link, onSuccessRedirect, onNavigate }) => {
  const { toast } = useToast();
  const [passwordInput, setPasswordInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;

    setIsSubmitting(true);
    // Simular validação rápida da senha (em prod, isso seria validado por hash no Worker)
    if (passwordInput === link.password) {
      toast.success('Senha confirmada', 'Redirecionando você para o destino...');
      setTimeout(() => {
        onSuccessRedirect(link.originalUrl);
      }, 1000);
    } else {
      toast.error('Senha incorreta', 'A senha digitada não confere com a chave do link.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center p-4 bg-neutral-50 dark:bg-dark-bg min-h-[80vh]">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl glass text-center space-y-6">
        
        {/* INTERMINÁVEL 1: PROTEÇÃO POR SENHA */}
        {type === 'password' && link && (
          <>
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-pulse">
              <Lock className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                Link Protegido
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-dark-text-muted mt-2">
                O acesso ao atalho <span className="font-semibold text-primary">samack.link/{link.slug}</span> exige uma senha de autenticação.
              </p>
            </div>

            <form onSubmit={handleVerifyPassword} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider mb-2">
                  Digite a senha do link
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Insira a senha de acesso"
                  className="w-full px-4 py-3 rounded-2xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/45 font-semibold text-sm transition-all"
                  required
                  autoFocus
                />
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold tracking-widest uppercase shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? 'Redirecionando...' : 'Desbloquear e Acessar'}
                <Unlock className="h-4 w-4" />
              </button>
            </form>
          </>
        )}

        {/* INTERMINÁVEL 2: EXPIROU */}
        {type === 'expired' && (
          <>
            <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <CalendarOff className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                Este link expirou
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-dark-text-muted mt-2 leading-relaxed">
                O proprietário deste atalho definiu um prazo limite que já foi atingido. Esta URL não está mais disponível.
              </p>
            </div>
            
            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6">
              <button
                onClick={() => onNavigate('landing')}
                className="w-full py-3 rounded-2xl border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="h-4 w-4" />
                Criar meus próprios links curtos
              </button>
            </div>
          </>
        )}

        {/* INTERMINÁVEL 3: SUSPENSO / DESATIVADO */}
        {type === 'disabled' && (
          <>
            <div className="mx-auto h-16 w-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                Link Suspenso
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-dark-text-muted mt-2 leading-relaxed">
                Este atalho de URL foi desativado temporariamente por violar nossas diretrizes de uso (spam, phishing) ou foi pausado pelo proprietário.
              </p>
            </div>

            <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10 flex items-start gap-2 text-left text-[11px] text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
              <span>
                Para sua segurança, bloqueamos o redirecionamento imediato. Se você acredita que este link é seguro, por favor contate o suporte do administrador.
              </span>
            </div>

            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6">
              <button
                onClick={() => onNavigate('landing')}
                className="w-full py-3 rounded-2xl border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="h-4 w-4" />
                Voltar à Página Principal
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
export default SecurityView;
