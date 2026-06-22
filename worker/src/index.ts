export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  JWT_SECRET: string;
  FRONTEND_URL: string;
}

// Utilitários de Resposta HTTP com CORS
function corsResponse(body: any, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Em prod, pode ser substituído por env.FRONTEND_URL
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers
    }
  });
}

function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}

// Analisadores auxiliares de User-Agent
function getDevice(ua: string): string {
  if (!ua) return 'Desktop';
  const lowercase = ua.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(lowercase)) return 'Tablet';
  if (/mobile|iphone|ipod|android|blackberry|iemobile/i.test(lowercase)) return 'Mobile';
  return 'Desktop';
}

function getBrowser(ua: string): string {
  if (!ua) return 'Outro';
  const lowercase = ua.toLowerCase();
  if (lowercase.includes('chrome') && !lowercase.includes('edg') && !lowercase.includes('opr')) return 'Chrome';
  if (lowercase.includes('safari') && !lowercase.includes('chrome')) return 'Safari';
  if (lowercase.includes('firefox')) return 'Firefox';
  if (lowercase.includes('edg')) return 'Edge';
  if (lowercase.includes('opr') || lowercase.includes('opera')) return 'Opera';
  return 'Outro';
}

function getOS(ua: string): string {
  if (!ua) return 'Outro';
  const lowercase = ua.toLowerCase();
  if (lowercase.includes('win')) return 'Windows';
  if (lowercase.includes('mac') && !lowercase.includes('iphone') && !lowercase.includes('ipad')) return 'MacOS';
  if (lowercase.includes('linux') && !lowercase.includes('android')) return 'Linux';
  if (lowercase.includes('android')) return 'Android';
  if (lowercase.includes('iphone') || lowercase.includes('ipad')) return 'iOS';
  return 'Outro';
}

function getReferrer(ref: string): string {
  if (!ref) return 'Direto';
  try {
    const url = new URL(ref);
    const host = url.hostname.toLowerCase();
    if (host.includes('linkedin.com')) return 'LinkedIn';
    if (host.includes('instagram.com')) return 'Instagram';
    if (host.includes('facebook.com') || host.includes('fb.me')) return 'Facebook';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YouTube';
    if (host.includes('twitter.com') || host.includes('x.com') || host.includes('t.co')) return 'X / Twitter';
    if (host.includes('github.com')) return 'GitHub';
    if (host.includes('t.me')) return 'Telegram';
    if (host.includes('whatsapp.com') || host.includes('wa.me')) return 'WhatsApp';
    return url.hostname;
  } catch (_) {
    return 'Outro';
  }
}

