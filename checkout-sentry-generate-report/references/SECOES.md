# Raio-X do checkout: seções sugeridas

Este é o padrão proposto para o relatório completo: cabeçalho, 10 seções e rodapé, numa página única de uma coluna.
É o ponto de partida quando o usuário pede o Raio-X sem dizer o que quer ver. Não é obrigatório: se o pedido for um
recorte, outra ordem ou outro formato, use só as seções e os gráficos que respondem a ele (veja `GALERIA.md`).

A ordem vai do amplo ao específico: onde se perde gente (1), por quê (2 a 5 e 9), para quem (6 e 7), o que fazer (8)
e como evolui (10). A composição pronta desse padrão está em `examples/raio-x-completo.js`.

Campos do JSON: `checkout-sentry-data-extract/references/KPIS.md`.

Em qualquer recorte valem as regras de fidelidade: todo gráfico mostra todas as linhas que vieram nos dados (listas com
mais de 25 linhas ganham rolagem interna), sem filtro silencioso e sem classificação por texto livre. Nomes de produto,
de frete, de cupom, siglas de UF, identificadores de método de pagamento e mensagens de erro aparecem exatamente como
vieram do checkout. Um corte pedido pelo usuário (por exemplo, só as 10 maiores) é dito no título do gráfico.

## Narrativa

Cada seção tem um título-conclusão (até 100 caracteres) e um contexto (uma a três frases, até 420 caracteres). O
subtítulo resume o relatório em uma frase a partir da visão geral. Na composição sugerida, esses textos ficam no objeto
`NARRATIVA` no topo de `examples/raio-x-completo.js`.

---

## Cabeçalho
- **Blocos:** `fonte` (loja, cadastros da base), `periodo` (início, fim, dias, disponível), `checkouts`, `avisos`.
- **Visualização sugerida:** loja, título, barra verde, subtítulo, período, volume coletado × disponível, tamanho da base e os avisos em pílulas amarelas. Sem avisos, pílula verde "coleta completa".
- **Objetivo:** calibrar a confiança do leitor antes de qualquer número.

## 1. Visão geral (`visao_geral`)
- **Blocos:** `taxa_abandono`, `pessoas`, `desfecho`, `recuperaveis`, `valor_recuperavel`, `funil`, `parou`.
- **Visualização sugerida:** número-herói com a taxa de abandono; blocos de valor abandonado, compras concluídas, pessoas recuperáveis e anônimos; funil em barras com a queda entre etapas (pessoas e valor), a maior queda em vermelho.
- **Objetivo:** mostrar em que etapa a jornada perde mais gente e mais dinheiro e dar o ponto de partida para as outras seções.
- **Receita do título:** a etapa da maior queda (`parou` com maior `n`) e, se for diferente, a de maior valor.

## 2. Frete (`frete`)
- **Blocos:** `frete.opcoes`, `frete.gratis`, `frete.pago`, `frete.peso_mediano_pago`, `frete.abandonos_sem_frete`.
- **Visualização sugerida:** destaques de taxa grátis × pago com os tickets, peso mediano do frete (abandonou × concluiu) e abandonos antes de escolher frete; barras empilhadas por opção (largura = volume, taxa à direita); nota fixa sobre a mistura entre frete e ticket.
- **Objetivo:** medir a relação entre custo de frete e desistência e se o frete pesa mais para quem desiste.
- **Receita do título:** comparar a taxa do grátis e do pago **junto** com a diferença de ticket. Nunca afirmar que o frete causa o abandono só pela diferença de taxa.

## 3. Estados (`estados`)
- **Blocos:** `regioes` (inclui `frete.gratis`, `frete.pago`, `opcoes` por UF). A UF aparece pela sigla, como veio, sem conversão para o nome do estado. `uf: null` é o grupo sem UF informada.
- **Visualização sugerida:** destaques (UF com mais abandonos, maior taxa entre UFs sem amostra pequena, checkouts sem UF); barras de frete grátis × pago de todas as UFs que tiveram frete escolhido; abandono de todas as UFs por volume; tabela. Amostra pequena esmaecida.
- **Objetivo:** separar comportamento geográfico de efeito indireto da política de frete e apontar onde testar frete. O grupo sem estado sinaliza quem não avançou no formulário.
- **Receita do título:** dizer se a taxa varia por estado ou só acompanha o volume, e onde o frete pago destoa.

## 4. Métodos de pagamento (`pagamento`)
- **Blocos:** `pagamento.metodos` (identificador do método como veio), `pagamento.abandonos_sem_metodo`, `erros.tipos` (código `PAYMENT_ERROR`), `erros.mensagens` com `codigo` `PAYMENT_ERROR`, `erros.tentativas_pagamento`.
- **Visualização sugerida:** destaques (checkouts com erro de pagamento e a taxa entre eles, taxa em 1 tentativa × última faixa, abandonos antes do método); barras empilhadas por método; barras por mensagem de erro exata com a parte que abandonou; resultado por número de tentativas; tabela de todas as mensagens.
- **Objetivo:** separar o problema do meio de pagamento do problema de execução e mostrar o efeito de insistir sem sucesso. A leitura de cada mensagem (falha do cliente, do banco ou da integração) é sua, na narrativa: os gráficos não classificam texto.
- **Receita do título:** a mensagem ou o método que mais pesa, com o número.

