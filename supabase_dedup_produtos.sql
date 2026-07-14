-- =====================================================================
-- SCRIPT SQL PARA ELIMINAR PRODUTOS DUPLICADOS (SUPABASE / POSTGRESQL)
-- =====================================================================
-- Este script identifica e remove produtos duplicados na tabela 'produtos',
-- mantendo apenas um único registro para cada par de (nome, categoria).
-- Ele prioriza manter o registro mais antigo com base na coluna 'created_at'.
--
-- Instruções para execução:
-- 1. Acesse o painel do Supabase (https://supabase.com).
-- 2. Vá em "SQL Editor" no menu lateral esquerdo.
-- 3. Clique em "New query" (Nova consulta).
-- 4. Cole o conteúdo deste arquivo no editor.
-- 5. Clique em "Run" (Executar).
-- =====================================================================

-- PASSOS:

-- ---------------------------------------------------------------------
-- PASSO 1: VERIFICAR PRODUTOS DUPLICADOS (INFORMATIVO)
-- ---------------------------------------------------------------------
-- Execute esta consulta primeiro se você quiser apenas visualizar quais produtos 
-- estão duplicados e a quantidade de repetições antes de deletar.

SELECT 
    nome, 
    categoria, 
    COUNT(*) as total_duplicados, 
    array_agg(id) as ids_duplicados
FROM produtos
GROUP BY nome, categoria
HAVING COUNT(*) > 1;


-- ---------------------------------------------------------------------
-- PASSO 2: ELIMINAR PRODUTOS DUPLICADOS MANTENDO O MAIS ANTIGO
-- ---------------------------------------------------------------------
-- Este comando remove todas as duplicatas com o mesmo nome e categoria,
-- mantendo apenas o registro que foi criado primeiro (menor 'created_at').
-- Se os timestamps de criação forem idênticos, ele desempata mantendo o menor ID (UUID).

DELETE FROM produtos
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY nome, categoria 
                   ORDER BY created_at ASC, id ASC
               ) as row_num
        FROM produtos
    ) t
    WHERE t.row_num > 1
);


-- ---------------------------------------------------------------------
-- PASSO 3: ADICIONAR RESTRIÇÃO UNIQUE PARA EVITAR FUTURAS DUPLICATAS (RECOMENDADO)
-- ---------------------------------------------------------------------
-- Após limpar a tabela, é altamente recomendado adicionar uma restrição UNIQUE 
-- para garantir que o banco de dados rejeite inserções duplicadas no futuro.
-- Descomente as duas linhas abaixo caso queira aplicar essa regra:

-- ALTER TABLE produtos 
-- ADD CONSTRAINT unique_produto_nome_categoria UNIQUE (nome, categoria);
