"""Ponto de entrada único da skill: escolhe o fluxo (CSV ou JSON) e o executa em subprocesso.

Uso, a partir da raiz do projeto:
    python3 <pasta da skill>/scripts/extract.py <arquivo> [flags]

Roteamento, nesta ordem:
    1. --fluxo csv|json explícito vence (e não é repassado ao fluxo);
    2. --de-json presente -> csv;
    3. posicional .csv -> csv; .json ou .jsonl -> json;
    4. sem posicional -> json (o fluxo JSON pede o arquivo).

Os dois fluxos têm módulos com o mesmo nome (load.py, metrics.py) e conteúdo diferente, por isso
nunca são importados aqui: cada um roda no seu próprio processo, com stdout, stderr e código de
saída repassados sem alteração.
"""
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
FLUXOS = {'csv': os.path.join(AQUI, 'csv', 'indicadores.py'),
          'json': os.path.join(AQUI, 'json', 'kpis.py')}
# flags dos dois fluxos que recebem valor: o valor não é o arquivo de entrada
COM_VALOR = {'--clientes', '--json', '--csv', '--de-json', '--tz', '--saida'}


def separar_fluxo(args):
    """Tira --fluxo X / --fluxo=X da lista. Devolve (fluxo ou None, args restantes)."""
    fluxo, resto, i = None, [], 0
    while i < len(args):
        a = args[i]
        if a == '--fluxo':
            if i + 1 >= len(args):
                erro('--fluxo precisa de um valor: csv ou json')
            fluxo, i = args[i + 1], i + 2
            continue
        if a.startswith('--fluxo='):
            fluxo, i = a.split('=', 1)[1], i + 1
            continue
        resto.append(a)
        i += 1
    if fluxo is not None and fluxo not in FLUXOS:
        erro(f'--fluxo inválido: {fluxo} (use csv ou json)')
    return fluxo, resto


def posicional(args):
    """Primeiro argumento que não é flag nem valor de flag."""
    i = 0
    while i < len(args):
        a = args[i]
        if a == '--':
            return args[i + 1] if i + 1 < len(args) else None
        if a.startswith('-') and a != '-':
            i += 2 if a in COM_VALOR else 1
            continue
        return a
    return None


def rotear(args):
    """Devolve (fluxo, args a repassar)."""
    fluxo, args = separar_fluxo(args)
    if fluxo:
        return fluxo, args
    if any(a == '--de-json' or a.startswith('--de-json=') for a in args):
        return 'csv', args
    arq = posicional(args)
    if arq is None:
        return 'json', args
    ext = os.path.splitext(arq)[1].lower()
    if ext == '.csv':
        return 'csv', args
    if ext in ('.json', '.jsonl'):
        return 'json', args
    erro(f'não sei qual fluxo usar para "{arq}" (esperado .csv, .json ou .jsonl). Passe --fluxo csv ou --fluxo json.')


def erro(msg):
    print(f'ERRO: {msg}', file=sys.stderr)
    sys.exit(2)


def main(argv=None):
    fluxo, args = rotear(list(sys.argv[1:] if argv is None else argv))
    return subprocess.run([sys.executable, FLUXOS[fluxo], *args]).returncode


if __name__ == '__main__':
    sys.exit(main())