// Middleware de autenticação básico
async function getAuthUser(request: Request, env: Env): Promise<{ id: string; role: string; plan: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  
  // Em modo simulação rápida, nós decodificamos perfis mockados jwt_token_for_<id>
  if (token.startsWith('mock_jwt_token_for_')) {
    const userId = token.replace('mock_jwt_token_for_', '');
    // Buscar perfil do banco
    const user = await env.DB.prepare('SELECT id, role, plan, status FROM users WHERE id = ?').bind(userId).first<{ id: string; role: string; plan: string; status: string }>();
    if (user && user.status === 'active') return user;
  }

  return null;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // 1. Tratar Preflight CORS
    if (method === 'OPTIONS') {
      return handleOptions();
    }

    const pathname = url.pathname;

    // -------------------------------------------------------------
    // ROTA DE REDIRECIONAMENTO RÁPIDO: GET /:slug
    // -------------------------------------------------------------
    const slugMatch = pathname.match(/^\/([a-zA-Z0-9-_]+)$/);
    // Ignorar endpoints da API
    if (slugMatch && !pathname.startsWith('/api') && !pathname.startsWith('/static')) {
      const slug = slugMatch[1].toLowerCase();

      // ROTA DE SEGURANÇA: Palavras reservadas não passam por aqui
      const reserved = ['admin', 'dashboard', 'login', 'stats', 'expired', 'password', 'disabled'];
      if (reserved.includes(slug)) {
        return new Response('Reservado', { status: 404 });
      }

      // TENTATIVA 1: Obter do Cache Rápido do Cloudflare KV
      const cached = await env.KV.get(`link:${slug}`);
      let linkData: any = null;

      if (cached) {
        linkData = JSON.parse(cached);
      } else {
        // TENTATIVA 2: Buscar no Banco D1 caso não esteja em KV
        linkData = await env.DB.prepare(
          'SELECT * FROM links WHERE LOWER(slug) = ? AND deleted_at IS NULL LIMIT 1'
        ).bind(slug).first();

        if (linkData) {
          // Salvar em cache KV por 1 hora
          await env.KV.put(`link:${slug}`, JSON.stringify(linkData), { expirationTtl: 3600 });
        }
      }

      if (!linkData) {
        // Retornar 404 para o frontend lidar
        return new Response('Link não encontrado', { status: 404 });
      }

      // Validar expiração e status
      const isExpired = linkData.expires_at && new Date(linkData.expires_at) < new Date();
      if (linkData.status === 'disabled' || isExpired || linkData.password) {
        // Se precisar de senha, expiração ou ban, mandar de volta para a SPA processar o visual
        // O redirecionador frontend lê o hash e renderiza o SecurityView adequado
        const redirectSpaUrl = `${env.FRONTEND_URL || url.origin}/#/${slug}`;
        return Response.redirect(redirectSpaUrl, 302);
      }

      // REGISTRO DE CLIQUE ASSÍNCRONO: ctx.waitUntil roda em segundo plano sem travar a resposta
      const clickId = `clk_${crypto.randomUUID()}`;
      const userAgent = request.headers.get('User-Agent') || '';
      const referrer = request.headers.get('Referer') || '';
      const country = request.headers.get('CF-IPCountry') || 'Outro';
      const city = request.headers.get('CF-IPCity') || 'Outra';
      
      const browser = getBrowser(userAgent);
      const os = getOS(userAgent);
      const device = getDevice(userAgent);
      const refName = getReferrer(referrer);

      ctx.waitUntil(
        env.DB.prepare(
          'INSERT INTO clicks (id, link_id, clicked_at, country, city, browser, os, device, referrer) VALUES (?, ?, datetime("now"), ?, ?, ?, ?, ?, ?)'
        ).bind(clickId, linkData.id, country, city, browser, os, device, refName).run()
      );

      // REDIRECIONAR EM <50ms
      return Response.redirect(linkData.original_url, 302);
    }

    // -------------------------------------------------------------
    // ROTAS DE API: /api/*
    // -------------------------------------------------------------

    // API: Obter Link por Slug
    if (pathname.startsWith('/api/links/slug/') && method === 'GET') {
      const slug = pathname.replace('/api/links/slug/', '');
      const link = await env.DB.prepare('SELECT * FROM links WHERE LOWER(slug) = ? AND deleted_at IS NULL LIMIT 1').bind(slug.toLowerCase()).first();
      return corsResponse(link);
    }

    // API: Autenticação de Usuário e Perfil
    if (pathname.startsWith('/api/users/') && method === 'GET') {
      const userId = pathname.replace('/api/users/', '');
      const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
      return corsResponse(user);
    }

    // API: CRUD de Links
    if (pathname === '/api/links') {
      const authUser = await getAuthUser(request, env);
      
      if (method === 'GET') {
        const userId = url.searchParams.get('userId');
        const includeDeleted = url.searchParams.get('includeDeleted') === 'true';
        
        let query = 'SELECT l.*, COUNT(c.id) as clicksCount, MAX(c.clicked_at) as lastClickedAt FROM links l LEFT JOIN clicks c ON l.id = c.link_id WHERE l.deleted_at ';
        query += includeDeleted ? 'IS NOT NULL ' : 'IS NULL ';
        
        if (userId) {
          query += 'AND l.user_id = ? ';
        } else {
          query += 'AND l.user_id IS NULL '; // Anônimo
        }
        query += 'GROUP BY l.id ORDER BY l.created_at DESC';

        const stmt = userId 
          ? env.DB.prepare(query).bind(userId)
          : env.DB.prepare(query);

        const { results } = await stmt.all();
        return corsResponse(results);
      }

      if (method === 'POST') {
        const linkData = await request.json<any>();
        const id = `lnk_${crypto.randomUUID()}`;
        const userId = authUser ? authUser.id : null;

        // Validar slug duplicado
        const existing = await env.DB.prepare('SELECT id FROM links WHERE LOWER(slug) = ? AND deleted_at IS NULL').bind(linkData.slug.toLowerCase()).first();
        if (existing) {
          return corsResponse({ message: 'Este apelido já está em uso.' }, 400);
        }

        await env.DB.prepare(
          'INSERT INTO links (id, user_id, original_url, slug, title, description, password, expires_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "active", datetime("now"))'
        ).bind(id, userId, linkData.originalUrl, linkData.slug, linkData.title || 'Sem título', linkData.description || '', linkData.password || null, linkData.expiresAt || null).run();

        // Limpar cache KV se necessário
        await env.KV.delete(`link:${linkData.slug.toLowerCase()}`);

        // Registrar Log
        const logId = `log_${crypto.randomUUID()}`;
        await env.DB.prepare(
          'INSERT INTO audit_logs (id, user_id, action, target_type, target_id, ip_address, created_at) VALUES (?, ?, "CREATE_LINK", "LINK", ?, ?, datetime("now"))'
        ).bind(logId, userId, id, request.headers.get('CF-Connecting-IP') || '127.0.0.1').run();

        const newLink = await env.DB.prepare('SELECT * FROM links WHERE id = ?').bind(id).first();
        return corsResponse(newLink, 21);
      }
    }

    // API: Modificar Link (Editar, Restaurar, Excluir)
    if (pathname.startsWith('/api/links/')) {
      const authUser = await getAuthUser(request, env);
      const linkId = pathname.split('/')[3];

      if (method === 'PUT') {
        const updates = await request.json<any>();
        
        // Validar slug duplicado se houver alteração
        if (updates.slug) {
          const duplicate = await env.DB.prepare('SELECT id FROM links WHERE LOWER(slug) = ? AND id != ? AND deleted_at IS NULL').bind(updates.slug.toLowerCase(), linkId).first();
          if (duplicate) {
            return corsResponse({ message: 'Este apelido já está em uso.' }, 400);
          }
        }

        await env.DB.prepare(
          'UPDATE links SET original_url = ?, slug = ?, title = ?, description = ?, password = ?, expires_at = ?, status = ? WHERE id = ?'
        ).bind(updates.originalUrl, updates.slug, updates.title, updates.description, updates.password || null, updates.expiresAt || null, updates.status, linkId).run();

        // Invalidar cache do slug antigo e do novo
        if (updates.slug) {
          await env.KV.delete(`link:${updates.slug.toLowerCase()}`);
        }
        
        const updated = await env.DB.prepare('SELECT * FROM links WHERE id = ?').bind(linkId).first();
        return corsResponse(updated);
      }

      // Soft Delete (Mover para Lixeira de 30 dias)
      if (method === 'DELETE' && !pathname.endsWith('/force')) {
        await env.DB.prepare('UPDATE links SET deleted_at = datetime("now") WHERE id = ?').bind(linkId).run();
        
        // Pegar slug para invalidar no KV
        const target = await env.DB.prepare('SELECT slug FROM links WHERE id = ?').bind(linkId).first<{ slug: string }>();
        if (target) {
          await env.KV.delete(`link:${target.slug.toLowerCase()}`);
        }

        return corsResponse({ success: true });
      }

      // Restaurar da Lixeira
      if (method === 'POST' && pathname.endsWith('/restore')) {
        await env.DB.prepare('UPDATE links SET deleted_at = NULL WHERE id = ?').bind(linkId).run();
        return corsResponse({ success: true });
      }

      // Excluir Permanentemente
      if (method === 'DELETE' && pathname.endsWith('/force')) {
        const target = await env.DB.prepare('SELECT slug FROM links WHERE id = ?').bind(linkId).first<{ slug: string }>();
        if (target) {
          await env.KV.delete(`link:${target.slug.toLowerCase()}`);
        }

        await env.DB.prepare('DELETE FROM clicks WHERE link_id = ?').bind(linkId).run();
        await env.DB.prepare('DELETE FROM links WHERE id = ?').bind(linkId).run();
        return corsResponse({ success: true });
      }
    }

    // API: Registrar Clique Manual (Tela de validação de senha do link)
    if (pathname === '/api/clicks' && method === 'POST') {
      const clickData = await request.json<any>();
      const clickId = `clk_${crypto.randomUUID()}`;
      
      const userAgent = request.headers.get('User-Agent') || '';
      const referrer = request.headers.get('Referer') || '';
      const country = request.headers.get('CF-IPCountry') || 'Outro';
      const city = request.headers.get('CF-IPCity') || 'Outra';
      
      const browser = getBrowser(userAgent);
      const os = getOS(userAgent);
      const device = getDevice(userAgent);
      const refName = getReferrer(referrer);

      await env.DB.prepare(
        'INSERT INTO clicks (id, link_id, clicked_at, country, city, browser, os, device, referrer) VALUES (?, ?, datetime("now"), ?, ?, ?, ?, ?, ?)'
      ).bind(clickId, clickData.linkId, country, city, browser, os, device, refName).run();

      return corsResponse({ success: true });
    }

    // API: Relatórios de Analytics
    if (pathname === '/api/analytics/summary') {
      const userId = url.searchParams.get('userId');
      const isAdmin = url.searchParams.get('isAdmin') === 'true';

      let totalLinksQuery = 'SELECT COUNT(id) as total FROM links WHERE deleted_at IS NULL ';
      let clicksQuery = 'SELECT COUNT(c.id) as total FROM clicks c JOIN links l ON c.link_id = l.id WHERE l.deleted_at IS NULL ';
      
      if (!isAdmin && userId) {
        totalLinksQuery += 'AND user_id = ?';
        clicksQuery += 'AND l.user_id = ?';
      } else if (!isAdmin && !userId) {
        totalLinksQuery += 'AND user_id IS NULL';
        clicksQuery += 'AND l.user_id IS NULL';
      }

      const totalLinks = await env.DB.prepare(totalLinksQuery).bind(userId || '').first<{ total: number }>();
      const totalClicks = await env.DB.prepare(clicksQuery).bind(userId || '').first<{ total: number }>();

      // Cliques hoje / mês
      let clicksTodayQuery = clicksQuery + 'AND date(c.clicked_at) = date("now")';
      let clicksMonthQuery = clicksQuery + 'AND strftime("%Y-%m", c.clicked_at) = strftime("%Y-%m", "now")';
      
      const clicksToday = await env.DB.prepare(clicksTodayQuery).bind(userId || '').first<{ total: number }>();
      const clicksThisMonth = await env.DB.prepare(clicksMonthQuery).bind(userId || '').first<{ total: number }>();

      // Link mais acessado
      let mostActiveQuery = 'SELECT l.*, COUNT(c.id) as clicksCount FROM links l JOIN clicks c ON l.id = c.link_id WHERE l.deleted_at IS NULL ';
      if (!isAdmin && userId) mostActiveQuery += 'AND l.user_id = ? ';
      mostActiveQuery += 'GROUP BY l.id ORDER BY clicksCount DESC LIMIT 1';
      
      const mostActiveLink = await env.DB.prepare(mostActiveQuery).bind(userId || '').first<any>();

      // Usuários Ativos
      const activeUsers = await env.DB.prepare('SELECT COUNT(id) as total FROM users WHERE status = "active"').first<{ total: number }>();

      return corsResponse({
        totalLinks: totalLinks?.total || 0,
        totalClicks: totalClicks?.total || 0,
        clicksToday: clicksToday?.total || 0,
        clicksThisMonth: clicksThisMonth?.total || 0,
        activeLinksCount: totalLinks?.total || 0, // Simplificação
        mostActiveLink,
        activeUsersCount: activeUsers?.total || 0
      });
    }

    if (pathname === '/api/analytics/details') {
      const userId = url.searchParams.get('userId');
      const linkId = url.searchParams.get('linkId');
      const period = url.searchParams.get('period') || '30d';
      const isAdmin = url.searchParams.get('isAdmin') === 'true';

      // Montar filtro de período SQL
      let dateFilter = ' ';
      if (period === 'today') {
        dateFilter = 'AND date(c.clicked_at) = date("now")';
      } else if (period === 'yesterday') {
        dateFilter = 'AND date(c.clicked_at) = date("now", "-1 day")';
      } else if (period === '7d') {
        dateFilter = 'AND c.clicked_at >= datetime("now", "-7 days")';
      } else if (period === '30d') {
        dateFilter = 'AND c.clicked_at >= datetime("now", "-30 days")';
      } else if (period === '90d') {
        dateFilter = 'AND c.clicked_at >= datetime("now", "-90 days")';
      }

      // Função para agrupar campos
      const groupData = async (field: string) => {
        let query = `SELECT c.${field} as label, COUNT(c.id) as value FROM clicks c JOIN links l ON c.link_id = l.id WHERE l.deleted_at IS NULL ${dateFilter} `;
        if (linkId) {
          query += 'AND c.link_id = ? ';
        } else if (!isAdmin && userId) {
          query += 'AND l.user_id = ? ';
        }
        query += `GROUP BY c.${field} ORDER BY value DESC LIMIT 8`;

        const stmt = linkId 
          ? env.DB.prepare(query).bind(linkId)
          : env.DB.prepare(query).bind(userId || '');

        const { results } = await stmt.all();
        return results;
      };

      // Evolução no tempo (Agrupar cliques por dia formatado)
      let timeQuery = 'SELECT strftime("%d/%m", c.clicked_at) as label, COUNT(c.id) as value FROM clicks c JOIN links l ON c.link_id = l.id WHERE l.deleted_at IS NULL ' + dateFilter + ' ';
      if (linkId) {
        timeQuery += 'AND c.link_id = ? ';
      } else if (!isAdmin && userId) {
        timeQuery += 'AND l.user_id = ? ';
      }
      timeQuery += 'GROUP BY label ORDER BY c.clicked_at ASC';

      const timeStmt = linkId 
        ? env.DB.prepare(timeQuery).bind(linkId)
        : env.DB.prepare(timeQuery).bind(userId || '');

      const timeData = await timeStmt.all();

      return corsResponse({
        clicksOverTime: timeData.results,
        countries: await groupData('country'),
        browsers: await groupData('browser'),
        devices: await groupData('device'),
        referrers: await groupData('referrer'),
      });
    }

    // -------------------------------------------------------------
    // CONTROLES ADMINISTRATIVOS: /api/admin/*
    // -------------------------------------------------------------
    const authUser = await getAuthUser(request, env);
    if (!authUser || authUser.role !== 'admin') {
      // Bloquear se não for admin nos endpoints restritos
      if (pathname.startsWith('/api/admin/')) {
        return corsResponse({ message: 'Não autorizado. Apenas administradores.' }, 43);
      }
    } else {
      // Operações de Administração
      if (pathname === '/api/admin/users' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
        return corsResponse(results);
      }

      if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/status') && method === 'POST') {
        const userId = pathname.split('/')[4];
        const { status } = await request.json<any>();
        
        await env.DB.prepare('UPDATE users SET status = ? WHERE id = ?').bind(status, userId).run();

        const logId = `log_${crypto.randomUUID()}`;
        await env.DB.prepare(
          'INSERT INTO audit_logs (id, user_id, action, target_type, target_id, ip_address, created_at) VALUES (?, ?, "TOGGLE_USER_STATUS", "USER", ?, ?, datetime("now"))'
        ).bind(logId, authUser.id, userId, request.headers.get('CF-Connecting-IP') || '127.0.0.1').run();

        return corsResponse({ success: true });
      }

      if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/plan') && method === 'POST') {
        const userId = pathname.split('/')[4];
        const { plan } = await request.json<any>();
        
        await env.DB.prepare('UPDATE users SET plan = ? WHERE id = ?').bind(plan, userId).run();

        const logId = `log_${crypto.randomUUID()}`;
        await env.DB.prepare(
          'INSERT INTO audit_logs (id, user_id, action, target_type, target_id, ip_address, created_at) VALUES (?, ?, "TOGGLE_USER_PLAN", "USER", ?, ?, datetime("now"))'
        ).bind(logId, authUser.id, `${userId}:${plan}`, request.headers.get('CF-Connecting-IP') || '127.0.0.1').run();

        return corsResponse({ success: true });
      }

      if (pathname === '/api/admin/links' && method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT l.*, COUNT(c.id) as clicksCount, MAX(c.clicked_at) as lastClickedAt FROM links l LEFT JOIN clicks c ON l.id = c.link_id GROUP BY l.id ORDER BY l.created_at DESC'
        ).all();
        return corsResponse(results);
      }

      if (pathname === '/api/admin/audit-logs' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
        return corsResponse(results);
      }
    }

    return corsResponse({ message: 'Método ou Rota não encontrada' }, 404);
  }
};
