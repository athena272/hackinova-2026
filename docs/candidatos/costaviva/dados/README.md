# Dados seed — CostaViva

Arquivo principal: `zonas-criticas.seed.geojson`

## Como usar
- Carregar no Leaflet como camada “Zonas críticas (literatura)”
- Exibir popup com `nome`, `taxa_resumo`, `fonte` e link
- Deixar claro na UI: **não é sensor em tempo real**

## Campos principais
- `severidade`: alta | media | baixa
- `taxa_resumo`: texto legível para o pitch
- `fonte` / `fonte_url` / `ano_referencia`: rastreabilidade

## Limite
Coordenadas são **aproximadas** para demo. Refinar com mapa/GPS antes da apresentação final se este for o tema escolhido.
