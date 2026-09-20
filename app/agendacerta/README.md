# AgendaCerta (MVP)

Protótipo da InnovaPair: confirmação de agenda (mock WhatsApp) + painel para clínicas.

## O que esta fatia inclui

- Seed de agendamentos em JSON
- Repositório em memória (reinicia com o servidor)
- `GET /api/appointments`
- `POST /api/appointments/[id]/confirm` com `{ "action": "SIM" | "NAO" | "REMARCAR" }`
- Páginas `/painel` e `/mock-whatsapp`
- Testes unitários da regra de status (Vitest)

## O que fica de fora

- WhatsApp Cloud API / Meta
- Banco de dados persistente
- Autenticação
- Score de risco (IA) e lista de espera completa

## Requisitos

- Node.js **24+** (veja `.nvmrc`)
- **pnpm** 9+ (gerenciador oficial deste app; não use `npm install` aqui)

No Windows, o arquivo `.npmrc` usa `node-linker=hoisted` para evitar erro de symlink (`Acesso negado`).

## Como rodar

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

CI em `.github/workflows/ci.yml` (lint + test + build) com Node 24, pnpm e Actions `checkout`/`setup-node` v5.

## Demo rápida

1. Abra `/painel` e veja os status do seed.
2. Abra `/mock-whatsapp`, escolha uma vaga pendente e clique SIM, NÃO ou REMARCAR.
3. Volte em `/painel` e clique em **Atualizar**.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` se for usar variáveis no futuro. Nesta fatia o app sobe sem secrets.
