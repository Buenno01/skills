"""Dict de métricas (saída de metrics.calcular ou o JSON dela) → tabela plana de indicadores.

Cada indicador tem uma chave estável, o valor bruto, o percentual já calculado e a base desse percentual.
Nada de apresentação aqui: quem usa decide o formato (chat, planilha, slide, página, texto).
"""
from datetime import date, datetime

MOEDA = 'R$'
CANAIS = ('E-mail', 'SMS', 'WhatsApp')
ETAPAS = [('nada', 'Sem interação'), ('cont', 'Após informar contato'),
          ('ship', 'Após preencher entrega'), ('pag', 'Ao tentar pagar')]
COLUNAS = ['grupo', 'chave', 'indicador', 'tipo', 'valor', 'pct', 'base_pct']


# ---------- formatação (milhar com ponto, decimal com vírgula) ----------
def fmt_n(x, d=0):
    s = f'{x:,.{d}f}'
    return s.replace(',', 'X').replace('.', ',').replace('X', '.')


def fmt_valor(tipo, v, moeda):
    if v is None or v == '': return ''
    if tipo == 'moeda': return f'{moeda} {fmt_n(v, 2)}'
    if tipo == 'qtd': return fmt_n(v)
    if tipo == 'dias': return fmt_n(v, 1)
    if tipo == 'pct': return fmt_n(v, 1) + '%'
    if tipo == 'data': return datetime.fromisoformat(v).strftime('%d/%m/%Y %H:%M')
    return str(v)


def _p(a, b): return round(100 * a / b, 4) if b else None


def _slug(s):
    return ''.join(c if c.isalnum() else '_' for c in s.lower()).strip('_')


