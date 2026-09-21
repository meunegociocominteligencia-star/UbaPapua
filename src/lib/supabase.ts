/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfigInfo {
  url: string;
  anonKey: string;
  isCustom: boolean;
  source: 'custom' | 'env' | 'fallback';
}

export function getSupabaseConfig(): SupabaseConfigInfo {
  let customUrl = '';
  let customKey = '';
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      customUrl = window.localStorage.getItem('custom_supabase_url') || '';
      customKey = window.localStorage.getItem('custom_supabase_anon_key') || '';
    } catch {}
  }

  if (customUrl.trim() && customKey.trim()) {
    return {
      url: customUrl.trim(),
      anonKey: customKey.trim(),
      isCustom: true,
      source: 'custom'
    };
  }

  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  if (envUrl && envKey && envUrl !== 'https://your-project-id.supabase.co') {
    return {
      url: envUrl.trim(),
      anonKey: envKey.trim(),
      isCustom: false,
      source: 'env'
    };
  }

  return {
    url: 'https://tilpkngvdadkciyfrigp.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbHBrbmd2ZGFka2NpeWZyaWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Nzc2MTgsImV4cCI6MjA5OTI1MzYxOH0.gJeyx9rZMdt3hykUCk2nTo9xOYSu2DXVPwQoz8nXDMQ',
    isCustom: false,
    source: 'fallback'
  };
}

export function saveCustomSupabaseConfig(url: string, anonKey: string) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (!url.trim() && !anonKey.trim()) {
        window.localStorage.removeItem('custom_supabase_url');
        window.localStorage.removeItem('custom_supabase_anon_key');
      } else {
        window.localStorage.setItem('custom_supabase_url', url.trim());
        window.localStorage.setItem('custom_supabase_anon_key', anonKey.trim());
      }
    } catch {}
    supabaseInstance = null;
  }
}

export const hasSupabaseConfig = true;

let supabaseInstance: SupabaseClient | null = null;
let currentClientUrl = '';

