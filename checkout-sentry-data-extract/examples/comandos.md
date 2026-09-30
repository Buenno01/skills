# Exemplos de comandos

Todos rodam a partir da raiz do projeto, pelo roteador. `<skill>` é a pasta desta skill. Os caminhos de entrada são os que o usuário anexou ou indicou.

## CSV

### Básico

```
python3 <skill>/scripts/extract.py checkouts-export-30d.csv --clientes clientes.csv
```

Fuso UTC, valores em R$. Imprime avisos, a tabela de indicadores e as notas de método.

### Fuso

```
python3 <skill>/scripts/extract.py checkouts.csv --clientes clientes.csv --tz <fuso IANA>
```

### Base de clientes em vários CSVs

```
python3 <skill>/scripts/extract.py checkouts.csv --clientes <pasta com os CSVs de clientes>
```

### UF conta como entrega

```
python3 <skill>/scripts/extract.py checkouts.csv --clientes clientes.csv --uf-conta-entrega
```

### Dados completos para gráficos, planilhas ou páginas

```
python3 <skill>/scripts/extract.py checkouts.csv --clientes clientes.csv --json metricas.json --csv indicadores.csv
```

`metricas.json` tem as listas linha a linha (cupons, checkouts com erro de frete). `indicadores.csv` tem a tabela plana com valores brutos, pronta para planilha.

### Reaproveitar um cálculo

```
python3 <skill>/scripts/extract.py --de-json metricas.json
```

Não relê os CSVs: reimprime a tabela a partir do JSON. O `--de-json` já leva ao fluxo CSV.

### Via skill

```
/checkout-sentry-data-extract checkouts.csv --clientes clientes.csv
/checkout-sentry-data-extract checkouts.csv --clientes clientes.csv quero uma planilha
/checkout-sentry-data-extract os dois arquivos anexados, me diga onde está o maior valor perdido
```

## JSON

### Básico

```
python3 <skill>/scripts/extract.py checkouts_<loja>_30d_<data>.json --clientes clientes.csv
```

Grava `kpis-checkouts-<data>.json` ao lado do arquivo de entrada.

### JSONL

```
python3 <skill>/scripts/extract.py checkouts.jsonl --clientes clientes.csv
```

Um checkout por linha. Uma linha sem `checkout_token` (ou com `checkouts`) é lida como metadados (`period`, `total_disponivel`, `total_coletado`).

### Saída em outro lugar ou no stdout

```
python3 <skill>/scripts/extract.py <arquivo> --clientes clientes.csv --saida kpis.json
python3 <skill>/scripts/extract.py <arquivo> --clientes clientes.csv --saida - | jq '.pagamento.metodos[0]'
```

### Forçar o fluxo

```
python3 <skill>/scripts/extract.py export_sem_extensao --fluxo json --clientes clientes.csv
```

### Via skill

```
/checkout-sentry-data-extract checkouts_<loja>_30d_<data>.json --clientes clientes.csv
/checkout-sentry-data-extract o JSON e a base anexados: só o método de pagamento mais abandonado, em texto
/checkout-sentry-data-extract: atualizar o artefato <url do artefato publicado>
```

## Testes

```
cd <skill>/scripts/csv && python3 -m unittest discover .
cd <skill>/scripts/json && python3 -m unittest discover .
```
