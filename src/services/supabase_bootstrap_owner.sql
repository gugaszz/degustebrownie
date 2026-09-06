-- ==============================================================================
-- BROWNIE CONTROL - BOOTSTRAP DA CONTA DO PROPRIETÁRIO (rodar uma única vez)
-- ==============================================================================
-- Pré-requisito: rode supabase_schema.sql (ou supabase_migration_reservations.sql,
-- se o schema base já existir) antes deste arquivo.
--
-- Este projeto NÃO tem tela de cadastro: toda conta é criada pelo proprietário.
-- A primeira conta de todas — a sua, Gustavo, como proprietário — precisa ser
-- criada manualmente uma vez, porque não existe "proprietário anterior" para
-- cadastrá-la pelo app. Depois disso, você cadastra os vendedores normalmente
-- dentro do próprio sistema (Vendedores > Novo Vendedor).
--
-- PASSO 1 — Criar o usuário de autenticação (faz a senha ficar protegida de verdade):
--   No painel do Supabase: Authentication > Users > Add User
--     Email: antunescosta.gustavo@gmail.com
--     Password: 74282121
--     Marque "Auto Confirm User"
--   Depois de criado, copie o "User UID" gerado — você vai precisar dele no Passo 3.
--
-- PASSO 2 — Criar a organização (rode isto no SQL Editor do Supabase):
INSERT INTO organizations (id, name, currency, timezone, pix_key, pix_key_type, pix_merchant_name, pix_merchant_city, default_commission_type, default_commission_value, default_purchase_cost)
VALUES (
    'a0000000-0000-4000-8000-000000000001',
    'Brownie Control',
    'BRL',
    'America/Fortaleza',
    '63633597000107',
    'cnpj',
    'BROWNIE CONTROL',
    'FORTALEZA',
    'percentage_of_gross_profit',
    50.00,
    4.00
)
ON CONFLICT (id) DO NOTHING;

-- PASSO 3 — Criar o perfil do proprietário, ligado ao usuário criado no Passo 1.
-- Troque 'COLE-AQUI-O-USER-UID-DO-PASSO-1' pelo UID copiado no painel de Authentication.
INSERT INTO profiles (id, organization_id, role, status, name, email)
VALUES (
    'COLE-AQUI-O-USER-UID-DO-PASSO-1',
    'a0000000-0000-4000-8000-000000000001',
    'owner',
    'active',
    'Gustavo',
    'antunescosta.gustavo@gmail.com'
)
ON CONFLICT (id) DO UPDATE SET role = 'owner', status = 'active', name = 'Gustavo';

-- Pronto: agora só o e-mail antunescosta.gustavo@gmail.com com a senha 74282121 consegue
-- entrar, e é o único com acesso de proprietário. Todo vendedor novo é cadastrado por você
-- dentro do app — não existe formulário de cadastro público em lugar nenhum do sistema.
