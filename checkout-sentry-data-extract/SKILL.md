---
name: checkout-sentry-data-extract
description: Camada de dados do Checkout Sentry. Lê o export CSV (tabela de indicadores de checkouts, abandono, opt-ins, valor recuperável e erros de frete, cupom e pagamento) ou o JSON/JSONL coletado do navegador (KPIs de funil, tempo por passo, método de pagamento, frete, UFs, produtos, combinações de carrinho, erros e recuperação), sempre cruzado com o export de clientes da Shopify. Os números saem de scripts determinísticos. O agente decide como apresentar.
disable-model-invocation: true
argument-hint: "<checkouts .csv | .json | .jsonl> --clientes <csv ou pasta de csvs> [--fluxo csv|json] [flags do fluxo] | --de-json <metricas.json>  + o que você quer como resultado"
---

Esta skill só calcula. Todo número vem de um script, e o formato da entrega (resposta no chat, tabela, planilha, página, deck, e-mail, um número só) é decisão sua, a partir do que o usuário pediu em `$ARGUMENTS` ou na conversa.

Requer Python 3.9+ e só a biblioteca padrão. Valores em dinheiro são sempre em reais (`R$`). Estados aparecem sempre pela sigla da UF, exatamente como vieram no export, sem conversão para o nome.

## Entradas

As duas são obrigatórias. O usuário anexa ou indica o caminho, ou você infere pelo contexto da conversa (um arquivo que acabou de ser baixado ou citado). Nunca invente caminho e nunca procure em pasta fixa. Se faltar uma delas, peça e pare.

1. **Checkouts**, em um de dois formatos:
   - **CSV** exportado da tela do Checkout Sentry, com as colunas `Status`, `Checkout Token`, `Client ID`, `Email`, `Nome`, `Telefone`, `Cidade`, `UF`, `Valor`, `Última atividade`, `Entrou em`, `Tipo de erro`, `Mensagem de erro`.
   - **JSON** gravado pela skill `checkout-sentry-collect-from-browser` (objeto com `checkouts`) ou **JSONL** (um checkout por linha).
2. **Base de clientes** (`--clientes`): um CSV ou uma pasta de CSVs no formato do export de clientes da Shopify, com `Customer ID`, `Email`, `Phone`, `Default Address Phone`, `Accepts Email Marketing`, `Accepts SMS Marketing`, `Accepts WhatsApp Marketing` (e `Total Orders` para o fluxo JSON). Deduplicada por `Customer ID`.

Se faltar coluna ou campo, o script para com `ERRO:` e diz qual.

## Como invocar

Sempre pelo roteador, a partir da raiz do projeto:

```
python3 <pasta da skill>/scripts/extract.py <arquivo> --clientes <csv_ou_pasta> [flags]
```

`<pasta da skill>` é a pasta onde está este `SKILL.md`. Não chame os scripts de `scripts/csv/` ou `scripts/json/` direto.

### Roteamento

O `extract.py` escolhe o fluxo nesta ordem:

1. `--fluxo csv` ou `--fluxo json` explícito vence. A flag é removida antes de repassar os argumentos.
2. Com `--de-json`, o fluxo é CSV.
3. Pelo arquivo posicional: `.csv` vai para CSV, `.json` ou `.jsonl` vai para JSON.
4. Sem posicional, o fluxo é JSON, que para pedindo o arquivo.

Outra extensão sai com `ERRO:` (código 2) e pede `--fluxo`. O fluxo roda em um processo separado. stdout, stderr e o código de saída chegam sem alteração: `0` é sucesso, `1` é `ERRO:` de dado, `2` é argumento inválido.

## Flags

### Fluxo CSV

| Flag | Efeito | Padrão |
|---|---|---|
| `<csv>` (posicional) | CSV do Checkout Sentry | obrigatório, exceto com `--de-json` |
| `--clientes CSV_OU_PASTA` | Base de clientes | obrigatório com o CSV |
| `--tz FUSO` | Fuso IANA para datas e horas | `UTC` |
| `--uf-conta-entrega` | UF sozinha conta como "após preencher entrega" | não conta |
| `--json JSON` | Grava as métricas completas, com as listas linha a linha | não grava |
| `--csv CSV` | Grava a tabela plana de indicadores com valores brutos | não grava |
| `--de-json JSON` | Reimprime a tabela a partir de um JSON gravado antes com `--json`, sem recalcular. Aceita `--csv` | |

### Fluxo JSON

| Flag | Efeito | Padrão |
|---|---|---|
| `<arquivo>` (posicional) | `.json` (objeto com `checkouts`) ou `.jsonl` | obrigatório |
| `--clientes CSV_OU_PASTA` | Base de clientes | obrigatório |
| `--saida JSON` | Onde gravar os KPIs. `-` escreve o JSON no stdout e nada mais | `kpis-checkouts-<data>.json` ao lado do arquivo de entrada |

