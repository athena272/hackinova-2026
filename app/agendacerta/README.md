# AgendaCerta (MVP)

Protótipo da InnovaPair: confirmação de agenda (mock WhatsApp) + painel para clínicas.

## O que esta fatia inclui

- Seed de agendamentos (JSON + migration Supabase)
- Lista de espera simples: oferecer vaga liberada a candidato da mesma especialidade
- Repositório em memória **ou** Supabase (se `.env.local` estiver configurado)
- `GET /api/appointments`
- `GET /api/waitlist?specialty=...`
- `POST /api/appointments/[id]/confirm` com `{ "action": "SIM" | "NAO" | "REMARCAR" }`
- `POST /api/appointments/[id]/offer` com `{ "waitlistId": "..." }`
- Páginas `/painel` e `/mock-whatsapp`
- Testes unitários da regra de status e da oferta de vaga (Vitest)

## O que fica de fora

- WhatsApp Cloud API / Meta
- Autenticação (Better Auth etc.)
- Score de risco (IA) e fila de espera automática sem ação da clínica

## Requisitos

- Node.js **24+** (veja `.nvmrc`)
- **pnpm** 9+ (gerenciador oficial deste app)
- Docker Desktop (só para o banco Supabase local)

No Windows, o arquivo `.npmrc` usa `node-linker=hoisted` para evitar erro de symlink (`Acesso negado`).

## Banco local (opção B)

O Next.js roda no host. O Docker sobe só a stack de dados do Supabase.

Na **raiz** do monorepo:

```bash
npx supabase start
npx supabase db reset
```

Copie URL e `service_role` para `app/agendacerta/.env.local` (veja `.env.example`).  
Detalhes: [`supabase/README.md`](../../supabase/README.md).

Sem `.env.local` de Supabase, a API usa o seed em memória (CI e smoke sem Docker).

## Como rodar o app

```bash
cd app/agendacerta
pnpm install
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Testes

```bash
pnpm test
```

CI em `.github/workflows/ci.yml` (lint + test + build) com Node 24 e pnpm.

## Demo rápida

1. Abra `/painel` e veja os status.
2. Abra `/mock-whatsapp`, escolha uma vaga pendente e clique SIM, NÃO ou REMARCAR.
3. Volte em `/painel` e clique em **Atualizar**.
4. Em vagas liberadas, use **Oferecer vaga** para atribuir um candidato (fica **pendente** para ele confirmar no mock).
5. No mock WhatsApp, o novo paciente aparece nas pendentes; use SIM/NÃO/REMARCAR.

## Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha após `npx supabase start` (local) ou com as keys do projeto cloud (Vercel).  
Nunca commite `.env` / `.env.local`.

## Deploy na Vercel

Na tela **New Project**:

1. Repo `hackinova-2026`, branch `main`
2. **Root Directory:** `app/agendacerta` (já está certo no print)
3. Framework: Next.js (automático); Node `24.x` via `package.json` / `.nvmrc`
4. Antes de **Deploy**, abra **Environment Variables** e adicione (Production + Preview):

| Nome | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable / anon do cloud |
| `SUPABASE_SERVICE_ROLE_KEY` | secret / service_role do cloud |

5. Garanta que a migration `supabase/migrations/..._create_appointments.sql` já rodou no projeto cloud (integração GitHub do Supabase ou `npx supabase db push` com o projeto linkado). Sem isso o painel sobe, mas a API falha ao listar.
6. Faça o deploy **depois** de mergear a fatia Supabase em `main` (senão a Vercel sobe o código antigo sem Postgres).

Sem as env vars, o deploy funciona, mas cai no seed em memória (dados não persistem entre cold starts).