## 5. Cupons (`cupons`)
- **Blocos:** `erros.tipos` (código `DISCOUNT_ERROR`), `erros.mensagens` com `codigo` `DISCOUNT_ERROR` (mensagem exata, checkouts, abandonos, anônimos, taxa).
- **Visualização sugerida:** destaques (taxa entre quem teve erro de cupom, anônimos com erro, mensagens distintas); barras por mensagem exata com a parte que abandonou; tabela de todas.
- **Objetivo:** avaliar se a promoção está bem comunicada e configurada. Ao ler as mensagens, separe regra de elegibilidade, comunicação da campanha e digitação.
- **Receita do título:** o padrão que domina nas mensagens e o que ele indica.

## 6. Produtos (`produtos`)
- **Blocos:** `produtos` (todos os itens dos carrinhos, por `product_id`).
- **Visualização sugerida:** destaques (produto com mais abandonos, maior valor abandonado, total de produtos); barras empilhadas de todos os produtos com valor e unidades na legenda; tabela com ID e SKU.
- **Objetivo:** mostrar onde o abandono se concentra em volume e onde pesa em dinheiro, separando produto de entrada, ticket alto e acessório.
- **Receita do título:** o produto que concentra o dinheiro parado, contrastado com o de maior volume quando forem diferentes.

## 7. Combinações de carrinho (`combinacoes`)
- **Blocos:** `combinacoes` (`ids`, `produtos`, `qtd_produtos`, `n`, taxa, `ticket_medio`).
- **Visualização sugerida:** destaques (percentual de carrinhos de produto único, taxa e ticket produto único × vários, composição que mais converte sem amostra pequena); barras empilhadas de todas as composições, com os produtos unidos por "+".
- **Objetivo:** medir venda cruzada e quais composições convertem mais, e se algum item sozinho tende a não fechar.
- **Receita do título:** o peso do carrinho de produto único e a diferença de conversão para os carrinhos combinados.

## 8. Recuperação (`recuperacao`)
- **Blocos:** `recuperaveis`, `valor_recuperavel`, `clientes` (`abandonados_sem_optin`, `recuperaveis.por_canal`, `por_ponto`, `ticket_medio`, `recorrentes`, `multicanal`, `sem_erro`, `base_sem_optin`), `pessoas.voltaram_para_finalizar`.
- **Visualização sugerida:** barra dividida (com opt-in em verde, na base sem opt-in em amarelo, fora da base em vermelho); cartões por canal, com pílula de alerta quando nenhum cliente da base tem opt-in naquele canal; destaques; barras por etapa de parada.
- **Objetivo:** é a seção de ação. Quem é contatável, por qual canal e com que mensagem (a etapa em que parou orienta o tom). Mostra também quem não pode ser contatado e canais sem coleta de consentimento, que podem ser falha de configuração.
- **Receita do título:** quantas pessoas e quanto valor dá para acionar, e pelo canal principal. Se um canal tem zero opt-in na base, o contexto diz que pode ser coleta desativada, não falta de interesse.

## 9. Formulário (`formulario`)
- **Blocos:** `erros.por_etapa` com `codigo` `INPUT_INVALID` ou `INPUT_REQUIRED`. A etapa vem da sequência de eventos (a que o cliente preenchia quando o alerta apareceu), não do texto.
- **Visualização sugerida:** dois gráficos lado a lado, um com os alertas da etapa de pagamento e outro com os de contato, endereço e frete, todos com a mensagem exata (barra = checkouts com alerta, trecho vermelho = quantos abandonaram); tabela com todos.
- **Objetivo:** localizar atrito de usabilidade. São erros do cliente, não do sistema, e apontam melhorias de máscara, validação e mensagem.
- **Receita do título:** a etapa e as mensagens que mais travam, com a sugestão de melhoria no contexto.

## 10. Tendência (`tendencia`)
- **Blocos:** `por_dia` (`total`, `abandonados`, `concluidos`, `anonimos`, `em_andamento`, `ticket_medio` e `frete_medio` com `geral`, `abandonados`, `concluidos`).
- **Visualização sugerida:** três gráficos por dia, um abaixo do outro: checkouts empilhados (concluiu, abandonou, anônimo ou em andamento); ticket médio e frete médio em barras lado a lado (abandonou × concluiu) com marcador da média geral. Médias não se empilham, por isso ficam lado a lado.
- **Objetivo:** mostrar se o volume de checkouts sobe ou cai no período e se ticket e frete mudam de padrão.
- **Receita do título:** a direção do volume. Com menos de 7 dias ou com `periodo.curto`, o título diz que o período não permite ler tendência.

## Rodapé
Sugerido: definição da taxa, regra de pessoa pelo último checkout, exclusão dos anônimos, critério de recuperável, regra de amostra pequena, arquivo de origem, data de exportação, base de clientes, fuso e moeda (R$).
