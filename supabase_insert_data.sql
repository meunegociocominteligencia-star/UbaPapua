-- ====================================================================
-- SCRIPT DE CRIAÇÃO E INSERÇÃO DO CARDÁPIO UBÁ PAPUÁ NO SUPABASE
-- ====================================================================
-- Instruções:
-- 1. Acesse o seu painel do Supabase (https://supabase.com)
-- 2. Selecione o seu projeto e vá em "SQL Editor"
-- 3. Clique em "New query" (Nova consulta)
-- 4. Cole o conteúdo deste arquivo e clique em "Run" (Executar)
-- ====================================================================

-- 1. Criar tabela de Categorias (se não existir)
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE
);

-- 2. Criar tabela de Produtos (se não existir)
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

-- 3. Criar tabela de Clientes (se não existir)
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  quiosque VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Criar tabela de Pedidos (se não existir)
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

-- 5. Criar tabela de Itens do Pedido (se não existir)
CREATE TABLE IF NOT EXISTS pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id VARCHAR(100) NOT NULL,
  produto_nome VARCHAR(255) NOT NULL,
  quantidade INT NOT NULL,
  valor DECIMAL(10,2) NOT NULL
);

-- 6. Configurar Segurança de Nível de Linha (RLS - Row Level Security)
-- Permite leitura e escrita públicas para o sistema de quiosques de demonstração
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;

-- Remover políticas se já existirem para evitar conflitos de recriação
DROP POLICY IF EXISTS "Acesso público categorias" ON categorias;
DROP POLICY IF EXISTS "Acesso público produtos" ON produtos;
DROP POLICY IF EXISTS "Acesso público pedidos" ON pedidos;
DROP POLICY IF EXISTS "Acesso público pedido_itens" ON pedido_itens;

-- Criar as Políticas Públicas de Acesso
CREATE POLICY "Acesso público categorias" ON categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público produtos" ON produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público pedidos" ON pedidos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público pedido_itens" ON pedido_itens FOR ALL USING (true) WITH CHECK (true);


-- ====================================================================
-- POPULAR AS CATEGORIAS DO CARDÁPIO UBÁ PAPUÁ
-- ====================================================================
INSERT INTO categorias (nome) VALUES 
  ('Refeições'), 
  ('Prato Regional'), 
  ('Petisco'), 
  ('Não Alcoólicos'), 
  ('Drinks'), 
  ('Bebidas')
ON CONFLICT (nome) DO NOTHING;


