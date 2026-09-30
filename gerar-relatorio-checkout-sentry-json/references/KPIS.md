# Campos do JSON de KPIs

Referência para quem apresenta os números. Valores em dinheiro vêm sem formatação, e `fonte.moeda` é só o rótulo. Taxas vão de 0 a 1. Tempos estão em segundos. Floats saem com 4 casas.

## Convenções que valem para tudo

- **Anônimo** = checkout sem e-mail e sem telefone: status `anonimo` do Sentry ou `abandonado`/`com_erro` sem contato (o Sentry marca como abandono quem só abriu o checkout e viu um erro, como um cupom testado). Fica fora dos abandonos e de todas as taxas. `desfecho.anonimo_com_erro` conta os que o Sentry marcava como abandono; nos blocos de erros, `anonimos` mostra quantos checkouts afetados eram anônimos.
- **Abandonado** = status `abandonado` ou `com_erro` com contato. **Concluído** = `concluido`.
- **`taxa`** = taxa de abandono do grupo = abandonados ÷ (abandonados + concluídos). É `null` quando os dois são zero.
- **Pessoa** = e-mail normalizado, senão telefone, senão `client_id`. O desfecho da pessoa é o do seu último checkout abandonado ou concluído, então quem abandonou e depois comprou conta como concluída.
- **Erro × alerta**: erro é o `error_type` do checkout (status `com_erro`: pagamento, cupom, estoque, frete). Alerta é qualquer `alert_displayed`, inclusive validação de campo. Checkout `abandonado` pode ter alerta, mas não tem erro.
- Datas em UTC, o fuso do Checkout Sentry.
- **`amostra_pequena: true`** quando abandonados + concluídos < 5. Não apresente essa taxa como conclusão.
- Listas vêm ordenadas do mais relevante para o menos (por abandonos, alertas ou volume).
- O arquivo não contém nome, e-mail nem telefone, e a entrega também não deve conter.

## Blocos

| Bloco | O que é |
|---|---|
| `avisos` | Frases prontas sobre limitações do export (coleta parcial, período curto). **Sempre mostre ao leitor.** |
| `fonte` | Arquivo, loja, data do export, tamanho da base de clientes, rótulo da moeda. |
| `periodo` | Primeiro evento (`first_event_at`) e última atividade (ISO, UTC). `dias_real` × `dias_nome`. `disponivel`/`coletado` vêm do Sentry. |
| `taxa_abandono` | **Taxa geral**, por pessoa: pessoas que abandonaram ÷ (abandonaram + concluíram). Mesmo número de `pessoas.taxa`. |
| `pessoas` | `total` (inclui anônimos), `abandonados` e `concluidos` por pessoa (anônimos fora), `valor_abandonado` (último carrinho abandonado de cada pessoa), `voltaram_para_finalizar` (abandonaram e depois concluíram, com o valor da compra). |
| `checkouts`, `abandonados`, `valor_abandonado` | Por checkout, sem deduplicar. Uma pessoa que abandonou 3 vezes conta 3. |
| `recuperaveis`, `valor_recuperavel` | Por pessoa: último abandono de quem não voltou para comprar e tem pelo menos um opt-in na base. |
| `desfecho` | Como cada checkout terminou. "Após erro" usa o `error_type` do checkout (erro real, não alerta). |
| `funil` | Por checkout, **sem anônimos** (eles estão em `desfecho.anonimo`): quantos chegaram pelo menos até cada passo (início, contato, endereço, frete, pagamento) e quantos concluíram. É cumulativo e nunca sobe de um passo para o seguinte. Concluído conta em todos os passos, mesmo sem o evento (conta logada, checkout expresso). A queda entre dois passos é o `parou` do passo anterior. |
| `parou` | Abandonos pelo passo mais avançado que o cliente enviou, com valor. |
| `abandonos_fim_em_alerta` | Abandonos cujo último evento foi um alerta de erro, por tipo. |
| `pagamento.metodos` | Por método: quantos chegaram, abandonaram e concluíram. `Não identificado` = `informado`/`creditCard`, dados de cartão sem bandeira, quase sempre com erro. `abandonos_sem_metodo` = saíram antes do pagamento. |
| `frete` | Por opção escolhida, e grátis (`shipping_price` 0) × pago. `peso_mediano_pago` = frete ÷ carrinho, só onde o frete é pago. `Estándar (ejemplo)` é tarifa de exemplo do Shopify. O ticket do frete grátis é bem maior, então parte da diferença de taxa é o carrinho, não o frete. |
| `tempo` | Mediana e p90 do intervalo entre um passo e o passo anterior (1ª ocorrência de cada passo; alertas não contam como passo), concluídos × abandonados. `total` = do primeiro ao último evento, incluindo novas tentativas e alertas. |
| `regioes` | Por UF do checkout, com nome do estado. `uf: "—"` = sem UF, que nunca conclui (convém mostrar fora do ranking). Anônimos têm UF, provavelmente por geolocalização. `frete` = só os checkouts que escolheram frete no estado: `com_frete`, `gratis` e `pago` (n, abandonados, concluídos, taxa; `pago.preco_medio`) e `opcoes` por nome. |
| `produtos` | Por `product_id`. Só o item com prefixo "Regalo: …" é brinde: ele é excluído e contado em `brindes_ignorados`. O mesmo produto sem o prefixo (ex.: "Wine Bag") foi vendido e entra no ranking. `valor` = preço de tabela × quantidade nos abandonados. Um checkout com vários produtos conta em cada um. |
| `combinacoes` | Carrinhos agrupados pelo conjunto de produtos distintos (sem brindes, sem quantidade), sem anônimos. Por combinação: `n` checkouts, abandonados, concluídos, `taxa`, `valor_abandonado`, `ticket_medio` (`cart_value`). `qtd_produtos` = 1 é carrinho de um produto só. |
| `erros.tipos` | Por tipo de alerta (`alert_displayed`): alertas, checkouts afetados, abandonos, concluídos e valores. Recuperação depois do erro = concluídos ÷ (concluídos + abandonados). |
| `erros.mensagens` | Mensagens em espanhol agrupadas em rótulo curto em português. Um checkout com vários erros conta em cada um, então os valores não somam. |
| `erros.cupons`, `erros.pagamento` | Detalhe por código de cupom e por motivo de recusa, com as mensagens originais. |
| `erros.tentativas_pagamento` | Checkouts pelo número de alertas `PAYMENT_ERROR`. |
| `clientes` | Cruzamento com a base: por e-mail normalizado e, sem match, pelos 10 últimos dígitos do telefone. Os blocos de abandonados são **por pessoa** (último abandono de quem não voltou), então `abandonados_sem_optin` (`base`, `fora`) + `recuperaveis` = `pessoas.abandonados`. Traz opt-in, base sem opt-in, recorrente (`Total Orders` > 0) × novo, e detalhe dos recuperáveis por canal, passo, método e estado. Como quem voltou para comprar sai dos abandonos, a compra feita no período não transforma ninguém em "recorrente". WhatsApp em 0% pode ser coleta desativada, não falta de interesse. |
| `por_dia` | Checkouts e abandonos (por checkout) por data da última atividade, em UTC. |
