"""Leitura e validação dos CSVs do Checkout Sentry e da base de clientes."""
import csv
import os

CHK_COLS = ['Status', 'Checkout Token', 'Client ID', 'Email', 'Nome', 'Telefone', 'Cidade', 'UF', 'Valor',
            'Última atividade', 'Entrou em', 'Tipo de erro', 'Mensagem de erro']
CLI_COLS = ['Customer ID', 'Email', 'Phone', 'Default Address Phone', 'Accepts Email Marketing',
            'Accepts SMS Marketing', 'Accepts WhatsApp Marketing']


class ColunaFaltando(Exception):
    pass


def ler_csv(path, colunas):
    """Lê um CSV como lista de dicts (valores vazios viram ''). Para se faltar coluna obrigatória."""
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


def carregar(csv_checkouts, caminho_clientes):
    """Devolve (checkouts, clientes deduplicados por Customer ID, lista de arquivos de clientes)."""
    checkouts = ler_csv(csv_checkouts, CHK_COLS)
    arquivos = arquivos_clientes(caminho_clientes)
    if not arquivos:
        raise FileNotFoundError(f'Nenhum CSV de clientes em {caminho_clientes}')
    clientes = {}
    for f in arquivos:
        for r in ler_csv(f, CLI_COLS):
            clientes.setdefault(r['Customer ID'], r)
    return checkouts, list(clientes.values()), arquivos
