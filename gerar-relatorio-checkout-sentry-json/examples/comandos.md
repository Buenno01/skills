# Exemplos de comandos

Todos rodam a partir da raiz do repositório.

## Básico

```
python3 .claude/skills/gerar-relatorio-checkout-sentry-json/scripts/kpis.py "Análises/CheckoutSentry/checkouts_wine-com-mx.myshopify.com_30d_2026-09-30T00-24-32.json"
```

Grava `kpis-checkouts-<data>.json` ao lado do arquivo, com a base de clientes de `BaseDeClientes/customers_export`.

## JSONL

```
python3 .claude/skills/gerar-relatorio-checkout-sentry-json/scripts/kpis.py Análises/CheckoutSentry/checkouts.jsonl
```

Um checkout por linha. Uma linha sem `checkout_token` (ou com `checkouts`) é lida como metadados (`period`, `total_disponivel`, `total_coletado`).

## Saída em outro lugar ou no stdout

```
python3 .claude/skills/gerar-relatorio-checkout-sentry-json/scripts/kpis.py <arquivo> --saida /tmp/kpis.json
python3 .claude/skills/gerar-relatorio-checkout-sentry-json/scripts/kpis.py <arquivo> --saida - | jq '.pagamento.metodos[0]'
```

## Moeda e base de clientes

```
python3 .claude/skills/gerar-relatorio-checkout-sentry-json/scripts/kpis.py <arquivo> --currency 'R$' --clientes BaseDeClientes/outro_export
```

## Testes

```
python3 -m unittest discover .claude/skills/gerar-relatorio-checkout-sentry-json/scripts
```

## Via skill

```
/gerar-relatorio-checkout-sentry-json
/gerar-relatorio-checkout-sentry-json Análises/CheckoutSentry/<arquivo>.json — só o método de pagamento mais abandonado, em texto
/gerar-relatorio-checkout-sentry-json — atualizar o artefato https://claude.ai/artifact/VMNVNpDpMT1A6bfAV7uVRq
```
