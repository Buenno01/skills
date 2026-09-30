"""Empacota uma página do Raio-X num HTML único e autocontido: kit visual + KPIs + composição.

Uso:
    python3 montar.py --kpis kpis.json --pagina pagina.js --saida raio-x.html [--titulo TEXTO]
    python3 montar.py --pagina examples/galeria.js --saida examples/galeria.html --titulo "Galeria do Raio-X"

pagina.js é a composição escrita pelo agente: define function pagina(K, Kit) que devolve o HTML da página,
usando as funções de assets/kit.js. O ponto de partida sugerido é examples/raio-x-completo.js, mas qualquer
composição serve (um recorte, outra ordem, outros gráficos da galeria). Sem --kpis, K é {} (só para a galeria,
que usa dados sintéticos).

O script não calcula nem escolhe nada: junta os arquivos e recusa a página quando ela quebra uma regra
verificável (travessão, e-mail, narrativa em branco, avisos do export fora da página).
"""
import argparse
import html as htmllib
import json
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(AQUI, '..', 'assets')
TRAVESSAO = re.compile('[' + chr(0x2014) + chr(0x2013) + ']')
EMAIL = re.compile(r'[\w.+-]+@[\w-]+\.[\w.]+')
NARRATIVA_VAZIA = re.compile(r'\b(titulo|subtitulo|contexto)\s*:\s*(\'\'|"")')

MODELO = '''<!DOCTYPE html>
<html lang="pt-BR" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{titulo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>
{css}
</style>
</head>
<body>
<div id="raiz"></div>
<div id="tip" role="tooltip"></div>
<script id="dados" type="application/json">{dados}</script>
<script>
{kit}
</script>
<script>
{pagina}
(function () {{
  var K = JSON.parse(document.getElementById('dados').textContent);
  document.getElementById('raiz').innerHTML = pagina(K, window.Kit);
  window.Kit.tooltip();
}})();
</script>
</body>
</html>
'''


def erro(msg):
    sys.exit(f'ERRO: {msg}')


def ler(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def conferir(pagina, kpis):
    problemas = []
    if not re.search(r'function\s+pagina\s*\(', pagina):
        problemas.append('a composição precisa definir function pagina(K, Kit)')
    for n, linha in enumerate(pagina.splitlines(), 1):
        if TRAVESSAO.search(linha):
            problemas.append(f'linha {n}: travessão (troque por vírgula, dois pontos ou ponto)')
        if EMAIL.search(linha):
            problemas.append(f'linha {n}: parece conter e-mail')
        if 'NARRATIVA' in pagina and NARRATIVA_VAZIA.search(linha):
            problemas.append(f'linha {n}: narrativa em branco ({linha.strip()[:60]})')
    if kpis.get('avisos') and 'avisos' not in pagina:
        problemas.append('o export tem avisos e a composição não os mostra (use Kit.cabecalho({avisos: K.avisos}) ou equivalente)')
    return problemas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--kpis', help='kpis.json da skill checkout-sentry-data-extract (obrigatório para relatório)')
    ap.add_argument('--pagina', required=True, help='composição JS com function pagina(K, Kit)')
    ap.add_argument('--saida', required=True)
    ap.add_argument('--titulo', help='título da aba (padrão: "Raio-X do checkout · <loja>")')
    a = ap.parse_args()

    kpis = {}
    if a.kpis:
        with open(a.kpis, encoding='utf-8') as f:
            kpis = json.load(f)
    faltam = [b for b in ('avisos', 'fonte', 'periodo') if b not in kpis]
    if a.kpis and faltam:
        erro('JSON de KPIs incompleto (faltam: ' + ', '.join(faltam) + '). Gere de novo com a skill checkout-sentry-data-extract.')
    if kpis.get('por_dia') and 'ticket_medio' not in kpis['por_dia'][0]:
        erro('KPIs gerados por versão antiga (por_dia sem ticket e frete). Atualize a skill checkout-sentry-data-extract e gere de novo.')

    pagina = ler(a.pagina)
    problemas = conferir(pagina, kpis)
    if problemas:
        erro('composição com problemas:\n  - ' + '\n  - '.join(problemas))

    loja = (kpis.get('fonte') or {}).get('loja')
    titulo = a.titulo or ('Raio-X do checkout' + (f' · {loja}' if loja else ''))
    html = MODELO.format(titulo=htmllib.escape(titulo), css=ler(os.path.join(ASSETS, 'kit.css')),
                         kit=ler(os.path.join(ASSETS, 'kit.js')), pagina=pagina.replace('</script', '<\\/script'),
                         dados=json.dumps(kpis, ensure_ascii=False).replace('</', '<\\/'))

    os.makedirs(os.path.dirname(os.path.abspath(a.saida)), exist_ok=True)
    with open(a.saida, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'HTML: {os.path.abspath(a.saida)} ({len(html.encode()) / 1024:.0f} KB)')
    for av in kpis.get('avisos') or []:
        print(f'AVISO: {av}')


if __name__ == '__main__':
    main()