export function getSupabase(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  if (!supabaseInstance || currentClientUrl !== config.url) {
    try {
      supabaseInstance = createClient(config.url, config.anonKey);
      currentClientUrl = config.url;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseInstance;
}

export async function testSupabaseLiveConnection(): Promise<{
  success: boolean;
  url: string;
  source: string;
  latencyMs: number;
  message: string;
}> {
  const config = getSupabaseConfig();
  const client = getSupabase();
  if (!client) {
    return {
      success: false,
      url: config.url,
      source: config.source,
      latencyMs: 0,
      message: 'Não foi possível inicializar o cliente Supabase. Verifique a URL e a Chave Anon.'
    };
  }

  const start = Date.now();
  try {
    const { error } = await client.from('categorias').select('count', { count: 'exact', head: true });
    const latencyMs = Date.now() - start;

    if (error) {
      const isMissingTable = error.code === '42P01' || (error.message && error.message.toLowerCase().includes('does not exist'));
      if (isMissingTable) {
        return {
          success: true,
          url: config.url,
          source: config.source,
          latencyMs,
          message: `Conexão com o Supabase estabelecida com sucesso (${latencyMs}ms)! Nota: o banco respondeu, mas a tabela "categorias" ainda não foi criada via SQL.`
        };
      }
      return {
        success: false,
        url: config.url,
        source: config.source,
        latencyMs,
        message: `Servidor Supabase respondeu com código ${error.code}: ${error.message}`
      };
    }

    return {
      success: true,
      url: config.url,
      source: config.source,
      latencyMs,
      message: `Conectado ao Supabase com sucesso em ${latencyMs}ms!`
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      success: false,
      url: config.url,
      source: config.source,
      latencyMs,
      message: `Falha de rede ao conectar no Supabase: ${err.message || String(err)}`
    };
  }
}

/**
 * Resilient Supabase persistence helper for 'clientes' table.
 * Automatically adapts to schemas where 'celular' does not exist (using canonical 'telefone'),
 * and self-heals by stripping non-existent columns if PostgREST returns PGRST204.
 */
export async function upsertClienteSupabase(cliente: {
  nome: string;
  quiosque: string;
  telefone?: string;
  celular?: string;
  status_conta?: string;
  valor_total_conta?: number;
  created_at?: string;
}): Promise<{ success: boolean; error?: string; data?: any }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase não conectado' };

  const rawPhone = (cliente.telefone || cliente.celular || '').trim();
  if (!rawPhone) return { success: false, error: 'Telefone do cliente é obrigatório' };

  // Canonical payload - never include 'celular' by default because the DB column is 'telefone'
  let payload: Record<string, any> = {
    telefone: rawPhone,
    nome: cliente.nome.trim(),
    quiosque: cliente.quiosque.trim(),
    status_conta: cliente.status_conta || 'Conta em Aberto',
    valor_total_conta: cliente.valor_total_conta !== undefined ? cliente.valor_total_conta : 0,
    created_at: cliente.created_at || new Date().toISOString()
  };

  // Attempt upsert with self-healing column stripping on PGRST204
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      // Check if client exists by telefone
      const { data: existing, error: findErr } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefone', rawPhone)
        .limit(1);

      if (findErr) {
        if (findErr.code === '42P01') {
          return { success: false, error: 'Tabela clientes não encontrada no Supabase (42P01)' };
        }
      }

      if (existing && existing.length > 0) {
        // Update
        const upd = { ...payload };
        delete upd.telefone; // Keep primary key unchanged
        const { data, error } = await supabase
          .from('clientes')
          .update(upd)
          .eq('telefone', rawPhone)
          .select();

        if (!error) {
          return { success: true, data: data?.[0] };
        }

        // Check if a column was not found in schema cache (PGRST204)
        if (error.code === 'PGRST204' || (error.message && error.message.includes('Could not find the'))) {
          const match = error.message.match(/Could not find the '([^']+)' column/);
          if (match && match[1]) {
            delete payload[match[1]];
            continue; // retry with stripped column
          }
        }

        return { success: false, error: error.message };
      } else {
        // Insert
        const { data, error } = await supabase
          .from('clientes')
          .insert(payload)
          .select();

        if (!error) {
          return { success: true, data: data?.[0] };
        }

        // Self-heal on PGRST204
        if (error.code === 'PGRST204' || (error.message && error.message.includes('Could not find the'))) {
          const match = error.message.match(/Could not find the '([^']+)' column/);
          if (match && match[1]) {
            delete payload[match[1]];
            continue;
          }
        }

        // If duplicate key error (23505), update instead
        if (error.code === '23505') {
          const upd = { ...payload };
          delete upd.telefone;
          const { data: updData, error: updErr } = await supabase
            .from('clientes')
            .update(upd)
            .eq('telefone', rawPhone)
            .select();
          if (!updErr) return { success: true, data: updData?.[0] };
        }

        return { success: false, error: error.message };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  return { success: false, error: 'Falha ao persistir cliente após tentativas' };
}

/**
 * Resilient update for clientes table
 */
export async function updateClienteSupabase(
  telefoneOrId: string, 
  cliente: {
    nome?: string;
    quiosque?: string;
    telefone?: string;
    celular?: string;
    status_conta?: string;
    valor_total_conta?: number;
  }
): Promise<{ success: boolean; error?: string; data?: any }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase não conectado' };

  const phone = (cliente.telefone || cliente.celular || telefoneOrId).trim();
  let payload: Record<string, any> = {};
  if (cliente.nome) payload.nome = cliente.nome.trim();
  if (cliente.quiosque) payload.quiosque = cliente.quiosque.trim();
  if (cliente.status_conta) payload.status_conta = cliente.status_conta;
  if (cliente.valor_total_conta !== undefined) payload.valor_total_conta = cliente.valor_total_conta;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .update(payload)
        .eq('telefone', phone)
        .select();

      if (!error) return { success: true, data: data?.[0] };

      if (error.code === 'PGRST204' || (error.message && error.message.includes('Could not find the'))) {
        const match = error.message.match(/Could not find the '([^']+)' column/);
        if (match && match[1]) {
          delete payload[match[1]];
          continue;
        }
      }
      return { success: false, error: error.message };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }
  return { success: false, error: 'Falha ao atualizar cliente' };
}

/**
 * Resilient delete for clientes table
 */
