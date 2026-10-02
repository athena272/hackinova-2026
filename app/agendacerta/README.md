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
- Login da clínica (`/login`) com Better Auth: painel, mock e APIs exigem sessão
- Testes unitários da regra de status e da oferta de vaga (Vitest)

## O que fica de fora

- WhatsApp Cloud API / Meta
- Recuperação de senha e múltiplas clínicas
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

## Login da clínica

O Better Auth é só uma biblioteca: não precisa criar conta nem projeto no site dele. Usuários e sessões ficam nas tabelas `auth_*` do Postgres do Supabase (migration `supabase/migrations/20261001000000_create_auth_tables.sql`). O cadastro público é desligado; o usuário da clínica é criado por script.

1. Com o Supabase local rodando, aplique as migrations na raiz do repo: `npx supabase db reset`
2. No `.env.local`, preencha `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` e `CLINIC_USER_EMAIL` / `CLINIC_USER_PASSWORD` (veja `.env.example`)
3. Crie o usuário: `pnpm auth:create-user` (se já existir, não faz nada)
4. Rode `pnpm dev`, abra `/painel` e entre com o e-mail e a senha do passo 2

Sem `DATABASE_URL` ou `BETTER_AUTH_SECRET`, a tela de login avisa que a autenticação está indisponível e as APIs respondem 503.

## Testes

```bash
pnpm test
```

CI em `.github/workflows/ci.yml` (lint + test + build) com Node 24 e pnpm.

## Demo rápida

1. Entre em `/login` com o usuário da clínica, abra `/painel` e veja os status.
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
| `DATABASE_URL` | Supabase → Connect → Transaction pooler (porta 6543) |
| `BETTER_AUTH_SECRET` | valor novo de 32+ caracteres (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | `https://<seu-app>.vercel.app` |

Para criar o usuário da clínica em produção, rode `pnpm auth:create-user` localmente com `DATABASE_URL` e `BETTER_AUTH_SECRET` do cloud (sem salvar esses valores no repo).

5. Garanta que as migrations de `supabase/migrations/` (incluindo `..._create_auth_tables.sql`) já rodaram no projeto cloud (integração GitHub do Supabase ou `npx supabase db push` com o projeto linkado). Sem isso o painel sobe, mas a API falha ao listar.
6. Faça o deploy **depois** de mergear a fatia Supabase em `main` (senão a Vercel sobe o código antigo sem Postgres).

Sem as env vars, o deploy funciona, mas cai no seed em memória (dados não persistem entre cold starts).
