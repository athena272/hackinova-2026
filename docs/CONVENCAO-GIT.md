# Convenção de branches e commits

Padrão da InnovaPair no repositório `hackinova-2026`.

## Branches

Formato:

```text
<tipo>_<NNN>/<slug-curto>
```

- `tipo`: `feature`, `docs`, `fix` ou `chore`
- `NNN`: número sequencial com 3 dígitos (`001`, `002`, …)
- `slug-curto`: kebab-case, produto + assunto quando fizer sentido

Exemplos reais do time:

```text
feature_001/agendacerta-mvp-painel-mock-whatsapp
feature_002/agendacerta-ui-viva
feature_003/agendacerta-supabase-persistencia
feature_004/agendacerta-lista-espera
docs_001/organizar-tarefa-01-innovapair
docs_004/agendacerta-tarefa02-modelo-negocio
```

Regras práticas:

1. Crie a branch a partir de `main` atualizada.
2. Um assunto por branch (não misture docs da OPIN com feature do app no mesmo PR, salvo hotfix mínimo).
3. Depois do merge, pode apagar a branch remota.
4. Evite `feat/` ou nomes soltos fora do padrão `tipo_NNN/slug`.

## Commits

Prefira commits pequenos e em lotes coerentes (vários arquivos relacionados, não um único arquivo quando der para agrupar).

Estrutura da mensagem:

```text
Linha de assunto (imperativo, sem ponto final)

Descrição curta do porquê / impacto, em uma ou duas frases.
```

Boas práticas:

1. Assunto em português, claro para quem lê o histórico.
2. Foque no motivo da mudança, não só na lista de arquivos.
3. Não commite `.env`, `.env.local`, keys ou secrets.
4. Prefira Conventional Commits no título do PR quando ajudar a leitura, por exemplo `feat(agendacerta): ...`, `docs(agendacerta): ...`, `fix(agendacerta): ...`.

Exemplos de assunto:

```text
Adiciona lista de espera e oferta de vaga reaproveitável
Documenta avisos do Security Advisor e as correções nas migrations
Corrige parse de resposta vazia da API no painel
```

## Pull requests

1. Título curto e específico (pode usar `feat` / `fix` / `docs`).
2. Corpo com Summary e Test plan.
3. Base sempre em `main`.
4. CI verde (`lint`, `test`, `build` do AgendaCerta) antes do merge.

## Fluxo mínimo

```text
main → branch tipo_NNN/slug → commits em lotes → PR → review/CI → merge em main
```
