# Candidato - AgendaCerta (Saúde)

Entregas da equipe InnovaPair no Hackinova 2026 (AgendaCerta).

**Equipe:** InnovaPair  
**Produto provisório:** AgendaCerta  
**Área:** Saúde (+ IA como meio)

## Arquivos desta pasta

| Arquivo | Para quê |
| --- | --- |
| `anexo-tarefa01.html` | **Tarefa 01** (6 slides) - problema, usuário e valor |
| `anexo-tarefa02.html` | **Tarefa 02** (6 slides) - modelo de negócio (slides 4–6 pendentes da dupla) |
| `entrega.md` | Versão curta da Tarefa 01 (~1–2 págs.) |
| `completa.md` | Versão completa da Tarefa 01 com evidências, JTBD, empatia e fontes |
| `canvas/` | Visuais extras para slide / mentoria |

## Tarefa 02 (em andamento)

`anexo-tarefa02.html`:

- Slides 1 a 3: monetização + Business Model Canvas (versão fechada nesta leva)
- Slides 4 a 6: abertos com `TODO (dupla)` (benchmark, custos/parceiros/primeiros 10, diferencial)

```bash
start docs/candidatos/agendacerta/anexo-tarefa02.html
```

## Como gerar o PDF do anexo (OPIN)

1. Abra o HTML no Chrome ou Edge (`anexo-tarefa01.html` ou `anexo-tarefa02.html`)
2. `Ctrl+P` → Destino: **Salvar como PDF**
3. Layout: **Paisagem**; margens **mínimas**; marcar **gráficos de fundo**
4. Confira se saíram **até 6 páginas**

**Tarefa 01 cobre:** evidências (≥3 com fontes), perfil do usuário, mapa de empatia, JTBD, alternativas (≥3), proposta de valor e solução inicial (≤5 linhas).

**Tarefa 02 cobre:** BMC (9 blocos), benchmark (≥3), monetização, custos, parceiros, primeiros 10 clientes e diferencial competitivo.

## Respostas prontas dos campos da OPIN

**Problema (pergunta 1):**
```
Usuários do SUS em Aracaju com consulta ou exame especializado já marcado enfrentam dificuldade para lembrar, confirmar ou remarcar a tempo, causando faltas frequentes, vagas ociosas e atraso no atendimento de quem está na fila.
```

**Hipótese (pergunta 3):**
```
Acreditamos que lembretes e confirmação de presença pelo WhatsApp, com remarcação em 1 toque, aumentam o comparecimento e liberam vagas com antecedência suficiente para a rede reaproveitar a agenda.
```

## Canvas / slides extras

| Arquivo | Uso |
| --- | --- |
| `canvas/empatia-e-valor.html` | 2 slides (empatia + valor) |
| `canvas/mapa-empatia.png` | PNG do Mapa de Empatia |
| `canvas/canvas-valor.png` | PNG Problema → Valor → Solução |

```bash
start docs/candidatos/agendacerta/anexo-tarefa01.html
```

## Problema (em uma frase)

Pacientes do SUS em Aracaju perdem (e fazem outros perderem) vagas de consultas/exames especializados porque o sistema atual não confirma, não prevê e não redistribui o não comparecimento com eficiência.

## Próximo passo

Protótipo em `app/agendacerta/` - WhatsApp Cloud API (modo teste) + painel de gestão.
