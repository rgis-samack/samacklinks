import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'blocked';
  createdAt: string;
}

export interface Link {
  id: string;
  userId: string | null;
  originalUrl: string;
  slug: string;
  title: string;
  description: string;
  password?: string;
  expiresAt: string | null;
  deletedAt: string | null;
  status: 'active' | 'disabled';
  createdAt: string;
  lastClickedAt?: string | null;
  clicksCount: number;
}

export interface Click {
  id: string;
  linkId: string;
  clickedAt: string;
  country: string;
  city: string;
  browser: string;
  os: string;
  device: string;
  referrer: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  ipAddress: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalLinks: number;
  totalClicks: number;
  clicksToday: number;
  clicksThisMonth: number;
  activeLinksCount: number;
  mostActiveLink: Link | null;
  activeUsersCount: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface AnalyticsDetails {
  clicksOverTime: ChartDataPoint[];
  countries: ChartDataPoint[];
  browsers: ChartDataPoint[];
  devices: ChartDataPoint[];
  referrers: ChartDataPoint[];
}

export interface IDatabaseClient {
  // Autenticação / Usuários
  getCurrentUser(userId: string): Promise<User | null>;
  getUsers(): Promise<User[]>;
  updateUserStatus(userId: string, status: 'active' | 'blocked'): Promise<boolean>;
  updateUserPlan(userId: string, plan: 'free' | 'pro' | 'enterprise'): Promise<boolean>;

  // Links
  getLinkBySlug(slug: string): Promise<Link | null>;
  getLinksByUser(userId: string | null, includeDeleted?: boolean): Promise<Link[]>;
  getLinksBySlugs(slugs: string[]): Promise<Link[]>;
  getAllLinksAdmin(): Promise<Link[]>;
  createLink(linkData: Partial<Link>): Promise<Link>;
  updateLink(linkId: string, updates: Partial<Link>): Promise<Link>;
  deleteLink(linkId: string): Promise<boolean>;
  restoreLink(linkId: string): Promise<boolean>;
  forceDeleteLink(linkId: string): Promise<boolean>;

  // Cliques / Analytics
  registerClick(clickData: Omit<Click, 'id' | 'clickedAt'>): Promise<boolean>;
  getAnalyticsSummary(userId: string | null, isAdmin?: boolean): Promise<AnalyticsSummary>;
  getAnalyticsDetails(userId: string | null, linkId: string | null, period: string, isAdmin?: boolean): Promise<AnalyticsDetails>;

  // Logs
  getAuditLogs(): Promise<AuditLog[]>;
  addAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<boolean>;
}

// -------------------------------------------------------------
// IMPLEMENTAÇÃO MOCK (LocalStorage)
// -------------------------------------------------------------
class MockDatabaseClient implements IDatabaseClient {
  private getStorage<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(`samack_${key}`);
    return data ? JSON.parse(data) : defaultValue;
  }

  private setStorage<T>(key: string, value: T): void {
    localStorage.setItem(`samack_${key}`, JSON.stringify(value));
  }

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    if (!localStorage.getItem('samack_users')) {
      const users: User[] = [
        {
          id: 'usr_admin',
          name: 'Samack Admin',
          email: 'admin@samack.com',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          role: 'admin',
          plan: 'enterprise',
          status: 'active',
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'usr_user1',
          name: 'Developer John',
          email: 'john@example.com',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
          role: 'user',
          plan: 'pro',
          status: 'active',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'usr_user2',
          name: 'Jane Silva',
          email: 'jane@outlook.com',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
          role: 'user',
          plan: 'free',
          status: 'active',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        }
      ];
      this.setStorage('users', users);
    }

