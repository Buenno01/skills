"""Indicadores de checkouts, opt-ins e recuperação (Checkout Sentry × base de clientes).

Uso (pelo roteador da skill, a partir da raiz do projeto):
    python3 <pasta da skill>/scripts/extract.py <csv_checkouts> --clientes PASTA_OU_CSV
        [--json JSON] [--csv CSV] [--uf-conta-entrega] [--tz FUSO]
    python3 <pasta da skill>/scripts/extract.py --de-json metricas.json [--csv CSV]

Imprime no stdout, em Markdown: avisos, a tabela com todos os indicadores e as notas de método.
--json grava as métricas completas (inclui listas linha a linha, como todos os cupons e cada erro de frete).
--csv grava a tabela plana de indicadores, com valores brutos.
Não gera HTML nem qualquer apresentação: o formato final é decidido por quem consome os dados.
"""
import argparse
import csv
import json
import sys

from load import ColunaFaltando, carregar
from metrics import calcular
from tabela import COLUNAS, avisos, indicadores, markdown, notas_metodo, pacote_json


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('checkouts', nargs='?', help='CSV exportado do Checkout Sentry')
    ap.add_argument('--clientes', help='pasta com CSVs de clientes ou um CSV (obrigatório com o CSV de checkouts)')
    ap.add_argument('--json', help='grava as métricas completas neste JSON')
    ap.add_argument('--csv', help='grava a tabela plana de indicadores neste CSV')
    ap.add_argument('--de-json', help='reusa um JSON gravado antes com --json, sem recalcular')
    ap.add_argument('--uf-conta-entrega', action='store_true',
                    help='UF sozinha conta como "após preencher entrega" (padrão: não conta)')
    ap.add_argument('--tz', default='UTC', help='fuso IANA para datas e horas (padrão: UTC)')
    a = ap.parse_args(argv)

    if a.de_json:
        try:
            with open(a.de_json, encoding='utf-8') as f:
                m = json.load(f)
        except (OSError, json.JSONDecodeError) as err:
            sys.exit(f'ERRO: não consegui ler {a.de_json} ({err})')
        for k in ('indicadores', 'avisos', 'notas_metodo'):
            m.pop(k, None)
    elif a.checkouts:
        if not a.clientes:
            ap.error('--clientes é obrigatório junto com o CSV de checkouts')
        try:
            chk, clientes, arquivos = carregar(a.checkouts, a.clientes)
            m = calcular(chk, clientes, nome_arquivo=a.checkouts, n_arquivos_clientes=len(arquivos),
                         uf_conta_entrega=a.uf_conta_entrega, fuso=a.tz)
        except (ColunaFaltando, FileNotFoundError, ValueError) as err:
            sys.exit(f'ERRO: {err}')
    else:
        ap.error('informe o CSV de checkouts ou --de-json')

    if a.json:
        with open(a.json, 'w', encoding='utf-8') as f:
            json.dump(pacote_json(m), f, ensure_ascii=False, indent=2)
    if a.csv:
        with open(a.csv, 'w', encoding='utf-8-sig', newline='') as f:
            w = csv.DictWriter(f, fieldnames=COLUNAS)
            w.writeheader()
            w.writerows(indicadores(m))

    out = []
    if a.json: out.append(f'JSON: {a.json}')
    if a.csv: out.append(f'CSV: {a.csv}')
    out += [f'AVISO: {x}' for x in avisos(m)]
    out += ['', '## Indicadores', '', markdown(m), '', '## Notas de método', '']
    out += [f'- {x}' for x in notas_metodo(m)]
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    print('\n'.join(out))


if __name__ == '__main__':
    main()
