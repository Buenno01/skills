"""Leitura e validação do export JSON/JSONL do Checkout Sentry e da base de clientes (CSV)."""
import csv
import json
import os

CHK_CHAVES = ['status', 'checkout_token', 'client_id', 'email', 'phone', 'province', 'payment_method', 'cart_value',
              'cart_items', 'events', 'error_type', 'error_message', 'first_event_at', 'last_event_at']
CLI_COLS = ['Customer ID', 'Email', 'Phone', 'Default Address Phone', 'Accepts Email Marketing',
            'Accepts SMS Marketing', 'Accepts WhatsApp Marketing']


class ColunaFaltando(Exception):
    pass


def _eh_checkout(o): return isinstance(o, dict) and 'checkout_token' in o


def ler_checkouts(path):
    """Devolve (meta, checkouts). Aceita:
    - .json: objeto com a lista em "checkouts" (o resto vira meta) ou uma lista de checkouts;
    - .jsonl: um checkout por linha (uma linha com "checkouts" ou sem "checkout_token" vira meta)."""
    with open(path, encoding='utf-8-sig') as f:
        texto = f.read()
    meta, lista = {}, []
    try:
        dados = json.loads(texto)
    except json.JSONDecodeError:
        dados = None
        for n, linha in enumerate(texto.splitlines(), 1):
            if not linha.strip(): continue
            try: o = json.loads(linha)
            except json.JSONDecodeError as err:
                raise ColunaFaltando(f'{path}: linha {n} não é JSON válido ({err.msg})')
            if _eh_checkout(o): lista.append(o)
            elif isinstance(o, dict): meta.update({k: v for k, v in o.items() if k != 'checkouts'}); lista += o.get('checkouts', [])
    else:
        if isinstance(dados, list): lista = dados
        elif isinstance(dados, dict):
            meta = {k: v for k, v in dados.items() if k != 'checkouts'}
            lista = dados.get('checkouts', [dados] if _eh_checkout(dados) else [])
    if not lista:
        raise ColunaFaltando(f'{path}: nenhum checkout encontrado (esperado "checkouts": [...] ou um checkout por linha)')
    falta = [k for k in CHK_CHAVES if not any(k in c for c in lista)]
    if falta:
        raise ColunaFaltando(f'Falta campo em {path}: {", ".join(falta)}')
    return meta, lista


def ler_csv(path, colunas):
    with open(path, encoding='utf-8-sig', newline='') as f:
        rd = csv.DictReader(f)
        falta = [c for c in colunas if c not in (rd.fieldnames or [])]
        if falta:
            raise ColunaFaltando(f'Falta coluna em {path}: {", ".join(falta)}')
        return [{k: (v or '') for k, v in r.items()} for r in rd]


def arquivos_clientes(caminho):
    """Um CSV ou uma pasta de CSVs (ordem alfabética)."""
    if os.path.isdir(caminho):
        return sorted(os.path.join(caminho, f) for f in os.listdir(caminho) if f.lower().endswith('.csv'))
    return [caminho]


def carregar(arquivo, caminho_clientes):
    """Devolve (meta, checkouts, clientes deduplicados por Customer ID, arquivos de clientes)."""
    meta, checkouts = ler_checkouts(arquivo)
    arquivos = arquivos_clientes(caminho_clientes)
    if not arquivos:
        raise FileNotFoundError(f'Nenhum CSV de clientes em {caminho_clientes}')
    clientes = {}
    for f in arquivos:
        for r in ler_csv(f, CLI_COLS):
            clientes.setdefault(r['Customer ID'], r)
    return meta, checkouts, list(clientes.values()), arquivos