    if (!localStorage.getItem('samack_links')) {
      const links: Link[] = [
        {
          id: 'lnk_1',
          userId: 'usr_admin',
          originalUrl: 'https://github.com/rgis-samack/samacklinks',
          slug: 'github',
          title: 'Repositório GitHub Oficial',
          description: 'Link direto para o código fonte do SAMACK no GitHub.',
          createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: null,
          deletedAt: null,
          status: 'active',
          clicksCount: 1420
        },
        {
          id: 'lnk_2',
          userId: 'usr_user1',
          originalUrl: 'https://linkedin.com',
          slug: 'portfolio',
          title: 'Meu Portfólio Profissional',
          description: 'LinkedIn e projetos pessoais de destaque.',
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: null,
          deletedAt: null,
          status: 'active',
          clicksCount: 843
        },
        {
          id: 'lnk_3',
          userId: 'usr_user1',
          originalUrl: 'https://youtube.com',
          slug: 'youtube',
          title: 'Canal de Tutoriais Youtube',
          description: 'Vídeos explicativos sobre programação.',
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: null,
          deletedAt: null,
          status: 'active',
          clicksCount: 512
        },
        {
          id: 'lnk_4',
          userId: 'usr_user1',
          originalUrl: 'https://google.com',
          slug: 'curriculo',
          title: 'Currículo PDF Atualizado',
          description: 'Currículo em PDF para vagas de desenvolvimento de software.',
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: null,
          deletedAt: null,
          status: 'active',
          clicksCount: 204
        },
        {
          id: 'lnk_5',
          userId: 'usr_user1',
          originalUrl: 'https://medium.com',
          slug: 'dicas-dev',
          title: 'Dicas de Produtividade no Medium',
          description: 'Artigo com dicas sobre desenvolvimento ágil.',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          deletedAt: null,
          status: 'active',
          clicksCount: 97
        },
        {
          id: 'lnk_6',
          userId: 'usr_user2',
          originalUrl: 'https://news.ycombinator.com',
          slug: 'hacker-news',
          title: 'Hacker News Portal',
          description: 'Portal de notícias sobre tecnologia.',
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: null,
          deletedAt: null,
          status: 'active',
          clicksCount: 22
        },
        {
          id: 'lnk_expired',
          userId: 'usr_user1',
          originalUrl: 'https://example.com/promocao-antiga',
          slug: 'blackfriday',
          title: 'Campanha Expirada',
          description: 'Link promocional que já expirou.',
          createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          deletedAt: null,
          status: 'active',
          clicksCount: 154
        },
        {
          id: 'lnk_deleted',
          userId: 'usr_user1',
          originalUrl: 'https://example.com/excluido-temporariamente',
          slug: 'teste-lixeira',
          title: 'Link na Lixeira',
          description: 'Link excluído para testar a lixeira de 30 dias.',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: null,
          deletedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          clicksCount: 12
        }
      ];
      this.setStorage('links', links);
    }

    if (!localStorage.getItem('samack_clicks')) {
      const clicks: Click[] = [];
      const links: Link[] = this.getStorage('links', []);
      const countries = ['Brasil', 'Brasil', 'Brasil', 'EUA', 'Portugal', 'Espanha', 'Angola', 'Argentina'];
      const citiesMap: Record<string, string[]> = {
        'Brasil': ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Porto Alegre', 'Salvador'],
        'EUA': ['New York', 'San Francisco', 'Miami', 'Boston'],
        'Portugal': ['Lisboa', 'Porto', 'Braga'],
        'Espanha': ['Madrid', 'Barcelona'],
        'Angola': ['Luanda'],
        'Argentina': ['Buenos Aires']
      };
      const browsers = ['Chrome', 'Chrome', 'Safari', 'Firefox', 'Edge', 'Opera'];
      const OSs = ['Windows', 'MacOS', 'iOS', 'Android', 'Linux'];
      const devices = ['Desktop', 'Desktop', 'Mobile', 'Mobile', 'Tablet'];
      const referrers = ['Direto', 'LinkedIn', 'Instagram', 'GitHub', 'X / Twitter', 'YouTube', 'Facebook'];

      links.forEach(link => {
        if (link.deletedAt) return;
        const numClicks = link.clicksCount;
        for (let i = 0; i < numClicks; i++) {
          const linkAge = Date.now() - new Date(link.createdAt).getTime();
          const randomAge = Math.random() * linkAge;
          const clickedAt = new Date(Date.now() - randomAge).toISOString();
          const country = countries[Math.floor(Math.random() * countries.length)];
          const cities = citiesMap[country] || ['Outra'];
          const city = cities[Math.floor(Math.random() * cities.length)];

          clicks.push({
            id: `clk_${link.id}_${i}`,
            linkId: link.id,
            clickedAt,
            country,
            city,
            browser: browsers[Math.floor(Math.random() * browsers.length)],
            os: OSs[Math.floor(Math.random() * OSs.length)],
            device: devices[Math.floor(Math.random() * devices.length)],
            referrer: referrers[Math.floor(Math.random() * referrers.length)],
          });
        }
      });

      this.setStorage('clicks', clicks);

      const updatedLinks = links.map(link => {
        const linkClicks = clicks.filter(c => c.linkId === link.id);
        if (linkClicks.length === 0) return link;
        const sorted = [...linkClicks].sort((a, b) => new Date(b.clickedAt).getTime() - new Date(a.clickedAt).getTime());
        return {
          ...link,
          lastClickedAt: sorted[0].clickedAt
        };
      });
      this.setStorage('links', updatedLinks);
    }