-- ====================================================================
-- POPULAR OS PRODUTOS DO CARDÁPIO UBÁ PAPUÁ
-- ====================================================================
INSERT INTO produtos (nome, descricao, categoria, preco, imagem, ativo, ordem) VALUES 
  -- --- REFEIÇÕES (Serve 02 pessoas) ---
  ('Dourada (Refeição p/ 2)', 'Tradicional Dourada assada ou frita, servida bem quente com acompanhamentos regionais. Serve 2 pessoas.', 'Refeições', 65.00, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80', true, 1),
  ('Pirarucu (Refeição p/ 2)', 'O gigante da Amazônia grelhado ou frito, macio e saboroso com acompanhamentos. Serve 2 pessoas.', 'Refeições', 80.00, 'https://images.unsplash.com/photo-1559847844-5315685d8cb6?w=600&auto=format&fit=crop&q=80', true, 2),
  ('Filé de Gó (Refeição p/ 2)', 'Filé do peixe Gó preparado na chapa ou frito, perfeito para saborear em dupla. Serve 2 pessoas.', 'Refeições', 65.00, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80', true, 3),
  ('Filhote (Refeição p/ 2)', 'Nobre e suculento filhote preparado com carinho, servido com arroz, vinagrete e farofa. Serve 2 pessoas.', 'Refeições', 65.00, 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop&q=80', true, 4),
  ('Pescada (Refeição p/ 2)', 'Pescada fresca dourada na chapa ou frita, muito saborosa. Acompanha arroz, farofa e vinagrete. Serve 2 pessoas.', 'Refeições', 65.00, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80', true, 5),
  ('Bisteca Bovina (Boi) (Refeição p/ 2)', 'Generosa bisteca bovina grelhada na brasa, macia e suculenta com acompanhamentos. Serve 2 pessoas.', 'Refeições', 65.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', true, 6),
  ('Filé de Dourada (Refeição p/ 2)', 'Nobre filé de dourada limpo, grelhado com azeite de oliva e servido com acompanhamentos finos. Serve 2 pessoas.', 'Refeições', 80.00, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80', true, 7),
  ('Filé de Carne (Refeição p/ 2)', 'Delicioso filé de carne grelhado ao ponto do cliente, guarnecido de acompanhamentos. Serve 2 pessoas.', 'Refeições', 80.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', true, 8),
  ('Frango Frito (Refeição p/ 2)', 'Pedaços selecionados de frango crocantes por fora and macios por dentro, acompanhados de fritas ou arroz. Serve 2 pessoas.', 'Refeições', 65.00, 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80', true, 9),

  -- --- PRATO REGIONAL ---
  ('Dourada (Prato Regional)', 'Prato individual de dourada fresca grelhada com arroz branco, feijão regional e farinha d''água.', 'Prato Regional', 40.00, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80', true, 10),
  ('Pirarucu (Prato Regional)', 'Delicioso pirarucu grelhado, acompanhado de arroz, feijão e farofa crocante.', 'Prato Regional', 40.00, 'https://images.unsplash.com/photo-1559847844-5315685d8cb6?w=600&auto=format&fit=crop&q=80', true, 11),
  ('Filé de Gó (Prato Regional)', 'Delicado filé de Gó servido com guarnições regionais quentes.', 'Prato Regional', 40.00, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80', true, 12),
  ('Bisteca Bovina (Prato Regional)', 'Corte saboroso de bisteca grelhada na chapa com acompanhamentos tradicionais.', 'Prato Regional', 40.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', true, 13),
  ('Filé de Carne (Prato Regional)', 'Filé bovino grelhado individual, servido com arroz, feijão e farofa.', 'Prato Regional', 40.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', true, 14),
  ('Frango (Prato Regional)', 'Frango grelhado ou frito individual, servido quentinho com guarnições regionais.', 'Prato Regional', 40.00, 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80', true, 15),

  -- --- PETISCO ---
  ('Azeitona', 'Porção de azeitonas verdes temperadas com azeite de oliva e orégano.', 'Petisco', 20.00, 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=600&auto=format&fit=crop&q=80', true, 16),
  ('Macaxeira Frita', 'Porção de macaxeira (mandioca) frita, dourada e muito crocante.', 'Petisco', 25.00, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80', true, 17),
  ('Queijo Coalho', 'Deliciosos cubos ou espetos de queijo coalho grelhados na chapa.', 'Petisco', 25.00, 'https://images.unsplash.com/photo-1552763442-159ac9a24dce?w=600&auto=format&fit=crop&q=80', true, 18),
  ('Isca de Peixe', 'Deliciosas iscas de peixe local empanadas e fritas. Acompanha molho tártaro ou limão.', 'Petisco', 50.00, 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop&q=80', true, 19),
  ('Calabresa', 'Porção de calabresa acebolada frita, ideal para acompanhar uma bebida bem gelada.', 'Petisco', 30.00, 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600&auto=format&fit=crop&q=80', true, 20),
  ('Batata Frita', 'Porção de batatas fritas crocantes com sal.', 'Petisco', 25.00, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80', true, 21),
  ('Petisco: 02 Opções', 'Monte seu prato de petiscos escolhendo duas opções da casa.', 'Petisco', 40.00, 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop&q=80', true, 22),
  ('Petisco: 03 Opções', 'Monte seu prato de petiscos escolhendo três opções da casa.', 'Petisco', 50.00, 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop&q=80', true, 23),

  -- --- NÃO ALCOÓLICOS ---
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

  -- --- EXTRAS BEBIDAS & DRINKS ---
  ('Água de Coco Natural', 'Gelada e colhida na hora, direto da fruta.', 'Bebidas', 10.00, 'https://images.unsplash.com/photo-1525385133375-80955641da08?w=600&auto=format&fit=crop&q=80', true, 35),
  ('Caipirinha de Limão Tradicional', 'Feita com cachaça artesanal de alambique, limão taiti fresco e gelo.', 'Drinks', 22.00, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80', true, 36),
  ('Cerveja Heineken Long Neck', 'Puro malte, estupidamente gelada.', 'Bebidas', 12.00, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&auto=format&fit=crop&q=80', true, 37),
  ('Gin Tônica Tropical', 'Gin premium, água tônica, fatias de laranja e maracujá fresco.', 'Drinks', 28.00, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80', true, 38)
ON CONFLICT DO NOTHING;
