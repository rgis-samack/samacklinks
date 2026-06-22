import React, { useState, useEffect } from 'react';
import { db } from '../db/DatabaseClient';
import type { Link as DbLink, AnalyticsDetails } from '../db/DatabaseClient';
import { formatDate } from '../utils/helpers';
import { Line } from 'react-chartjs-2';
import { useToast } from './Toast';
import { 
  BarChart2, 
  Calendar, 
  ExternalLink, 
  Clock, 
  MousePointerClick, 
  ArrowLeft,
  Download,
  ShieldCheck
} from 'lucide-react';

interface PublicStatsProps {
  slug: string;
  onNavigate: (view: string) => void;
}

export const PublicStats: React.FC<PublicStatsProps> = ({ slug, onNavigate }) => {
  const { toast } = useToast();
  const [link, setLink] = useState<DbLink | null>(null);
  const [details, setDetails] = useState<AnalyticsDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    const loadPublicStats = async () => {
      setIsLoading(true);
      try {
        const linkData = await db.getLinkBySlug(slug);
        if (linkData) {
          setLink(linkData);
          // Obter dados públicos nos últimos 30 dias para o link específico
          const detailsData = await db.getAnalyticsDetails(null, linkData.id, '30d');
          setDetails(detailsData);
        } else {
          toast.error('Não encontrado', 'O link solicitado não existe ou foi excluído.');
        }
      } catch (e: any) {
        toast.error('Erro ao carregar', e.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadPublicStats();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center p-8 bg-neutral-50 dark:bg-dark-bg">
        <div className="text-center text-neutral-500 text-sm">Carregando estatísticas públicas...</div>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-8 bg-neutral-50 dark:bg-dark-bg text-center">
        <div className="h-16 w-16 rounded-full bg-neutral-200 dark:bg-neutral-850 text-neutral-400 dark:text-dark-text-muted flex items-center justify-center mb-4">
          <BarChart2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Estatísticas Não Disponíveis</h2>
        <p className="text-sm text-neutral-500 dark:text-dark-text-muted max-w-sm mb-4">
          Não conseguimos encontrar informações para a URL curta <span className="font-bold text-primary">/{slug}</span>.
        </p>
        <button
          onClick={() => onNavigate('landing')}
          className="px-4 py-2 bg-primary text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  const chartTextColor = isDarkMode ? '#9ca3af' : '#4b5563';
  const chartGridColor = isDarkMode ? '#222222' : '#e5e7eb';

  const lineChartData = {
    labels: details?.clicksOverTime.map(d => d.label) || [],
    datasets: [{
      label: 'Cliques nos últimos 30 dias',
      data: details?.clicksOverTime.map(d => d.value) || [],
      fill: true,
      borderColor: '#FF6B00',
      backgroundColor: 'rgba(255, 107, 0, 0.05)',
      tension: 0.35,
      borderWidth: 2.5,
      pointBackgroundColor: '#FF6B00',
      pointHoverRadius: 6,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
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

  const getShortenedUrl = () => {
    return `${window.location.origin}/#/${link.slug}`;
  };

  return (
    <div className="flex-grow bg-neutral-50 dark:bg-dark-bg pb-16">
      
      {/* HEADER DE ESTATÍSTICA PÚBLICA */}
      <div className="border-b border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card py-6">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-1 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Dados de Analytics Públicos</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
        
        {/* Painel Principal do Link */}
        <div className="p-6 rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-lg text-left">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary block mb-1">
            Estatísticas do Link Curto
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">
            samack.link/{link.slug}
          </h2>
          <p className="text-xs text-neutral-400 dark:text-dark-text-muted truncate mt-1">
            Destino Original: <a href={link.originalUrl} target="_blank" rel="noreferrer" className="underline hover:text-primary transition-colors">{link.originalUrl}</a>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 border-t border-neutral-100 dark:border-neutral-800 pt-6">
            
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <MousePointerClick className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[9px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase">Total de Acessos</span>
                <span className="text-lg font-black text-neutral-900 dark:text-white">{link.clicksCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[9px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase">Criado em</span>
                <span className="text-sm font-extrabold text-neutral-850 dark:text-white">{formatDate(link.createdAt).split(' ')[0]}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[9px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase">Último Clique</span>
                <span className="text-sm font-extrabold text-neutral-850 dark:text-white">{link.lastClickedAt ? formatDate(link.lastClickedAt).split(' ')[0] : 'Nunca'}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Gráfico Público */}
        <div className="p-6 rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-lg text-left">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4">
            Histórico de Cliques (Últimos 30 Dias)
          </h3>
          <div className="h-64 w-full">
            {details && details.clicksOverTime.length > 0 ? (
              <Line data={lineChartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                Nenhum clique registrado no período.
              </div>
            )}
          </div>
        </div>

        {/* QR Code Público */}
        <div className="p-6 rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-lg text-left flex flex-col md:flex-row items-center gap-6">
          <div className="p-3 bg-white rounded-2xl border border-neutral-100 flex-shrink-0">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180&data=${encodeURIComponent(getShortenedUrl())}`} 
              alt="QR Code" 
              className="h-36 w-36 object-contain"
            />
          </div>
          <div className="space-y-3 flex-grow text-center md:text-left">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">QR Code de Acesso Rápido</h3>
            <p className="text-xs text-neutral-500 dark:text-dark-text-muted leading-relaxed">
              Você pode escanear o QR Code acima para ir diretamente ao link encurtado ou baixar as versões para divulgar em panfletos ou redes.
            </p>
            <div className="flex gap-2 justify-center md:justify-start">
              <button
                onClick={() => {
                  const url = `https://api.qrserver.com/v1/create-qr-code/?size=300&data=${encodeURIComponent(getShortenedUrl())}`;
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `samack-qr-${link.slug}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  toast.success('Download PNG', 'Baixando código QR.');
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="h-4.5 w-4.5" />
                Baixar PNG
              </button>
              <button
                onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300&data=${encodeURIComponent(getShortenedUrl())}`, '_blank')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-850 dark:text-neutral-200 hover:bg-neutral-55 dark:hover:bg-neutral-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <ExternalLink className="h-4.5 w-4.5" />
                Visualizar SVG
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
export default PublicStats;
