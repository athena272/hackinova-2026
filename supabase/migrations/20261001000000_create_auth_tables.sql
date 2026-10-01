-- AgendaCerta: tabelas do Better Auth (login da clínica).
-- Colunas em camelCase seguem o schema padrão do Better Auth 1.x;
-- os nomes das tabelas batem com AUTH_TABLES em app/agendacerta/src/lib/auth/server.ts.
-- O app acessa via conexão Postgres direta (DATABASE_URL, role postgres, dona das tabelas),
-- por isso não há GRANT para a Data API e anon/authenticated ficam bloqueados.

create table public.auth_user (
  "id" text primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null default false,
  "image" text,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp
);

create table public.auth_session (
  "id" text primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references public.auth_user ("id") on delete cascade
);

create table public.auth_account (
  "id" text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references public.auth_user ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null
);

create table public.auth_verification (
  "id" text primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp
);

create index auth_session_user_id_idx on public.auth_session ("userId");
create index auth_account_user_id_idx on public.auth_account ("userId");
create index auth_verification_identifier_idx on public.auth_verification ("identifier");

alter table public.auth_user enable row level security;
alter table public.auth_session enable row level security;
alter table public.auth_account enable row level security;
alter table public.auth_verification enable row level security;

create policy "auth_user_deny_anon" on public.auth_user
  for all to anon using (false) with check (false);
create policy "auth_user_deny_authenticated" on public.auth_user
  for all to authenticated using (false) with check (false);

create policy "auth_session_deny_anon" on public.auth_session
  for all to anon using (false) with check (false);
create policy "auth_session_deny_authenticated" on public.auth_session
  for all to authenticated using (false) with check (false);

create policy "auth_account_deny_anon" on public.auth_account
  for all to anon using (false) with check (false);
create policy "auth_account_deny_authenticated" on public.auth_account
  for all to authenticated using (false) with check (false);

create policy "auth_verification_deny_anon" on public.auth_verification
  for all to anon using (false) with check (false);
create policy "auth_verification_deny_authenticated" on public.auth_verification
  for all to authenticated using (false) with check (false);

revoke all on table
  public.auth_user,
  public.auth_session,
  public.auth_account,
  public.auth_verification
from anon, authenticated;

comment on table public.auth_user is
  'Usuários da clínica (Better Auth). Sem acesso pela Data API.';
comment on table public.auth_session is
  'Sessões do Better Auth. Sem acesso pela Data API.';
comment on table public.auth_account is
  'Credenciais (hash de senha) do Better Auth. Sem acesso pela Data API.';
comment on table public.auth_verification is
  'Tokens de verificação do Better Auth. Sem acesso pela Data API.';
