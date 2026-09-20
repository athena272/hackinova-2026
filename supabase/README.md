# AgendaCerta + Supabase (local)

Stack de **dados** local via Docker (`supabase start`).  
O Next.js do AgendaCerta roda no host (`pnpm dev`), não dentro do Docker.

## Pré-requisitos

- Docker Desktop rodando
- Node 24+
- CLI: `npx supabase` (ou instale o [Supabase CLI](https://supabase.com/docs/guides/cli))

## Subir o banco local

Na **raiz** do monorepo (`hackinova-2026/`):

```bash
npx supabase start
```

Ao terminar, o CLI imprime URL e keys locais (anon / service_role).  
Copie para `app/agendacerta/.env.local` (veja `.env.example` do app).

Aplicar migrations (se ainda não aplicou):

```bash
npx supabase db reset
```

`db reset` recria o banco local e roda todas as migrations (inclui seed de appointments).

Parar:

```bash
npx supabase stop
```

Analytics local (`supabase_vector`) fica **desligado** no `config.toml` para evitar loop no Docker Desktop no Windows. Postgres + Data API continuam normais.

## O que sobe no Docker

- Postgres
- Data API (PostgREST) e serviços auxiliares do Supabase

**Não** sobe o frontend/backend Next.js.

## Produção (cloud + Vercel)

1. **Migrations no projeto Supabase cloud** — com a integração GitHub ligada, merge em `main` aplica o SQL; ou rode `npx supabase db push` com o projeto linkado.
2. **Vercel** — Root Directory `app/agendacerta`; env vars do cloud (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, e opcionalmente a anon/publishable). Detalhes no README do app.

Desenvolva e teste no **local** (`supabase start`) antes de mergear SQL novo.
