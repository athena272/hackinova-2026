# Security Advisor (Supabase) — AgendaCerta

Documentação dos avisos vistos no **Database → Advisors → Security** do projeto Supabase e de como foram tratados nas migrations do monorepo.

Onde aplicar de novo (cloud ou local já migrado):

```bash
# na raiz do monorepo, com o projeto linkado
npx supabase db push
```

Ou rode o SQL correspondente no **SQL Editor** do Dashboard.

Migrations envolvidas:

```
supabase/migrations/20260920081658_create_appointments.sql
supabase/migrations/20260920085000_appointments_security_advisor.sql
supabase/migrations/20260920092600_appointments_grant_service_role.sql
```

---

## 1. Function Search Path Mutable

| Campo | Valor |
| --- | --- |
| Tipo | Warning |
| Entidade | `public.set_appointments_updated_at` |
| Mensagem típica | Detects functions where the `search_path` parameter is not set |

### O que significa

Funções PL/pgSQL sem `search_path` fixo podem resolver objetos em schemas inesperados (risco de hijack de `search_path`). O Advisor exige `SET search_path` explícito.

### Como resolvemos

Na função da trigger `updated_at`:

```sql
create or replace function public.set_appointments_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

Isso está na migration inicial e foi reaplicado em `20260920085000_appointments_security_advisor.sql` para bancos que já tinham a versão antiga.

### Como validar

No Advisor, o warning dessa função deve sumir após a migration. No SQL Editor:

```sql
select p.proname, pg_get_function_identity_arguments(p.oid), p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'set_appointments_updated_at';
```

`proconfig` deve incluir algo como `search_path=public`.

---

## 2. RLS Enabled No Policy

| Campo | Valor |
| --- | --- |
| Tipo | Info / Security suggestion |
| Entidade | `public.appointments` |
| Mensagem típica | Table has RLS enabled, but no policies exist |

### O que significa

RLS ligado **sem** policies: o Advisor alerta porque o comportamento fica “tudo bloqueado para roles sujeitas a RLS”, o que é fácil de confundir com “esqueci de criar policy”. No MVP, o Next.js acessa a tabela só com **service_role** (bypass de RLS) nas Route Handlers.

### Como resolvemos

Mantivemos RLS ativo e criamos policies **explícitas de negação** para `anon` e `authenticated` (nada de acesso público via Data API):

```sql
create policy "appointments_deny_anon"
  on public.appointments
  for all
  to anon
  using (false)
  with check (false);

create policy "appointments_deny_authenticated"
  on public.appointments
  for all
  to authenticated
  using (false)
  with check (false);
```

`service_role` continua bypassando RLS e é o único caminho usado pelo app (`getSupabaseAdmin()` + `SUPABASE_SERVICE_ROLE_KEY`).

### Como validar

```sql
select polname, polcmd, polroles::regrole[]
from pg_policy
where polrelid = 'public.appointments'::regclass;
```

O aviso “RLS Enabled No Policy” deve desaparecer; o modelo de acesso do MVP (só servidor) permanece.

---

## 3. Relacionado: `permission denied for table appointments` (não é Advisor)

Não aparece como annotation de Security Advisor, mas surgiu no painel da Vercel depois do deploy.

| Campo | Valor |
| --- | --- |
| Erro | `42501` — permission denied for table appointments |
| Causa | Em projetos cloud recentes, tabelas novas **não** recebem `GRANT` automático para roles da Data API |

Privilegio de tabela é checado **antes** do RLS. Sem `GRANT`, mesmo com service role a API falha.

### Como resolvemos

```sql
grant usage on type public.appointment_status to service_role;
grant select, insert, update, delete on table public.appointments to service_role;
```

Arquivo: `20260920092600_appointments_grant_service_role.sql` (e o mesmo GRANT na migration inicial para installs limpos).

Há teste de regressão em:

```
app/agendacerta/src/repository/appointments-grants.migration.test.ts
```

### Como validar

Com a secret na Vercel (`SUPABASE_SERVICE_ROLE_KEY`, não a anon), `GET /api/appointments` deve listar o seed. No SQL Editor, se ainda falhar:

```sql
grant usage on type public.appointment_status to service_role;
grant select, insert, update, delete on table public.appointments to service_role;
```

---

## Resumo rápido

| Annotation / erro | Ação |
| --- | --- |
| Function Search Path Mutable | `set search_path = public` na trigger function |
| RLS Enabled No Policy | Policies deny para `anon` / `authenticated` |
| permission denied (Data API) | `GRANT` explícito ao `service_role` |

O app **não** expõe `appointments` ao browser com a anon key; leitura/escrita passam pelas rotas Next com service role.
