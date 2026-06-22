import React, { useState, useEffect, useRef } from 'react';
import { useToast } from './Toast';
import { db } from '../db/DatabaseClient';
import type { Link as DbLink } from '../db/DatabaseClient';
import { validateUrl, isValidSlug, generateUniqueSlug, formatDate } from '../utils/helpers';
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
  Download,
  Upload,
  Trash2,
  X,
  Database,
  Info,
  ChevronDown,
  ChevronUp
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

interface LandingPageProps {
  onNavigate: (view: string, slug?: string) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, isSettingsOpen, setIsSettingsOpen }) => {
  const { toast } = useToast();

  // Estados do formulário de encurtamento
  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado do link recém-criado
  const [createdLink, setCreatedLink] = useState<DbLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Estados dos links salvos localmente
  const [localSlugs, setLocalSlugs] = useState<string[]>([]);
  const [myLinks, setMyLinks] = useState<DbLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  // Estados do modal de QR Code flutuante (para a tabela)
  const [activeQrSlug, setActiveQrSlug] = useState<string | null>(null);

  // Estados do banco de dados (Configurações)
  const [dbMode, setDbMode] = useState<'mock' | 'supabase'>('mock');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Carregar slugs locais e configurações do Supabase na montagem do componente
  useEffect(() => {
    // Slugs criados neste navegador
    const savedSlugs = localStorage.getItem('samack_my_created_slugs');
    if (savedSlugs) {
      setLocalSlugs(JSON.parse(savedSlugs));
    }

    // Configurações do Supabase
    const savedUrl = localStorage.getItem('samack_custom_supabase_url') || '';
    const savedKey = localStorage.getItem('samack_custom_supabase_anon_key') || '';
    setSupabaseUrl(savedUrl);
    setSupabaseKey(savedKey);
    setDbMode((db as any).isMock() ? 'mock' : 'supabase');
  }, []);

  // 2. Sempre que os slugs locais ou o modo do banco mudar, recarregar a lista detalhada
  useEffect(() => {
    loadMyLinks();
  }, [localSlugs, dbMode]);

  const loadMyLinks = async () => {
    if (localSlugs.length === 0) {
      setMyLinks([]);
      return;
    }
    setIsLoadingLinks(true);
    try {
      const data = await db.getLinksBySlugs(localSlugs);
      setMyLinks(data);
    } catch (e: any) {
      console.error('Erro ao carregar links salvos:', e);
    } finally {
      setIsLoadingLinks(false);
    }
  };

  // 3. Salvar novo slug no localStorage
  const saveLocalSlug = (newSlug: string) => {
    const updated = [newSlug, ...localSlugs];
    setLocalSlugs(updated);
    localStorage.setItem('samack_my_created_slugs', JSON.stringify(updated));
  };

  // 4. Ação de Encurtar
  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('URL em branco', 'Por favor, insira um link de destino.');
      return;
    }

    const { isValid, formattedUrl } = validateUrl(url);
    if (!isValid) {
      toast.error('URL inválida', 'Insira um formato válido (ex: google.com ou https://site.com).');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalSlug = slug.trim();

      if (finalSlug) {
        const slugValidation = isValidSlug(finalSlug);
        if (!slugValidation.isValid) {
          toast.error('Apelido inválido', slugValidation.message);
          setIsSubmitting(false);
          return;
        }
        
        const existing = await db.getLinkBySlug(finalSlug);
        if (existing) {
          toast.error('Indisponível', 'Este apelido já está sendo usado por outro link.');
          setIsSubmitting(false);
          return;
        }
      } else {
        finalSlug = await generateUniqueSlug();
      }

      // Criar o link no Banco de dados ativo
      const newLink = await db.createLink({
        userId: null, // Sem login, todos são criados anonimamente
        originalUrl: formattedUrl,
        slug: finalSlug,
        title: `Link encurtado em ${new Date().toLocaleDateString('pt-BR')}`,
        description: 'Criado na página inicial do SAMACK.',
        password: password.trim() ? password.trim() : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });

      // Sucesso
      setCreatedLink(newLink);
      saveLocalSlug(newLink.slug);
      
      // Limpar campos
      setUrl('');
      setSlug('');
      setPassword('');
      setExpiresAt('');
      setShowAdvanced(false);
      
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#FF6B00', '#FFFFFF', '#121212']
      });

      toast.success('Sucesso!', `Link criado com sucesso!`);

    } catch (err: any) {
      toast.error('Erro ao encurtar', err.message || 'Houve um problema ao processar seu link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Auxiliares de URL e Cópia
  const getShortenedUrl = (s: string) => {
    return `${window.location.origin}${window.location.pathname}#/${s}`;
  };

  const handleCopy = (s: string) => {
    navigator.clipboard.writeText(getShortenedUrl(s));
    setCopied(true);
    toast.success('Copiado!', 'Link copiado para a área de transferência.');
    setTimeout(() => setCopied(false), 2000);
  };

  // Redes Sociais
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

  const getQrCodeUrl = (s: string, size = 200) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(getShortenedUrl(s))}`;
  };

  const downloadQr = (s: string) => {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300&data=${encodeURIComponent(getShortenedUrl(s))}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `samack-qr-${s}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.info('Iniciando download', 'Baixando QR Code PNG.');
  };

  // 6. Excluir Link
  const handleDeleteLink = async (linkId: string, slugToDelete: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o link "/${slugToDelete}"?`)) return;

    try {
      await db.deleteLink(linkId);
      
      // Remover da lista local
      const updatedSlugs = localSlugs.filter(s => s !== slugToDelete);
      setLocalSlugs(updatedSlugs);
      localStorage.setItem('samack_my_created_slugs', JSON.stringify(updatedSlugs));
      
      toast.success('Excluído', 'O link foi removido da sua lista.');
    } catch (e: any) {
      toast.error('Erro ao excluir', e.message);
    }
  };

  // 7. Configuração do Supabase (Salvar e Reconectar)
  const handleSaveDbSettings = async (mode: 'mock' | 'supabase') => {
    if (mode === 'supabase') {
      if (!supabaseUrl.trim() || !supabaseKey.trim()) {
        toast.error('Campos vazios', 'Insira a URL e a Anon Key do seu projeto Supabase.');
        return;
      }
      if (!supabaseUrl.includes('supabase.co')) {
        toast.error('URL inválida', 'A URL do Supabase deve possuir o domínio supabase.co.');
        return;
      }
      localStorage.setItem('samack_custom_supabase_url', supabaseUrl.trim());
      localStorage.setItem('samack_custom_supabase_anon_key', supabaseKey.trim());
    } else {
      localStorage.removeItem('samack_custom_supabase_url');
      localStorage.removeItem('samack_custom_supabase_anon_key');
    }

    setDbMode(mode);
    
    // Reconectar o banco dinamicamente
    (db as any).reconnect();
    
    setIsSettingsOpen(false);
    toast.success('Conectado!', mode === 'supabase' ? 'Conectado com sucesso ao Supabase!' : 'Banco de dados local (LocalStorage) ativo.');
  };

  // 8. Importar / Exportar Backup
  const handleExportBackup = () => {
    if (myLinks.length === 0) {
      toast.error('Sem dados', 'Você ainda não possui nenhum link para exportar.');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localSlugs));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href",     dataStr);
    downloadAnchor.setAttribute("download", `samack_backup_links_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Backup exportado!', 'Seu arquivo de backup JSON foi gerado.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          // Filtrar itens válidos e mesclar
          const validSlugs = imported.filter(x => typeof x === 'string');
          const merged = Array.from(new Set([...validSlugs, ...localSlugs]));
          
          setLocalSlugs(merged);
          localStorage.setItem('samack_my_created_slugs', JSON.stringify(merged));
          toast.success('Backup importado!', `Restaurados ${validSlugs.length} slugs no navegador.`);
        } else {
          toast.error('Formato inválido', 'O arquivo JSON deve conter um array de slugs.');
        }
      } catch (err) {
        toast.error('Erro de leitura', 'Não foi possível ler o arquivo de backup.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex-grow flex flex-col justify-between relative bg-orange-glow">
      
      {/* SEÇÃO PRINCIPAL / HERO */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 text-center w-full">
        
        {/* Título de Destaque */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-6"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Encurtador prático, funcional e 105% gratuito
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
          Transforme URLs longas em atalhos amigáveis. Salve no banco de dados, adicione senha e acompanhe relatórios de acessos.
        </motion.p>

        {/* STATUS DO BANCO ATIVO */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className={`h-2.5 w-2.5 rounded-full ${dbMode === 'supabase' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            {dbMode === 'supabase' ? 'Conectado ao Supabase (Nuvem Global)' : 'Armazenamento Local (Offline neste navegador)'}
          </span>
        </div>

        {/* FORMULÁRIO DE ENCURTAMENTO */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-3xl mx-auto p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl glass mb-8"
        >
          <form onSubmit={handleShorten} className="space-y-4">
            
            {/* Campo da URL Destino */}
            <div className="flex flex-col text-left">
              <label htmlFor="url" className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-dark-text-muted mb-2">
                Cole sua URL longa aqui
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
                  placeholder="https://exemplo.com/pagina-muito-longa-e-complexa"
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
                  placeholder="meu-portfolio"
                  className="w-full px-4 py-3.5 bg-transparent text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none text-sm sm:text-base font-semibold"
                />
              </div>
            </div>

            {/* Opções Avançadas (Senha / Expiração) */}
            <div className="border-t border-neutral-100 dark:border-neutral-800/60 pt-3">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs font-bold text-neutral-500 hover:text-primary transition-colors cursor-pointer"
              >
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Configurações Avançadas (Senha e Validade)
              </button>

              {showAdvanced && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-left"
                >
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold uppercase text-neutral-400 mb-1.5 flex items-center gap-1">
                      <Lock className="h-3 w-3 text-primary" /> Proteger por Senha (opcional)
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha de Acesso"
                      className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold uppercase text-neutral-400 mb-1.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-primary" /> Data de Expiração (opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs"
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Botão de Encurtar */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-white font-extrabold text-sm sm:text-base tracking-wider uppercase shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Encurtando...' : 'Criar Link Curto'}
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
              className="w-full max-w-3xl mx-auto p-6 sm:p-8 rounded-3xl border border-primary/20 bg-primary/5 shadow-xl text-left mb-8 relative overflow-hidden"
            >
              <div className="bg-orange-glow-sm absolute inset-0 -z-10 pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-primary/10 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                     Seu link inteligente está pronto!
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-dark-text-muted truncate max-w-[320px] sm:max-w-xl mt-1">
                    Destino: {createdLink.originalUrl}
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('stats', createdLink.slug)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-dark-card hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Ver Estatísticas de Cliques
                </button>
              </div>

              {/* URL Encurtada Principal */}
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-dark-border shadow-inner">
                <span className="text-primary font-extrabold text-sm sm:text-lg truncate flex-grow">
                  {getShortenedUrl(createdLink.slug)}
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
                      Escanear código QR para acessar diretamente. Permite download e divulgação rápidos.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      <button
                        onClick={() => downloadQr(createdLink.slug)}
                        className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold shadow transition-colors cursor-pointer"
                      >
                        Download PNG
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

        {/* TABELA DE LINKS ENCURTADOS (Painel Principal) */}
        <div className="w-full max-w-6xl mx-auto text-left mt-8 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl glass">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                Seus Links Encurtados
              </h2>
              <p className="text-xs text-neutral-450 dark:text-dark-text-muted mt-1">
                Slugs salvos no navegador. Os cliques e dados são atualizados em tempo real.
              </p>
            </div>

            {/* Ações de Backup */}
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportBackup}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-neutral-250 dark:border-dark-border text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                title="Importar backup"
              >
                <Upload className="h-4 w-4 text-primary" />
                Importar JSON
              </button>
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-neutral-250 dark:border-dark-border text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                title="Exportar backup"
              >
                <Download className="h-4 w-4 text-primary" />
                Exportar JSON
              </button>
            </div>
          </div>

          {isLoadingLinks ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              <span className="text-xs text-neutral-400">Atualizando cliques e estatísticas do banco...</span>
            </div>
          ) : myLinks.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-neutral-200 dark:border-dark-border/60 rounded-2xl flex flex-col items-center justify-center">
              <Link2 className="h-10 w-10 text-neutral-300 dark:text-neutral-700 mb-3" />
              <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">Nenhum link ativo encontrado</h4>
              <p className="text-xs text-neutral-450 dark:text-dark-text-muted mt-1 max-w-sm leading-relaxed">
                Você ainda não encurtou nenhum link neste navegador ou seu backup está vazio. Encurte um link acima para iniciar!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-dark-border text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider">
                    <th className="px-6 py-4">Link Curto</th>
                    <th className="px-6 py-4">Destino Original</th>
                    <th className="px-6 py-4 text-center">Cliques</th>
                    <th className="px-6 py-4">Data de Criação</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-dark-border text-xs sm:text-sm">
                  {myLinks.map((link) => {
                    const shortUrl = getShortenedUrl(link.slug);
                    return (
                      <tr 
                        key={link.id} 
                        className="hover:bg-neutral-50/55 dark:hover:bg-neutral-800/20 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span 
                              onClick={() => window.open(shortUrl, '_blank')}
                              className="font-bold text-primary hover:underline cursor-pointer text-xs sm:text-sm"
                            >
                              samack.link/{link.slug}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(shortUrl);
                                toast.success('Copiado!', 'Link copiado!');
                              }}
                              className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-white transition-colors cursor-pointer"
                              title="Copiar Link"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-[200px] truncate">
                          <a 
                            href={link.originalUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition-colors underline"
                          >
                            {link.originalUrl}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="font-extrabold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md text-xs">
                            {link.clicksCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-neutral-450 dark:text-neutral-400">
                          {formatDate(link.createdAt).split(' ')[0]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => onNavigate('stats', link.slug)}
                              className="p-2 rounded-xl bg-primary/10 hover:bg-primary hover:text-white text-primary text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Ver Estatísticas"
                            >
                              <TrendingUp className="h-4 w-4" />
                              <span>Analytics</span>
                            </button>
                            <div className="relative">
                              <button
                                onClick={() => setActiveQrSlug(activeQrSlug === link.slug ? null : link.slug)}
                                className={`p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                                  activeQrSlug === link.slug 
                                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' 
                                    : 'border-neutral-250 dark:border-dark-border text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                }`}
                                title="QR Code"
                              >
                                <QrCode className="h-4 w-4" />
                              </button>
                              
                              {/* Popup Flutuante do QR Code */}
                              {activeQrSlug === link.slug && (
                                <>
                                  <div className="fixed inset-0 z-20" onClick={() => setActiveQrSlug(null)} />
                                  <div className="absolute right-0 bottom-10 z-30 p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-dark-border rounded-2xl shadow-2xl flex flex-col items-center gap-2">
                                    <div className="p-2 bg-white rounded-lg border border-neutral-100">
                                      <img src={getQrCodeUrl(link.slug, 120)} className="h-24 w-24 object-contain" alt="QR Code" />
                                    </div>
                                    <button
                                      onClick={() => {
                                        downloadQr(link.slug);
                                        setActiveQrSlug(null);
                                      }}
                                      className="w-full py-1 text-[10px] bg-primary text-white rounded-lg font-bold hover:bg-primary/95"
                                    >
                                      Baixar PNG
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteLink(link.id, link.slug)}
                              className="p-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* MODAL DE CONFIGURAÇÕES DO BANCO DE DADOS (SUPABASE) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm"
            />
            
            {/* Card do Modal */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl p-6 sm:p-8 z-10 text-left glass overflow-hidden"
            >
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-850 dark:hover:text-white cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Database className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Conexão de Banco de Dados
                </h3>
              </div>

              <p className="text-xs text-neutral-450 dark:text-dark-text-muted mb-6 leading-relaxed">
                Por padrão, o SAMACK salva seus links localmente no navegador (LocalStorage). 
                Se desejar persistência global na nuvem para compartilhar seus links com outras pessoas, você pode conectar o seu próprio banco de dados do **Supabase**.
              </p>

              {/* Botões de Seleção de Modo */}
              <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-neutral-50 dark:bg-neutral-900 rounded-2xl">
                <button
                  type="button"
                  onClick={() => handleSaveDbSettings('mock')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    dbMode === 'mock' 
                      ? 'bg-white dark:bg-dark-card text-neutral-900 dark:text-white shadow-sm' 
                      : 'text-neutral-450 hover:text-neutral-800'
                  }`}
                >
                  Modo Local (LocalStorage)
                </button>
                <button
                  type="button"
                  onClick={() => setDbMode('supabase')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    dbMode === 'supabase' 
                      ? 'bg-white dark:bg-dark-card text-neutral-900 dark:text-white shadow-sm' 
                      : 'text-neutral-450 hover:text-neutral-800'
                  }`}
                >
                  Modo Nuvem (Supabase)
                </button>
              </div>

              {dbMode === 'supabase' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Supabase Project URL
                    </label>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xxxxxx.supabase.co"
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Supabase API Anon Key
                    </label>
                    <input
                      type="password"
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="p-3.5 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-3 mt-4">
                    <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-primary/90 leading-relaxed font-semibold">
                      IMPORTANTE: Antes de conectar, você deve executar as tabelas e políticas do Supabase SQL Editor. 
                      Copie o arquivo <span className="underline cursor-pointer" onClick={() => window.open('https://github.com/rgis-samack/samacklinks/blob/main/supabase_schema.sql', '_blank')}>supabase_schema.sql</span> e cole no seu console para configurar automaticamente.
                    </p>
                  </div>

                  <button
                    onClick={() => handleSaveDbSettings('supabase')}
                    className="w-full mt-4 py-3 rounded-xl bg-primary hover:bg-primary/95 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all cursor-pointer"
                  >
                    Salvar e Conectar Supabase
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl text-xs text-neutral-500 leading-relaxed">
                    Você está rodando no **Modo Local**. Todos os seus dados de links e cliques ficarão restritos a este navegador, funcionando offline. 
                    Nenhuma chave do Supabase é necessária.
                  </div>
                  <button
                    onClick={() => handleSaveDbSettings('mock')}
                    className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-neutral-850 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Ativar Armazenamento Local
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RODAPÉ */}
      <footer className="w-full border-t border-neutral-200 dark:border-dark-border py-6 text-center text-xs text-neutral-400 dark:text-dark-text-muted bg-white dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} SAMACK. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-primary font-bold">Abre.ai & Vercel Inspired</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
