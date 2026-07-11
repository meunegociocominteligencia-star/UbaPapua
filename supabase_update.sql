-- =====================================================================
-- 1. ADICIONAR CAMPO TELEFONE NA TABELA CLIENTES (MIGRAÇÃO)
-- =====================================================================
-- Este script adiciona a coluna 'telefone' à tabela 'clientes' caso ela não exista.
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefone VARCHAR(50);

-- =====================================================================
-- 2. ADICIONAR CAMPO ESTOQUE NA TABELA PRODUTOS (MIGRAÇÃO)
-- =====================================================================
-- Este script adiciona a coluna 'estoque' à tabela 'produtos' caso ela não exista.
-- Itens de comida/petiscos terão 'estoque' como NULL (sem controle de estoque).
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS estoque INT;

-- =====================================================================
-- 3. VERIFICAR DADOS DUPLICADOS NOS PRODUTOS (VERIFICAÇÃO)
-- =====================================================================
-- Este script identifica produtos duplicados agrupando por nome e categoria.
-- Ele exibe a quantidade de repetições de cada produto.
SELECT nome, categoria, COUNT(*), array_agg(id) as ids_duplicados
FROM produtos
GROUP BY nome, categoria
HAVING COUNT(*) > 1;

-- =====================================================================
-- SCRIPT COMPLEMENTAR: REMOVER DUPLICADOS MANTENDO APENAS O MAIS RECENTE
-- =====================================================================
-- Caso existam duplicados e você queira remover deixando apenas o primeiro registrado:
-- DELETE FROM produtos a USING produtos b
-- WHERE a.id > b.id 
--   AND a.nome = b.nome 
--   AND a.categoria = b.categoria;
