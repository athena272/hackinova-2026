# Hackinova 2026 — InnovaPair

Repositório da equipe **InnovaPair** no [Hackinova 2026](https://github.com/athena272/hackinova-2026) (Innovation Hub × OPIN).

Dois candidatos de tema estão documentados (decisão em aberto):

| Produto | Área | Pasta |
| --- | --- | --- |
| **AgendaCerta** | Saúde (+ IA) | [`docs/candidatos/agendacerta`](./docs/candidatos/agendacerta) |
| **CostaViva** | Mudanças Climáticas | [`docs/candidatos/costaviva`](./docs/candidatos/costaviva) |

Comparativo: [`docs/candidatos/README.md`](./docs/candidatos/README.md)

## Equipe

| Papel | Nome |
| --- | --- |
| Equipe | InnovaPair |
| Evento | Hackinova 2026 |

## Estrutura do repositório

```text
hackinova-2026/
├── README.md
├── LICENSE
├── docs/
│   └── candidatos/
│       ├── agendacerta/
│       └── costaviva/
├── supabase/            ← Postgres local (Docker) + migrations
└── app/
    └── agendacerta/     ← MVP Next.js (pnpm dev no host)
```

Protótipo: [`app/agendacerta`](./app/agendacerta) (`pnpm install` + `pnpm dev`).  
Banco local: [`supabase/README.md`](./supabase/README.md) (`npx supabase start`).
## AgendaCerta (em uma frase)

Pacientes do SUS em Aracaju perdem (e fazem outros perderem) vagas de consultas/exames especializados porque o sistema atual não confirma, não prevê e não redistribui o não comparecimento com eficiência.

## CostaViva (em uma frase)

Municípios do litoral sergipano sofrem erosão costeira/fluvial, mas a evidência geolocalizada chega tarde e fragmentada para cidadãos e órgãos públicos.

## Licença

MIT — ver [`LICENSE`](./LICENSE).
