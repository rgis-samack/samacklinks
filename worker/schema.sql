-- ==========================================
-- ESTRUTURA DE BANCO DE DADOS CLOUDFLARE D1
-- ==========================================

-- Tabela de Usuários do SaaS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user', -- 'user', 'admin'
  plan TEXT NOT NULL DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'blocked'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabela de Links Encurtados
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  original_url TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  password TEXT, -- Senha opcional para redirecionamento protegido
  expires_at TEXT, -- Data/Hora UTC de expiração
  deleted_at TEXT DEFAULT NULL, -- Suporte a lixeira e recuperação por 30 dias
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'disabled'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tabela de Clicks para Analytics Avançado
CREATE TABLE IF NOT EXISTS clicks (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  clicked_at TEXT NOT NULL DEFAULT (datetime('now')),
  country TEXT NOT NULL DEFAULT 'Outro',
  city TEXT NOT NULL DEFAULT 'Outra',
  browser TEXT NOT NULL DEFAULT 'Outro',
  os TEXT NOT NULL DEFAULT 'Outro',
  device TEXT NOT NULL DEFAULT 'Desktop',
  referrer TEXT NOT NULL DEFAULT 'Direto',
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
);

-- Tabela de Logs de Auditoria para Administradores
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
