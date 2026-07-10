/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project-id.supabase.co');

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!hasSupabaseConfig) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
    }
  }

  return supabaseInstance;
}

// SQL Script generator for the user's Supabase dashboard
export const SUPABASE_SQL_SETUP = `-- SCRIPT DE MIGRAÇÃO SUPABASE
-- Execute este script no SQL Editor do seu projeto do Supabase para criar as tabelas.

-- 1. Criar tabela de Categorias
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE
);

-- 2. Criar tabela de Produtos
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(100) NOT NULL REFERENCES categorias(nome) ON UPDATE CASCADE,
  preco DECIMAL(10,2) NOT NULL,
  imagem TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  ordem INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Criar tabela de Clientes (Opcional, pois salvamos dados na sessão)
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  quiosque VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Criar tabela de Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nome VARCHAR(255) NOT NULL,
  quiosque VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'Recebido' NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  taxa_servico DECIMAL(10,2) NOT NULL,
  valor_final DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Criar tabela de Itens do Pedido
CREATE TABLE IF NOT EXISTS pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id VARCHAR(100) NOT NULL,
  produto_nome VARCHAR(255) NOT NULL,
  quantidade INT NOT NULL,
  valor DECIMAL(10,2) NOT NULL
);

-- 6. Configurar Segurança de Nível de Linha (RLS - Row Level Security)
-- Por padrão, como este é um sistema aberto de quiosque, ativamos acesso público de leitura e escrita.
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;

-- Políticas Públicas (Acesso livre para fins de demonstração simplificada)
CREATE POLICY "Acesso público categorias" ON categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público produtos" ON produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público pedidos" ON pedidos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público pedido_itens" ON pedido_itens FOR ALL USING (true) WITH CHECK (true);

-- 7. Inserir Categorias Padrão
INSERT INTO categorias (nome) VALUES 
  ('Bebidas'), 
  ('Drinks'), 
  ('Porções'), 
  ('Lanches'), 
  ('Sobremesas')
ON CONFLICT (nome) DO NOTHING;

-- 8. Inserir Produtos Iniciais de Amostra
INSERT INTO produtos (nome, descricao, categoria, preco, imagem, ativo, ordem) VALUES 
  ('Água de Coco Natural', 'Gelada e colhida na hora, direto da fruta.', 'Bebidas', 10.00, 'https://images.unsplash.com/photo-1525385133375-80955641da08?w=600&auto=format&fit=crop&q=80', true, 1),
  ('Caipirinha de Limão Tradicional', 'Feita com cachaça artesanal de alambique, limão taiti fresco e gelo.', 'Drinks', 22.00, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80', true, 2),
  ('Porção Isca de Peixe Crocante', 'Filé de pescada em tiras, empanado na farinha panko. Acompanha molho tártaro.', 'Porções', 65.00, 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop&q=80', true, 3),
  ('Camarão ao Alho e Óleo', 'Camarões médios grelhados com bastante alho dourado e azeite extra virgem.', 'Porções', 85.00, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80', true, 4)
ON CONFLICT DO NOTHING;
`;
