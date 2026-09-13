# Hackinova 2026 — Tarefa 01 (Entrega)
## Problema, Usuário e Proposta de Valor

**Equipe:** InnovaPair  
**Área:** Mudanças Climáticas  
**Projeto:** monitoramento participativo e operacional da erosão costeira no litoral sergipano  
**Produto (provisório):** CostaViva

---

### 1. Problema
Municípios litorâneos de Sergipe (ex.: Estância/Praia do Saco, Aracaju/Coroa do Meio, Barra dos Coqueiros, Pirambu) enfrentam erosão costeira e/ou fluvial: perda de faixa de areia, danos a calçadões/estruturas e risco a moradias. A evidência chega de forma fragmentada (notícia, vistoria, pesquisa pontual), dificultando resposta rápida de moradores e órgãos públicos.

**Em uma frase:** a orla muda, mas o risco não chega a tempo — nem geolocalizado — para quem precisa agir.

### 2. Evidências
- G1 (2024): erosão intensa ou moderada em **68 km** dos 147 km do litoral sergipano (estudo UFS).
- UFS: na Praia do Saco, águas do Rio Piauí avançaram cerca de **130 m em 10 anos**; trechos com erosão extrema.
- Dissertação UFS: taxas de variação da linha de costa no Saco entre **-14,8 e +13,6 m/ano** (há também acresção — a costa não é uniforme).
- UFS investiga dinâmica do estuário do Rio Sergipe e hipótese de influência marinha canal adentro (salinidade ainda em estudo).
- Já existem CoastSnap Brasil (totens/pesquisa) e alertas gerais (ex. 40199/CEMADEN), mas com cobertura e propósito diferentes.

### 3. Usuário principal
**Carla, 38** — moradora/comerciante de orla em área crítica; usa WhatsApp/celular; precisa registrar e acompanhar o avanço após ressacas.  
**Usuário secundário:** analista da Defesa Civil / Semac — consome mapa e histórico para priorizar vistoria e comunicação.

### 4. Mapa de Empatia (síntese)
| | |
|---|---|
| **Pensa/sente** | “Onde o mar chegou, não recua.” Medo de perder casa/negócio. |
| **Vê** | Faixa de areia sumindo, muros, casas abandonadas, obras judiciais travadas. |
| **Ouve** | Alertas genéricos, notícias pontuais, “não pode construir contenção”. |
| **Fala/faz** | Tira foto no celular; cobra poder público; improvisos locais. |
| **Dores** | Falta de evidência acumulada e canal simples para reportar com local. |
| **Ganhos** | Relato geolocalizado + mapa que mostre recorrência do risco. |

### 5. Jobs to Be Done
> Quando a orla muda após ressaca/maré,  
> quero registrar e visualizar o risco com evidência geolocalizada,  
> para decidir contenção, alerta ou desocupação sem depender só de notícia pontual.

### 6. Alternativas atuais
CoastSnap (pontos fixos/ciência cidadã), monitoramento acadêmico UFS, notícias, Alerta SMS/CEMADEN (mais chuva/risco geral), vistoria presencial.  
**Limitação:** pouca integração operacional móvel + dashboard municipal em tempo quase real.

### 7. Proposta de valor
**Para o cidadão:** relatotar dano/perda de areia com foto e localização em minutos.  
**Para a gestão:** mapa de calor de relatos + zonas críticas baseadas em literatura, para priorizar ação.

### 8. Solução inicial (não finalizada)
**CostaViva** — web app com:
1. mapa de risco (Leaflet) com zonas seed + relatos;
2. formulário de relato visual geolocalizado;
3. dashboard temporal simples (densidade/recência).

**Stack MVP:** Next.js + API Routes + Supabase + Vercel.  
**Dados:** OSM/IBGE + GeoJSON seed (UFS/G1) + relatos novos. Sem pipeline satelital obrigatório no hackathon (CASSIE/GEE como evolução).  
**IA como meio:** priorização de relatos por densidade/recência.

### Alinhamento temático (2026)
O tema dialoga com a agenda da **CSBC 2026** (Gramado–RS, 19–23/07): *Transformação Digital para um Mundo em Emergência Climática* — https://csbc.sbc.org.br/2026/

---

**InnovaPair** · Hackinova 2026 · Innovation Hub × OPIN
