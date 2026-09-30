"""Cálculo de todos os números do relatório. Devolve um dict serializável em JSON; nada de HTML aqui."""
import os
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from zoneinfo import ZoneInfo

CANAIS = [('E-mail', 'Accepts Email Marketing'), ('SMS', 'Accepts SMS Marketing'),
          ('WhatsApp', 'Accepts WhatsApp Marketing')]
ETAPAS = ['nada', 'cont', 'ship', 'pag']
TIPOS_ERRO = [('Pagamento', 'PAYMENT_ERROR'), ('Cupom', 'DISCOUNT_ERROR'), ('Frete', 'DELIVERY_ERROR')]
MAX_MUDANCAS_FRETE = 2


# ---------- normalização ----------
def norm_email(e): return re.sub(r'\s+', '', e).lower()


def norm_phone(p):
    """Chave de telefone: os 10 últimos dígitos, para casar o mesmo número com ou sem código de país."""
    d = re.sub(r'\D', '', p)
    return d[-10:] if len(d) >= 10 else ''


def yes(v): return v.strip().lower() == 'yes'


def num(v):
    v = v.strip()
    return float(v) if v else 0.0


def deacc(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower().strip()


# ---------- mensagens de erro ----------
def norm_msg(msg):
    """Mensagem exatamente como o checkout exibiu, só com espaços normalizados. Não há classificação por texto."""
    return re.sub(r'\s+', ' ', msg or '').strip() or '(sem mensagem)'


def etapa(r, uf_conta_entrega=False):
    """Etapa mais avançada de um abandono. Erro de cupom não define etapa."""
    if r['Tipo de erro'] == 'PAYMENT_ERROR': return 'pag'
    if r['Nome'].strip() or r['Cidade'].strip() or (uf_conta_entrega and r['UF'].strip()): return 'ship'
    if r['Email'].strip() or r['Telefone'].strip(): return 'cont'
    return 'nada'


def top_n(contagem, n=5):
    """[(chaves, qtd)] por qtd decrescente; empates na n-ésima posição viram uma linha só."""
    ordered = sorted(contagem.items(), key=lambda kv: (-kv[1], kv[0]))
    if len(ordered) <= n: return [([k], c) for k, c in ordered]
    cut = ordered[n - 1][1]
    head = [kv for kv in ordered if kv[1] > cut]
    tied = [kv for kv in ordered if kv[1] == cut]
    out = [([k], c) for k, c in head]
    if len(head) + len(tied) <= n: out += [([k], c) for k, c in tied]
    elif len(tied) == 1: out.append(([tied[0][0]], cut))
    else: out.append(([k for k, _ in tied], cut))
    return out


def eh_redondo(n): return n % 100 == 0 or n % 1000 == 0 or n in (50, 250, 500)


# ---------- cruzamento ----------
def _indexar(clientes):
    by_email, by_phone = defaultdict(list), defaultdict(list)
    for c in clientes:
        em = norm_email(c['Email'])
        if em: by_email[em].append(c)
        for p in (c['Phone'], c['Default Address Phone']):
            n = norm_phone(p)
            if n and c not in by_phone[n]: by_phone[n].append(c)
    return by_email, by_phone


def _enriquecer(chk, clientes, uf_conta_entrega, tz):
    by_email, by_phone = _indexar(clientes)
    rows = []
    for src in chk:
        r = dict(src)
        r['valor'] = num(r['Valor'])
        r['dt'] = datetime.fromisoformat(r['Última atividade']).astimezone(tz)
        em, ph = norm_email(r['Email']), norm_phone(r['Telefone'])
        match = by_email.get(em, []) if em else []
        via = 'e-mail' if match else ''
        if not match and ph:
            match = by_phone.get(ph, []); via = 'telefone' if match else ''
        r['via'] = via
        r['classe'] = 'base' if match else ('fora' if (em or ph) else 'anonimo')
        r['opt'] = {k: any(yes(c[col]) for c in match) for k, col in CANAIS}
        r['any_opt'] = any(r['opt'].values())
        r['aband'] = r['Status'] in ('abandonado', 'com_erro')
        r['recup'] = r['aband'] and r['any_opt']
        r['token'] = r['Checkout Token'][:8]
        r['etapa'] = etapa(r, uf_conta_entrega)
        if r['Tipo de erro'] == 'DISCOUNT_ERROR':
            r['cupom'] = norm_msg(r['Mensagem de erro'])
        if r['Tipo de erro'] == 'PAYMENT_ERROR':
            r['pmot'] = norm_msg(r['Mensagem de erro'])
        rows.append(r)
    # mudanças de endereço = combinações distintas de cidade + UF por Client ID, menos 1
    combos = defaultdict(set)
    for r in rows:
        city, uf = deacc(r['Cidade']), r['UF'].strip().upper()
        if city or uf: combos[r['Client ID']].add((city, uf))
    for r in rows:
        r['mud'] = max(len(combos.get(r['Client ID'], ())) - 1, 0)
    return rows


# ---------- métricas ----------
def calcular(chk, clientes, *, nome_arquivo, n_arquivos_clientes, uf_conta_entrega=False, fuso='UTC'):
    rows = _enriquecer(chk, clientes, uf_conta_entrega, ZoneInfo(fuso))
    N = len(rows)
    if not N:
        raise ValueError('CSV de checkouts sem linhas')
    ab = [r for r in rows if r['aband']]
    rec = [r for r in ab if r['recup']]
    NR = len(rec)
    soma = lambda rs: sum(r['valor'] for r in rs)

    dmin, dmax = min(r['dt'] for r in rows), max(r['dt'] for r in rows)
    dias_real = (dmax - dmin).total_seconds() / 86400
    m_nome = re.search(r'(\d+)d', os.path.basename(nome_arquivo))
    dias_nome = int(m_nome.group(1)) if m_nome else None
    curto = bool(dias_nome and dias_real < dias_nome - 1)

    st = Counter(r['Status'] for r in rows)
    cup_all = [r for r in rows if r.get('cupom')]
    pay_all = [r for r in rows if r.get('pmot')]
    frete_all = [r for r in rows if r['Tipo de erro'] == 'DELIVERY_ERROR']
    frete = [r for r in frete_all if r['mud'] <= MAX_MUDANCAS_FRETE]
    frete_ids = {id(r) for r in frete}
    rec_pay = [r for r in rec if r.get('pmot')]
    rec_cup = [r for r in rec if r.get('cupom')]
    rec_frete = [r for r in rec if id(r) in frete_ids]
    ab_sem = Counter(r['classe'] for r in ab if not r['any_opt'])
    pos = [r['valor'] for r in rec if r['valor'] > 0]
    via = Counter(r['via'] for r in rows if r['classe'] == 'base')

    def top(rs, chave):
        return [{'chaves': ks, 'n': c} for ks, c in top_n(Counter(r[chave] for r in rs))]

    def por_mensagem(rs):
        return [{'mensagem': k, 'n': v,
                 'abandonados': sum(1 for r in rs if r['Mensagem de erro'] == k and r['aband']),
                 'concluidos': sum(1 for r in rs if r['Mensagem de erro'] == k and r['Status'] == 'concluido'),
                 'valor': soma(r for r in rs if r['Mensagem de erro'] == k)}
                for k, v in Counter(r['Mensagem de erro'] for r in rs).most_common()]

    cup_top = top(rec_cup, 'cupom')
    dias = Counter(r['dt'].date() for r in rows)

    return {
        'fonte': {'checkouts': os.path.basename(nome_arquivo), 'arquivos_clientes': n_arquivos_clientes,
                  'clientes': len(clientes), 'uf_conta_entrega': uf_conta_entrega, 'moeda': 'R$', 'fuso': fuso},
        'periodo': {'inicio': dmin.isoformat(), 'fim': dmax.isoformat(), 'dias_real': dias_real,
                    'dias_nome': dias_nome, 'curto': curto,
                    'truncado': bool(eh_redondo(N) and dias_nome and dias_real < dias_nome - 1)},
        'checkouts': N,
        'pessoas': len({r['Client ID'] for r in rows}),
        'abandonados': len(ab),
        'recuperaveis': NR,
        'valor_abandonado': soma(ab),
        'valor_recuperavel': soma(rec),
        'desfecho': {'abandonou_sem_erro': sum(1 for r in ab if not r['Tipo de erro']),
                     'abandonou_apos_erro': sum(1 for r in ab if r['Tipo de erro']),
                     'finalizou': st['concluido'], 'em_andamento': st['em_andamento']},
        'abandonos_apos_erro': {'pagamento': sum(1 for r in ab if r['Tipo de erro'] == 'PAYMENT_ERROR'),
                                'cupom': sum(1 for r in ab if r.get('cupom')),
                                'frete': sum(1 for r in frete if r['aband']),
                                'finalizou_com_erro': sum(1 for r in rows if r['Status'] == 'concluido' and r['Tipo de erro'])},
        'etapas': {k: {'n': sum(1 for r in ab if r['etapa'] == k), 'valor': soma(r for r in ab if r['etapa'] == k)}
                   for k in ETAPAS},
        'chance_abandono': [{'tipo': lbl, 'tentativas': sum(1 for r in rows if r['Tipo de erro'] == t),
                             'abandonos': sum(1 for r in ab if r['Tipo de erro'] == t)}
                            for lbl, t in TIPOS_ERRO if any(r['Tipo de erro'] == t for r in rows)],
        'abandonados_sem_optin': {'base': ab_sem['base'], 'fora': ab_sem['fora'], 'anonimo': ab_sem['anonimo']},
        'abandonados_fora_base': sum(1 for r in ab if r['classe'] == 'fora'),
        'optin_abandonados': {k: sum(1 for r in ab if r['opt'][k]) for k, _ in CANAIS},
        'base_sem_optin': {k: sum(1 for c in clientes if not yes(c[col]))
                           for k, col in [CANAIS[2], CANAIS[0], CANAIS[1]]},
        'recuperaveis_detalhe': {
            'ticket_medio': sum(pos) / len(pos) if pos else 0, 'com_valor': len(pos),
            'media_com_zeros': soma(rec) / NR if NR else 0,
            'na_base': sum(1 for r in rec if r['classe'] == 'base'),
            'multicanal': sum(1 for r in rec if sum(r['opt'].values()) > 1),
            'sem_erro': sum(1 for r in rec if not r['Tipo de erro']),
            'por_canal': {k: {'n': sum(1 for r in rec if r['opt'][k]), 'valor': soma(r for r in rec if r['opt'][k])}
                          for k, _ in CANAIS},
        },
        'erros_recuperaveis': {
            'pagamento': {'n': len(rec_pay), 'valor': soma(rec_pay), 'top': top(rec_pay, 'pmot'),
                          'tipos': len({r['pmot'] for r in rec_pay})},
            'cupom': {'n': len(rec_cup), 'valor': soma(rec_cup), 'top': cup_top},
            'frete': {'n': len(rec_frete), 'valor': soma(rec_frete), 'top': top(rec_frete, 'Mensagem de erro'),
                      'tipos': len({r['Mensagem de erro'] for r in rec_frete}),
                      'por_uf': Counter(r['UF'] or 'Sem UF' for r in rec_frete).most_common(),
                      'no_export': len(frete_all), 'excluidos': len(frete_all) - len(frete)},
        },
        'por_dia': [{'data': d.isoformat(), 'total': c, 'abandonados': sum(1 for r in ab if r['dt'].date() == d)}
                    for d, c in sorted(dias.items())],
        'anexo': {
            'cupons_total': len(cup_all),
            'cupons': [{'mensagem': k, 'tentativas': v, 'abandonados': sum(1 for r in cup_all if r['cupom'] == k and r['aband'])}
                       for k, v in sorted(Counter(r['cupom'] for r in cup_all).items(), key=lambda kv: (-kv[1], kv[0]))],
            'pagamento_total': len(pay_all),
            'pagamento': por_mensagem(pay_all),
            'frete_total': len(frete),
            'frete': por_mensagem(frete),
            'frete_checkouts': [{'token': r['token'], 'status': r['Status'], 'recuperavel': r['recup'],
                                 'cidade': r['Cidade'], 'uf': r['UF'], 'valor': r['valor'], 'mudancas': r['mud'],
                                 'mensagem': r['Mensagem de erro']} for r in sorted(frete_all, key=lambda r: r['dt'])],
        },
        'matches': {'email': via['e-mail'], 'telefone': via['telefone']},
    }
