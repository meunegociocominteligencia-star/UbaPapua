# 🌊 Quiosque Bella Costa - Cardápio Digital & Pedidos Inteligentes

Um sistema completo, moderno e de alta performance projetado especificamente para quiosques, bares de praia e restaurantes à beira-mar. O projeto oferece um cardápio digital elegante para clientes enviarem pedidos diretamente de seus celulares e uma área administrativa unificada com atualizações em tempo real e suporte robusto para funcionamento **100% Offline** (Modo PWA com IndexedDB e auto-sincronização automática).

---

## ✨ Funcionalidades Principais

### 📱 Experiência do Cliente (Acesso Rápido)
- **Identificação Simplificada**: Apenas Nome e Mesa/Quiosque/Guarda-sol são necessários. Sessão persistida automaticamente.
- **Cardápio Digital Premium**: Catálogo dinâmico, dividido por categorias, com busca instantânea e carregamento otimizado de imagens.
- **Sacola de Pedidos Inteligente**: Ajustes de quantidades, taxa de serviço automática (10%) e campo de observações especiais.
- **Acompanhamento em Tempo Real**: Linha do tempo animada acompanhando o progresso (Recebido ➔ Em Preparo ➔ Pronto ➔ Entregue).

### 💼 Painel Administrativo / Garçom (Dashboard)
- **Métricas Financeiras**: Faturamento do dia, quantidade total de pedidos e contagem de itens em preparo ou entregues.
- **Gestão de Pedidos Realtime**: Notificações instantâneas de novos pedidos e alteração rápida de status de entrega.
- **CRUD Completo de Produtos**: Cadastro de novos pratos/bebidas, controle de preços, fotos e seletor de disponibilidade ("Esgotado").
- **CRUD de Categorias**: Criação e edição de novas abas de forma integrada com os produtos cadastrados.
- **Configurações Gerais**: Edição do nome do bar, emoji do logo, telefone, endereço, taxa de serviço e mensagem inicial de boas-vindas.

### 🔌 Conectividade & Resiliência (Offline-First)
- **Progressive Web App (PWA)**: Aplicativo instalável no Android, iPhone e Desktop com tela splash e carregamento otimizado.
- **Modo Offline com IndexedDB**: Se a internet cair, o cliente pode continuar escolhendo e efetuando pedidos normalmente. Os pedidos ficam guardados com segurança no banco local do navegador.
- **Sincronização Automática**: Assim que o dispositivo restabelece a conexão com a internet, os pedidos acumulados são enviados automaticamente para a cozinha.
- **Status da Rede**: Indicador visual discreto no canto da tela informando se o sistema está **Online**, **Offline** ou **Sincronizando**.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Tailwind CSS (v4), Framer Motion (`motion/react`) para transições suaves de telas e Lucide Icons.
- **Backend / Realtime**: Node.js com Express e Server-Sent Events (SSE) para comunicação em tempo real de altíssima velocidade e zero complexidade.
- **Banco de Dados Cloud**: Integração opcional direta e completa com **Supabase (PostgreSQL)** e canais de transmissão de alta fidelidade.
- **Local Persistence**: **IndexedDB** nativo e `localStorage` no cliente.

---

## 💾 Guia de Criação do Banco de Dados no Supabase

Se você deseja conectar o projeto com sua nuvem do Supabase, siga os passos abaixo:

1. Acesse o painel do seu [Supabase](https://supabase.com).
2. Crie um novo projeto.
3. No menu lateral esquerdo, vá em **SQL Editor** e clique em **New Query**.
4. Copie o script SQL abaixo e clique em **Run** para criar a estrutura completa das tabelas e políticas de RLS:

```sql
-- SCRIPT DE MIGRAÇÃO SUPABASE

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

-- 3. Criar tabela de Pedidos
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

-- 4. Criar tabela de Itens do Pedido
CREATE TABLE IF NOT EXISTS pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id VARCHAR(100) NOT NULL,
  produto_nome VARCHAR(255) NOT NULL,
  quantidade INT NOT NULL,
  valor DECIMAL(10,2) NOT NULL
);

-- 5. Ativar Segurança de Nível de Linha (RLS - Row Level Security)
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;

-- Políticas Públicas de Acesso (Ideal para demonstração rápida)
CREATE POLICY "Acesso público categorias" ON categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público produtos" ON produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público pedidos" ON pedidos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público pedido_itens" ON pedido_itens FOR ALL USING (true) WITH CHECK (true);

-- 6. Inserir Categorias Padrão
INSERT INTO categorias (nome) VALUES 
  ('Bebidas'), 
  ('Drinks'), 
  ('Porções'), 
  ('Lanches'), 
  ('Sobremesas')
ON CONFLICT (nome) DO NOTHING;

-- 7. Inserir Produtos Iniciais
INSERT INTO produtos (nome, descricao, categoria, preco, imagem, ativo, ordem) VALUES 
  ('Água de Coco Natural', 'Gelada e colhida na hora, direto da fruta.', 'Bebidas', 10.00, 'https://images.unsplash.com/photo-1525385133375-80955641da08?w=600&auto=format&fit=crop&q=80', true, 1),
  ('Caipirinha de Limão Tradicional', 'Feita com cachaça artesanal de alambique, limão taiti fresco e gelo.', 'Drinks', 22.00, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80', true, 2),
  ('Porção Isca de Peixe Crocante', 'Filé de pescada em tiras, empanado na farinha panko. Acompanha molho tártaro.', 'Porções', 65.00, 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop&q=80', true, 3),
  ('Camarão ao Alho e Óleo', 'Camarões médios grelhados com bastante alho dourado e azeite extra virgem.', 'Porções', 85.00, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80', true, 4)
ON CONFLICT DO NOTHING;
```

5. Copie as credenciais da sua API do Supabase (URL e Anon Key) e adicione-as no seu arquivo `.env` do projeto local ou no painel de configurações do ambiente de hospedagem:

```env
VITE_SUPABASE_URL="https://seu-projeto-id.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-publica-anonima"
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Ter o **Node.js** instalado (versão 18 ou superior recomendado).
- Ter o gerenciador de pacotes **npm** instalado.

### 1. Instalar as dependências do projeto:
```bash
npm install
```

### 2. Iniciar o servidor de desenvolvimento full-stack:
```bash
npm run dev
```
O servidor iniciará automaticamente na porta **3000** unificada. Acesse em `http://localhost:3000`.

### 3. Compilar o projeto para produção:
```bash
npm run build
```

---

## 🌐 Deploy na Vercel

O projeto foi preparado detalhadamente para ser implantado na **Vercel** de forma integrada (Full-Stack Express + React Vite).

1. Crie uma conta na [Vercel](https://vercel.com).
2. Conecte seu repositório de código (GitHub, GitLab, etc.).
3. Adicione suas variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas configurações da Vercel para sincronizar seu banco Supabase.
4. Clique em **Deploy** e o sistema estará online e pronto para uso mundial!
