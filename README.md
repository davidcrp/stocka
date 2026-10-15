# Stocka — gestão de estoque e lucro para revendas de veículos

Sistema web para revendas e concessionárias controlarem estoque de veículos,
vendas, trocas e leads, com visão do lucro por carro e assinatura paga.

**Sistema no ar:** https://dashboard-concessionaria.vercel.app

## Funcionalidades

- Dashboard com indicadores de estoque, vendas e lucro
- Cadastro de veículos com página de detalhe, custos e margem
- Controle de vendas, trocas e leads
- Multiusuário: convite por e-mail, papéis de admin e painel de super admin
- Assinatura recorrente via Asaas (checkout e webhook)
- Webhook de WhatsApp para entrada de leads

## Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix)
- Supabase: Postgres, autenticação, Row Level Security e Edge Functions
- Asaas (pagamentos), Vitest e Playwright
- Deploy na Vercel

## Estrutura

| Caminho | O que é |
|---|---|
| `src/pages/` | Telas: Dashboard, Estoque, Vendas, Trocas, Leads, Assinatura, Admin |
| `src/integrations/supabase` | Cliente e tipos do banco |
| `supabase/migrations` | Esquema do banco e políticas de acesso |
| `supabase/functions` | Edge Functions: Asaas, e-mails, WhatsApp, exclusão de veículo |

## Rodar localmente

```bash
npm install
npm run dev
```

As variáveis `VITE_SUPABASE_*` ficam no `.env` (chave pública do Supabase).