As datas do fluxo JSON são sempre em UTC, o fuso do Checkout Sentry. Exemplos em `examples/comandos.md`.

## Passos

1. **Confirmar as entradas.** Arquivo de checkouts e base de clientes existem. Se o usuário não disser o fuso no fluxo CSV, use o padrão e diga qual foi usado.
2. **Rodar** o `extract.py`. Se o resultado precisar de listas completas ou virar gráfico ou arquivo, no fluxo CSV acrescente `--json` com um caminho temporário. Se sair `ERRO:`, mostre a mensagem e pare.
3. **Ler a saída** (formato abaixo). No fluxo JSON, leia também `references/KPIS.md`, que define cada campo.
4. **Entregar no formato pedido.** Sem indicação, responda no chat com os indicadores principais e ofereça outros formatos. Para peça visual, siga a skill `identidade-visual-shakers`. Para o relatório completo e padronizado (Raio-X do checkout), use a skill `checkout-sentry-generate-report`, que chama o fluxo JSON.

## Formato de saída

**Fluxo CSV** (stdout, nesta ordem):
- linhas `JSON:` e `CSV:` com os caminhos gravados, se pedidos;
- linhas `AVISO:` (recorte curto ou truncado; o nome do arquivo com `NNd` é comparado com o período real);
- `## Indicadores`: tabela Markdown `Grupo | Chave | Indicador | Valor | % | Base do %`;
- `## Notas de método`: definições usadas no cálculo.

O JSON do `--json` tem os mesmos números em formato estruturado e mais:
- `indicadores`: a tabela plana (`grupo`, `chave`, `indicador`, `tipo`, `valor`, `pct`, `base_pct`). `valor` e `pct` são brutos (`pct` de 0 a 100). `tipo` é `qtd`, `moeda`, `dias` ou `data`.
- `anexo.cupons`: todas as mensagens de erro de cupom exatamente como o checkout exibiu, com tentativas e abandonos.
- `anexo.frete_checkouts`: cada checkout com erro de frete (token curto, status, recuperável, cidade, UF, valor, mudanças de endereço, mensagem).
- `anexo.pagamento` e `anexo.frete`: erros por mensagem.
- `por_dia`, `etapas`, `erros_recuperaveis`, `recuperaveis_detalhe`, `avisos` e `notas_metodo`.

Definições do fluxo CSV: **abandonado** é status `abandonado` ou `com_erro`. **Recuperável** é o abandonado cujo cliente (cruzado por e-mail ou, sem match, por telefone) tem opt-in em ao menos um canal. As demais regras (etapas, frete, cupom, pagamento, empates no top 5) estão nas notas de método da saída.

**Fluxo JSON** (stdout): `JSON: <caminho>`, uma linha de totais e uma linha `AVISO:` por limitação do export. Com `--saida -`, só o JSON. O arquivo tem os blocos descritos em `references/KPIS.md`: `avisos`, `fonte`, `periodo`, `taxa_abandono`, `pessoas`, `desfecho`, `funil`, `parou`, `pagamento`, `frete`, `tempo`, `regioes`, `produtos`, `combinacoes`, `erros`, `clientes`, `por_dia`.

## Regras de fidelidade aos dados

Valem para os dois fluxos, em qualquer formato de entrega:

- **Não recalcule nem estime.** Use valores e percentuais exatamente como saem do script. Se precisar de um número que não está na saída, calcule a partir do JSON e diga que é derivado.
- **Respeite a base do %.** Cada percentual tem a sua base (`checkouts`, `abandonados`, `valor abandonado`, `recuperáveis`, pessoas). Nunca troque a base ao reescrever: "37,9% dos abandonados" não é "37,9% dos checkouts".
- **Leve os avisos junto.** Toda linha `AVISO:` (ou bloco `avisos`) aparece na entrega, perto dos números.
- **Amostra pequena não é conclusão.** No fluxo JSON, taxa com `amostra_pequena: true` não sustenta afirmação.
- **Cite a chave** (CSV) ou o bloco (JSON) quando o usuário perguntar de onde veio um número.
- **Texto dos dados como veio.** Mensagens de erro, nomes de produto, de frete, de cupom e de método de pagamento aparecem exatamente como no export. Não crie categoria a partir de texto livre.
- **Sem filtro silencioso.** Não exclua checkouts, produtos, cupons, fretes ou UFs, nem os que pareçam teste. Um recorte pedido pelo usuário é dito explicitamente na entrega.
- **Sem dados pessoais.** Os scripts não expõem nome, e-mail nem telefone. Não os busque nos arquivos de entrada para montar listas.
- **Moeda e UF.** Valores sempre em `R$`. Estados pela sigla da UF, sem nome por extenso.

## Testes

Cada fluxo tem os seus, rodados separadamente (os módulos têm o mesmo nome):

```
cd <pasta da skill>/scripts/csv && python3 -m unittest discover .
cd <pasta da skill>/scripts/json && python3 -m unittest discover .
```
