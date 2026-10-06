# AgendaCerta (MVP)

Protótipo da InnovaPair: confirmação de agenda (mock WhatsApp) + painel para clínicas.

## O que esta fatia inclui

- Seed de agendamentos (JSON + migration Supabase)
- Cadastro de pacientes com bairro, histórico de comparecimento (compareceu / faltou) e tipo de procedimento (consulta ou exame), base para o score de falta e as próximas funções do diferencial
- Painel com a agenda ativa e o histórico de comparecimento em seções separadas
- Score preditivo de falta explicável: cada consulta pendente ou confirmada mostra a chance de falta e os motivos (veja [Score de falta](#score-de-falta))
- Lista de espera simples: oferecer vaga liberada a candidato da mesma especialidade
- Repositório em memória **ou** Postgres do Supabase via Prisma (se `DATABASE_URL` estiver configurada)
- `GET /api/appointments`
- `GET /api/appointments/risk`
- `GET /api/waitlist?specialty=...`
- `POST /api/appointments/[id]/confirm` com `{ "action": "SIM" | "NAO" | "REMARCAR" }`
- `POST /api/appointments/[id]/offer` com `{ "waitlistId": "..." }`
- Páginas `/painel` e `/mock-whatsapp`
- Login da clínica (`/login`) com Better Auth: painel, mock e APIs exigem sessão
- Testes unitários da regra de status, da oferta de vaga e do score de falta (Vitest)

## O que fica de fora

- WhatsApp Cloud API / Meta
- Recuperação de senha e múltiplas clínicas
- Modelo de machine learning treinado com dados reais (o score atual é uma regra com pesos ajustáveis)
- Fila de espera automática sem ação da clínica

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

Defina `DATABASE_URL` em `app/agendacerta/.env.local` (veja `.env.example`; o valor local padrão já vem pronto).  
Detalhes: [`supabase/README.md`](../../supabase/README.md).

Sem `DATABASE_URL`, a API usa o seed em memória (CI e smoke sem Docker).

## Banco e Prisma

O app acessa o Postgres do Supabase pelo Prisma 7 (agendamentos, lista de espera, pacientes, bairros e as tabelas `auth_*` do login). As migrations continuam em `supabase/migrations/` e são a fonte da verdade; o `prisma/schema.prisma` é gerado a partir do banco, sem `prisma migrate`.

Modelo de dados do agendamento:

| Tabela | O que guarda |
| --- | --- |
| `patients` | Nome, telefone mascarado e bairro (sem endereço completo, por LGPD) |
| `neighborhoods` | Bairros de Aracaju e região com coordenadas aproximadas, para distância estimada até a clínica (`src/domain/clinic.ts`) |
| `appointments` | Paciente (`patient_id`), especialidade, horário, quando foi marcado (`booked_at`), status e procedimento (`consulta` ou `exame` com nome) |
| `waitlist` | Paciente (`patient_id`), especialidade e status na lista de espera |

Status do agendamento: `pendente`, `confirmado`, `liberado` (o paciente avisou que não vai), `remarcacao_solicitada`, `compareceu` e `faltou` (não apareceu e não avisou). As APIs continuam devolvendo `patientName` e `phoneMasked` no agendamento e na lista de espera; agora também vêm `patientId`, `procedure` e `bookedAt`.

`booked_at` nunca passa do horário da consulta (check constraint). Quando a vaga é oferecida a outro paciente, ele conta como uma nova marcação; se a oferta acontece depois do horário (agenda de demonstração no passado), a marcação fica no próprio horário.

O seed em memória (`data/*.seed.json`) espelha as migrations. O `src/data/seed.test.ts` acusa se os ids dos dois seeds divergirem.

- `pnpm install` roda `prisma generate` (postinstall) e cria o client em `src/generated/prisma` (fora do git). Não precisa de banco.
- `prisma.config.ts` lê o `DATABASE_URL` do `.env.local`.

Para mudar uma tabela:

1. Crie a migration em `supabase/migrations/` (na raiz: `npx supabase migration new <nome>`)
2. Aplique no local: `npx supabase db reset`
3. Atualize o schema: `pnpm db:pull` (mantém os renomes `@map` / `@@map`) e, se precisar, ajuste o domínio
4. Rode `pnpm test` (o `prisma-schema.test.ts` acusa tabela ou enum fora de sincronia) e commite a migration junto com o `schema.prisma`

O `db reset` recria o banco do zero e apaga o usuário local da clínica. Depois dele, rode `pnpm auth:create-user` de novo.

Valor novo em enum (`alter type ... add value`) fica numa migration própria: o Postgres não deixa usar o valor na mesma transação em que ele foi criado.

Teste de integração opcional, somente leitura, com o Supabase local rodando (PowerShell):

```powershell
$env:RUN_DB_TESTS="1"; pnpm test; Remove-Item Env:RUN_DB_TESTS
```

## Score de falta

O painel mostra, para cada consulta pendente ou confirmada, a chance estimada de o paciente faltar, a faixa (baixo, médio ou alto) e os motivos. A ideia é a recepção saber quem vale lembrar primeiro, antes que a vaga vire prejuízo.

É uma regra explicável, não uma caixa preta: a chance começa em 15% e cada fator soma ou subtrai pontos.

| Fator | Como pesa |
| --- | --- |
| Histórico | Faltas nas últimas 3 consultas do paciente. Muitas faltas aumentam bastante; ter comparecido a todas (pelo menos 2) diminui |
| Especialidade | Algumas especialidades costumam ter mais faltas (Oftalmologia, Neurologia, Endocrinologia, Ultrassonografia) |
| Dia e horário | Segunda, sexta, antes das 8h ou a partir das 17h, no fuso da clínica (`America/Maceio`) |
| Antecedência | Marcado há 30 dias ou mais pesa mais; marcado com até 2 dias pesa menos |
| Distância | Distância estimada entre o bairro do paciente e o da clínica. Bairro desconhecido não pesa |

O resultado fica entre 3% e 95%. Faixas: alto a partir de 50%, médio a partir de 25%.

Os pesos são hipóteses iniciais para a demonstração, não valores calibrados. Todos ficam em um único arquivo, `src/domain/no-show-risk/risk-weights.ts`; os testes leem os limites de lá, então dá para ajustar sem reescrever teste.

O cálculo vem de `GET /api/appointments/risk`, separado da agenda. Se ele falhar, a agenda continua funcionando e o painel mostra um aviso com **Tentar de novo**. Vaga liberada ou com remarcação não recebe score.

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

1. Entre em `/login` com o usuário da clínica, abra `/painel` e veja os status. Abaixo da agenda fica o histórico de comparecimento (por exemplo, Ana Souza faltou 2 das últimas 3 consultas e Bruno Lima compareceu a todas).
2. Na coluna **Risco de falta**, Ana Souza aparece com 64% (alto) e Bruno Lima com 10% (baixo). Clique em **ver todos os motivos** para ver quanto cada fator pesou.
3. Abra `/mock-whatsapp`, escolha uma vaga pendente e clique SIM, NÃO ou REMARCAR.
4. Volte em `/painel` e clique em **Atualizar**.
5. Em vagas liberadas, use **Oferecer vaga** para atribuir um candidato (fica **pendente** para ele confirmar no mock). O risco da vaga é recalculado para o novo paciente.
6. No mock WhatsApp, o novo paciente aparece nas pendentes; use SIM/NÃO/REMARCAR.

## Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha após `npx supabase start` (local) ou com os valores do projeto cloud (Vercel).  
Nunca commite `.env` / `.env.local`.

## Deploy na Vercel

Na tela **New Project**:

1. Repo `hackinova-2026`, branch `main`
2. **Root Directory:** `app/agendacerta` (já está certo no print)
3. Framework: Next.js (automático); Node `24.x` via `package.json` / `.nvmrc`
4. Antes de **Deploy**, abra **Environment Variables** e adicione (Production + Preview):

| Nome | Valor |
| --- | --- |
| `DATABASE_URL` | Supabase → Connect → Transaction pooler (porta 6543), com `?sslmode=no-verify` no final |
| `BETTER_AUTH_SECRET` | valor novo de 32+ caracteres (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | `https://<seu-app>.vercel.app` |

A mesma `DATABASE_URL` serve para os dados e para o login. Se o pooler de transação reclamar de prepared statements, troque pela URL do Session pooler (porta 5432). As antigas `NEXT_PUBLIC_SUPABASE_*` e `SUPABASE_SERVICE_ROLE_KEY` não são mais usadas pelo app.

Para criar o usuário da clínica em produção, rode `pnpm auth:create-user` localmente com `DATABASE_URL` e `BETTER_AUTH_SECRET` do cloud (sem salvar esses valores no repo).

5. Garanta que as migrations de `supabase/migrations/` (incluindo `..._create_auth_tables.sql`) já rodaram no projeto cloud (integração GitHub do Supabase ou `npx supabase db push` com o projeto linkado). Sem isso o painel sobe, mas a API falha ao listar.
6. Faça o deploy **depois** de mergear a fatia Supabase em `main` (senão a Vercel sobe o código antigo sem Postgres).

Sem `DATABASE_URL`, o deploy funciona, mas cai no seed em memória (dados não persistem entre cold starts) e o login fica indisponível.
