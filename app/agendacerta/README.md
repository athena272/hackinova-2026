# AgendaCerta (MVP)

Protótipo da InnovaPair: confirmação de agenda (mock WhatsApp) + painel para clínicas.

## O que esta fatia inclui

- Seed de agendamentos (JSON + migration Supabase)
- Cadastro de pacientes com bairro, histórico de comparecimento (compareceu / faltou) e tipo de procedimento (consulta ou exame), base para o score de falta e as próximas funções do diferencial
- Painel com a agenda ativa e o histórico de comparecimento em seções separadas
- Score preditivo de falta explicável: cada consulta pendente ou confirmada mostra a chance de falta e os motivos (veja [Score de falta](#score-de-falta))
- Checklist de preparo pré-exame: o paciente responde sim ou não no mock, o painel mostra o status do preparo e a clínica libera antes a vaga de quem não vai cumprir (veja [Checklist de preparo](#checklist-de-preparo))
- Oferta de vaga em cascata: a vaga liberada vai primeiro para quem mora mais perto e espera há mais tempo; com recusa ou sem resposta no prazo, passa para o próximo da fila (veja [Oferta de vaga em cascata](#oferta-de-vaga-em-cascata))
- Overbooking guiado pelo score: nos horários com risco alto de falta, o painel sugere um encaixe para a lista de espera e a recepção aceita ou recusa (veja [Overbooking guiado pelo score](#overbooking-guiado-pelo-score))
- Detecção de booking duplo: o painel avisa quando o mesmo paciente tem dois horários do mesmo serviço em datas próximas, mesmo em unidades diferentes da rede; a confirmação reforçada pelo mock pergunta qual manter e o outro vira vaga reaproveitável (veja [Detecção de booking duplo](#detecção-de-booking-duplo))
- Indicadores de vagas recuperadas: por semana ou mês, quantas vagas voltaram a ter paciente e por qual motivo estavam livres, o valor estimado, a taxa de faltas e quantos pacientes da lista de espera foram atendidos (veja [Indicadores de vagas recuperadas](#indicadores-de-vagas-recuperadas))
- Repositório em memória **ou** Postgres do Supabase via Prisma (se `DATABASE_URL` estiver configurada)
- `GET /api/appointments`
- `GET /api/appointments/risk`
- `GET /api/exam-preparations`
- `GET /api/waitlist?specialty=...`
- `GET /api/slot-offers` (histórico das ofertas por vaga)
- `GET /api/overbookings` (sugestões de encaixe e quais vagas já têm encaixe)
- `GET /api/duplicate-bookings` (possíveis duplicidades e confirmações reforçadas em andamento)
- `GET /api/recovery-metrics?period=semana|mes&reference=AAAA-MM-DD` (indicadores do período; sem `reference`, vale hoje)
- `POST /api/appointments/[id]/confirm` com `{ "action": "SIM" | "NAO" | "REMARCAR" }`
- `POST /api/appointments/[id]/preparation` com `{ "answers": { "<id do item>": true | false } }`
- `POST /api/appointments/[id]/release`
- `POST /api/appointments/[id]/slot-offers` com `{ "timeoutMinutes": 2 | 5 | 15 | 30 }`
- `POST /api/slot-offers/[id]/response` com `{ "response": "aceitar" | "recusar" }`
- `POST /api/appointments/[id]/overbooking` com `{ "decision": "aceitar" | "recusar" }`
- `POST /api/duplicate-bookings` com `{ "appointmentIds": ["<id>", "<id>"] }` (envia a confirmação reforçada)
- `POST /api/duplicate-bookings/[id]/choice` com `{ "keepAppointmentId": "<id>" }`
- Páginas `/painel`, `/indicadores` e `/mock-whatsapp`
- Login da clínica (`/login`) com Better Auth: painel, indicadores, mock e APIs exigem sessão
- Testes unitários da regra de status, da oferta em cascata, do score de falta, das regras de preparo, do overbooking, da detecção de booking duplo e do cálculo dos indicadores (Vitest)

## O que fica de fora

- WhatsApp Cloud API / Meta
- Recuperação de senha e múltiplas clínicas
- Modelo de machine learning treinado com dados reais (o score atual é uma regra com pesos ajustáveis)
- Oferta que começa sozinha, sem a clínica iniciar, e job em segundo plano para os prazos
- Uso do score de falta na ordem da fila de espera
- Tela para mudar o limite de encaixes por horário (hoje é uma constante no código)
- Detecção de booking duplo entre clínicas diferentes (só olha a clínica e as unidades da rede dela)
- Opção "não vou a nenhum" na confirmação reforçada (o paciente ainda pode responder NÃO na confirmação de presença de cada horário)
- Preço médio editável na tela e preço por especialidade ou convênio (hoje o valor estimado usa um preço por consulta e outro por exame, fixos no código)

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
| `appointments` | Paciente (`patient_id`), especialidade, horário, quando foi marcado (`booked_at`), status, procedimento (`consulta` ou `exame` com nome), a resposta ao checklist de preparo (`preparation_result`, `preparation_answered_at`, `preparation_missed_item_ids`), a unidade (`unit_id`, opcional) e, quando é retorno, o agendamento de origem (`return_of_appointment_id`, opcional) |
| `clinic_units` | Unidades da rede da clínica, com nome (único) e bairro |
| `duplicate_booking_checks` | Cada confirmação reforçada: paciente, grupo de horários (`group_key`), status (`aguardando` ou `resolvida`), quando foi enviada, o horário que o paciente manteve (`kept_appointment_id`) e quando respondeu |
| `duplicate_booking_check_appointments` | Os horários perguntados em cada confirmação reforçada |
| `waitlist` | Paciente (`patient_id`), especialidade, status na lista de espera e quando entrou nela (`requested_at`) |
| `slot_offers` | Cada oferta de vaga: vaga (`appointment_id`), candidato (`waitlist_id`), status (`pendente`, `aceita`, `recusada`, `expirada`), quando foi oferecida, prazo, quando encerrou, a distância usada na ordem e o motivo de a vaga estar livre (`release_reason`: `cancelamento`, `preparo` ou `booking_duplo`) |
| `overbookings` | Cada decisão da recepção sobre um encaixe: horário (`specialty` + `scheduled_at`), agendamento de risco alto que motivou a sugestão (`anchor_appointment_id`), decisão (`aceita` ou `recusada`), o agendamento criado como encaixe (`encaixe_appointment_id`, só no aceite), a posição do encaixe no horário (`sequence`) e a chance de falta no momento da decisão |
| `exam_preparations` | Preparo exigido por exame: nome do exame (único) e instruções |
| `exam_preparation_items` | Itens do checklist de cada preparo, na ordem (`position`), com rótulo e pergunta de sim ou não |

Status do agendamento: `pendente`, `confirmado`, `liberado` (o paciente avisou que não vai), `remarcacao_solicitada`, `compareceu` e `faltou` (não apareceu e não avisou). As APIs continuam devolvendo `patientName` e `phoneMasked` no agendamento e na lista de espera; agora também vêm `patientId`, `procedure`, `bookedAt`, `unit` (id e nome, ou `null`) e `returnOfAppointmentId`.

`booked_at` nunca passa do horário da consulta (check constraint). Quando outro paciente aceita a vaga, ele conta como uma nova marcação; se o aceite acontece depois do horário (agenda de demonstração no passado), a marcação fica no próprio horário.

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

## Checklist de preparo

Exame com preparo mal feito costuma virar exame remarcado no dia, com a vaga perdida. O checklist pergunta antes se o paciente vai conseguir cumprir o preparo e, se ele disser que não, a clínica libera a vaga com antecedência para a lista de espera.

O cadastro de demonstração tem dois preparos:

| Exame | Itens do checklist |
| --- | --- |
| Ultrassonografia de abdome total | Jejum de 8 horas; bexiga cheia |
| Glicemia em jejum | Jejum de 8 a 12 horas; sem álcool por 3 dias |

Como funciona:

1. No mock WhatsApp, a aba **Checklist de preparo** lista os exames pendentes ou confirmados que têm preparo e ainda não foram respondidos. O paciente lê as instruções, responde sim ou não para cada item e envia.
2. Todas as respostas sim deixam o preparo **ok**. Qualquer não deixa o preparo **não cumprido** e guarda quais itens falharam.
3. No painel, cada exame mostra o status do preparo (**pendente**, **ok** ou **não cumprido**). Quem respondeu não cumprido e ainda ocupa a vaga aparece num alerta acima da agenda, com os itens que não vai cumprir e o botão **Liberar vaga**.
4. A vaga liberada fica como **Liberado** e reaproveitável, com o motivo visível no badge, e pode entrar na [oferta em cascata](#oferta-de-vaga-em-cascata). O novo paciente começa com o preparo pendente e responde ao próprio checklist.

As regras ficam em `src/domain/exam-preparation/`: o checklist só aceita vaga pendente ou confirmada, exige resposta para todos os itens, recusa item que não é do exame e não deixa responder duas vezes. Exame do histórico (já realizado) nunca aparece com preparo pendente.

Limitação conhecida: não existe tabela de exames, então o preparo é ligado ao agendamento pelo nome do exame (`appointments.procedure_name` igual a `exam_preparations.exam_name`). Se o nome mudar de um lado só, o exame deixa de pedir checklist. As respostas já gravadas continuam aparecendo, mesmo se o cadastro de preparo estiver fora do ar.

## Oferta de vaga em cascata

Vaga liberada em cima da hora costuma ficar vazia porque ligar para a lista de espera, um por um, leva tempo. A oferta em cascata faz isso sozinha: a clínica só escolhe o prazo e inicia.

Quem recebe primeiro:

1. Entra na fila só quem é da mesma especialidade, está aguardando, ainda não recebeu oferta desta vaga e não tem outra oferta em aberto. Um paciente nunca tem duas ofertas abertas ao mesmo tempo.
2. A fila é dividida em faixas de distância entre o bairro do paciente e o da clínica: perto (até 5 km), médio (até 10 km), longe (acima de 10 km) e, por último, distância desconhecida.
3. Dentro da mesma faixa, vem primeiro quem espera há mais tempo (`requested_at`). O desempate final é pelo id, para a ordem não mudar entre uma consulta e outra.

Com faixas, a distância e o tempo de espera pesam os dois. As faixas e as opções de prazo ficam em `src/domain/slot-offer/offer-rules.ts`, e a ordem é uma função pura (`rankCandidates`).

Como funciona:

1. No painel, a vaga reaproveitável mostra o seletor de **Prazo** (2, 5, 15 ou 30 minutos, padrão 15) e o botão **Iniciar oferta**. A oferta vai para o primeiro da fila e a linha passa a mostrar para quem foi e quanto falta para o prazo acabar.
2. No mock WhatsApp, a aba **Ofertas de vaga** mostra a mensagem para o candidato, com a contagem regressiva e os botões **Aceitar** e **Recusar**.
3. Aceitar já confirma a vaga para o candidato (status **Confirmado**) e o tira da lista de espera. Recusar passa a vaga para o próximo da fila, com o mesmo prazo.
4. Sem resposta no prazo, a oferta expira e a vaga também passa para o próximo. Quando a fila acaba, a cascata termina e a vaga continua liberada.
5. A seção **Ofertas de vaga** do painel mostra o histórico de cada vaga: quem recebeu, a que distância, quando, o prazo e o que respondeu.

Não existe job em segundo plano (na Vercel não há processo rodando o tempo todo). Os prazos vencidos são aplicados sempre que alguém lê ou responde as ofertas: o painel consulta `GET /api/slot-offers` a cada 10 segundos enquanto houver oferta em aberto, e também assim que a contagem zera. A oferta do próximo candidato conta o prazo a partir desse momento.

O banco garante as regras mesmo com duas requisições ao mesmo tempo: índices únicos parciais deixam só uma oferta aberta por vaga e por candidato, e encerrar uma oferta só funciona se ela ainda estiver aberta. Assim, a vaga não é repassada em dobro.

## Overbooking guiado pelo score

Quando o score diz que um paciente provavelmente vai faltar, a clínica pode marcar um segundo paciente no mesmo horário. Se o primeiro faltar, a vaga não fica vazia. Se os dois vierem, o atraso é pequeno e foi uma escolha consciente da recepção, não do sistema.

Quando aparece uma sugestão:

1. Um horário é a combinação de especialidade e instante da consulta. Dois agendamentos no mesmo horário e na mesma especialidade estão no mesmo bloco.
2. Só entra o bloco que tem um agendamento pendente ou confirmado com risco **alto** de falta (a partir de 50%). Risco baixo ou médio nunca gera sugestão. Se houver mais de um, vale o de maior chance de falta.
3. O bloco precisa estar abaixo do limite de encaixes, que é `MAX_OVERBOOKINGS_PER_BLOCK = 1` em `src/domain/overbooking/overbooking-rules.ts`. Todo encaixe aceito conta para o limite, mesmo que depois tenha sido liberado.
4. Bloco que a recepção já recusou não volta a aparecer.
5. Precisa existir alguém na lista de espera da mesma especialidade. O candidato é o primeiro da mesma ordem usada na [oferta em cascata](#oferta-de-vaga-em-cascata) (faixa de distância e tempo de espera), sem contar quem já está agendado no bloco ou tem oferta em aberto.

Como funciona no painel:

1. A seção **Encaixes sugeridos**, acima da agenda, mostra cada horário com a especialidade, quantos encaixes já tem, o paciente de risco alto, a chance de falta com os motivos do score e para quem iria o encaixe.
2. **Aceitar encaixe** cria um novo agendamento pendente para o candidato no mesmo horário e procedimento, e o tira da lista de espera. Na agenda, ele aparece com o selo **Encaixe**. Como o limite padrão é 1, a sugestão some.
3. **Recusar** guarda a decisão e esconde a sugestão daquele horário.
4. Enquanto a decisão é gravada, o botão mostra **Aceitando…** ou **Recusando…** e os dois botões ficam bloqueados. Se der erro, a mensagem aparece no próprio cartão.

Convivência com a oferta em cascata: se o horário já tem um encaixe e alguém cancela, o cancelamento só libera o encaixe e não abre leilão. Na prática, se o paciente de risco alto responde NÃO, quem fica atendido naquele horário é o paciente do encaixe. A vaga liberada aparece como **Vaga coberta pelo encaixe; não abre leilão** e `POST /api/appointments/[id]/slot-offers` responde 400 com o código `SLOT_COVERED_BY_OVERBOOKING`. Uma cascata que já estava rodando também para de repassar a vaga. Se todos os pacientes do bloco cancelarem, a vaga volta a poder ir para a lista de espera.

O banco garante as regras mesmo com duas recepções clicando ao mesmo tempo. Aceitar grava o agendamento do encaixe, a saída do candidato da lista de espera e a decisão em uma única transação. Índices únicos parciais impedem duas decisões para a mesma posição do bloco e mais de uma recusa por bloco. Se o horário recebeu outra decisão ou o candidato saiu da lista de espera nesse meio tempo, nada é gravado, a API responde 409 (`OVERBOOKING_CONFLICT`) e o cartão mostra o aviso.

Erros que a API devolve com código (400): `NOT_HIGH_RISK`, `LIMIT_REACHED`, `ALREADY_REFUSED`, `NO_CANDIDATES`, `ANCHOR_NOT_ACTIVE` e `ANCHOR_IS_ENCAIXE` (um encaixe não motiva outro encaixe).

## Detecção de booking duplo

Às vezes o paciente marca a mesma consulta duas vezes, por exemplo uma em cada unidade da rede, e só vai a uma. A outra vira falta. O painel avisa a recepção, que pergunta ao paciente pelo WhatsApp qual horário ele quer manter. O horário que ele descarta volta a ser uma vaga reaproveitável.

Quando dois horários contam como duplicidade:

1. São do mesmo paciente e do mesmo serviço. Consulta é comparada pela especialidade e exame, pelo nome do exame, sem diferenciar maiúsculas de minúsculas.
2. Os dois estão ativos (pendente ou confirmado). Horário liberado, remarcado ou já realizado não entra.
3. Estão a até `DUPLICATE_WINDOW_DAYS = 30` dias um do outro, em `src/domain/duplicate-booking/duplicate-rules.ts`. Horários em sequência formam um grupo só: se A e B estão a 20 dias e B e C também, os três ficam juntos.
4. Unidades diferentes não impedem a detecção. É justamente o caso mais comum.

Retorno legítimo nunca é marcado. O agendamento de retorno guarda o horário de origem em `return_of_appointment_id`, e um retorno do mesmo paciente e do mesmo serviço fica fora da detecção, mesmo dentro da janela e mesmo que a consulta de origem ainda não tenha acontecido. Se o vínculo apontar para outro paciente ou outro serviço, o dado está errado e o horário volta a ser analisado normalmente. A regra é uma função pura (`findDuplicateGroups`) com testes para esses casos.

Unidades: a tabela `clinic_units` guarda as unidades da rede e cada agendamento pode apontar para uma (`unit_id`). Agendamentos antigos continuam sem unidade. A agenda mostra a unidade abaixo da especialidade e o encaixe herda a unidade do horário que motivou a sugestão.

Como funciona:

1. No painel, o alerta **Possível booking duplo** aparece acima da agenda com o paciente, o serviço e cada horário com a unidade. Na agenda, as linhas do grupo ganham o selo **Possível duplicidade**.
2. **Enviar confirmação reforçada** registra a pergunta para o paciente. Enquanto grava, o botão mostra **Enviando…** e fica bloqueado. Depois, o alerta mostra **Aguardando o paciente escolher no WhatsApp**.
3. No mock WhatsApp, a aba **Confirmação reforçada** mostra a mensagem com os horários e um botão **Manter** para cada um. Enquanto a escolha é gravada, o botão escolhido mostra **Enviando…** e os outros ficam bloqueados.
4. O horário mantido fica **Confirmado**. Os outros ficam **Liberados**, com o selo **Liberado por duplicidade** na agenda, e o alerta some.

Convivência com o resto do fluxo: o horário descartado é uma vaga liberada como qualquer outra, então pode entrar na [oferta em cascata](#oferta-de-vaga-em-cascata) e respeita a cobertura por [encaixe](#overbooking-guiado-pelo-score). Se o paciente já respondeu NÃO em um dos horários pela confirmação de presença, o grupo se desfaz: o alerta some e uma escolha pendente responde 400 com o código `GROUP_DISSOLVED`.

O banco garante as regras mesmo com cliques ao mesmo tempo. Um índice único parcial deixa só uma confirmação aguardando por grupo. A escolha grava a confirmação, o horário mantido e os liberados em uma única transação, e só funciona se a confirmação ainda estiver aguardando e os horários continuarem ativos. Se outra requisição chegou antes, nada é gravado, a API responde 409 (`DUPLICATE_CHECK_CONFLICT`) e a tela mostra o aviso.

Erros que a API devolve com código (400): `NOT_A_DUPLICATE_GROUP` (os horários não formam mais uma duplicidade), `ALREADY_SENT`, `CHECK_NOT_OPEN` (o paciente já escolheu), `APPOINTMENT_NOT_IN_CHECK`, `APPOINTMENT_NOT_ACTIVE` e `GROUP_DISSOLVED`.

## Indicadores de vagas recuperadas

A página `/indicadores` mostra, em números, quanto o AgendaCerta recuperou: vagas que ficariam vazias e voltaram a ter paciente, quanto isso vale e como anda a taxa de faltas.

Uma vaga conta como recuperada quando volta a ter paciente: um aceite na [oferta em cascata](#oferta-de-vaga-em-cascata) ou um [encaixe](#overbooking-guiado-pelo-score) aceito. Cada aceite conta uma vez. Se o novo paciente também cancelar e a vaga for preenchida de novo, são duas recuperações. A origem é o motivo de a vaga ter ficado livre:

| Origem | Quando conta |
| --- | --- |
| Leilão | Cancelamento comum (o paciente respondeu NÃO ou pediu remarcação) preenchido pela cascata |
| Preparo | Vaga liberada porque o paciente não ia cumprir o [preparo do exame](#checklist-de-preparo), preenchida pela cascata |
| Booking duplo | Horário descartado na [confirmação reforçada](#detecção-de-booking-duplo), preenchido pela cascata |
| Overbooking | Encaixe aceito num horário de risco alto |

Os outros números:

- **Lista de espera atendida:** quantos pacientes diferentes da fila ganharam horário, somando cascata e encaixe.
- **Taxa de faltas:** faltas divididas por faltas mais comparecimentos dos atendimentos do período. Sem nenhum atendimento encerrado, o cartão mostra "Sem comparecimentos registrados no período" em vez de 0%.
- **Valor estimado:** soma do preço médio de cada vaga recuperada, R$ 200 por consulta e R$ 150 por exame. São valores de referência para a demonstração, não tabela de convênio, e ficam em `AVERAGE_PRICE_BRL`, em `src/domain/recovery-metrics/recovery-rules.ts`. A página mostra os valores usados.

Período: tudo conta pela data do horário recuperado (ou da consulta, na taxa de faltas), no fuso da clínica (`America/Maceio`). A semana vai de segunda a domingo e o mês é o do calendário. A página abre no período atual e as setas levam ao anterior ou ao próximo. Ao trocar entre semana e mês, se o período na tela inclui hoje, a página vai para o período de hoje; senão, para o que contém o início do período mostrado.

Estados da tela: **Calculando indicadores…** enquanto busca, aviso com **Tentar de novo** se a busca falhar e "Ainda não há dados neste período" quando não há recuperação nem atendimento encerrado. Com faltas mas sem recuperação, os cartões aparecem zerados com "Nenhuma vaga recuperada neste período".

Como a origem fica guardada: quando a cascata preenche a vaga, o agendamento passa a ser do novo paciente e a resposta do preparo é apagada, então o motivo se perderia. Por isso cada oferta grava o motivo no momento em que é criada, na coluna `slot_offers.release_reason` (padrão `cancelamento`, o que mantém válidas as ofertas antigas). A vaga só conta como booking duplo se a confirmação reforçada foi resolvida depois do último aceite daquela vaga: se o novo paciente cancelar depois, é um cancelamento comum. O cálculo é feito por funções puras em `src/domain/recovery-metrics/`, com testes para os limites da semana e do mês, a virada do ano e horários perto da meia-noite.

`GET /api/recovery-metrics` aceita `period` (`semana` ou `mes`, padrão `semana`) e `reference` (uma data `AAAA-MM-DD` dentro do período, padrão hoje). Período inválido responde 400 com o código `INVALID_PERIOD` e data inválida, com `INVALID_REFERENCE_DATE`.

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
5. Na vaga liberada de Endocrinologia (Fábio Nunes), escolha o prazo de **2 min** e clique em **Iniciar oferta**. A oferta vai para Igor Santos, que mora perto e espera há mais tempo.
6. No mock WhatsApp, abra a aba **Ofertas de vaga** e clique em **Recusar**. A vaga passa para Lucas Ferreira, também perto, mas na lista há menos tempo. Elena Rocha espera há mais tempo, mas mora longe, então fica por último.
7. Deixe o prazo de Lucas acabar. No painel, a seção **Ofertas de vaga** mostra que ele não respondeu a tempo e que a vaga foi para Elena.
8. No mock, clique em **Aceitar** na oferta de Elena. No painel, a vaga aparece **Confirmada** para ela e o risco de falta é recalculado.
9. No mock, abra a aba **Checklist de preparo**, escolha a ultrassonografia de Marina Costa, responda não para **Bexiga cheia** e clique em **Enviar respostas**.
10. No painel, clique em **Atualizar**: o alerta de preparo não cumprido aparece acima da agenda. Clique em **Liberar vaga**; a vaga vira reaproveitável e dá para iniciar a oferta, que vai para Nelson Araújo, da lista de espera de Ultrassonografia. No mock, clique em **Aceitar** na oferta de Nelson.
11. Na seção **Encaixes sugeridos**, veja a consulta de Neurologia de Ana Souza (64%, risco alto) com os motivos e a sugestão de encaixe para Helena Dias. Clique em **Aceitar encaixe**: Helena entra na agenda no mesmo horário, com o selo **Encaixe**, e a sugestão some.
12. No mock WhatsApp, responda **NÃO** na consulta de Ana Souza em Neurologia (se você usou essa consulta no passo 3, comece do zero com o reset abaixo).
13. Volte ao painel e clique em **Atualizar**. A vaga de Ana fica liberada, mas mostra **Vaga coberta pelo encaixe; não abre leilão**: Helena já ocupa o horário, então nenhuma oferta é iniciada.
14. Acima da agenda, o alerta **Possível booking duplo** mostra Bruno Lima com duas consultas de Endocrinologia, em 22/09 na Unidade Jardins e em 24/09 na Unidade Centro (se você respondeu NÃO em uma delas no passo 3, o alerta não aparece; comece do zero com o reset abaixo). Diego Alves também tem duas consultas de Cardiologia, mas a segunda é o retorno da primeira, então não gera alerta.
15. Clique em **Enviar confirmação reforçada**. O alerta passa a mostrar que aguarda a escolha do paciente.
16. No mock WhatsApp, abra a aba **Confirmação reforçada** e clique em **Manter** no horário de 22/09.
17. No painel, clique em **Atualizar**. A consulta de 22/09 fica **Confirmada**, a de 24/09 fica **Liberada** com o selo **Liberado por duplicidade** e já dá para iniciar a oferta em cascata para a lista de espera de Endocrinologia.
18. Inicie a oferta dessa vaga de 24/09 e, no mock, clique em **Aceitar** na oferta do próximo paciente da fila de Endocrinologia.
19. Abra `/indicadores`. A página abre na semana atual; use a seta da esquerda até a semana de 21/09 a 27/09/2026. Ela mostra 4 vagas recuperadas, uma de cada origem (leilão, preparo, booking duplo e overbooking), R$ 750 de valor estimado (3 consultas e 1 exame) e 4 pacientes da lista de espera atendidos. A taxa de faltas mostra que ainda não há atendimento encerrado nessa semana.
20. Clique em **Mês**: setembro de 2026 mostra as mesmas 4 vagas e taxa de faltas de 50% (2 faltas em 4 atendimentos do histórico).

Para repetir a demonstração do zero no banco local, rode `npx supabase db reset` na raiz e depois `pnpm auth:create-user`.

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
