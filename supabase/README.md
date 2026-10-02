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

O app usa só a connection string do Postgres local (`DATABASE_URL`, porta 54322), já preenchida no `.env.example` do app.  
Copie para `app/agendacerta/.env.local`.

Aplicar migrations (se ainda não aplicou):

```bash
npx supabase db reset
```

`db reset` recria o banco local e roda todas as migrations (inclui seed de appointments).

Parar:

```bash
npx supabase stop
```

**Não use o botão Stop do Docker Desktop** nos containers `supabase_*`.  
O CLI sobe a stack com política `restart=unless-stopped`. Parar um container (ou o grupo) pela UI costuma ficar em loading infinito e os serviços voltam a subir. O caminho certo é sempre `npx supabase stop` na raiz do monorepo.

Analytics local (`supabase_vector`) e Edge Runtime ficam **desligados** no `config.toml` (Windows/Docker Desktop: loop ou exit 255). Postgres + Data API continuam normais.

## O que sobe no Docker

- Postgres
- Data API (PostgREST) e serviços auxiliares do Supabase

**Não** sobe o frontend/backend Next.js.

## Produção (cloud + Vercel)

1. **Migrations no projeto Supabase cloud** — com a integração GitHub ligada, merge em `main` aplica o SQL; ou rode `npx supabase db push` com o projeto linkado.
2. **Vercel** — Root Directory `app/agendacerta`; env vars do cloud (`DATABASE_URL` do Transaction pooler, `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL`). Detalhes no README do app.
3. **Schema do Prisma** — depois de criar uma migration, rode `npx supabase db reset` e, em `app/agendacerta`, `pnpm db:pull` para atualizar o `prisma/schema.prisma`.

Desenvolva e teste no **local** (`supabase start`) antes de mergear SQL novo.

## Security Advisor

Avisos do Dashboard (search_path, RLS sem policy) e o erro relacionado `permission denied for table appointments`: veja [`SECURITY_ADVISOR.md`](./SECURITY_ADVISOR.md).
