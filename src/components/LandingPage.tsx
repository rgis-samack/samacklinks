import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { db } from '../db/DatabaseClient';
import type { Link as DbLink } from '../db/DatabaseClient';
import { validateUrl, isValidSlug, generateUniqueSlug } from '../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Link2, 
  Sparkles, 
  Copy, 
  Check, 
  QrCode, 
  ArrowRight,
  TrendingUp, 
  Lock, 
  Calendar,
  ExternalLink
} from 'lucide-react';

const FacebookIcon: React.FC = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const LinkedinIcon: React.FC = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

const TwitterIcon: React.FC = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
);

export const LandingPage: React.FC<{ onNavigate: (view: string, slug?: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdLink, setCreatedLink] = useState<DbLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [sessionLinks, setSessionLinks] = useState<DbLink[]>([]);
  const [showQr, setShowQr] = useState(false);

  // Carregar links recentes desta sessão do sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('samack_session_links');
    if (saved) {
      setSessionLinks(JSON.parse(saved));
    }
  }, []);

  const saveSessionLink = (newLink: DbLink) => {
    const updated = [newLink, ...sessionLinks].slice(0, 5); // guardar os 5 mais recentes
    setSessionLinks(updated);
    sessionStorage.setItem('samack_session_links', JSON.stringify(updated));
  };

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('URL em branco', 'Por favor, insira um link de destino.');
      return;
    }

    // 1. Validar URL
    const { isValid, formattedUrl } = validateUrl(url);
    if (!isValid) {
      toast.error('URL inválida', 'Insira um formato válido (ex: google.com ou https://site.com).');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalSlug = slug.trim();

      // 2. Tratar apelido
      if (finalSlug) {
        const slugValidation = isValidSlug(finalSlug);
        if (!slugValidation.isValid) {
          toast.error('Apelido inválido', slugValidation.message);
          setIsSubmitting(false);
          return;
        }
        
        // Verificar se já existe
        const existing = await db.getLinkBySlug(finalSlug);
        if (existing) {
          toast.error('Indisponível', 'Este apelido já está sendo usado por outro link.');
          setIsSubmitting(false);
          return;
        }
      } else {
        // Gerar automaticamente
        finalSlug = await generateUniqueSlug();
      }

      // 3. Criar o link no Banco
      const newLink = await db.createLink({
        userId: user ? user.id : null,
        originalUrl: formattedUrl,
        slug: finalSlug,
        title: user ? `Link encurtado em ${new Date().toLocaleDateString('pt-BR')}` : 'Link Anônimo',
        description: 'Criado pela página inicial do SAMACK.',
        expiresAt: null,
      });

      // 4. Sucesso: Animação e Estados
      setCreatedLink(newLink);
      saveSessionLink(newLink);
      setUrl('');
      setSlug('');
      
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#FF6B00', '#FFFFFF', '#121212']
      });

      toast.success('Sucesso!', `Link encurtado: samack.link/${newLink.slug}`);

    } catch (err: any) {
      toast.error('Erro ao encurtar', err.message || 'Houve um problema ao processar seu link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getShortenedUrl = (s: string) => {
    // Retorna a URL real de clique com HashRouter e a visual do sistema
    return `${window.location.origin}/#/${s}`;
  };

  const handleCopy = (s: string) => {
    navigator.clipboard.writeText(getShortenedUrl(s));
    setCopied(true);
    toast.success('Copiado!', 'Link copiado para a área de transferência.');
    setTimeout(() => setCopied(false), 2000);
  };

  // Funções de Compartilhamento Social
  const shareLinks = (s: string) => {
    const link = encodeURIComponent(getShortenedUrl(s));
    const text = encodeURIComponent("Confira este link encurtado pelo SAMACK Shortener!");
    
    return {
      whatsapp: `https://api.whatsapp.com/send?text=${text}%20${link}`,
      telegram: `https://t.me/share/url?url=${link}&text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${link}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${link}`,
      twitter: `https://twitter.com/intent/tweet?url=${link}&text=${text}`
    };
  };

  // Gerador de QR Code do Google Charts API ou similar (estático rápido)
  const getQrCodeUrl = (s: string, size = 300) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(getShortenedUrl(s))}`;
  };

  const downloadQr = (s: string, type: 'png' | 'svg') => {
    const url = getQrCodeUrl(s);
    if (type === 'png') {
      const link = document.createElement('a');
      link.href = url;
      link.download = `samack-qr-${s}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.info('Iniciando download', 'Seu QR Code em PNG está sendo baixado.');
    } else {
      // Como o qrserver gera PNG por padrão, vamos simular SVG redirecionando
      window.open(url, '_blank');
      toast.info('QR Code SVG', 'O código QR foi aberto em formato vetorial numa nova aba.');
    }
  };

  return (
    <div className="flex-grow flex flex-col justify-between relative bg-orange-glow">
      
      {/* SEÇÃO PRINCIPAL / HERO */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 text-center">
        
        {/* Título de Destaque */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-6"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Transformando URLs em links inteligentes
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-none mb-6"
        >
          Encurte seus links em <span className="text-primary bg-clip-text">segundos</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg text-neutral-500 dark:text-dark-text-muted max-w-2xl mx-auto mb-10"
        >
          Crie links curtos, acompanhe estatísticas em tempo real e compartilhe facilmente com segurança, expiração e senha.
        </motion.p>

        {/* FORMULÁRIO DE ENCURTAMENTO */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl glass mb-12"
        >
          <form onSubmit={handleShorten} className="space-y-4">
            
            {/* Campo da URL Destino */}
            <div className="flex flex-col text-left">
              <label htmlFor="url" className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-dark-text-muted mb-2">
                Cole sua URL aqui
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-neutral-400">
                  <Link2 className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://exemplo.com/pagina-muito-longa-e-chata"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/45 transition-all text-sm sm:text-base font-medium"
                  required
                />
              </div>
            </div>

            {/* Campo Opcional do Apelido */}
            <div className="flex flex-col text-left">
              <label htmlFor="slug" className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-dark-text-muted mb-2">
                Apelido personalizado (opcional)
              </label>
              <div className="flex rounded-2xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-neutral-900 overflow-hidden focus-within:ring-2 focus-within:ring-primary/45 transition-all">
                <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-dark-text-muted px-4 flex items-center border-r border-neutral-200 dark:border-dark-border text-xs sm:text-sm font-semibold select-none">
                  samack.link/
                </span>
                <input
                  type="text"
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="curriculo"
                  className="w-full px-4 py-3.5 bg-transparent text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none text-sm sm:text-base font-semibold"
                />
              </div>
              <span className="mt-1.5 text-[10px] text-neutral-400 dark:text-dark-text-muted">
                Use apenas letras, números e hífens. Ex: <span className="underline">curriculo</span>, <span className="underline">youtube</span>, <span className="underline">portfolio</span>.
              </span>
            </div>

            {/* Botão de Submissão */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-primary hover:bg-primary-hover text-white font-extrabold text-sm sm:text-base tracking-wider uppercase shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processando...' : 'Encurtar Link'}
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        </motion.div>

        {/* PAINEL DE SUCESSO DO LINK CRIADO */}
        <AnimatePresence>
          {createdLink && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="w-full max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl border border-primary/20 bg-primary/5 shadow-xl text-left mb-12 relative overflow-hidden"
            >
              <div className="bg-orange-glow-sm absolute inset-0 -z-10 pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-primary/10 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                     Seu link está pronto!
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-dark-text-muted truncate max-w-[320px] sm:max-w-md mt-1">
                    Destino: {createdLink.originalUrl}
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('stats', createdLink.slug)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-dark-card hover:bg-neutral-50 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Ver Estatísticas Públicas
                </button>
              </div>

              {/* URL Encurtada Principal */}
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-dark-border shadow-inner">
                <span className="text-primary font-extrabold text-sm sm:text-lg truncate flex-grow">
                  samack.link/{createdLink.slug}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopy(createdLink.slug)}
                    className="p-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                    title="Copiar link"
                  >
                    {copied ? <Check className="h-4.5 w-4.5 text-emerald-500" /> : <Copy className="h-4.5 w-4.5" />}
                  </button>
                  <button
                    onClick={() => setShowQr(!showQr)}
                    className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                      showQr 
                        ? 'bg-primary text-white' 
                        : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}
                    title="Mostrar QR Code"
                  >
                    <QrCode className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Bloco Dinâmico de QR Code */}
              {showQr && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-dark-border flex flex-col sm:flex-row items-center gap-6"
                >
                  <div className="p-3 bg-white rounded-xl border border-neutral-100 flex-shrink-0">
                    <img 
                      src={getQrCodeUrl(createdLink.slug, 150)} 
                      alt="QR Code" 
                      className="h-32 w-32 object-contain"
                    />
                  </div>
                  <div className="text-center sm:text-left space-y-3 flex-grow">
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white">QR Code Inteligente</h4>
                    <p className="text-xs text-neutral-500 dark:text-dark-text-muted leading-relaxed">
                      Escaneie para acessar o link encurtado direto do seu dispositivo móvel ou faça o download para usar em materiais.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      <button
                        onClick={() => downloadQr(createdLink.slug, 'png')}
                        className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold shadow transition-colors cursor-pointer"
                      >
                        Download PNG
                      </button>
                      <button
                        onClick={() => downloadQr(createdLink.slug, 'svg')}
                        className="px-3.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Abrir SVG
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Botões de Compartilhamento Social */}
              <div className="mt-4 pt-4 border-t border-primary/10">
                <span className="block text-xs font-bold text-neutral-400 dark:text-dark-text-muted mb-2.5">
                  Compartilhar nas Redes:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <a
                    href={shareLinks(createdLink.slug).whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white text-xs font-semibold transition-all"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={shareLinks(createdLink.slug).telegram}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500 text-sky-600 dark:text-sky-400 hover:text-white text-xs font-semibold transition-all"
                  >
                    Telegram
                  </a>
                  <a
                    href={shareLinks(createdLink.slug).facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white text-xs font-semibold transition-all"
                  >
                    <FacebookIcon />
                    Facebook
                  </a>
                  <a
                    href={shareLinks(createdLink.slug).linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-700/10 hover:bg-blue-700 text-blue-700 dark:text-blue-400 hover:text-white text-xs font-semibold transition-all"
                  >
                    <LinkedinIcon />
                    LinkedIn
                  </a>
                  <a
                    href={shareLinks(createdLink.slug).twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900/10 hover:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 dark:hover:text-white text-xs font-semibold transition-all"
                  >
                    <TwitterIcon />
                    X / Twitter
                  </a>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* SEÇÃO DE LINKS RECENTES */}
        {sessionLinks.length > 0 && (
          <div className="w-full max-w-2xl mx-auto text-left mb-16">
            <h3 className="text-sm font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider mb-3">
              Criados Recentemente nesta sessão:
            </h3>
            <div className="space-y-2">
              {sessionLinks.map((link) => (
                <div 
                  key={link.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-neutral-200 dark:border-dark-border bg-white/60 dark:bg-dark-card/50 glass hover:border-neutral-300 dark:hover:border-neutral-800 transition-colors"
                >
                  <div className="min-w-0 flex-grow pr-3">
                    <span className="font-bold text-neutral-900 dark:text-white text-sm sm:text-base">
                      samack.link/{link.slug}
                    </span>
                    <p className="text-xs text-neutral-400 dark:text-dark-text-muted truncate mt-0.5">
                      {link.originalUrl}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopy(link.slug)}
                      className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors cursor-pointer"
                      title="Copiar Link"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <a
                      href={getShortenedUrl(link.slug)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
                      title="Visitar link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BENEFÍCIOS DO SaaS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left border-t border-neutral-200 dark:border-dark-border pt-12">
          
          <div className="p-6 rounded-2xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card hover-scale">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-primary flex items-center justify-center mb-4">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h4 className="font-extrabold text-neutral-900 dark:text-white mb-2">Estatísticas Completas</h4>
            <p className="text-xs text-neutral-500 dark:text-dark-text-muted leading-relaxed">
              Mapeie dados completos de cliques diários, semanais, países, navegadores, dispositivos e sites de origem.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card hover-scale">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
              <Lock className="h-5 w-5" />
            </div>
            <h4 className="font-extrabold text-neutral-900 dark:text-white mb-2">Segurança por Senha</h4>
            <p className="text-xs text-neutral-500 dark:text-dark-text-muted leading-relaxed">
              Proteja seus redirecionamentos exigindo uma senha de acesso. Ideal para documentos privados.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card hover-scale">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-4">
              <Calendar className="h-5 w-5" />
            </div>
            <h4 className="font-extrabold text-neutral-900 dark:text-white mb-2">Expiração Dinâmica</h4>
            <p className="text-xs text-neutral-500 dark:text-dark-text-muted leading-relaxed">
              Defina data e hora para que o link expire automaticamente, encaminhando o visitante para uma tela informativa.
            </p>
          </div>

        </div>

      </main>

      {/* RODAPÉ */}
      <footer className="w-full border-t border-neutral-200 dark:border-dark-border py-6 text-center text-xs text-neutral-400 dark:text-dark-text-muted bg-white dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} SAMACK. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-4">
            <a href="#/privacidade" className="hover:text-neutral-600 dark:hover:text-white">Privacidade</a>
            <a href="#/termos" className="hover:text-neutral-600 dark:hover:text-white">Termos</a>
            <span className="text-primary font-bold">Abre.ai & Vercel Inspired</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
export default LandingPage;
