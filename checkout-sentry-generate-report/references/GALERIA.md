# Galeria: como apresentar cada KPI

O kit (`assets/kit.css` e `assets/kit.js`) tem um componente por padrão visual. `examples/galeria.html` mostra todos
com dados sintéticos: abra no navegador para ver antes de escolher. O código de cada exemplo está em
`examples/galeria.js`, que é ele mesmo uma composição do `montar.py`. Nenhum componente calcula KPI, eles só desenham
o que recebem do `kpis.json`.

A escolha é sua, a partir do pedido. A tabela abaixo é a sugestão de partida.

## Página HTML

| Pergunta que o gráfico responde | Padrão | Função | Blocos do `kpis.json` |
|---|---|---|---|
| Qual é o quadro geral? | Número-herói com grade de cards | `Kit.heroi` | `taxa_abandono`, `pessoas`, `desfecho`, `recuperaveis` |
| Quais números sustentam a conclusão da seção? | Linha de destaques | `Kit.destaques` | qualquer |
| Em que etapa se perde mais gente e dinheiro? | Funil com queda | `Kit.funil` | `funil`, `parou` |
| Qual categoria abandona mais? | Barras empilhadas concluiu × abandonou | `Kit.empilhadas` | `frete.opcoes`, `regioes`, `pagamento.metodos`, `produtos`, `combinacoes`, `erros.tentativas_pagamento` |
| Quantas vezes cada erro aparece e quantos desistiram? | Barras simples com parte destacada | `Kit.simples` | `erros.mensagens`, `erros.por_etapa`, `clientes.recuperaveis.por_ponto` |
| Um subgrupo muda o resultado dentro de cada grupo? | Empilhadas agrupadas | `Kit.agrupadas` | `regioes[].frete` (grátis × pago por UF) |
| Como um total se divide? | Barra 100% segmentada | `Kit.segmentada` | `recuperaveis`, `clientes.abandonados_sem_optin` |
| Quanto cada canal ou item vale? | Cartões | `Kit.cartoes` | `clientes.recuperaveis.por_canal` |
| O volume sobe ou cai? | Colunas empilhadas por dia | `Kit.colunasEmpilhadas` | `por_dia` |
| Médias mudam de padrão no período? | Colunas lado a lado com média | `Kit.colunasPares` | `por_dia[].ticket_medio`, `por_dia[].frete_medio` |
| Qual é a direção de uma série? | Linha no tempo (SVG) | `Kit.linhaTempo` | `por_dia` |
| Onde duas dimensões se concentram? | Tabela de calor | `Kit.calor` | `erros.por_etapa` (etapa × tipo) |
| Quais são os números completos? | Tabela recolhível | `Kit.tabela` | o mesmo bloco do gráfico |
| Como comparar dois recortes da mesma medida? | Lado a lado | `Kit.ladoALado` | qualquer |

Estrutura: `Kit.cabecalho` (sempre com `K.avisos`), `Kit.secao` para cada bloco de conteúdo e `Kit.rodape` com a metodologia.
Formatação: `Kit.din` (R$), `Kit.pct` (taxa de 0 a 1), `Kit.int`, `Kit.data`, `Kit.diaCurto`, `Kit.seg` (segundos) e `Kit.uf` (sigla ou "Sem UF").

### Como montar

1. Copie `examples/raio-x-completo.js` para a pasta de trabalho, ou escreva uma composição nova com `function pagina(K, Kit)` que devolve o HTML.
2. Use só os componentes que respondem ao pedido. Para um recorte (uma seção, um gráfico), a composição pode ter só `Kit.cabecalho` e uma `Kit.secao`.
3. Rode `scripts/montar.py`, que junta kit, KPIs e composição num HTML único.

## Outros formatos

O kit é para página. Para outros formatos, use os mesmos números e as mesmas regras de fidelidade:

- **Resposta no chat:** texto curto com a conclusão e até três números, seguido de uma tabela Markdown quando houver comparação. Exemplo de tabela:

  | Método | Chegaram | Abandonaram | Taxa de abandono |
  |---|---:|---:|---:|
  | `<metodo>` | 120 | 48 | 40,0% |

  Os avisos do export vão numa linha antes ou depois da tabela.
- **Planilha:** uma aba por bloco do `kpis.json` (colunas iguais aos campos, valores brutos, taxa de 0 a 1 formatada como %), mais uma aba "Avisos". Siga a skill de planilha e a `identidade-visual-shakers`.
- **Deck:** um slide por seção, com o título-conclusão como título do slide, um gráfico e no máximo dois números de apoio. Avisos no slide de abertura.
- **Um número só:** o número, a base do percentual e o período. Exemplo: "58,4% das pessoas com contato abandonaram, de 01/01 a 07/01".