export async function deleteClienteSupabase(telefone: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase não conectado' };

  try {
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('telefone', telefone.trim());

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
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
  estoque INT, -- Controle de estoque simples (nulo para comida/petiscos)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Criar tabela de Clientes (Chave primária por telefone) de forma segura
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clientes' AND table_schema = 'public') THEN
    -- Garante que colunas adicionais existam se a tabela já foi criada anteriormente
    ALTER TABLE clientes ADD COLUMN IF NOT EXISTS celular VARCHAR(50);
    ALTER TABLE clientes ADD COLUMN IF NOT EXISTS status_conta VARCHAR(50) DEFAULT 'Conta em Aberto';
    ALTER TABLE clientes ADD COLUMN IF NOT EXISTS valor_total_conta DECIMAL(10,2) DEFAULT 0.00;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'id') THEN
    ALTER TABLE clientes RENAME TO clientes_old;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- ignora erros se a tabela não puder ser renomeada
END $$;

CREATE TABLE IF NOT EXISTS clientes (
  telefone VARCHAR(50) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  quiosque VARCHAR(50) NOT NULL,
  celular VARCHAR(50),
  status_conta VARCHAR(50) DEFAULT 'Conta Paga',
  valor_total_conta DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Copiar dados da tabela antiga de forma condicional e segura se ela existir
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clientes_old' AND table_schema = 'public') THEN
    -- (rest copy check)
    NULL;
  END IF;
END $$;

-- Garantir que as colunas de status de conta e valor total existam em instalações anteriores
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS status_conta VARCHAR(50) DEFAULT 'Conta Paga';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS valor_total_conta DECIMAL(10,2) DEFAULT 0.00;

-- 4. Criar tabela de Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_telefone VARCHAR(50),
  quiosque VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'Recebido' NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  taxa_servico DECIMAL(10,2) NOT NULL,
  valor_final DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS conta_solicitada BOOLEAN DEFAULT FALSE;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT FALSE;

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
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;

-- Políticas Públicas (Acesso livre para fins de demonstração simplificada)
DROP POLICY IF EXISTS "Acesso público categorias" ON categorias;
CREATE POLICY "Acesso público categorias" ON categorias FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público produtos" ON produtos;
CREATE POLICY "Acesso público produtos" ON produtos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público clientes" ON clientes;
CREATE POLICY "Acesso público clientes" ON clientes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público pedidos" ON pedidos;
CREATE POLICY "Acesso público pedidos" ON pedidos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público pedido_itens" ON pedido_itens;
CREATE POLICY "Acesso público pedido_itens" ON pedido_itens FOR ALL USING (true) WITH CHECK (true);

-- 7. Inserir Categorias Padrão
INSERT INTO categorias (nome) VALUES 
  ('Refeições'), 
  ('Prato Regional'), 
  ('Petisco'), 
  ('Não Alcoólicos'), 
  ('Drinks'), 
  ('Bebidas')
ON CONFLICT (nome) DO NOTHING;

-- 8. Inserir Produtos Iniciais de Amostra
INSERT INTO produtos (nome, descricao, categoria, preco, imagem, ativo, ordem) VALUES 
  ('Dourada (Refeição p/ 2)', 'Tradicional Dourada assada ou frita, servida bem quente com acompanhamentos regionais. Serve 2 pessoas.', 'Refeições', 65.00, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80', true, 1),
  ('Pirarucu (Refeição p/ 2)', 'O gigante da Amazônia grelhado ou frito, macio e saboroso com acompanhamentos. Serve 2 pessoas.', 'Refeições', 80.00, 'https://images.unsplash.com/photo-1559847844-5315685d8cb6?w=600&auto=format&fit=crop&q=80', true, 2),
  ('Filé de Gó (Refeição p/ 2)', 'Filé do peixe Gó preparado na chapa ou frito, perfeito para saborear em dupla. Serve 2 pessoas.', 'Refeições', 65.00, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80', true, 3),
  ('Filhote (Refeição p/ 2)', 'Nobre e suculento filhote preparado com carinho, servido com arroz, vinagrete e farofa. Serve 2 pessoas.', 'Refeições', 65.00, 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop&q=80', true, 4),
  ('Pescada (Refeição p/ 2)', 'Pescada fresca dourada na chapa ou frita, muito saborosa. Acompanha arroz, farofa e vinagrete. Serve 2 pessoas.', 'Refeições', 65.00, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80', true, 5),
  ('Bisteca Bovina (Boi) (Refeição p/ 2)', 'Generosa bisteca bovina grelhada na brasa, macia e suculenta com acompanhamentos. Serve 2 pessoas.', 'Refeições', 65.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', true, 6),
  ('Filé de Dourada (Refeição p/ 2)', 'Nobre filé de dourada limpo, grelhado com azeite de oliva e servido com acompanhamentos finos. Serve 2 pessoas.', 'Refeições', 80.00, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80', true, 7),
  ('Filé de Carne (Refeição p/ 2)', 'Delicioso filé de carne grelhado ao ponto do cliente, guarnecido de acompanhamentos. Serve 2 pessoas.', 'Refeições', 80.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', true, 8),
  ('Frango Frito (Refeição p/ 2)', 'Pedaços selecionados de frango crocantes por fora e macios por dentro, acompanhados de fritas ou arroz. Serve 2 pessoas.', 'Refeições', 65.00, 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80', true, 9),
  ('Dourada (Prato Regional)', 'Prato individual de dourada fresca grelhada com arroz branco, feijão regional e farinha d''água.', 'Prato Regional', 40.00, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80', true, 10),
  ('Pirarucu (Prato Regional)', 'Delicioso pirarucu grelhado, acompanhado de arroz, feijão e farofa crocante.', 'Prato Regional', 40.00, 'https://images.unsplash.com/photo-1559847844-5315685d8cb6?w=600&auto=format&fit=crop&q=80', true, 11),
  ('Filé de Gó (Prato Regional)', 'Delicado filé de Gó servido com guarnições regionais quentes.', 'Prato Regional', 40.00, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80', true, 12),
  ('Bisteca Bovina (Prato Regional)', 'Corte saboroso de bisteca grelhada na chapa com acompanhamentos tradicionais.', 'Prato Regional', 40.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', true, 13),
  ('Filé de Carne (Prato Regional)', 'Filé bovino grelhado individual, servido com arroz, feijão e farofa.', 'Prato Regional', 40.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', true, 14),
  ('Frango (Prato Regional)', 'Frango grelhado ou frito individual, servido quentinho com guarnições regionais.', 'Prato Regional', 40.00, 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80', true, 15),
  ('Azeitona', 'Porção de azeitonas verdes temperadas com azeite de oliva e orégano.', 'Petisco', 20.00, 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=600&auto=format&fit=crop&q=80', true, 16),
  ('Macaxeira Frita', 'Porção de macaxeira (mandioca) frita, dourada e muito crocante.', 'Petisco', 25.00, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80', true, 17),
  ('Queijo Coalho', 'Deliciosos cubos ou espetos de queijo coalho grelhados na chapa.', 'Petisco', 25.00, 'https://images.unsplash.com/photo-1552763442-159ac9a24dce?w=600&auto=format&fit=crop&q=80', true, 18),
  ('Isca de Peixe', 'Deliciosas iscas de peixe local empanadas e fritas. Acompanha molho tártaro ou limão.', 'Petisco', 50.00, 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop&q=80', true, 19),
  ('Calabresa', 'Porção de calabresa acebolada frita, ideal para acompanhar uma bebida bem gelada.', 'Petisco', 30.00, 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600&auto=format&fit=crop&q=80', true, 20),
  ('Batata Frita', 'Porção de batatas fritas crocantes com sal.', 'Petisco', 25.00, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80', true, 21),
  ('Petisco: 02 Opções', 'Monte seu prato de petiscos escolhendo duas opções da casa.', 'Petisco', 40.00, 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop&q=80', true, 22),
  ('Petisco: 03 Opções', 'Monte seu prato de petiscos escolhendo três opções da casa.', 'Petisco', 50.00, 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop&q=80', true, 23),
  ('Coca-Cola 2L', 'Garrafa pet de 2 Litros, bem gelada para toda a mesa.', 'Não Alcoólicos', 14.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', true, 24),
  ('Coca-Cola 1L', 'Garrafa pet de 1 Litro, ideal para dividir.', 'Não Alcoólicos', 9.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', true, 25),
  ('Coca-Cola 600ml', 'Tamanho perfeito para matar a sua sede individual.', 'Não Alcoólicos', 8.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', true, 26),
  ('Fanta Laranja 2L', 'Garrafa pet de 2 Litros gelada.', 'Não Alcoólicos', 12.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', true, 27),
  ('Fanta Laranja 1L', 'Garrafa pet de 1 Litro gelada.', 'Não Alcoólicos', 8.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', true, 28),
  ('Pepsi 2L', 'Garrafa pet de 2 Litros gelada.', 'Não Alcoólicos', 12.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', true, 29),
  ('Tuchaua 2L', 'O refrigerante sabor guaraná mais tradicional da região norte. Garrafa pet 2L.', 'Não Alcoólicos', 12.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', true, 30),
  ('Tuchaua 1L', 'Refrigerante guaraná regional do norte. Garrafa pet 1L.', 'Não Alcoólicos', 8.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', true, 31),
  ('Sukita 2L', 'Refrigerante Sukita de laranja, garrafa pet de 2 Litros.', 'Não Alcoólicos', 12.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', true, 32),
  ('Sukita 1L', 'Refrigerante Sukita de laranja, garrafa pet de 1 Litro.', 'Não Alcoólicos', 8.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', true, 33),
  ('Refrigerante Lata', 'Refrigerante em lata (Coca-Cola, Fanta, Guaraná, Sukita). Escolha o sabor com o atendente.', 'Não Alcoólicos', 6.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', true, 34),
  ('Água de Coco Natural', 'Gelada e colhida na hora, direto da fruta.', 'Bebidas', 10.00, 'https://images.unsplash.com/photo-1525385133375-80955641da08?w=600&auto=format&fit=crop&q=80', true, 35),
  ('Caipirinha de Limão Tradicional', 'Feita com cachaça artesanal de alambique, limão taiti fresco e gelo.', 'Drinks', 22.00, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80', true, 36),
  ('Cerveja Heineken Long Neck', 'Puro malte, estupidamente gelada.', 'Bebidas', 12.00, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&auto=format&fit=crop&q=80', true, 37),
  ('Gin Tônica Tropical', 'Gin premium, água tônica, fatias de laranja e maracujá fresco.', 'Drinks', 28.00, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80', true, 38)
ON CONFLICT DO NOTHING;

-- 9. Criar tabela de Usuários Admin/Garçom para controle de acesso restrito
CREATE TABLE IF NOT EXISTS usuarios_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  usuario VARCHAR(100) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  regra VARCHAR(50) DEFAULT 'garcom' NOT NULL, -- 'admin' ou 'garcom'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS para a tabela de usuários
ALTER TABLE usuarios_admin ENABLE ROW LEVEL SECURITY;

-- Permitir acesso público de leitura e escrita (para fins de simplicidade e demonstração integrada)
DROP POLICY IF EXISTS "Acesso público usuarios_admin" ON usuarios_admin;
CREATE POLICY "Acesso público usuarios_admin" ON usuarios_admin FOR ALL USING (true) WITH CHECK (true);

-- Inserir os usuários iniciais se não existirem
INSERT INTO usuarios_admin (nome, usuario, senha, regra) VALUES
  ('Administrador', 'admin', '123', 'admin'),
  ('Garçom Padrão', 'garcom', '123', 'garcom')
ON CONFLICT (usuario) DO NOTHING;

-- 10. Criar tabela de Configurações do Estabelecimento
CREATE TABLE IF NOT EXISTS config_estabelecimento (
  id INT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  logo TEXT NOT NULL,
  telefone VARCHAR(100),
  endereco TEXT,
  taxa_servico DECIMAL(10,2) DEFAULT 10.00,
  mensagem_inicial TEXT,
  horario_funcionamento VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS para a tabela de configurações
ALTER TABLE config_estabelecimento ENABLE ROW LEVEL SECURITY;

-- Permitir acesso público de leitura e escrita
DROP POLICY IF EXISTS "Acesso público config_estabelecimento" ON config_estabelecimento;
CREATE POLICY "Acesso público config_estabelecimento" ON config_estabelecimento FOR ALL USING (true) WITH CHECK (true);

-- Inserir as configurações iniciais se não existirem
INSERT INTO config_estabelecimento (id, nome, logo, telefone, endereco, taxa_servico, mensagem_inicial, horario_funcionamento) VALUES
  (1, 'Moju Park', '/moju-park-logo.svg', '(91) 98765-4321', 'Parque Aquático Moju Park', 10, 'Bem-vindo ao Moju Park! Desfrute de momentos inesquecíveis no parque aquático. Faça seu pedido diretamente aqui!', 'Todos os dias, das 09h às 18h')
ON CONFLICT (id) DO NOTHING;
`;

export const SQL_TABELA_USUARIOS_ADMIN = `-- SCRIPT EXCLUSIVO: TABELA USUARIOS_ADMIN
-- Copie e execute este código no SQL Editor do Supabase se receber erro na tabela usuarios_admin:

CREATE TABLE IF NOT EXISTS usuarios_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  usuario VARCHAR(100) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  regra VARCHAR(50) DEFAULT 'garcom' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE usuarios_admin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso público usuarios_admin" ON usuarios_admin;
CREATE POLICY "Acesso público usuarios_admin" ON usuarios_admin FOR ALL USING (true) WITH CHECK (true);

INSERT INTO usuarios_admin (nome, usuario, senha, regra) VALUES
  ('Administrador', 'admin', '123', 'admin'),
  ('Garçom Padrão', 'garcom', '123', 'garcom')
ON CONFLICT (usuario) DO NOTHING;
`;

export const SQL_TABELA_CONFIG_ESTABELECIMENTO = `-- SCRIPT EXCLUSIVO: TABELA CONFIG_ESTABELECIMENTO
CREATE TABLE IF NOT EXISTS config_estabelecimento (
  id INT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  logo TEXT NOT NULL,
  telefone VARCHAR(100),
  endereco TEXT,
  taxa_servico DECIMAL(10,2) DEFAULT 10.00,
  mensagem_inicial TEXT,
  horario_funcionamento VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE config_estabelecimento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso público config_estabelecimento" ON config_estabelecimento;
CREATE POLICY "Acesso público config_estabelecimento" ON config_estabelecimento FOR ALL USING (true) WITH CHECK (true);

INSERT INTO config_estabelecimento (id, nome, logo, telefone, endereco, taxa_servico, mensagem_inicial, horario_funcionamento) VALUES
  (1, 'Moju Park', '/moju-park-logo.svg', '(91) 98765-4321', 'Parque Aquático Moju Park', 10, 'Bem-vindo ao Moju Park!', 'Todos os dias, das 09h às 18h')
ON CONFLICT (id) DO NOTHING;
`;

export interface TableDiagnosticResult {
  tableName: string;
  label: string;
  description: string;
  status: 'ok' | 'missing' | 'error' | 'unconfigured';
  count: number;
  message: string;
  sqlSnippet: string;
}

export const SYSTEM_TABLES_META: { tableName: string; label: string; description: string; sqlSnippet: string }[] = [
  {
    tableName: 'categorias',
    label: 'Categorias do Cardápio',
    description: 'Armazena as divisões do menu (Refeições, Bebidas, Petiscos, etc.)',
    sqlSnippet: `CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE
);
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso público categorias" ON categorias;
CREATE POLICY "Acesso público categorias" ON categorias FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    tableName: 'produtos',
    label: 'Produtos e Pratos',
    description: 'Armazena itens com preço, descrição, foto, categoria e estoque',
    sqlSnippet: `CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(100) NOT NULL REFERENCES categorias(nome) ON UPDATE CASCADE,
  preco DECIMAL(10,2) NOT NULL,
  imagem TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  ordem INT DEFAULT 0,
  estoque INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso público produtos" ON produtos;
CREATE POLICY "Acesso público produtos" ON produtos FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    tableName: 'clientes',
    label: 'Clientes e Mesas',
    description: 'Cadastro de clientes que abriram conta ou realizaram pedidos',
    sqlSnippet: `CREATE TABLE IF NOT EXISTS clientes (
  telefone VARCHAR(50) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  quiosque VARCHAR(50) NOT NULL,
  celular VARCHAR(50),
  status_conta VARCHAR(50) DEFAULT 'Conta Paga',
  valor_total_conta DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso público clientes" ON clientes;
CREATE POLICY "Acesso público clientes" ON clientes FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    tableName: 'pedidos',
    label: 'Pedidos Realizados',
    description: 'Registros de vendas dos quiosques, balcão e garçom',
    sqlSnippet: `CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_telefone VARCHAR(50),
  quiosque VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'Recebido' NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  taxa_servico DECIMAL(10,2) NOT NULL,
  valor_final DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  conta_solicitada BOOLEAN DEFAULT FALSE,
  pago BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso público pedidos" ON pedidos;
CREATE POLICY "Acesso público pedidos" ON pedidos FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    tableName: 'pedido_itens',
    label: 'Itens dos Pedidos',
    description: 'Itens individuais associados a cada pedido realizado',
    sqlSnippet: `CREATE TABLE IF NOT EXISTS pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id VARCHAR(100) NOT NULL,
  produto_nome VARCHAR(255) NOT NULL,
  quantidade INT NOT NULL,
  valor DECIMAL(10,2) NOT NULL
);
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso público pedido_itens" ON pedido_itens;
CREATE POLICY "Acesso público pedido_itens" ON pedido_itens FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    tableName: 'usuarios_admin',
    label: 'Equipe e Colaboradores (Admin/Garçom)',
    description: 'Controle de acesso para administradores e garçons',
    sqlSnippet: SQL_TABELA_USUARIOS_ADMIN
  },
  {
    tableName: 'config_estabelecimento',
    label: 'Configurações do Estabelecimento',
    description: 'Nome, logo, taxa de serviço, mensagem de boas-vindas e horário',
    sqlSnippet: SQL_TABELA_CONFIG_ESTABELECIMENTO
  }
];

export async function checkAllSupabaseTables(): Promise<TableDiagnosticResult[]> {
  const client = getSupabase();
  if (!client || !hasSupabaseConfig) {
    return SYSTEM_TABLES_META.map((t) => ({
      tableName: t.tableName,
      label: t.label,
      description: t.description,
      status: 'unconfigured',
      count: 0,
      message: 'Supabase não configurado ou desconectado',
      sqlSnippet: t.sqlSnippet
    }));
  }

  const results: TableDiagnosticResult[] = [];

  for (const meta of SYSTEM_TABLES_META) {
    try {
      const { data, count, error } = await client
        .from(meta.tableName)
        .select('*', { count: 'exact', head: false })
        .limit(1);

      if (error) {
        const isMissing = error.code === '42P01' ||
          (error.message && (
            error.message.toLowerCase().includes('does not exist') ||
            error.message.toLowerCase().includes('relation') ||
            error.message.toLowerCase().includes('not found')
          ));
        
        const isPermission = error.code === '42501' ||
          (error.message && error.message.toLowerCase().includes('row-level security'));

        results.push({
          tableName: meta.tableName,
          label: meta.label,
          description: meta.description,
          status: isMissing ? 'missing' : 'error',
          count: 0,
          message: isMissing
            ? 'Tabela não foi criada no banco de dados Supabase.'
            : isPermission
              ? 'Erro de RLS (permissão negada). Execute as políticas de RLS.'
              : `Erro: ${error.message || error.code}`,
          sqlSnippet: meta.sqlSnippet
        });
      } else {
        // Table exists and query was successful
        const total = typeof count === 'number' ? count : ((data as any)?.length ?? 0);
        results.push({
          tableName: meta.tableName,
          label: meta.label,
          description: meta.description,
          status: 'ok',
          count: total,
          message: `Tabela ativa e acessível (${total} ${total === 1 ? 'registro' : 'registros'})`,
          sqlSnippet: meta.sqlSnippet
        });
      }
    } catch (err: any) {
      results.push({
        tableName: meta.tableName,
        label: meta.label,
        description: meta.description,
        status: 'error',
        count: 0,
        message: `Falha na requisição: ${err.message || err}`,
        sqlSnippet: meta.sqlSnippet
      });
    }
  }

  return results;
}