# ---------- tabela ----------
def indicadores(m):
    """Lista de dicts com as colunas de COLUNAS, na ordem de leitura do relatório."""
    out = []

    def add(grupo, chave, indicador, tipo, valor, parte=None, base=None, base_pct=''):
        pv = _p(parte if parte is not None else valor, base) if base is not None else None
        out.append({'grupo': grupo, 'chave': chave, 'indicador': indicador, 'tipo': tipo,
                    'valor': round(valor, 2) if isinstance(valor, float) else valor,
                    'pct': pv, 'base_pct': base_pct if base is not None else ''})

    f, p = m['fonte'], m['periodo']
    N, NA, NR = m['checkouts'], m['abandonados'], m['recuperaveis']
    VA, VR = m['valor_abandonado'], m['valor_recuperavel']
    NB = f['clientes']

    g = 'Período e fontes'
    add(g, 'periodo.inicio', 'Primeira atividade no export', 'data', p['inicio'])
    add(g, 'periodo.fim', 'Última atividade no export', 'data', p['fim'])
    add(g, 'periodo.dias_real', 'Dias cobertos pelo export', 'dias', p['dias_real'])
    if p['dias_nome']: add(g, 'periodo.dias_nome', 'Dias indicados no nome do arquivo', 'qtd', p['dias_nome'])
    add(g, 'fonte.clientes', 'Clientes na base (deduplicados)', 'qtd', NB)
    add(g, 'fonte.arquivos_clientes', 'Arquivos de clientes lidos', 'qtd', f['arquivos_clientes'])

    g = 'Resumo'
    add(g, 'checkouts', 'Checkouts', 'qtd', N)
    add(g, 'pessoas', 'Pessoas distintas (Client ID)', 'qtd', m['pessoas'])
    add(g, 'abandonados', 'Checkouts abandonados', 'qtd', NA, base=N, base_pct='checkouts')
    add(g, 'valor_abandonado', 'Valor abandonado', 'moeda', VA)
    add(g, 'recuperaveis', 'Abandonados recuperáveis (com opt-in)', 'qtd', NR, base=NA, base_pct='abandonados')
    add(g, 'valor_recuperavel', 'Valor recuperável', 'moeda', VR, base=VA, base_pct='valor abandonado')
    add(g, 'valor_nao_recuperavel', 'Valor abandonado sem canal autorizado', 'moeda', VA - VR, base=VA,
        base_pct='valor abandonado')

    g = 'Desfecho'
    d = m['desfecho']
    for k, lbl in [('finalizou', 'Finalizou'), ('abandonou_sem_erro', 'Abandonou sem erro'),
                   ('abandonou_apos_erro', 'Abandonou após erro'), ('em_andamento', 'Em andamento')]:
        add(g, f'desfecho.{k}', lbl, 'qtd', d[k], base=N, base_pct='checkouts')
    a = m['abandonos_apos_erro']
    for k, lbl in [('frete', 'Abandonou após erro de frete'), ('cupom', 'Abandonou após erro de cupom'),
                   ('pagamento', 'Abandonou após erro de pagamento')]:
        add(g, f'abandonos_apos_erro.{k}', lbl, 'qtd', a[k], base=NA, base_pct='abandonados')
    add(g, 'abandonos_apos_erro.finalizou_com_erro', 'Finalizou mesmo com erro', 'qtd', a['finalizou_com_erro'],
        base=N, base_pct='checkouts')

    g = 'Etapa do abandono'
    for k, lbl in ETAPAS:
        e = m['etapas'][k]
        add(g, f'etapas.{k}.qtd', f'{lbl}: checkouts', 'qtd', e['n'], base=NA, base_pct='abandonados')
        add(g, f'etapas.{k}.valor', f'{lbl}: valor', 'moeda', e['valor'], base=VA, base_pct='valor abandonado')

    g = 'Chance de abandono após erro'
    for c in m['chance_abandono']:
        s = _slug(c['tipo'])
        add(g, f'chance_abandono.{s}.tentativas', f'{c["tipo"]}: checkouts com erro', 'qtd', c['tentativas'])
        add(g, f'chance_abandono.{s}.abandonos', f'{c["tipo"]}: abandonaram', 'qtd', c['abandonos'],
            base=c['tentativas'], base_pct=f'checkouts com erro de {c["tipo"].lower()}')

    g = 'Quem abandonou'
    s = m['abandonados_sem_optin']
    add(g, 'quem.recuperaveis', 'Com opt-in (recuperáveis)', 'qtd', NR, base=NA, base_pct='abandonados')
    add(g, 'quem.base_sem_optin', 'Na base, sem opt-in', 'qtd', s['base'], base=NA, base_pct='abandonados')
    add(g, 'quem.fora_da_base', 'Fora da base (tem contato, não encontrado)', 'qtd', s['fora'], base=NA,
        base_pct='abandonados')
    add(g, 'quem.anonimo', 'Anônimos (sem contato)', 'qtd', s['anonimo'], base=NA, base_pct='abandonados')
    for k in CANAIS:
        add(g, f'optin_abandonados.{_slug(k)}', f'Abandonados com opt-in de {k}', 'qtd', m['optin_abandonados'][k],
            base=NA, base_pct='abandonados')

    g = 'Base de clientes'
    for k in CANAIS:
        add(g, f'base_sem_optin.{_slug(k)}', f'Clientes sem opt-in de {k}', 'qtd', m['base_sem_optin'][k],
            base=NB, base_pct='clientes na base')

    g = 'Recuperáveis'
    r = m['recuperaveis_detalhe']
    add(g, 'recuperaveis.ticket_medio', 'Ticket médio (valor > 0)', 'moeda', r['ticket_medio'])
    add(g, 'recuperaveis.com_valor', 'Recuperáveis com valor > 0', 'qtd', r['com_valor'], base=NR,
        base_pct='recuperáveis')
    add(g, 'recuperaveis.media_com_zeros', 'Ticket médio contando zeros', 'moeda', r['media_com_zeros'])
    add(g, 'recuperaveis.na_base', 'Recuperáveis já na base', 'qtd', r['na_base'], base=NR, base_pct='recuperáveis')
    add(g, 'recuperaveis.multicanal', 'Recuperáveis com 2+ canais', 'qtd', r['multicanal'], base=NR,
        base_pct='recuperáveis')
    add(g, 'recuperaveis.sem_erro', 'Recuperáveis que abandonaram sem erro', 'qtd', r['sem_erro'], base=NR,
        base_pct='recuperáveis')
    for k in CANAIS:
        c = r['por_canal'][k]
        add(g, f'recuperaveis.{_slug(k)}.qtd', f'Recuperáveis por {k}', 'qtd', c['n'], base=NR, base_pct='recuperáveis')
        add(g, f'recuperaveis.{_slug(k)}.valor', f'Valor recuperável por {k}', 'moeda', c['valor'], base=VR,
            base_pct='valor recuperável')

    er = m['erros_recuperaveis']
    for k, lbl in [('frete', 'Frete'), ('cupom', 'Cupom'), ('pagamento', 'Pagamento')]:
        g = f'Erros dos recuperáveis: {lbl}'
        e = er[k]
        add(g, f'erros_recuperaveis.{k}.qtd', f'Recuperáveis com erro de {lbl.lower()}', 'qtd', e['n'], base=NR,
            base_pct='recuperáveis')
        add(g, f'erros_recuperaveis.{k}.valor', f'Valor desses recuperáveis', 'moeda', e['valor'], base=VR,
            base_pct='valor recuperável')
        for i, t in enumerate(e['top'], 1):
            ch = t['chaves']
            nome = ch[0] if len(ch) == 1 else f'{len(ch)} itens empatados, {t["n"]} caso(s) cada: ' + ' / '.join(ch)
            qtd = t['n'] * len(ch)
            add(g, f'erros_recuperaveis.{k}.top{i}', f'Top {i}: {nome}', 'qtd', qtd, base=e['n'],
                base_pct=f'recuperáveis com erro de {lbl.lower()}')
        if k == 'frete':
            for uf, n in e['por_uf']:
                add(g, f'erros_recuperaveis.frete.uf.{uf}', f'UF {uf}', 'qtd', n, base=e['n'],
                    base_pct='recuperáveis com erro de frete')
            add(g, 'erros_recuperaveis.frete.no_export', 'Erros de frete no export (todos)', 'qtd', e['no_export'])
            add(g, 'erros_recuperaveis.frete.excluidos', 'Excluídos pelo filtro de mudança de endereço', 'qtd',
                e['excluidos'], base=e['no_export'], base_pct='erros de frete no export')

    g = 'Por dia'
    for dd in m['por_dia']:
        dia = date.fromisoformat(dd['data']).strftime('%d/%m/%Y')
        add(g, f'por_dia.{dd["data"]}.total', f'{dia}: checkouts', 'qtd', dd['total'])
        add(g, f'por_dia.{dd["data"]}.abandonados', f'{dia}: abandonados', 'qtd', dd['abandonados'], base=dd['total'],
            base_pct='checkouts do dia')

    an = m['anexo']
    g = 'Erros por mensagem (todo o export)'
    for k, lbl, tot in [('pagamento', 'Pagamento', an['pagamento_total']), ('frete', 'Frete', an['frete_total'])]:
        for i, x in enumerate(an[k], 1):
            add(g, f'anexo.{k}.{i}.qtd', f'{lbl}: {x["mensagem"]}', 'qtd', x['n'], base=tot,
                base_pct=f'erros de {lbl.lower()}')
            add(g, f'anexo.{k}.{i}.abandonados', f'{lbl} (msg {i}): abandonaram', 'qtd', x['abandonados'], base=x['n'],
                base_pct='checkouts com a mensagem')
            add(g, f'anexo.{k}.{i}.concluidos', f'{lbl} (msg {i}): concluíram depois', 'qtd', x['concluidos'],
                base=x['n'], base_pct='checkouts com a mensagem')
            add(g, f'anexo.{k}.{i}.valor', f'{lbl} (msg {i}): valor', 'moeda', x['valor'])
    add(g, 'anexo.cupons_total', 'Checkouts com erro de cupom', 'qtd', an['cupons_total'])
    add(g, 'anexo.cupons_distintos', 'Mensagens distintas de erro de cupom', 'qtd', len(an['cupons']))

    g = 'Cruzamento'
    add(g, 'matches.email', 'Checkouts cruzados com a base por e-mail', 'qtd', m['matches']['email'])
    add(g, 'matches.telefone', 'Checkouts cruzados com a base por telefone', 'qtd', m['matches']['telefone'])
    return out


