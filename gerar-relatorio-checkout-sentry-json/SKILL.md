---
name: gerar-relatorio-checkout-sentry-json
description: Calcula os KPIs de checkout (eventos, tempo por passo, método de pagamento, frete, regiões, produtos, erros e cruzamento com a base de clientes) a partir do export JSON/JSONL do Checkout Sentry e entrega no formato que o pedido pedir.
disable-model-invocation: true
argument-hint: "[caminho do JSON/JSONL] [--currency SÍMBOLO] [--clientes PASTA_OU_CSV] [--saida JSON]"
---

O script `scripts/kpis.py` só calcula: ele lê o export do Checkout Sentry e a base de clientes e grava um JSON de KPIs. **Formato, estilo e recorte da entrega são decisão sua**, conforme o que o usuário pedir: artefato, documento, mensagem curta, tabela, só um número.

## Parâmetros

`$ARGUMENTS` é o caminho do arquivo seguido de flags opcionais, e o que for pedido sobre a entrega. Repasse as flags ao script.

| Parâmetro | Efeito | Padrão |
|---|---|---|
| `<arquivo>` (posicional) | `.json` (objeto com `checkouts`) ou `.jsonl` (um checkout por linha) | o mais recente de `Análises/CheckoutSentry/` |
| `--currency SÍMBOLO` | Rótulo gravado em `fonte.moeda`. Não converte valores | `MX$` |
| `--clientes PASTA_OU_CSV` | Base de clientes (pasta com CSVs ou um CSV) | `BaseDeClientes/customers_export` |
| `--saida JSON` | Onde gravar. `-` escreve no stdout | `kpis-checkouts-<data>.json` ao lado do arquivo |

Exemplos em `examples/comandos.md`.

## Passos

1. **Arquivo.** Use o caminho em `$ARGUMENTS`. Sem caminho, pegue o mais recente:
   `ls -t Análises/CheckoutSentry/checkouts_*.json* | head -1`.

2. **Calcular**, a partir da raiz do repositório:
   ```
   python3 .claude/skills/gerar-relatorio-checkout-sentry-json/scripts/kpis.py <arquivo> [flags]
   ```
   A saída é `JSON: <caminho>`, uma linha de totais e `AVISO:` para cada limitação do export.
   Se sair `ERRO:`, mostre a mensagem ao usuário e encerre aqui.

3. **Ler o JSON** e `references/KPIS.md`, que define cada campo. Use só os números do JSON. Não recalcule nem estime.

4. **Entregar** no formato pedido. Sem indicação, pergunte ou escolha o mais simples que responda à pergunta. Em qualquer formato:
   - mostre os `avisos`;
   - não trate como conclusão uma taxa com `amostra_pequena: true`;
   - não inclua nome, e-mail ou telefone;
   - use o rótulo de `fonte.moeda`.

   Para um artefato visual, siga `Documentação/Tema/Identidade Visual Wine.md`. Para atualizar um artefato existente, passe a `url` dele. Sem `url`, a publicação cria uma cópia nova.
