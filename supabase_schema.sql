-- ========================================================
-- ESQUEMA DE BANCO DE DADOS POSTGRESQL PARA O SUPABASE
-- Execute este script no "SQL Editor" do seu painel Supabase
-- ========================================================

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY, -- ID do usuário (ex: usr_admin, ou UUID do Supabase Auth)
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user', -- 'user', 'admin'
    plan TEXT NOT NULL DEFAULT 'free', -- 'free', 'pro', 'enterprise'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'blocked'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE LINKS ENCURTADOS
CREATE TABLE IF NOT EXISTS public.links (
    id TEXT PRIMARY KEY, -- ID único do link
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    original_url TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    password TEXT, -- Senha opcional
    expires_at TIMESTAMP WITH TIME ZONE, -- Data de expiração
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- Soft delete (recuperação de 30 dias)
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'disabled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE CLIQUES (ANALYTICS)
CREATE TABLE IF NOT EXISTS public.clicks (
    id TEXT PRIMARY KEY,
    link_id TEXT REFERENCES public.links(id) ON DELETE CASCADE NOT NULL,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    country TEXT NOT NULL DEFAULT 'Outro',
    city TEXT NOT NULL DEFAULT 'Outra',
    browser TEXT NOT NULL DEFAULT 'Outro',
    os TEXT NOT NULL DEFAULT 'Outro',
    device TEXT NOT NULL DEFAULT 'Desktop',
    referrer TEXT NOT NULL DEFAULT 'Direto'
);

-- 4. TABELA DE LOGS DE AUDITORIA
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. HABILITAR SEGURANÇA E ACESSOS (RLS - Row Level Security se desejar, por padrão habilitamos leitura geral para anonimo)
-- Nota: Para simplificar, as políticas anon/authenticated públicas podem ser ativadas no Supabase.
-- Por padrão, garantimos permissões simples:
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso amplo e simplificado (Select/Insert para usuários anon/autenticados)
CREATE POLICY "Permitir leitura geral de usuários" ON public.users FOR SELECT USING (true);
CREATE POLICY "Permitir criação geral de usuários" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update geral de usuários" ON public.users FOR UPDATE USING (true);

CREATE POLICY "Permitir leitura geral de links" ON public.links FOR SELECT USING (true);
CREATE POLICY "Permitir criação geral de links" ON public.links FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update geral de links" ON public.links FOR UPDATE USING (true);

CREATE POLICY "Permitir leitura geral de cliques" ON public.clicks FOR SELECT USING (true);
CREATE POLICY "Permitir inserção geral de cliques" ON public.clicks FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir inserção geral de logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura de logs para admin" ON public.audit_logs FOR SELECT USING (true);
