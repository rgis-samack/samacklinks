import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { db } from '../db/DatabaseClient';
import type { User, Link as DbLink, AuditLog, AnalyticsSummary } from '../db/DatabaseClient';
import { formatDate } from '../utils/helpers';
import { 
  ShieldAlert, 
  Users, 
  Link2, 
  Activity, 
  Ban, 
  CheckCircle, 
  Trash, 
  ExternalLink,
  Shield,
  FileSpreadsheet
} from 'lucide-react';

export const AdminPanel: React.FC<{ onNavigate: (view: string, slug?: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [usersList, setUsersList] = useState<User[]>([]);
  const [linksList, setLinksList] = useState<DbLink[]>([]);
  const [logsList, setLogsList] = useState<AuditLog[]>([]);
  const [globalStats, setGlobalStats] = useState<AnalyticsSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'links' | 'logs'>('stats');
  const [isLoading, setIsLoading] = useState(true);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      // Carregar dados de admin
      const allUsers = await db.getUsers();
      const allLinks = await db.getAllLinksAdmin();
      const auditLogs = await db.getAuditLogs();
      const stats = await db.getAnalyticsSummary(null, true);

      setUsersList(allUsers);
      setLinksList(allLinks);
      setLogsList(auditLogs);
      setGlobalStats(stats);
    } catch (e: any) {
      toast.error('Erro ao carregar dados de Admin', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadAdminData();
    }
  }, [user]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-8 bg-neutral-50 dark:bg-dark-bg text-center">
        <div className="h-16 w-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Acesso Negado</h2>
        <p className="text-sm text-neutral-500 dark:text-dark-text-muted max-w-sm mb-4">
          Esta área é restrita para administradores do sistema.
        </p>
        <button
          onClick={() => onNavigate('landing')}
          className="px-4 py-2 bg-primary text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
        >
          Voltar para Início
        </button>
      </div>
    );
  }

  // Ações de Usuário
  const handleToggleUserBlock = async (targetUser: User) => {
    const newStatus = targetUser.status === 'blocked' ? 'active' : 'blocked';
    const actionText = newStatus === 'blocked' ? 'bloquear' : 'desbloquear';
    if (!window.confirm(`Deseja realmente ${actionText} o usuário ${targetUser.name}?`)) return;

    try {
      const res = await db.updateUserStatus(targetUser.id, newStatus);
      if (res) {
        toast.success(`Usuário ${newStatus === 'blocked' ? 'bloqueado' : 'desbloqueado'}!`, `O status de ${targetUser.name} foi atualizado.`);
        loadAdminData();
      }
    } catch (e: any) {
      toast.error('Erro ao alterar status', e.message);
    }
  };

  const handleChangeUserPlan = async (userId: string, newPlan: 'free' | 'pro' | 'enterprise') => {
    try {
      const res = await db.updateUserPlan(userId, newPlan);
      if (res) {
        toast.success('Plano Atualizado!', `O plano do usuário foi alterado para ${newPlan.toUpperCase()}.`);
        loadAdminData();
      }
    } catch (e: any) {
      toast.error('Erro ao alterar plano', e.message);
    }
  };

  // Ações de Links de Outros
  const handleToggleLinkStatus = async (link: DbLink) => {
    const newStatus = link.status === 'disabled' ? 'active' : 'disabled';
    try {
      await db.updateLink(link.id, { status: newStatus });
      toast.success(
        newStatus === 'active' ? 'Link Reativado!' : 'Link Desativado!',
        `O link samack.link/${link.slug} foi ${newStatus === 'active' ? 'ativado' : 'suspenso'}.`
      );
      loadAdminData();
    } catch (e: any) {
      toast.error('Erro ao alterar status do link', e.message);
    }
  };

  const handleAdminDeleteLink = async (linkId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este link permanentemente do sistema? Esta ação é irreversível.')) return;
    try {
      await db.forceDeleteLink(linkId);
      toast.success('Excluído!', 'O link foi apagado de forma definitiva.');
      loadAdminData();
    } catch (e: any) {
      toast.error('Erro ao excluir link', e.message);
    }
  };

  return (
    <div className="flex-grow bg-neutral-50 dark:bg-dark-bg min-h-screen pb-16">
      
      {/* CABEÇALHO ADMIN */}
      <div className="border-b border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                Painel Administrativo
              </h1>
              <p className="text-xs text-neutral-500 dark:text-dark-text-muted mt-0.5">
                Monitoramento global do SaaS, controle de usuários, auditoria de segurança e moderação.
              </p>
            </div>
          </div>
          <button
            onClick={loadAdminData}
            className="p-2 rounded-lg border border-neutral-200 dark:border-dark-border text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-dark-card transition-colors cursor-pointer"
            title="Recarregar dados"
          >
            <Activity className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* ABA SELETORA */}
        <div className="flex gap-2 border-b border-neutral-200 dark:border-dark-border">
          {[
            { id: 'stats', label: 'Estatísticas Gerais', icon: <Activity className="h-4 w-4" /> },
            { id: 'users', label: 'Usuários Registrados', icon: <Users className="h-4 w-4" /> },
            { id: 'links', label: 'Moderação de Links', icon: <Link2 className="h-4 w-4" /> },
            { id: 'logs', label: 'Logs de Auditoria', icon: <FileSpreadsheet className="h-4 w-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-2 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTEÚDO DAS ABAS */}
        {isLoading ? (
          <div className="text-center py-12 text-neutral-400 text-sm">Carregando dados de auditoria...</div>
        ) : (
          <>
            {/* 1. ABA ESTATÍSTICAS GERAIS */}
            {activeTab === 'stats' && globalStats && (
              <div className="space-y-6">
                {/* Cartões Globais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  <div className="p-5 rounded-2xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card">
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider block mb-1">
                      Usuários Ativos no Sistema
                    </span>
                    <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                      {usersList.length}
                    </span>
                    <p className="text-[10px] text-emerald-500 font-medium mt-1">
                      {usersList.filter(u => u.status === 'active').length} contas ativas
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card">
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider block mb-1">
                      Total de Links Encurtados
                    </span>
                    <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                      {linksList.length}
                    </span>
                    <p className="text-[10px] text-neutral-400 dark:text-dark-text-muted mt-1">
                      {linksList.filter(l => l.deletedAt !== null).length} na lixeira
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card">
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider block mb-1">
                      Total de Redirecionamentos (Cliques)
                    </span>
                    <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                      {globalStats.totalClicks}
                    </span>
                    <p className="text-[10px] text-primary font-medium mt-1">
                      Registrados em tempo real
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card">
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider block mb-1">
                      Plano Corporativo (Enterprise)
                    </span>
                    <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                      {usersList.filter(u => u.plan === 'enterprise').length}
                    </span>
                    <p className="text-[10px] text-violet-500 font-medium mt-1">
                      Clientes Premium ativos
                    </p>
                  </div>

                </div>

                {/* Métricas de Distribuição de Planos */}
                <div className="p-6 rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-md">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4">
                    Visão Geral do Faturamento / Distribuição de Planos
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl">
                      <span className="text-xs text-neutral-400">Plano Gratuito</span>
                      <span className="block text-xl font-extrabold text-neutral-850 dark:text-white mt-1">
                        {usersList.filter(u => u.plan === 'free').length}
                      </span>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <span className="text-xs text-primary">Plano PRO</span>
                      <span className="block text-xl font-extrabold text-primary mt-1">
                        {usersList.filter(u => u.plan === 'pro').length}
                      </span>
                    </div>
                    <div className="p-4 bg-violet-500/5 rounded-2xl border border-violet-500/10">
                      <span className="text-xs text-violet-500">Plano Enterprise</span>
                      <span className="block text-xl font-extrabold text-violet-500 mt-1">
                        {usersList.filter(u => u.plan === 'enterprise').length}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* 2. ABA USUÁRIOS */}
            {activeTab === 'users' && (
              <div className="p-6 rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-lg overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider">
                      <th className="pb-3">Usuário</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Data Cadastro</th>
                      <th className="pb-3">Plano SaaS</th>
                      <th className="pb-3">Status da Conta</th>
                      <th className="pb-3 text-right">Ações de Moderação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850 text-xs">
                    {usersList.map((usr) => (
                      <tr key={usr.id} className="text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10">
                        
                        {/* Identidade */}
                        <td className="py-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={usr.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                              alt={usr.name}
                              className="h-8 w-8 rounded-lg object-cover"
                            />
                            <div>
                              <span className="font-bold text-neutral-900 dark:text-white block">{usr.name}</span>
                              <span className="text-[10px] text-neutral-400 uppercase font-semibold">{usr.role}</span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-4">{usr.email}</td>

                        {/* Cadastro */}
                        <td className="py-4 text-neutral-500">{formatDate(usr.createdAt).split(' ')[0]}</td>

                        {/* Plano */}
                        <td className="py-4">
                          <select
                            value={usr.plan}
                            onChange={(e) => handleChangeUserPlan(usr.id, e.target.value as any)}
                            className="px-2 py-1 rounded bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-dark-border font-bold uppercase text-[10px] text-primary"
                          >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </td>

                        {/* Status */}
                        <td className="py-4">
                          {usr.status === 'blocked' ? (
                            <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 font-bold text-[10px]">Bloqueado</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">Ativo</span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleUserBlock(usr)}
                              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                usr.status === 'blocked'
                                  ? 'border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white'
                                  : 'border border-red-500/20 bg-red-500/5 hover:bg-red-500 text-red-600 dark:text-red-450 hover:text-white'
                              }`}
                            >
                              {usr.status === 'blocked' ? (
                                <>
                                  <CheckCircle className="h-3.5 w-3.5" /> Reativar
                                </>
                              ) : (
                                <>
                                  <Ban className="h-3.5 w-3.5" /> Bloquear
                                </>
                              )}
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. ABA MODERAÇÃO DE LINKS */}
            {activeTab === 'links' && (
              <div className="p-6 rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-lg overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider">
                      <th className="pb-3">Criador</th>
                      <th className="pb-3">Link Encurtado</th>
                      <th className="pb-3">URL Original</th>
                      <th className="pb-3 text-center">Cliques</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Ações Moderador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850 text-xs">
                    {linksList.map((link) => {
                      const creator = usersList.find(u => u.id === link.userId) || { name: 'Anônimo', email: 'Visitante' };
                      return (
                        <tr key={link.id} className="text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10">
                          
                          {/* Dono do Link */}
                          <td className="py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-neutral-900 dark:text-white">{creator.name}</span>
                              <span className="text-[10px] text-neutral-400">{creator.email}</span>
                            </div>
                          </td>

                          {/* Link Curto */}
                          <td className="py-4 font-extrabold text-neutral-900 dark:text-white">
                            samack.link/{link.slug}
                            {link.deletedAt && (
                              <span className="ml-1.5 px-1 py-0.5 rounded bg-red-500/10 text-red-500 font-bold text-[8px] uppercase">
                                Excluído
                              </span>
                            )}
                          </td>

                          {/* URL Destino */}
                          <td className="py-4 max-w-[200px] truncate pr-4 text-neutral-500" title={link.originalUrl}>
                            {link.originalUrl}
                          </td>

                          {/* Cliques */}
                          <td className="py-4 text-center">
                            <span className="font-bold">{link.clicksCount}</span>
                          </td>

                          {/* Status */}
                          <td className="py-4">
                            {link.status === 'disabled' ? (
                              <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 font-bold text-[10px]">Suspenso</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">Ativo</span>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleToggleLinkStatus(link)}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                  link.status === 'disabled'
                                    ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                                    : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white'
                                }`}
                                title={link.status === 'disabled' ? 'Ativar Link' : 'Suspender Redirecionamento'}
                              >
                                {link.status === 'disabled' ? 'Reativar' : 'Suspender'}
                              </button>
                              <button
                                onClick={() => handleAdminDeleteLink(link.id)}
                                className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                                title="Apagar Definitivamente"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                              <a
                                href={`${window.location.origin}/#/${link.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg border border-neutral-200 dark:border-dark-border text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. ABA LOGS DE AUDITORIA */}
            {activeTab === 'logs' && (
              <div className="p-6 rounded-3xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-lg overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 dark:text-dark-text-muted uppercase tracking-wider">
                      <th className="pb-3">Data e Hora</th>
                      <th className="pb-3">Operador</th>
                      <th className="pb-3">Ação</th>
                      <th className="pb-3">Tipo do Alvo</th>
                      <th className="pb-3">ID do Recurso</th>
                      <th className="pb-3 text-right">IP Origem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850 text-xs font-mono text-neutral-600 dark:text-neutral-400">
                    {logsList.map((log) => {
                      const operator = usersList.find(u => u.id === log.userId) || { name: 'Visitante (Anônimo)' };
                      return (
                        <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10">
                          <td className="py-3 text-neutral-450">{formatDate(log.createdAt)}</td>
                          <td className="py-3 font-semibold text-neutral-900 dark:text-white">{operator.name}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              log.action.includes('BLOCK') || log.action.includes('DELETE')
                                ? 'bg-red-500/10 text-red-500'
                                : log.action.includes('CREATE')
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-blue-500/10 text-blue-500'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3">{log.targetType}</td>
                          <td className="py-3 text-neutral-400 truncate max-w-[120px]" title={log.targetId}>
                            {log.targetId}
                          </td>
                          <td className="py-3 text-right">{log.ipAddress}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

      </div>

    </div>
  );
};
export default AdminPanel;
