"""Gate de entrada do Raio-X do checkout. Nada é calculado sem as duas entradas válidas.

Uso:
    python3 validar.py --checkouts ARQUIVO.json --clientes CSV_OU_PASTA [--raiz DIR]

Os dois caminhos são obrigatórios: o usuário anexa ou indica, ou o agente infere pelo contexto.
O script não procura arquivos em pasta nenhuma. --raiz (padrão: diretório atual) só serve para achar
a skill checkout-sentry-data-extract instalada no projeto.

Saída (uma informação por linha, sem dados pessoais):
    CHECKOUTS: <caminho> | loja=... | periodo=... | exportado_em=... | checkouts=N/M
    CLIENTES: <caminho> | arquivos=N | cadastros=N
    KPIS_SCRIPT: <caminho do scripts/json/kpis.py da skill checkout-sentry-data-extract>
    OK
Códigos de saída: 0 = pronto; 2 = falta entrada (pedir ao usuário); 3 = entrada inválida; 4 = dependência ausente.
"""
import argparse
import csv
import glob
import json
import os
import sys

# Assinatura do JSON gravado por checkout-sentry-collect-from-browser (scripts/coletarCheckouts.js)
TOPO = ['shop', 'period', 'exported_at', 'total_disponivel', 'total_coletado', 'checkouts']
CHK = ['status', 'checkout_token', 'client_id', 'email', 'phone', 'province', 'payment_method', 'cart_value',
       'cart_items', 'events', 'error_type', 'error_message', 'first_event_at', 'last_event_at']
# Colunas do export de clientes da Shopify usadas no cruzamento
CLI = ['Customer ID', 'Email', 'Phone', 'Default Address Phone', 'Accepts Email Marketing',
       'Accepts SMS Marketing', 'Accepts WhatsApp Marketing', 'Total Orders']


def falta(msg):
    print(f'FALTA: {msg}')
    sys.exit(2)


def invalido(msg):
    print(f'INVALIDO: {msg}')
    sys.exit(3)


def checar_checkouts(path):
    """Devolve o resumo se o arquivo for o JSON da checkout-sentry-collect-from-browser; senão, a razão da recusa."""
    if not path.lower().endswith('.json'):
        return None, 'não é .json (o Raio-X aceita só o JSON gravado pela skill checkout-sentry-collect-from-browser)'
    try:
        with open(path, encoding='utf-8-sig') as f:
            d = json.load(f)
    except (OSError, json.JSONDecodeError) as err:
        return None, f'não é um JSON válido ({err})'
    if not isinstance(d, dict):
        return None, 'o JSON não é um objeto com a chave "checkouts"'
    sem = [k for k in TOPO if k not in d]
    if sem:
        return None, 'não tem a assinatura da checkout-sentry-collect-from-browser (faltam: ' + ', '.join(sem) + ')'
    lista = d.get('checkouts') or []
    if not isinstance(lista, list) or not lista:
        return None, 'a lista "checkouts" está vazia'
    campos = [k for k in CHK if not any(isinstance(c, dict) and k in c for c in lista)]
    if campos:
        return None, 'checkouts sem os campos esperados: ' + ', '.join(campos)
    return {'loja': d.get('shop'), 'periodo': d.get('period'), 'exportado_em': d.get('exported_at'),
            'coletado': d.get('total_coletado'), 'disponivel': d.get('total_disponivel'), 'n': len(lista)}, None


def cabecalho_csv(path):
    try:
        with open(path, encoding='utf-8-sig', newline='') as f:
            return next(csv.reader(f), [])
    except (OSError, UnicodeDecodeError):
        return []


def eh_clientes(path):
    cab = cabecalho_csv(path)
    return all(c in cab for c in CLI), [c for c in CLI if c not in cab]


def contar_linhas(paths):
    n = 0
    for p in paths:
        with open(p, encoding='utf-8-sig', newline='') as f:
            n += max(0, sum(1 for _ in csv.reader(f)) - 1)
    return n


def achar_kpis(raiz):
    aqui = os.path.dirname(os.path.abspath(__file__))
    cands = [os.path.join(aqui, '..', '..', 'checkout-sentry-data-extract', 'scripts', 'json', 'kpis.py'),
             os.path.join(raiz, '.claude', 'skills', 'checkout-sentry-data-extract', 'scripts', 'json', 'kpis.py'),
             os.path.expanduser('~/.claude/skills/checkout-sentry-data-extract/scripts/json/kpis.py')]
    cands += glob.glob('/mnt/skills/*/checkout-sentry-data-extract/scripts/json/kpis.py')
    for c in cands:
        if os.path.isfile(c):
            metrics = os.path.join(os.path.dirname(c), 'metrics.py')
            with open(metrics, encoding='utf-8') as f:
                if 'def _dia(' not in f.read():
                    print(f'DEPENDENCIA: {os.path.abspath(c)} é uma versão antiga, sem ticket e frete por dia. '
                          'Instale a versão atualizada da skill checkout-sentry-data-extract.')
                    sys.exit(4)
            return os.path.abspath(c)
    print('DEPENDENCIA: skill checkout-sentry-data-extract não encontrada.')
    sys.exit(4)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--checkouts')
    ap.add_argument('--clientes')
    ap.add_argument('--raiz', default=os.getcwd())
    a = ap.parse_args()

    if not a.checkouts:
        falta('JSON de checkouts coletado pela skill checkout-sentry-collect-from-browser '
              '(checkouts_<loja>_<periodo>_<data>.json). Anexe o arquivo, indique o caminho ou rode a coleta.')
    if not a.clientes:
        falta('export de clientes da Shopify em CSV (Clientes > Exportar, com as colunas '
              + ', '.join(CLI) + '). Anexe o arquivo ou indique o caminho (um CSV ou uma pasta de CSVs).')

    # ---------- checkouts ----------
    if not os.path.isfile(a.checkouts):
        falta(f'arquivo de checkouts não encontrado: {a.checkouts}')
    info, erro = checar_checkouts(a.checkouts)
    if erro:
        invalido(f'{a.checkouts}: {erro}')

    # ---------- clientes ----------
    if os.path.isdir(a.clientes):
        arquivos = sorted(glob.glob(os.path.join(a.clientes, '*.csv')))
    elif os.path.isfile(a.clientes):
        arquivos = [a.clientes]
    else:
        falta(f'base de clientes não encontrada: {a.clientes}')
    if not arquivos:
        falta(f'nenhum CSV de clientes em {a.clientes}')
    ruins = [(p, eh_clientes(p)[1]) for p in arquivos if not eh_clientes(p)[0]]
    if ruins:
        invalido('; '.join(f'{p}: não é export de clientes da Shopify (faltam colunas: {", ".join(f)})' for p, f in ruins))

    kpis = achar_kpis(a.raiz)

    print(f'CHECKOUTS: {os.path.abspath(a.checkouts)} | loja={info["loja"]} | periodo={info["periodo"]} | '
          f'exportado_em={info["exportado_em"]} | checkouts={info["coletado"]}/{info["disponivel"]}')
    print(f'CLIENTES: {os.path.abspath(a.clientes)} | arquivos={len(arquivos)} | cadastros={contar_linhas(arquivos)}')
    print(f'KPIS_SCRIPT: {kpis}')
    print('OK')


if __name__ == '__main__':
    main()
