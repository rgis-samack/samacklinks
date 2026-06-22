import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { db } from '../db/DatabaseClient';
import type { Link as DbLink, AnalyticsSummary, AnalyticsDetails } from '../db/DatabaseClient';
import { formatDate } from '../utils/helpers';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import {
  Plus,
  Search,
  Copy,
  Check,
  QrCode,
  Edit2,
  Trash2,
  RefreshCw,
  Calendar,
  Lock,
  TrendingUp,
  Link2,
  MousePointerClick,
  CalendarDays,
  Activity,
  Award,
  X,
  Copy as CopyIcon,
  Download,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const Dashboard: React.FC<{ onNavigate: (view: string, slug?: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Estados principais
  const [links, setLinks] = useState<DbLink[]>([]);
  const [deletedLinks, setDeletedLinks] = useState<DbLink[]>([]);
  const [activeTab, setActiveTab] = useState<'ativos' | 'lixeira'>('ativos');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  
  // Analytics detalhado
  const [period, setPeriod] = useState<string>('30d');

  const [selectedLinkForChart, setSelectedLinkForChart] = useState<string | null>(null);
  const [details, setDetails] = useState<AnalyticsDetails | null>(null);

  // Modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [currentLink, setCurrentLink] = useState<DbLink | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Estados de formulário para edição / criação rápida
  const [editUrl, setEditUrl] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editExpires, setEditExpires] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'disabled'>('active');

  // Detectar se o tema é escuro para adaptar cores dos gráficos
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    return () => observer.disconnect();
  }, []);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Carregar links ativos e deletados
      const userLinks = await db.getLinksByUser(user.id, false);
      const userDeleted = await db.getLinksByUser(user.id, true);
      
      setLinks(userLinks);
      setDeletedLinks(userDeleted.filter(l => l.deletedAt !== null));
      
      // Carregar sumário de analytics
      const summaryData = await db.getAnalyticsSummary(user.id);
      setSummary(summaryData);

      // Carregar gráficos
      await loadAnalyticsDetails(period, selectedLinkForChart);
    } catch (e: any) {
      toast.error('Erro ao carregar dados', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalyticsDetails = async (selectedPeriod: string, linkId: string | null = null) => {
    if (!user) return;
    try {
      const detailsData = await db.getAnalyticsDetails(user.id, linkId, selectedPeriod);
      setDetails(detailsData);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handler de mudança de período
  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    loadAnalyticsDetails(newPeriod, selectedLinkForChart);
    toast.info('Período atualizado', `Exibindo cliques do período: ${newPeriod.toUpperCase()}`);
  };

  // Handler de clique em link específico para filtrar gráficos
  const handleLinkSelectForChart = (linkId: string | null) => {
    setSelectedLinkForChart(linkId);
    loadAnalyticsDetails(period, linkId);
    if (linkId) {
      const target = links.find(l => l.id === linkId);
      toast.info('Filtro por Link', `Exibindo gráficos do link: samack.link/${target?.slug}`);
    } else {
      toast.info('Filtro por Link', 'Exibindo gráficos consolidados de todos os links.');
    }
  };

  // Funções de Gerenciamento de Links
  const handleCopy = (slug: string) => {
    const fullUrl = `${window.location.origin}/#/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    toast.success('Copiado!', 'Link copiado para a área de transferência.');
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleDuplicate = async (link: DbLink) => {
    try {
      // Gerar um slug aleatório novo
      let newSlug = link.slug + '-copia';
      const existing = await db.getLinkBySlug(newSlug);
      if (existing) {
        newSlug = link.slug + '-' + Math.floor(Math.random() * 1000);
      }

      await db.createLink({
        userId: user?.id || null,
        originalUrl: link.originalUrl,
        slug: newSlug,
        title: `${link.title} (Cópia)`,
        description: link.description,
        password: link.password,
        expiresAt: link.expiresAt,
      });

      toast.success('Link duplicado!', `Criação da cópia samack.link/${newSlug} concluída.`);
      loadData();
    } catch (e: any) {
      toast.error('Erro ao duplicar', e.message);
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!window.confirm('Tem certeza que deseja mover este link para a lixeira? Ele poderá ser restaurado em até 30 dias.')) return;
    try {
      const res = await db.deleteLink(linkId);
      if (res) {
        toast.success('Movido para a lixeira', 'Link excluído temporariamente. Acesso desativado.');
        loadData();
      }
    } catch (e: any) {
      toast.error('Erro ao excluir', e.message);
    }
  };

  const handleRestore = async (linkId: string) => {
    try {
      const res = await db.restoreLink(linkId);
      if (res) {
        toast.success('Restaurado', 'Link ativado e restaurado com sucesso.');
        loadData();
      }
    } catch (e: any) {
      toast.error('Erro ao restaurar', e.message);
    }
  };

  const handleForceDelete = async (linkId: string) => {
    if (!window.confirm('ATENÇÃO: Deseja apagar este link PERMANENTEMENTE? Todos os cliques históricos associados serão eliminados sem possibilidade de recuperação.')) return;
    try {
      const res = await db.forceDeleteLink(linkId);
      if (res) {
        toast.success('Excluído definitivamente', 'Link e estatísticas eliminados com sucesso.');
        loadData();
      }
    } catch (e: any) {
      toast.error('Erro ao excluir permanentemente', e.message);
    }
  };

  // Abertura de Modal de Edição
  const openEditModal = (link: DbLink) => {
    setCurrentLink(link);
    setEditUrl(link.originalUrl);
    setEditSlug(link.slug);
    setEditTitle(link.title);
    setEditDesc(link.description);
    setEditPassword(link.password || '');
    setEditExpires(link.expiresAt ? link.expiresAt.substring(0, 16) : '');
    setEditStatus(link.status);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLink) return;

    try {
      await db.updateLink(currentLink.id, {
        originalUrl: editUrl,
        slug: editSlug,
        title: editTitle,
        description: editDesc,
        password: editPassword || undefined,
        expiresAt: editExpires ? new Date(editExpires).toISOString() : null,
        status: editStatus
      });

      toast.success('Link atualizado', 'As alterações foram gravadas com sucesso.');
      setIsEditModalOpen(false);
      loadData();
    } catch (e: any) {
      toast.error('Erro ao salvar edições', e.message);
    }
  };

  // Modal QR Code
  const openQrModal = (link: DbLink) => {
    setCurrentLink(link);
    setIsQrModalOpen(true);
  };

  // Filtro de Busca
  const filteredLinks = links.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.originalUrl.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Configuração de dados dos gráficos Chart.js
  const chartTextColor = isDarkMode ? '#9ca3af' : '#4b5563';
  const chartGridColor = isDarkMode ? '#222222' : '#e5e7eb';

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: { color: chartGridColor },
        ticks: { color: chartTextColor, font: { family: 'Inter', size: 10 } }
      },
      y: {
        grid: { color: chartGridColor },
        ticks: { color: chartTextColor, font: { family: 'Inter', size: 10 }, stepSize: 1 }
      }
    }
  };

  // Gráfico 1: Cliques no tempo
  const clicksTimeData = {
    labels: details?.clicksOverTime.map(d => d.label) || [],
    datasets: [{
      label: 'Cliques',
      data: details?.clicksOverTime.map(d => d.value) || [],
      fill: true,
      borderColor: '#FF6B00',
      backgroundColor: 'rgba(255, 107, 0, 0.08)',
      tension: 0.35,
      borderWidth: 2,
      pointBackgroundColor: '#FF6B00',
      pointBorderColor: isDarkMode ? '#141414' : '#ffffff',
      pointHoverRadius: 6,
    }]
  };

  // Gráfico 2: Dispositivos (Doughnut)
  const deviceData = {
    labels: details?.devices.map(d => d.label) || [],
    datasets: [{
      data: details?.devices.map(d => d.value) || [],
      backgroundColor: ['#FF6B00', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
      borderColor: isDarkMode ? '#141414' : '#ffffff',
      borderWidth: 1,
    }]
  };

  // Gráfico 3: Países (Barra Horizontal)
  const countriesData = {
    labels: details?.countries.map(d => d.label) || [],
    datasets: [{
      data: details?.countries.map(d => d.value) || [],
      backgroundColor: '#FF6B00',
      borderRadius: 6,
      barThickness: 16
    }]
  };

  // Gráfico 4: Navegadores (Doughnut)
  const browsersData = {
    labels: details?.browsers.map(d => d.label) || [],
    datasets: [{
      data: details?.browsers.map(d => d.value) || [],
      backgroundColor: ['#FF6B00', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#10b981'],
      borderColor: isDarkMode ? '#141414' : '#ffffff',
      borderWidth: 1,
    }]
  };

  // Gráfico 5: Origem / Referrers (Barra Horizontal)
  const referrersData = {
    labels: details?.referrers.map(d => d.label) || [],
    datasets: [{
      data: details?.referrers.map(d => d.value) || [],
      backgroundColor: '#3b82f6',
      borderRadius: 6,
      barThickness: 16
    }]
  };

  return (
    <div className="flex-grow bg-neutral-50 dark:bg-dark-bg min-h-screen pb-16">
      
      {/* CABEÇALHO DO DASHBOARD */}
      <div className="border-b border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
              Painel de Controle
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-dark-text-muted mt-1">
              Gerencie seus links encurtados, visualize estatísticas e crie redirecionamentos inteligentes.
            </p>
          </div>
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold tracking-wider uppercase transition-all shadow-md shadow-primary/10 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Novo Link
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* GRID DE INDICADORES DE PERFORMANCE */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card hover-scale flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider block mb-1">
                  Total de Links
                </span>
                <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                  {summary.totalLinks}
                </span>
              </div>
              <Link2 className="h-4.5 w-4.5 text-primary mt-2" />
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card hover-scale flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider block mb-1">
                  Total de Cliques
                </span>
                <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                  {summary.totalClicks}
                </span>
              </div>
              <MousePointerClick className="h-4.5 w-4.5 text-blue-500 mt-2" />
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card hover-scale flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider block mb-1">
                  Cliques Hoje
                </span>
                <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                  {summary.clicksToday}
                </span>
              </div>
              <Activity className="h-4.5 w-4.5 text-emerald-500 mt-2" />
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card hover-scale flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider block mb-1">
                  Cliques Este Mês
                </span>
                <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                  {summary.clicksThisMonth}
                </span>
              </div>
              <CalendarDays className="h-4.5 w-4.5 text-violet-500 mt-2" />
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card hover-scale flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider block mb-1">
                  Links Ativos
                </span>
                <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                  {summary.activeLinksCount}
                </span>
              </div>
              <Check className="h-4.5 w-4.5 text-emerald-500 mt-2" />
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card hover-scale flex flex-col justify-between col-span-2 sm:col-span-1">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider block mb-1">
                  Link Mais Acessado
                </span>
                <span className="text-xs font-bold text-primary block truncate max-w-[120px]" title={summary.mostActiveLink?.slug}>
                  {summary.mostActiveLink ? `samack.link/${summary.mostActiveLink.slug}` : 'Nenhum'}
                </span>
                <span className="text-xs text-neutral-400 block">
                  {summary.mostActiveLink ? `${summary.mostActiveLink.clicksCount} cliques` : '-'}
                </span>
              </div>
              <Award className="h-4.5 w-4.5 text-amber-500 mt-2" />
            </div>

          </div>
        )}

        {/* SEÇÃO ANALYTICS DETALHADA E GRÁFICOS */}
        <div className="p-6 rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-lg space-y-6">
          
          {/* Cabeçalho do Analytics e Filtros */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Análise de Tráfego e Analytics
              </h2>
            </div>
            
            {/* Controles de filtro */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Filtro por Link específico */}
              <select
                onChange={(e) => handleLinkSelectForChart(e.target.value ? e.target.value : null)}
                value={selectedLinkForChart || ''}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 outline-none"
              >
                <option value="">Todos os Links</option>
                {links.map(l => (
                  <option key={l.id} value={l.id}>/{l.slug} ({l.clicksCount} clks)</option>
                ))}
              </select>

              {/* Botões de Período */}
              <div className="flex items-center rounded-lg border border-neutral-200 dark:border-dark-border overflow-hidden bg-neutral-50 dark:bg-neutral-900 p-0.5">
                {['today', 'yesterday', '7d', '30d', '90d'].map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                      period === p
                        ? 'bg-primary text-white'
                        : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
                    }`}
                  >
                    {p === 'today' ? 'Hoje' : p === 'yesterday' ? 'Ontem' : p.toUpperCase()}
                  </button>
                ))}
              </div>

            </div>
          </div>

          {/* Área de Visualização dos Gráficos */}
          {details ? (
            <div className="space-y-6">
              
              {/* Gráfico 1: Evolução Temporal de Cliques */}
              <div className="p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
                <h3 className="text-xs font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider mb-4">
                  Cliques ao longo do período
                </h3>
                <div className="h-64 w-full">
                  <Line data={clicksTimeData} options={chartOptions} />
                </div>
              </div>

              {/* Grid Secundário de Gráficos (Dispositivos, Países, Navegadores, Origem) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Dispositivos (Doughnut) */}
                <div className="p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-col justify-between">
                  <h3 className="text-xs font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider mb-3">
                    Dispositivos
                  </h3>
                  <div className="h-44 w-full flex items-center justify-center">
                    {details.devices.length > 0 ? (
                      <Doughnut 
                        data={deviceData} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, color: chartTextColor, font: { family: 'Inter', size: 9 } } } }
                        }} 
                      />
                    ) : (
                      <span className="text-xs text-neutral-400">Sem dados</span>
                    )}
                  </div>
                </div>

                {/* Países (Barra Horizontal) */}
                <div className="p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
                  <h3 className="text-xs font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider mb-3">
                    Top Países
                  </h3>
                  <div className="h-44 w-full">
                    {details.countries.length > 0 ? (
                      <Bar 
                        data={countriesData} 
                        options={{
                          indexAxis: 'y',
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                          scales: {
                            x: { grid: { display: false }, ticks: { color: chartTextColor, font: { size: 9 } } },
                            y: { grid: { display: false }, ticks: { color: chartTextColor, font: { size: 9 } } }
                          }
                        }} 
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-neutral-400">Sem dados</div>
                    )}
                  </div>
                </div>

                {/* Navegadores (Doughnut) */}
                <div className="p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-col justify-between">
                  <h3 className="text-xs font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider mb-3">
                    Navegadores
                  </h3>
                  <div className="h-44 w-full flex items-center justify-center">
                    {details.browsers.length > 0 ? (
                      <Doughnut 
                        data={browsersData} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, color: chartTextColor, font: { family: 'Inter', size: 9 } } } }
                        }} 
                      />
                    ) : (
                      <span className="text-xs text-neutral-400">Sem dados</span>
                    )}
                  </div>
                </div>

                {/* Origens de Tráfego / Referrers (Barra Horizontal) */}
                <div className="p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
                  <h3 className="text-xs font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider mb-3">
                    Origem de Acesso
                  </h3>
                  <div className="h-44 w-full">
                    {details.referrers.length > 0 ? (
                      <Bar 
                        data={referrersData} 
                        options={{
                          indexAxis: 'y',
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                          scales: {
                            x: { grid: { display: false }, ticks: { color: chartTextColor, font: { size: 9 } } },
                            y: { grid: { display: false }, ticks: { color: chartTextColor, font: { size: 9 } } }
                          }
                        }} 
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-neutral-400">Sem dados</div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="py-12 text-center text-neutral-400 text-sm">
              Carregando analytics detalhado...
            </div>
          )}

        </div>

        {/* CONTROLES DE TABELA (Abas Ativos vs Lixeira) */}
        <div className="border-b border-neutral-200 dark:border-dark-border flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('ativos')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'ativos'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
              }`}
            >
              Links Ativos
            </button>
            <button
              onClick={() => setActiveTab('lixeira')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'lixeira'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
              }`}
            >
              Lixeira de Recuperação
              {deletedLinks.length > 0 && (
                <span className="bg-red-500 text-white rounded-full text-[10px] px-1.5 py-0.5">
                  {deletedLinks.length}
                </span>
              )}
            </button>
          </div>

          {/* Campo de Busca (Apenas na aba ativa) */}
          {activeTab === 'ativos' && (
            <div className="relative mb-2 w-full max-w-xs hidden sm:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar links..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>

        {/* LISTAGEM DE LINKS ATIVOS */}
        {activeTab === 'ativos' && (
          <div className="p-6 rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-lg overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-8 text-neutral-400 text-sm">Carregando links...</div>
            ) : filteredLinks.length > 0 ? (
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider">
                    <th className="pb-3">Link Encurtado</th>
                    <th className="pb-3">URL Original</th>
                    <th className="pb-3 text-center">Cliques</th>
                    <th className="pb-3">Criado Em</th>
                    <th className="pb-3">Último Clique</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850">
                  {filteredLinks.map((link) => {
                    const isLinkExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
                    return (
                      <tr key={link.id} className="text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10 transition-colors">
                        {/* Link Curto */}
                        <td className="py-4">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-neutral-900 dark:text-white text-sm">
                              samack.link/{link.slug}
                            </span>
                            {link.title && (
                              <span className="text-[10px] text-neutral-400 dark:text-dark-text-muted max-w-[200px] truncate mt-0.5" title={link.title}>
                                {link.title}
                              </span>
                            )}
                          </div>
                        </td>
                        
                        {/* URL Original */}
                        <td className="py-4 max-w-[220px] truncate pr-4" title={link.originalUrl}>
                          {link.originalUrl}
                        </td>

                        {/* Cliques */}
                        <td className="py-4 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-primary/5 text-primary font-bold text-[10px] border border-primary/10">
                            {link.clicksCount || 0}
                          </span>
                        </td>

                        {/* Criado Em */}
                        <td className="py-4 text-neutral-500 dark:text-dark-text-muted">
                          {formatDate(link.createdAt).split(' ')[0]}
                        </td>

                        {/* Último Clique */}
                        <td className="py-4 text-neutral-500 dark:text-dark-text-muted">
                          {link.lastClickedAt ? formatDate(link.lastClickedAt) : '-'}
                        </td>

                        {/* Status */}
                        <td className="py-4">
                          {isLinkExpired ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                              <Calendar className="h-3 w-3" /> Expirado
                            </span>
                          ) : link.status === 'disabled' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 text-[10px] font-bold">
                              Desativado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                              Ativo
                            </span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleCopy(link.slug)}
                              className="p-1.5 rounded-lg border border-neutral-100 dark:border-dark-border text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                              title="Copiar Link"
                            >
                              {copiedSlug === link.slug ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => openQrModal(link)}
                              className="p-1.5 rounded-lg border border-neutral-100 dark:border-dark-border text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                              title="QR Code"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicate(link)}
                              className="p-1.5 rounded-lg border border-neutral-100 dark:border-dark-border text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                              title="Duplicar Link"
                            >
                              <CopyIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(link)}
                              className="p-1.5 rounded-lg border border-neutral-100 dark:border-dark-border text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                              title="Editar Link"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(link.id)}
                              className="p-1.5 rounded-lg border border-neutral-100 dark:border-dark-border text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              title="Mover para Lixeira"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-neutral-400 text-xs sm:text-sm">
                Nenhum link encontrado. Comece encurtando um link!
              </div>
            )}
          </div>
        )}

        {/* ABA LIXEIRA DE RECUPERAÇÃO */}
        {activeTab === 'lixeira' && (
          <div className="p-6 rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-lg overflow-x-auto">
            
            <div className="flex items-center gap-2 mb-4 p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-amber-600 dark:text-amber-400 text-xs">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                Links excluídos permanecem aqui por até 30 dias. Durante este período, você pode restaurá-los. Após 30 dias, serão excluídos definitivamente de forma automática.
              </span>
            </div>

            {deletedLinks.length > 0 ? (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider">
                    <th className="pb-3">Link Encurtado</th>
                    <th className="pb-3">URL Original</th>
                    <th className="pb-3">Excluído Em</th>
                    <th className="pb-3 text-right">Ações de Recuperação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850">
                  {deletedLinks.map((link) => (
                    <tr key={link.id} className="text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10 transition-colors">
                      <td className="py-4">
                        <span className="font-extrabold text-neutral-400 line-through text-sm">
                          samack.link/{link.slug}
                        </span>
                      </td>
                      <td className="py-4 max-w-[250px] truncate text-neutral-400 pr-4">
                        {link.originalUrl}
                      </td>
                      <td className="py-4 text-neutral-500 dark:text-dark-text-muted">
                        {link.deletedAt ? formatDate(link.deletedAt) : '-'}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRestore(link.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Restaurar Link
                          </button>
                          <button
                            onClick={() => handleForceDelete(link.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-neutral-400 text-xs sm:text-sm">
                A lixeira está vazia.
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL DE EDIÇÃO DE LINK */}
      {isEditModalOpen && currentLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-xl rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl glass p-6 z-10 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                Editar Configurações do Link
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-left">
              {/* URL Destino */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  URL Destino
                </label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              {/* Slug / Apelido */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Apelido (Slug)
                </label>
                <input
                  type="text"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              {/* Título & Descrição */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Título do Link
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none"
                    placeholder="Campanha Vendas"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'disabled')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none"
                  >
                    <option value="active">Ativo (Redirecionando)</option>
                    <option value="disabled">Desativado (Pausado)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Descrição Interna
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none"
                  placeholder="Finalidade deste link..."
                />
              </div>

              {/* Segurança: Proteção por Senha */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-primary" /> Proteção por Senha (Opcional)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Deixe em branco para remover a senha"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none"
                />
              </div>

              {/* Data de Expiração */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Data e Hora de Expiração (Opcional)
                </label>
                <input
                  type="datetime-local"
                  value={editExpires}
                  onChange={(e) => setEditExpires(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none"
                />
              </div>

              {/* Botões do Modal */}
              <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-850 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors shadow-md shadow-primary/10 cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL QR CODE E COMPARTILHAMENTO DETALHADO */}
      {isQrModalOpen && currentLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsQrModalOpen(false)} />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl glass p-6 z-10 text-center"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-4">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                QR Code & Compartilhar
              </h3>
              <button onClick={() => setIsQrModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <span className="block text-xs font-bold text-primary mb-1">
              samack.link/{currentLink.slug}
            </span>

            {/* Imagem do QR Code */}
            <div className="p-4 bg-white rounded-2xl border border-neutral-100 inline-block my-3 shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250&data=${encodeURIComponent(`${window.location.origin}/#/${currentLink.slug}`)}`}
                alt="QR Code"
                className="h-44 w-44 object-contain"
              />
            </div>

            {/* Ações de Download */}
            <div className="flex gap-2 justify-center mb-6">
              <button
                onClick={() => {
                  const url = `https://api.qrserver.com/v1/create-qr-code/?size=300&data=${encodeURIComponent(`${window.location.origin}/#/${currentLink.slug}`)}`;
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `samack-qr-${currentLink.slug}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  toast.success('Download Iniciado', 'QR Code PNG baixado com sucesso.');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" /> PNG
              </button>
              <button
                onClick={() => {
                  window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300&data=${encodeURIComponent(`${window.location.origin}/#/${currentLink.slug}`)}`, '_blank');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-xs font-bold cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Abrir SVG
              </button>
            </div>

            {/* Compartilhamento Social */}
            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 text-left">
              <span className="block text-xs font-bold text-neutral-400 dark:text-dark-text-muted mb-2.5">
                Compartilhar diretamente:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={`https://api.whatsapp.com/send?text=Acesse%20samack.link/${currentLink.slug}%20para%20mais%20detalhes.`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white text-[10px] font-bold text-center block"
                >
                  WhatsApp
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/#/${currentLink.slug}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500 text-sky-600 dark:text-sky-400 hover:text-white text-[10px] font-bold text-center block"
                >
                  Telegram
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/#/${currentLink.slug}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-2 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white text-[10px] font-bold text-center block"
                >
                  Facebook
                </a>
              </div>
            </div>

          </motion.div>
        </div>
      )}

    </div>
  );
};
export default Dashboard;
