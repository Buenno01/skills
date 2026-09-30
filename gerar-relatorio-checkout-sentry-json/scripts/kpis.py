"""KPIs de checkout (export JSON/JSONL do Checkout Sentry × base de clientes) em um arquivo JSON.

Uso:
    python3 .claude/skills/gerar-relatorio-checkout-sentry-json/scripts/kpis.py <checkouts.json|jsonl>
        [--clientes PASTA_OU_CSV] [--saida JSON|-] [--currency SIMBOLO]

Sem --saida, grava kpis-checkouts-<AAAA-MM-DD da última atividade>.json ao lado do arquivo.
Com --saida -, escreve o JSON no stdout (e nada mais).
Este script só calcula. Formato e estilo da entrega ficam com o agente.
"""
import argparse
import json
import os
import sys
from datetime import datetime

from load import ColunaFaltando, carregar
from metrics import calcular

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('checkouts', help='JSON (objeto com "checkouts") ou JSONL exportado do Checkout Sentry')
    ap.add_argument('--clientes', default=os.path.join(RAIZ, 'BaseDeClientes', 'customers_export'),
                    help='pasta com CSVs de clientes ou um CSV (padrão: BaseDeClientes/customers_export)')
    ap.add_argument('--saida', help='JSON de saída; "-" = stdout')
    ap.add_argument('--currency', default='MX$', help='rótulo da moeda gravado em fonte.moeda (padrão: MX$)')
    a = ap.parse_args(argv)

    try:
        meta, chk, clientes, arquivos = carregar(a.checkouts, a.clientes)
        m = calcular(meta, chk, clientes, nome_arquivo=a.checkouts, n_arquivos_clientes=len(arquivos), moeda=a.currency)
    except (ColunaFaltando, FileNotFoundError, ValueError) as err:
        sys.exit(f'ERRO: {err}')

    texto = json.dumps(m, ensure_ascii=False, indent=2)
    if a.saida == '-':
        print(texto)
        return
    fim = datetime.fromisoformat(m['periodo']['fim']).date().isoformat()
    saida = a.saida or os.path.join(os.path.dirname(os.path.abspath(a.checkouts)), f'kpis-checkouts-{fim}.json')
    with open(saida, 'w', encoding='utf-8') as f:
        f.write(texto)

    print(f'JSON:    {saida}')
    p = m['pessoas']
    print(f'{m["checkouts"]} checkouts · {m["abandonados"]} abandonados · {p["abandonados"]} pessoas abandonaram · '
          f'{p["voltaram_para_finalizar"]["n"]} voltaram para finalizar · {m["recuperaveis"]} recuperáveis')
    for aviso in m['avisos']:
        print(f'AVISO: {aviso}')


if __name__ == '__main__':
    main()
