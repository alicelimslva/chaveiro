# Sistema do Chaveiro

Gestão de ordens de serviço e atendimento para chaveiro de shopping. É um PWA (instalável no computador do balcão) feito com React, TypeScript, Tailwind e Supabase.

## Rodar agora (modo demo, sem configurar nada)

```bash
npm install
npm run dev
```

Abra http://localhost:5173:

| Endereço | O quê |
|---|---|
| `/` | Vitrine pública (landing page para o Google) |
| `/app` | Balcão (login) |
| `/acompanhar/CODIGO` | Acompanhamento público da ordem (sem login) |

Sem as variáveis do Supabase, o app roda em **modo demo**: os dados ficam no navegador, com clientes e ordens de exemplo.
- Dono (admin): `dono@demo.com` / `demo123`
- Atendente: `ana@demo.com` / `demo123`

## Ligar no Supabase (gratuito)

1. Crie um projeto em supabase.com.
2. No **SQL Editor**, rode o arquivo `supabase/migrations/20261105000000_init.sql`. Ele cria as tabelas, os triggers de histórico, a RLS em todas as tabelas, o bucket `vitrine` e os dados iniciais.
3. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_PUBLIC_URL` (o domínio final, usado nos links enviados ao cliente).
4. Abra `/app/login`, clique em **Criar acesso** e cadastre o dono. Na instalação inicial, esse primeiro cadastro vira administrador.
5. **Logo em seguida**, rode no SQL Editor as demais migrations de `supabase/migrations/`, em ordem de nome. A `20261110000000_harden_signup_and_order_codes.sql` confere se existe um administrador ativo e desliga a promoção automática: a partir daí **todo cadastro novo entra como atendente inativo**, e o dono libera e promove em *Usuários* (ou pelo SQL Editor). Os funcionários se cadastram pela mesma tela.
6. (Opcional) Em Authentication → Providers → Email, desligue "Confirm email" para agilizar o cadastro.

## Deploy

- **Vercel:** importe o repositório e defina as variáveis `VITE_*`. O `vercel.json` já faz o fallback de rotas da SPA.
- **Cloudflare Pages:** build `npm run build`, pasta `dist`. O `public/_redirects` já está incluído.
- **GitHub Actions:** `ci.yml` roda typecheck, Vitest e Playwright. `keepalive.yml` pinga o Supabase a cada 3 dias para o plano gratuito não pausar; configure os secrets `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

## Testes

```bash
npm test          # Vitest: regras de prazo, status, mensagens, permissões (API demo)
npm run test:e2e  # Playwright: login → nova ordem → status → link público; permissões; vitrine
```

## Arquitetura

```
src/
  api/types.ts      contrato único de dados (Api)
  api/demo.ts       implementação no navegador (localStorage)
  api/supabase.ts   implementação Supabase (Auth, Postgres, Storage, RPC)
  lib/domain.ts     regras: frentes, status e transições, urgência, prazo, modelos
  lib/messaging.ts  "canal de mensagens" (hoje: links wa.me; amanhã: robô)
  pages/            Painel, Ordens, Nova ordem, Detalhe, Comprovante, Clientes, Ficha,
                    Acompanhar (público), Vitrine (pública), admin/*
supabase/migrations/ schema + RLS
```

**Segurança (RLS):**
- Atendente ativo lê e grava clientes, veículos, ordens e pagamentos.
- Só o admin apaga, edita modelos de mensagem, vitrine e preços, gerencia usuários e vê relatórios financeiros.
- O histórico de status é gravado por trigger e não pode ser editado.
- O link público usa a função `get_public_order(code)`, que expõe só o necessário (primeiro nome, etapas, prazo e saldo).

## Milestones

| # | Entrega | Status |
|---|---|---|
| 1 | Base: Vite, React, TS, Tailwind, PWA, rotas, modo demo | ✅ |
| 2 | Banco: schema, RLS por perfil, trigger de histórico, Storage | ✅ |
| 3 | Login, multiusuário, permissões (admin e atendente), aprovação de cadastro | ✅ |
| 4 | Ordens: abertura rápida, prazo, responsável obrigatório, status com histórico (quem, quando, de/para), sinal e pagamentos | ✅ |
| 5 | Painel do dia (atrasadas, hoje, amanhã, prontas) e avisos com notificação do sistema | ✅ |
| 6 | Clientes: busca sempre visível (nome, telefone, placa), ficha com veículos, linha do tempo, pago e pendente | ✅ |
| 7 | Cliente: link público com código, botão “Avisar cliente” (wa.me), modelos editáveis | ✅ |
| 8 | Comprovante 80mm ou A4 (imprimir e salvar PDF) com QR Code do link | ✅ |
| 9 | Vitrine pública com SEO local (schema.org Locksmith), WhatsApp por serviço, upload de fotos | ✅ |
| 10 | Relatórios: % no prazo, faturamento por frente e por forma de pagamento, por responsável | ✅ |
| — | **Roadmap:** caixa com Pix por QR Code e fechamento do dia → estoque com alerta de mínimo → configurador de carimbos (upload de artes) e agenda de aberturas → relatórios avançados e robô de WhatsApp (nova implementação de `MessageChannel`) | próximo |

## Atalhos do balcão

- `/` foca a busca de cliente.
- `N` abre uma nova ordem.