# ---------- avisos e método ----------
def avisos(m):
    p = m['periodo']
    if not (p['curto'] or p['truncado']): return []
    txt = f'Export cobre {fmt_n(p["dias_real"], 1)} dias, mas o nome do arquivo diz {p["dias_nome"]}.'
    if p['truncado']:
        txt += f' O número de linhas ({fmt_n(m["checkouts"])}) é redondo: provável truncamento.'
    return [txt + ' Os números valem só para este recorte.']


def notas_metodo(m):
    f = m['fonte']
    uf = ('UF sozinha conta como entrega (opção --uf-conta-entrega).' if f['uf_conta_entrega'] else
          'UF sozinha não conta como entrega, porque pode vir pré-preenchida em checkouts sem outros dados.')
    return [
        f'Fontes: {f["checkouts"]} ({fmt_n(m["checkouts"])} linhas) e {f["arquivos_clientes"]} CSV(s) de clientes '
        f'({fmt_n(f["clientes"])} após deduplicar por Customer ID).',
        f'Datas no fuso {f.get("fuso", "UTC")}. Valores em {MOEDA}.',
        'Abandonado: status "abandonado" ou "com_erro".',
        'Opt-in: cruzamento por e-mail normalizado; sem match, por telefone (últimos 10 dígitos; '
        'Phone e Default Address Phone). Vale o "yes" de qualquer cadastro.',
        'Classes: base (encontrado), fora da base (tem contato, não encontrado), anônimo (sem contato). '
        'Fora e anônimo contam como sem opt-in.',
        'Recuperável: abandonado com opt-in em ao menos um canal (e-mail, SMS ou WhatsApp).',
        'Cupom: DISCOUNT_ERROR, agrupado pela mensagem exata exibida no checkout (sem classificação por texto).',
        'Mudanças de endereço: combinações distintas de cidade + UF por Client ID no export, menos 1.',
        'Frete: DELIVERY_ERROR de clientes com até 2 mudanças de endereço.',
        'Pagamento: PAYMENT_ERROR, agrupado pela mensagem exata exibida no checkout.',
        'Etapa do abandono (a mais avançada): sem interação = sem contato e sem entrega; após informar contato = '
        'tem e-mail ou telefone; após preencher entrega = tem nome ou cidade; ao tentar pagar = teve PAYMENT_ERROR. '
        + uf + ' Erro de cupom não define etapa.',
        'Top de erros: até 5 linhas; empate na 5ª posição vira uma linha com todos os itens empatados '
        '(o valor da linha soma os casos).',
        'Ticket médio sobre valor > 0; a média com zeros aparece à parte.',
    ]


# ---------- saídas ----------
def markdown(m):
    moeda = MOEDA
    esc = lambda s: str(s).replace('|', '\\|').replace('\n', ' ')
    linhas = ['| Grupo | Chave | Indicador | Valor | % | Base do % |', '|---|---|---|---:|---:|---|']
    for r in indicadores(m):
        linhas.append('| ' + ' | '.join([esc(r['grupo']), f'`{r["chave"]}`', esc(r['indicador']),
                                          fmt_valor(r['tipo'], r['valor'], moeda),
                                          fmt_valor('pct', r['pct'], moeda), esc(r['base_pct'])]) + ' |')
    return '\n'.join(linhas)


def pacote_json(m):
    """Métricas completas + tabela plana + avisos + notas, para o JSON de saída."""
    return {**m, 'indicadores': indicadores(m), 'avisos': avisos(m), 'notas_metodo': notas_metodo(m)}