    if (!localStorage.getItem('samack_audit_logs')) {
      const logs: AuditLog[] = [
        {
          id: 'log_1',
          userId: 'usr_admin',
          action: 'LOGIN_SUCCESS',
          targetType: 'USER',
          targetId: 'usr_admin',
          ipAddress: '189.120.45.12',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      this.setStorage('audit_logs', logs);
    }
  }

  async getCurrentUser(userId: string): Promise<User | null> {
    const users = this.getStorage<User[]>('users', []);
    return users.find(u => u.id === userId) || null;
  }

  async getUsers(): Promise<User[]> {
    return this.getStorage<User[]>('users', []);
  }

  async updateUserStatus(userId: string, status: 'active' | 'blocked'): Promise<boolean> {
    const users = this.getStorage<User[]>('users', []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].status = status;
      this.setStorage('users', users);
      return true;
    }
    return false;
  }

  async updateUserPlan(userId: string, plan: 'free' | 'pro' | 'enterprise'): Promise<boolean> {
    const users = this.getStorage<User[]>('users', []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].plan = plan;
      this.setStorage('users', users);
      return true;
    }
    return false;
  }

  async getLinkBySlug(slug: string): Promise<Link | null> {
    const links = this.getStorage<Link[]>('links', []);
    return links.find(l => l.slug.toLowerCase() === slug.toLowerCase() && l.deletedAt === null) || null;
  }

  async getLinksByUser(userId: string | null, includeDeleted = false): Promise<Link[]> {
    const links = this.getStorage<Link[]>('links', []);
    return links.filter(l => l.userId === userId && (includeDeleted ? true : l.deletedAt === null));
  }

  async getLinksBySlugs(slugs: string[]): Promise<Link[]> {
    const links = this.getStorage<Link[]>('links', []);
    const lowercaseSlugs = slugs.map(s => s.toLowerCase());
    return links.filter(l => lowercaseSlugs.includes(l.slug.toLowerCase()) && l.deletedAt === null);
  }

  async getAllLinksAdmin(): Promise<Link[]> {
    return this.getStorage<Link[]>('links', []);
  }

  async createLink(linkData: Partial<Link>): Promise<Link> {
    const links = this.getStorage<Link[]>('links', []);
    const existing = links.find(l => l.slug.toLowerCase() === (linkData.slug || '').toLowerCase() && l.deletedAt === null);
    if (existing) throw new Error('Este apelido (slug) já está em uso.');

    const newLink: Link = {
      id: `lnk_${Math.random().toString(36).substr(2, 9)}`,
      userId: linkData.userId || null,
      originalUrl: linkData.originalUrl || '',
      slug: linkData.slug || '',
      title: linkData.title || 'Link Sem Título',
      description: linkData.description || '',
      password: linkData.password || undefined,
      expiresAt: linkData.expiresAt || null,
      deletedAt: null,
      status: 'active',
      createdAt: new Date().toISOString(),
      clicksCount: 0,
      lastClickedAt: null
    };

    links.unshift(newLink);
    this.setStorage('links', links);
    return newLink;
  }

  async updateLink(linkId: string, updates: Partial<Link>): Promise<Link> {
    const links = this.getStorage<Link[]>('links', []);
    const idx = links.findIndex(l => l.id === linkId);
    if (idx === -1) throw new Error('Link não encontrado.');

    if (updates.slug && updates.slug.toLowerCase() !== links[idx].slug.toLowerCase()) {
      const existing = links.find(l => l.slug.toLowerCase() === updates.slug!.toLowerCase() && l.deletedAt === null);
      if (existing) throw new Error('Este apelido (slug) já está em uso.');
    }

    const updated = { ...links[idx], ...updates };
    links[idx] = updated;
    this.setStorage('links', links);
    return updated;
  }

  async deleteLink(linkId: string): Promise<boolean> {
    const links = this.getStorage<Link[]>('links', []);
    const idx = links.findIndex(l => l.id === linkId);
    if (idx !== -1) {
      links[idx].deletedAt = new Date().toISOString();
      this.setStorage('links', links);
      return true;
    }
    return false;
  }

  async restoreLink(linkId: string): Promise<boolean> {
    const links = this.getStorage<Link[]>('links', []);
    const idx = links.findIndex(l => l.id === linkId);
    if (idx !== -1) {
      links[idx].deletedAt = null;
      this.setStorage('links', links);
      return true;
    }
    return false;
  }

  async forceDeleteLink(linkId: string): Promise<boolean> {
    let links = this.getStorage<Link[]>('links', []);
    const initialLen = links.length;
    links = links.filter(l => l.id !== linkId);
    if (links.length < initialLen) {
      this.setStorage('links', links);
      let clicks = this.getStorage<Click[]>('clicks', []);
      clicks = clicks.filter(c => c.linkId !== linkId);
      this.setStorage('clicks', clicks);
      return true;
    }
    return false;
  }

  async registerClick(clickData: Omit<Click, 'id' | 'clickedAt'>): Promise<boolean> {
    const clicks = this.getStorage<Click[]>('clicks', []);
    const links = this.getStorage<Link[]>('links', []);
    const newClick: Click = {
      ...clickData,
      id: `clk_${Math.random().toString(36).substr(2, 9)}`,
      clickedAt: new Date().toISOString()
    };

    clicks.push(newClick);
    this.setStorage('clicks', clicks);

    const linkIdx = links.findIndex(l => l.id === clickData.linkId);
    if (linkIdx !== -1) {
      links[linkIdx].clicksCount = (links[linkIdx].clicksCount || 0) + 1;
      links[linkIdx].lastClickedAt = newClick.clickedAt;
      this.setStorage('links', links);
      return true;
    }
    return false;
  }

  async getAnalyticsSummary(userId: string | null, isAdmin = false): Promise<AnalyticsSummary> {
    const links = this.getStorage<Link[]>('links', []);
    const clicks = this.getStorage<Click[]>('clicks', []);
    const users = this.getStorage<User[]>('users', []);

    const userLinks = isAdmin 
      ? links.filter(l => l.deletedAt === null)
      : links.filter(l => l.userId === userId && l.deletedAt === null);

    const userLinkIds = new Set(userLinks.map(l => l.id));
    const userClicks = clicks.filter(c => userLinkIds.has(c.linkId));

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthPrefix = now.toISOString().slice(0, 7);

    const clicksToday = userClicks.filter(c => c.clickedAt.startsWith(todayStr)).length;
    const clicksThisMonth = userClicks.filter(c => c.clickedAt.startsWith(monthPrefix)).length;

    let mostActiveLink: Link | null = null;
    if (userLinks.length > 0) {
      mostActiveLink = userLinks.reduce((prev, current) => (prev.clicksCount > current.clicksCount) ? prev : current);
    }

    return {
      totalLinks: userLinks.length,
      totalClicks: userClicks.length,
      clicksToday,
      clicksThisMonth,
      activeLinksCount: userLinks.filter(l => l.status === 'active').length,
      mostActiveLink,
      activeUsersCount: users.filter(u => u.status === 'active').length
    };
  }

  async getAnalyticsDetails(userId: string | null, linkId: string | null, period: string, isAdmin = false): Promise<AnalyticsDetails> {
    const links = this.getStorage<Link[]>('links', []);
    const clicks = this.getStorage<Click[]>('clicks', []);

    let targetLinkIds: Set<string>;
    if (linkId) {
      targetLinkIds = new Set([linkId]);
    } else {
      const userLinks = isAdmin 
        ? links.filter(l => l.deletedAt === null)
        : links.filter(l => l.userId === userId && l.deletedAt === null);
      targetLinkIds = new Set(userLinks.map(l => l.id));
    }

    let filteredClicks = clicks.filter(c => targetLinkIds.has(c.linkId));
    const now = new Date();
    let minDate = new Date(0);

    if (period === 'today') {
      minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'yesterday') {
      minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filteredClicks = filteredClicks.filter(c => {
        const d = new Date(c.clickedAt);
        return d >= minDate && d < endOfYesterday;
      });
    } else if (period === '7d') {
      minDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '30d') {
      minDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === '90d') {
      minDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    if (period !== 'yesterday') {
      filteredClicks = filteredClicks.filter(c => new Date(c.clickedAt) >= minDate);
    }

    const timeGroups: Record<string, number> = {};
    const daysToGenerate = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 15;
    
    if (period !== 'today' && period !== 'yesterday') {
      for (let i = daysToGenerate - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        timeGroups[label] = 0;
      }
    } else {
      for (let i = 0; i < 24; i += 2) {
        timeGroups[`${i}h`] = 0;
      }
    }

    filteredClicks.forEach(c => {
      const d = new Date(c.clickedAt);
      let label = '';
      if (period === 'today' || period === 'yesterday') {
        label = `${Math.floor(d.getHours() / 2) * 2}h`;
      } else {
        label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      }
      if (timeGroups[label] !== undefined) timeGroups[label]++;
    });

    const clicksOverTime = Object.keys(timeGroups).map(key => ({ label: key, value: timeGroups[key] }));

    const groupField = (field: keyof Click): ChartDataPoint[] => {
      const counts: Record<string, number> = {};
      filteredClicks.forEach(c => {
        const val = c[field] as string;
        counts[val] = (counts[val] || 0) + 1;
      });
      return Object.keys(counts)
        .map(key => ({ label: key, value: counts[key] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
    };

    return {
      clicksOverTime,
      countries: groupField('country'),
      browsers: groupField('browser'),
      devices: groupField('device'),
      referrers: groupField('referrer'),
    };
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return this.getStorage<AuditLog[]>('audit_logs', []);
  }

  async addAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<boolean> {
    const logs = this.getStorage<AuditLog[]>('audit_logs', []);
    logs.unshift({ ...log, id: `log_${crypto.randomUUID()}`, createdAt: new Date().toISOString() });
    this.setStorage('audit_logs', logs);
    return true;
  }
}

// -------------------------------------------------------------
// IMPLEMENTAÇÃO SUPABASE DATABASE CLIENT (PostgreSQL)
// -------------------------------------------------------------
class SupabaseDatabaseClient implements IDatabaseClient {
  private supabase: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.supabase = createClient(url, anonKey);
  }

  async getCurrentUser(userId: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatar_url,
      role: data.role as any,
      plan: data.plan as any,
      status: data.status as any,
      createdAt: data.created_at
    };
  }

  async getUsers(): Promise<User[]> {
    const { data } = await this.supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    return (data || []).map(d => ({
      id: d.id,
      name: d.name,
      email: d.email,
      avatarUrl: d.avatar_url,
      role: d.role,
      plan: d.plan,
      status: d.status,
      createdAt: d.created_at
    }));
  }

  async updateUserStatus(userId: string, status: 'active' | 'blocked'): Promise<boolean> {
    const { error } = await this.supabase
      .from('users')
      .update({ status })
      .eq('id', userId);
    return !error;
  }

  async updateUserPlan(userId: string, plan: 'free' | 'pro' | 'enterprise'): Promise<boolean> {
    const { error } = await this.supabase
      .from('users')
      .update({ plan })
      .eq('id', userId);
    return !error;
  }

  async getLinkBySlug(slug: string): Promise<Link | null> {
    const { data, error } = await this.supabase
      .from('links')
      .select('*')
      .eq('slug', slug.toLowerCase())
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      userId: data.user_id,
      originalUrl: data.original_url,
      slug: data.slug,
      title: data.title,
      description: data.description,
      password: data.password || undefined,
      expiresAt: data.expires_at,
      deletedAt: data.deleted_at,
      status: data.status,
      createdAt: data.created_at,
      clicksCount: 0 // Será atualizado sob demanda
    };
  }

  async getLinksByUser(userId: string | null, includeDeleted = false): Promise<Link[]> {
    let query = this.supabase
      .from('links')
      .select('*, clicks(id, clicked_at)')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }

    if (includeDeleted) {
      query = query.not('deleted_at', 'is', null);
    } else {
      query = query.is('deleted_at', null);
    }

    const { data } = await query;
    if (!data) return [];

    return data.map((d: any) => {
      const clicksList = d.clicks || [];
      const clicksCount = clicksList.length;
      const sorted = [...clicksList].sort((a: any, b: any) => new Date(b.clicked_at).getTime() - new Date(a.clicked_at).getTime());
      const lastClickedAt = sorted.length > 0 ? sorted[0].clicked_at : null;

      return {
        id: d.id,
        userId: d.user_id,
        originalUrl: d.original_url,
        slug: d.slug,
        title: d.title,
        description: d.description,
        password: d.password || undefined,
        expiresAt: d.expires_at,
        deletedAt: d.deleted_at,
        status: d.status,
        createdAt: d.created_at,
        clicksCount,
        lastClickedAt
      };
    });
  }

  async getLinksBySlugs(slugs: string[]): Promise<Link[]> {
    if (slugs.length === 0) return [];
    const lowercaseSlugs = slugs.map(s => s.toLowerCase());
    const { data } = await this.supabase
      .from('links')
      .select('*, clicks(id, clicked_at)')
      .in('slug', lowercaseSlugs)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (!data) return [];
    return data.map((d: any) => {
      const clicksList = d.clicks || [];
      const clicksCount = clicksList.length;
      const sorted = [...clicksList].sort((a: any, b: any) => new Date(b.clicked_at).getTime() - new Date(a.clicked_at).getTime());
      const lastClickedAt = sorted.length > 0 ? sorted[0].clicked_at : null;

      return {
        id: d.id,
        userId: d.user_id,
        originalUrl: d.original_url,
        slug: d.slug,
        title: d.title,
        description: d.description,
        password: d.password || undefined,
        expiresAt: d.expires_at,
        deletedAt: d.deleted_at,
        status: d.status,
        createdAt: d.created_at,
        clicksCount,
        lastClickedAt
      };
    });
  }

  async getAllLinksAdmin(): Promise<Link[]> {
    const { data } = await this.supabase
      .from('links')
      .select('*, clicks(id, clicked_at)')
      .order('created_at', { ascending: false });

    if (!data) return [];
    return data.map((d: any) => {
      const clicksList = d.clicks || [];
      const clicksCount = clicksList.length;
      const sorted = [...clicksList].sort((a: any, b: any) => new Date(b.clicked_at).getTime() - new Date(a.clicked_at).getTime());
      const lastClickedAt = sorted.length > 0 ? sorted[0].clicked_at : null;

      return {
        id: d.id,
        userId: d.user_id,
        originalUrl: d.original_url,
        slug: d.slug,
        title: d.title,
        description: d.description,
        password: d.password || undefined,
        expiresAt: d.expires_at,
        deletedAt: d.deleted_at,
        status: d.status,
        createdAt: d.created_at,
        clicksCount,
        lastClickedAt
      };
    });
  }

  async createLink(linkData: Partial<Link>): Promise<Link> {
    const id = `lnk_${Math.random().toString(36).substr(2, 9)}`;
    const { data, error } = await this.supabase
      .from('links')
      .insert({
        id,
        user_id: linkData.userId || null,
        original_url: linkData.originalUrl,
        slug: linkData.slug?.toLowerCase(),
        title: linkData.title || 'Sem Título',
        description: linkData.description || '',
        password: linkData.password || null,
        expires_at: linkData.expiresAt || null,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    
    return {
      id: data.id,
      userId: data.user_id,
      originalUrl: data.original_url,
      slug: data.slug,
      title: data.title,
      description: data.description,
      password: data.password || undefined,
      expiresAt: data.expires_at,
      deletedAt: data.deleted_at,
      status: data.status,
      createdAt: data.created_at,
      clicksCount: 0
    };
  }

  async updateLink(linkId: string, updates: Partial<Link>): Promise<Link> {
    const { data, error } = await this.supabase
      .from('links')
      .update({
        original_url: updates.originalUrl,
        slug: updates.slug?.toLowerCase(),
        title: updates.title,
        description: updates.description,
        password: updates.password || null,
        expires_at: updates.expiresAt,
        status: updates.status
      })
      .eq('id', linkId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      userId: data.user_id,
      originalUrl: data.original_url,
      slug: data.slug,
      title: data.title,
      description: data.description,
      password: data.password || undefined,
      expiresAt: data.expires_at,
      deletedAt: data.deleted_at,
      status: data.status,
      createdAt: data.created_at,
      clicksCount: 0
    };
  }

  async deleteLink(linkId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('links')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', linkId);
    return !error;
  }

  async restoreLink(linkId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('links')
      .update({ deleted_at: null })
      .eq('id', linkId);
    return !error;
  }

  async forceDeleteLink(linkId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('links')
      .delete()
      .eq('id', linkId);
    return !error;
  }

  async registerClick(clickData: Omit<Click, 'id' | 'clickedAt'>): Promise<boolean> {
    const id = `clk_${Math.random().toString(36).substr(2, 9)}`;
    const { error } = await this.supabase
      .from('clicks')
      .insert({
        id,
        link_id: clickData.linkId,
        country: clickData.country,
        city: clickData.city,
        browser: clickData.browser,
        os: clickData.os,
        device: clickData.device,
        referrer: clickData.referrer
      });
    return !error;
  }

  async getAnalyticsSummary(userId: string | null, isAdmin = false): Promise<AnalyticsSummary> {
    // Para simplificar e evitar queries pesadas com joins complexos, puxamos links e cliques correspondentes
    let linksQuery = this.supabase.from('links').select('id, status, clicks(id, clicked_at)').is('deleted_at', null);
    if (!isAdmin && userId) {
      linksQuery = linksQuery.eq('user_id', userId);
    } else if (!isAdmin && !userId) {
      linksQuery = linksQuery.is('user_id', null);
    }

    const { data: linksData } = await linksQuery;
    const usersCountRes = await this.supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active');
    
    if (!linksData) {
      return {
        totalLinks: 0,
        totalClicks: 0,
        clicksToday: 0,
        clicksThisMonth: 0,
        activeLinksCount: 0,
        mostActiveLink: null,
        activeUsersCount: usersCountRes.count || 0
      };
    }

    let totalClicks = 0;
    let clicksToday = 0;
    let clicksThisMonth = 0;
    let activeLinksCount = 0;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthPrefix = now.toISOString().slice(0, 7);

    linksData.forEach((link: any) => {
      if (link.status === 'active') activeLinksCount++;
      const clicksList = link.clicks || [];
      totalClicks += clicksList.length;

      clicksList.forEach((c: any) => {
        if (c.clicked_at.startsWith(todayStr)) clicksToday++;
        if (c.clicked_at.startsWith(monthPrefix)) clicksThisMonth++;
      });
    });

    // Encontrar link mais ativo
    let mostActiveLink: Link | null = null;
    if (linksData.length > 0) {
      // Como precisamos de detalhes completos para o mostActiveLink, fazemos uma requisição rápida para o topo
      let topLinkQuery = this.supabase
        .from('links')
        .select('*, clicks(id)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (!isAdmin && userId) topLinkQuery = topLinkQuery.eq('user_id', userId);
      
      const { data: topData } = await topLinkQuery;
      if (topData && topData.length > 0) {
        const sorted = [...topData].sort((a: any, b: any) => (b.clicks?.length || 0) - (a.clicks?.length || 0));
        const best = sorted[0];
        mostActiveLink = {
          id: best.id,
          userId: best.user_id,
          originalUrl: best.original_url,
          slug: best.slug,
          title: best.title,
          description: best.description,
          password: best.password || undefined,
          expiresAt: best.expires_at,
          deletedAt: best.deleted_at,
          status: best.status,
          createdAt: best.created_at,
          clicksCount: best.clicks?.length || 0
        };
      }
    }

    return {
      totalLinks: linksData.length,
      totalClicks,
      clicksToday,
      clicksThisMonth,
      activeLinksCount,
      mostActiveLink,
      activeUsersCount: usersCountRes.count || 0
    };
  }

  async getAnalyticsDetails(userId: string | null, linkId: string | null, period: string, isAdmin = false): Promise<AnalyticsDetails> {
    // 1. Obter links
    let linksQuery = this.supabase.from('links').select('id');
    if (linkId) {
      linksQuery = linksQuery.eq('id', linkId);
    } else if (!isAdmin && userId) {
      linksQuery = linksQuery.eq('user_id', userId);
    } else if (!isAdmin && !userId) {
      linksQuery = linksQuery.is('user_id', null);
    }

    const { data: targetLinks } = await linksQuery;
    if (!targetLinks || targetLinks.length === 0) {
      return { clicksOverTime: [], countries: [], browsers: [], devices: [], referrers: [] };
    }

    const linkIds = targetLinks.map(l => l.id);

    // 2. Obter cliques
    let clicksQuery = this.supabase.from('clicks').select('*').in('link_id', linkIds);
    
    // Filtro temporal básico no cliente para consistência
    const now = new Date();
    let minDate = new Date(0);

    if (period === 'today') {
      minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'yesterday') {
      minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    } else if (period === '7d') {
      minDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '30d') {
      minDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === '90d') {
      minDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    if (period === 'yesterday') {
      const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      clicksQuery = clicksQuery.gte('clicked_at', minDate.toISOString()).lt('clicked_at', endOfYesterday.toISOString());
    } else {
      clicksQuery = clicksQuery.gte('clicked_at', minDate.toISOString());
    }

    const { data: clicksData } = await clicksQuery;
    if (!clicksData || clicksData.length === 0) {
      return { clicksOverTime: [], countries: [], browsers: [], devices: [], referrers: [] };
    }

    // 3. Agrupamento temporal e de strings (igual ao do MockDB para reutilizar lógica testada)
    const timeGroups: Record<string, number> = {};
    const daysToGenerate = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 15;
    
    if (period !== 'today' && period !== 'yesterday') {
      for (let i = daysToGenerate - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        timeGroups[label] = 0;
      }
    } else {
      for (let i = 0; i < 24; i += 2) {
        timeGroups[`${i}h`] = 0;
      }
    }

    clicksData.forEach((c: any) => {
      const d = new Date(c.clicked_at);
      let label = '';
      if (period === 'today' || period === 'yesterday') {
        label = `${Math.floor(d.getHours() / 2) * 2}h`;
      } else {
        label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      }
      if (timeGroups[label] !== undefined) timeGroups[label]++;
    });

    const clicksOverTime = Object.keys(timeGroups).map(key => ({ label: key, value: timeGroups[key] }));

    const groupField = (field: string): ChartDataPoint[] => {
      const counts: Record<string, number> = {};
      clicksData.forEach((c: any) => {
        const val = c[field] || 'Outro';
        counts[val] = (counts[val] || 0) + 1;
      });
      return Object.keys(counts)
        .map(key => ({ label: key, value: counts[key] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
    };

    return {
      clicksOverTime,
      countries: groupField('country'),
      browsers: groupField('browser'),
      devices: groupField('device'),
      referrers: groupField('referrer'),
    };
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    const { data } = await this.supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    return (data || []).map(d => ({
      id: d.id,
      userId: d.user_id,
      action: d.action,
      targetType: d.target_type,
      targetId: d.target_id,
      ipAddress: d.ip_address,
      createdAt: d.created_at
    }));
  }

  async addAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<boolean> {
    const id = `log_${crypto.randomUUID()}`;
    const { error } = await this.supabase
      .from('audit_logs')
      .insert({
        id,
        user_id: log.userId,
        action: log.action,
        target_type: log.targetType,
        target_id: log.targetId,
        ip_address: log.ipAddress
      });
    return !error;
  }
}

// -------------------------------------------------------------
// SELETOR DINÂMICO DE CLIENTE (MOCK VS SUPABASE)
// -------------------------------------------------------------
const getSupabaseConfig = () => {
  const customUrl = localStorage.getItem('samack_custom_supabase_url');
  const customKey = localStorage.getItem('samack_custom_supabase_anon_key');
  
  if (customUrl && customKey && customUrl.includes('supabase.co')) {
    return { url: customUrl, key: customKey };
  }
  
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  // Ignorar credenciais de exemplo/placeholder
  const isPlaceholder = envUrl.includes('sua-url-do-supabase') || envKey.includes('sua-anon-key-aqui') || envKey.trim() === '';
  
  if (envUrl && envKey && envUrl.includes('supabase.co') && !isPlaceholder) {
    return { url: envUrl, key: envKey };
  }
  
  return null;
};

class DynamicDatabaseClient implements IDatabaseClient {
  private activeClient!: IDatabaseClient;

  constructor() {
    this.reconnect();
  }

  reconnect() {
    const config = getSupabaseConfig();
    if (config) {
      try {
        this.activeClient = new SupabaseDatabaseClient(config.url, config.key);
        return;
      } catch (e) {
        console.error("Falha ao inicializar Supabase client:", e);
      }
    }
    this.activeClient = new MockDatabaseClient();
  }

  isMock(): boolean {
    return this.activeClient instanceof MockDatabaseClient;
  }

  // Delegar todos os métodos
  getCurrentUser(userId: string) { return this.activeClient.getCurrentUser(userId); }
  getUsers() { return this.activeClient.getUsers(); }
  updateUserStatus(userId: string, status: 'active' | 'blocked') { return this.activeClient.updateUserStatus(userId, status); }
  updateUserPlan(userId: string, plan: 'free' | 'pro' | 'enterprise') { return this.activeClient.updateUserPlan(userId, plan); }
  getLinkBySlug(slug: string) { return this.activeClient.getLinkBySlug(slug); }
  getLinksByUser(userId: string | null, includeDeleted?: boolean) { return this.activeClient.getLinksByUser(userId, includeDeleted); }
  getLinksBySlugs(slugs: string[]) { return this.activeClient.getLinksBySlugs(slugs); }
  getAllLinksAdmin() { return this.activeClient.getAllLinksAdmin(); }
  createLink(linkData: Partial<Link>) { return this.activeClient.createLink(linkData); }
  updateLink(linkId: string, updates: Partial<Link>) { return this.activeClient.updateLink(linkId, updates); }
  deleteLink(linkId: string) { return this.activeClient.deleteLink(linkId); }
  restoreLink(linkId: string) { return this.activeClient.restoreLink(linkId); }
  forceDeleteLink(linkId: string) { return this.activeClient.forceDeleteLink(linkId); }
  registerClick(clickData: Omit<Click, 'id' | 'clickedAt'>) { return this.activeClient.registerClick(clickData); }
  getAnalyticsSummary(userId: string | null, isAdmin?: boolean) { return this.activeClient.getAnalyticsSummary(userId, isAdmin); }
  getAnalyticsDetails(userId: string | null, linkId: string | null, period: string, isAdmin?: boolean) { return this.activeClient.getAnalyticsDetails(userId, linkId, period, isAdmin); }
  getAuditLogs() { return this.activeClient.getAuditLogs(); }
  addAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>) { return this.activeClient.addAuditLog(log); }
}

export const db = new DynamicDatabaseClient();
