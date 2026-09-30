"""Cálculo dos KPIs a partir do export JSON do Checkout Sentry × base de clientes.
Devolve um dict serializável em JSON. Sem dados pessoais na saída (só contagens, valores e rótulos).
Significado de cada campo: ../references/KPIS.md."""
import os
import re
import statistics
from collections import Counter, defaultdict
from datetime import datetime
from zoneinfo import ZoneInfo

TZ = ZoneInfo('UTC')  # fuso do Checkout Sentry
CANAIS = [('E-mail', 'Accepts Email Marketing'), ('SMS', 'Accepts SMS Marketing'),
          ('WhatsApp', 'Accepts WhatsApp Marketing')]
ABANDONO = ('abandonado', 'com_erro')
AMOSTRA_MIN = 5  # grupos com menos abandonados + concluídos que isso levam amostra_pequena: true

# Passos do checkout na ordem em que o cliente os percorre. O índice do mais avançado dá "onde parou".
PASSOS = [('checkout_started', 'Iniciou o checkout', 'Só abriu o checkout'),
          ('checkout_contact_info_submitted', 'Informou contato', 'Parou após informar contato'),
          ('checkout_address_info_submitted', 'Informou endereço', 'Parou após informar endereço'),
          ('checkout_shipping_info_submitted', 'Escolheu frete', 'Parou após escolher frete'),
          ('payment_info_submitted', 'Enviou pagamento', 'Parou após enviar pagamento')]

MARCOS = {ev for ev, _, _ in PASSOS} | {'checkout_completed'}  # alertas e eventos do Shopify não são passo
TEMPOS = [('checkout_contact_info_submitted', 'Informar contato'), ('checkout_address_info_submitted', 'Informar endereço'),
          ('checkout_shipping_info_submitted', 'Escolher frete'), ('payment_info_submitted', 'Enviar pagamento')]
FAIXAS_TENTATIVAS = [('1 tentativa', 1, 1), ('2 tentativas', 2, 2), ('3 a 4 tentativas', 3, 4), ('5 ou mais', 5, 10 ** 6)]

METODOS = {'MASTERCARD': 'Mastercard', 'VISA': 'Visa', 'AMEX': 'American Express', 'PAYPAL_EXPRESS': 'PayPal',
           'APPLE_PAY': 'Apple Pay', 'GOOGLE_PAY': 'Google Pay', 'informado': 'Não identificado',
           'creditCard': 'Não identificado'}
TIPOS_ERRO = {'PAYMENT_ERROR': 'Pagamento', 'DISCOUNT_ERROR': 'Cupom', 'INPUT_INVALID': 'Dado inválido',
              'INPUT_REQUIRED': 'Campo obrigatório', 'DELIVERY_ERROR': 'Frete', 'INVENTORY_ERROR': 'Estoque',
              'CHECKOUT_ERROR': 'Checkout'}
ESTADOS = {'AGS': 'Aguascalientes', 'BC': 'Baja California', 'BCS': 'Baja California Sur', 'CAMP': 'Campeche',
           'CHIS': 'Chiapas', 'CHIH': 'Chihuahua', 'COAH': 'Coahuila', 'COL': 'Colima', 'DF': 'Ciudad de México',
           'CDMX': 'Ciudad de México', 'DGO': 'Durango', 'GTO': 'Guanajuato', 'GRO': 'Guerrero', 'HGO': 'Hidalgo',
           'JAL': 'Jalisco', 'MEX': 'Estado de México', 'MICH': 'Michoacán', 'MOR': 'Morelos', 'NAY': 'Nayarit',
           'NL': 'Nuevo León', 'OAX': 'Oaxaca', 'PUE': 'Puebla', 'QRO': 'Querétaro', 'Q ROO': 'Quintana Roo',
           'QROO': 'Quintana Roo', 'SLP': 'San Luis Potosí', 'SIN': 'Sinaloa', 'SON': 'Sonora', 'TAB': 'Tabasco',
           'TAMPS': 'Tamaulipas', 'TLAX': 'Tlaxcala', 'VER': 'Veracruz', 'YUC': 'Yucatán', 'ZAC': 'Zacatecas'}


# ---------- normalização ----------
def norm_email(e): return re.sub(r'\s+', '', e or '').lower()


def norm_phone(p):
    """Número nacional mexicano: os 10 últimos dígitos (tira +52 e o 1 de celular antigo).
    55 é DDD da Cidade do México, não código de país, então não pode ser removido."""
    d = re.sub(r'\D', '', p or '')
    return d[-10:] if len(d) >= 10 else ''


def yes(v): return (v or '').strip().lower() == 'yes'


def parse_dt(s):
    if not s: return None
    return datetime.fromisoformat(s).astimezone(TZ)


# ---------- classificação de erros (mensagens em espanhol → rótulos em português) ----------
PADROES_CUPOM = [r'código digitado:\s*([^)\s]+)\s*\)', r'código de descuento\s+(?!o\b)(\S+)',
                 r'código de desconto\s+(?!o\b)(\S+)', r'(\S+)\s+é válido, mas não aplicável',
                 r'(\S+)\s+es válido, pero no (?:es )?aplicable']


def cupom(msg):
    for p in PADROES_CUPOM:
        m = re.search(p, msg, re.I)
        if m: return m.group(1).strip().upper()
    return '(código não informado)'


def motivo_cupom(msg):
    m = msg.lower()
    if 'no está disponible' in m or 'não está disponível' in m: return 'Indisponível para o cliente'
    if 'ya se usó' in m or 'ya fue usado' in m or 'ya se ha usado' in m or 'já foi usado' in m: return 'Já utilizado'
    if 'no es válido para los artículos' in m or 'no aplicable' in m or 'não aplicável' in m: return 'Válido, mas não aplicável'
    if 'límite de uso' in m or 'limite de uso' in m: return 'Limite de uso atingido'
    return 'Código inválido'


def motivo_pagamento(msg):
    x = (msg or '').lower()
    if 'saldo insuficiente' in x: return 'Saldo insuficiente'
    if 'vencida' in x: return 'Cartão vencido'
    if 'rechaz' in x: return 'Cartão recusado'
    if 'verificar' in x: return 'Falha na verificação'
    if 'procesar' in x: return 'Erro no processamento'
    return 'Outro motivo'


CAMPOS = [(r'nombre exactamente', 'Cartão: nome no cartão'), (r'número de tarjeta', 'Cartão: número'),
          (r'fecha de vencimiento', 'Cartão: validade'), (r'CVV|código de seguridad', 'Cartão: CVV'),
          (r'dirección', 'Endereço não informado'), (r'código postal|zona', 'Código postal'),
          (r'teléfono', 'Telefone'), (r'correo', 'E-mail não informado'), (r'apellido|introduce un nombre', 'Nome/sobrenome'),
          (r'ciudad', 'Cidade não informada'), (r'selecciona un estado', 'Estado inválido')]


def rotular(tipo, msg):
    """Agrupa mensagens quase iguais (códigos de cupom, valores digitados) num rótulo curto em português."""
    msg = msg or ''
    if tipo == 'PAYMENT_ERROR': return f'Pagamento: {motivo_pagamento(msg).lower()}'
    if tipo == 'DISCOUNT_ERROR' or 'descuento' in msg.lower(): return f'Cupom: {motivo_cupom(msg).lower()}'
    for pad, rot in CAMPOS:
        if re.search(pad, msg, re.I): return rot
    limpo = re.sub(r'\s*\(.*?\)\s*$', '', msg).strip() or '(sem mensagem)'
    return f'{TIPOS_ERRO.get(tipo, tipo or "Erro")}: {limpo[:70]}'


# ---------- cruzamento com a base de clientes ----------
def _indexar(clientes):
    by_email, by_phone = defaultdict(list), defaultdict(list)
    for c in clientes:
        em = norm_email(c['Email'])
        if em: by_email[em].append(c)
        for p in (c['Phone'], c['Default Address Phone']):
            n = norm_phone(p)
            if n and c not in by_phone[n]: by_phone[n].append(c)
    return by_email, by_phone


def _pedidos(c):
    try: return int(float(c.get('Total Orders') or 0))
    except ValueError: return 0


def _chave_produto(i): return str(i.get('product_id') or i.get('sku') or i.get('title'))


def _brinde(i):
    """Só o item com prefixo "Regalo:" é brinde. O mesmo produto sem o prefixo (ex.: "Wine Bag") foi vendido."""
    return (i.get('title') or '').lower().startswith('regalo')


def _enriquecer(chk, clientes):
    by_email, by_phone = _indexar(clientes)
    rows = []
    for c in chk:
        r = {'src': c, 'st': c['status'], 'valor': float(c.get('cart_value') or 0)}
        # anônimo = sem e-mail e sem telefone. O Sentry marca como abandonado quem só abriu o checkout e viu um
        # erro (ex.: testou um cupom), mesmo sem contato; aqui ele volta a ser anônimo.
        em, ph = norm_email(c.get('email')), norm_phone(c.get('phone'))
        r['anon'] = r['st'] == 'anonimo' or (r['st'] in ABANDONO and not (em or ph))
        r['aband'] = r['st'] in ABANDONO and not r['anon']
        r['conc'] = r['st'] == 'concluido'
        r['dt'] = parse_dt(c.get('last_event_at') or c.get('first_event_at'))
        r['inicio'] = parse_dt(c.get('first_event_at')) or r['dt']
        r['uf'] = (c.get('province') or '').strip().upper() or None
        r['pm'] = METODOS.get(c.get('payment_method'), c.get('payment_method')) if c.get('payment_method') else None
        evs = sorted(c.get('events') or [], key=lambda e: parse_dt(e.get('created_at')) or datetime.min.replace(tzinfo=TZ))
        r['passos'] = {e['event_type'] for e in evs}
        r['alertas'] = [(e.get('error_type'), e.get('error_message') or '') for e in evs
                        if e['event_type'] == 'alert_displayed']
        util = [e for e in evs if not e['event_type'].startswith('shopify_')]
        r['ultimo'] = util[-1] if util else None
        # tempo em cada passo: intervalo entre o passo anterior (1ª ocorrência de cada passo) e este
        marcos = {}
        for e in util:
            if e['event_type'] in MARCOS and e.get('created_at'):
                marcos.setdefault(e['event_type'], parse_dt(e['created_at']))
        ordem = sorted(marcos.items(), key=lambda kv: kv[1])
        r['tempos'] = {ev: (t - ordem[i - 1][1]).total_seconds() for i, (ev, t) in enumerate(ordem) if i}
        # duração: do primeiro ao último evento, contando novas tentativas e alertas
        ts = [parse_dt(e['created_at']) for e in util if e.get('created_at')]
        r['duracao'] = (ts[-1] - ts[0]).total_seconds() if len(ts) > 1 else None
        r['frete'] = c.get('selected_shipping_title')
        r['frete_preco'] = c.get('shipping_price')
        r['ponto'] = max([i for i, (ev, _, _) in enumerate(PASSOS) if ev in r['passos']] or [0])
        # contato e cruzamento
        match = by_email.get(em, []) if em else []
        via = 'e-mail' if match else ''
        if not match and ph:
            match = by_phone.get(ph, []); via = 'telefone' if match else ''
        r['via'] = via
        r['classe'] = 'base' if match else ('fora' if (em or ph) else 'anonimo')
        r['pessoa'] = em or ph or f"id:{c.get('client_id') or c['checkout_token']}"
        r['opt'] = {k: any(yes(m[col]) for m in match) for k, col in CANAIS}
        r['any_opt'] = any(r['opt'].values())
        # Total Orders é da data do export da base e inclui compras do período. Só é lido no último abandono
        # de quem não voltou (_por_pessoa), que não tem compra depois, então não conta a própria recuperação.
        r['recorrente'] = any(_pedidos(m) > 0 for m in match)
        # produtos: brindes ficam fora do ranking
        r['itens'] = [i for i in c.get('cart_items') or [] if not _brinde(i)]
        r['brindes'] = len(c.get('cart_items') or []) - len(r['itens'])
        rows.append(r)
    return rows


def _por_pessoa(rows):
    """Deduplica por pessoa (e-mail, senão telefone, senão client_id). O desfecho da pessoa é o do último
    checkout abandonado ou concluído: quem abandonou e voltou para comprar conta como concluída.
    Marca 'recup' só no último abandono de quem não voltou e tem opt-in.
    Devolve (último abandono por pessoa, último checkout de quem concluiu, desses os que abandonaram antes)."""
    grupos = defaultdict(list)
    for r in rows:
        r['recup'] = False
        grupos[r['pessoa']].append(r)
    fim = datetime.min.replace(tzinfo=TZ)
    ab_p, conc_p, voltaram = [], [], []
    for rs in grupos.values():
        desf = sorted((r for r in rs if r['aband'] or r['conc']), key=lambda r: r['dt'] or fim)
        if not desf: continue
        ult = desf[-1]
        if ult['aband']:
            ult['recup'] = ult['any_opt']
            ab_p.append(ult)
        else:
            conc_p.append(ult)
            if any(r['aband'] for r in desf): voltaram.append(ult)
    return ab_p, conc_p, voltaram


def _nome_uf(uf): return 'Sem UF' if not uf else f'{ESTADOS.get(uf, uf)}'


def seg(v):
    v = sorted(x for x in v if x is not None)
    if not v: return {'n': 0, 'mediana': None, 'p90': None}
    return {'n': len(v), 'mediana': statistics.median(v), 'p90': v[min(len(v) - 1, int(0.9 * len(v)))]}


def taxa(ab, conc): return ab / (ab + conc) if ab + conc else None


def cont(counter, chave='rotulo'):
    return [{chave: k, 'n': v} for k, v in counter.most_common()]


def _finalizar(o):
    """Arredonda floats e marca amostra pequena em todo grupo que tem taxa de abandono."""
    if isinstance(o, float): return round(o, 4)
    if isinstance(o, list): return [_finalizar(x) for x in o]
    if isinstance(o, dict):
        d = {k: _finalizar(v) for k, v in o.items()}
        if 'taxa' in d and 'abandonados' in d and 'concluidos' in d:
            d['amostra_pequena'] = d['abandonados'] + d['concluidos'] < AMOSTRA_MIN
        return d
    return o


# ---------- métricas ----------
def calcular(meta, chk, clientes, *, nome_arquivo, n_arquivos_clientes, moeda='MX$'):
    return _finalizar(_calcular(meta, chk, clientes, nome_arquivo, n_arquivos_clientes, moeda))


def _calcular(meta, chk, clientes, nome_arquivo, n_arquivos_clientes, moeda):
    rows = _enriquecer(chk, clientes)
    N = len(rows)
    ab = [r for r in rows if r['aband']]
    ab_p, conc_p, voltaram = _por_pessoa(rows)
    rec = [r for r in ab_p if r['recup']]
    NR = len(rec)
    soma = lambda rs: sum(r['valor'] for r in rs)

    dmin = min(r['inicio'] for r in rows if r['inicio'])
    dmax = max(r['dt'] for r in rows if r['dt'])
    dias_real = (dmax - dmin).total_seconds() / 86400
    m_nome = re.search(r'(\d+)d', str(meta.get('period') or '')) or re.search(r'(\d+)d', os.path.basename(nome_arquivo))
    dias_nome = int(m_nome.group(1)) if m_nome else None
    disp, colet = meta.get('total_disponivel'), meta.get('total_coletado')

    st = Counter(r['st'] for r in rows)

    # -- funil por checkout, sem anônimos: quantos chegaram pelo menos até cada passo (concluído passou por todos)
    funil = [{'rotulo': rot, 'n': sum(1 for r in rows if r['conc'] or (r['aband'] and r['ponto'] >= i))}
             for i, (_, rot, _) in enumerate(PASSOS)]
    funil.append({'rotulo': 'Concluiu a compra', 'n': st['concluido']})

    # -- onde os abandonos pararam (passo mais avançado) e o que aconteceu no fim
    parou = [{'rotulo': PASSOS[i][2], 'n': sum(1 for r in ab if r['ponto'] == i),
              'valor': soma(r for r in ab if r['ponto'] == i)} for i in range(len(PASSOS))]
    fim_alerta = [r for r in ab if r['ultimo'] and r['ultimo']['event_type'] == 'alert_displayed']
    ult_alerta = Counter(TIPOS_ERRO.get(r['ultimo'].get('error_type'), r['ultimo'].get('error_type') or '?') for r in fim_alerta)

    # -- método de pagamento (só existe para quem chegou ao passo de pagamento)
    def linha_pm(rs):
        a, c = sum(1 for r in rs if r['aband']), sum(1 for r in rs if r['conc'])
        return {'n': len(rs), 'abandonados': a, 'concluidos': c, 'com_erro': sum(1 for r in rs if r['aband'] and r['st'] == 'com_erro'),
                'valor_abandonado': soma(r for r in rs if r['aband']), 'taxa': taxa(a, c)}
    por_pm = defaultdict(list)
    for r in rows:
        if r['pm']: por_pm[r['pm']].append(r)
    metodos = sorted(({'metodo': k, **linha_pm(v)} for k, v in por_pm.items()),
                     key=lambda x: (-x['abandonados'], -x['n'], x['metodo']))
    sem_pm = [r for r in ab if not r['pm']]

    # -- regiões (UF do checkout; anônimos também têm UF, provavelmente por geolocalização)
    def ac(rs):
        a, c = sum(1 for r in rs if r['aband']), sum(1 for r in rs if r['conc'])
        return {'n': len(rs), 'abandonados': a, 'concluidos': c, 'taxa': taxa(a, c)}

    def frete_uf(rs):
        fr = [r for r in rs if r['frete']]
        pago = [r for r in fr if (r['frete_preco'] or 0) > 0]
        return {'com_frete': len(fr), 'gratis': ac([r for r in fr if r['frete_preco'] == 0]),
                'pago': {**ac(pago), 'preco_medio': sum(float(r['frete_preco']) for r in pago) / len(pago) if pago else None},
                'opcoes': [{'opcao': k, **ac([r for r in fr if r['frete'] == k])}
                           for k, _ in Counter(r['frete'] for r in fr).most_common()]}

    por_uf = defaultdict(list)
    for r in rows: por_uf[r['uf']].append(r)
    regioes = []
    for uf, rs in por_uf.items():
        a, c = sum(1 for r in rs if r['aband']), sum(1 for r in rs if r['conc'])
        regioes.append({'uf': uf or '—', 'nome': _nome_uf(uf), 'checkouts': len(rs), 'abandonados': a, 'concluidos': c,
                        'anonimos': sum(1 for r in rs if r['anon']), 'recuperaveis': sum(1 for r in rs if r['recup']),
                        'valor_abandonado': soma(r for r in rs if r['aband']), 'taxa': taxa(a, c), 'frete': frete_uf(rs)})
    regioes.sort(key=lambda x: (-x['abandonados'], -x['valor_abandonado'], x['nome']))

    # -- produtos (por product_id; um checkout conta uma vez por produto; brindes ignorados)
    prod = {}
    for r in rows:
        vistos = set()
        for i in r['itens']:
            pid = _chave_produto(i)
            p = prod.setdefault(pid, {'titulos': Counter(), 'sku': i.get('sku'), 'abandonados': 0, 'concluidos': 0,
                                      'anonimos': 0, 'unidades': 0, 'valor': 0.0, 'recuperaveis': 0})
            p['titulos'][i.get('title') or pid] += 1
            if pid not in vistos:
                vistos.add(pid)
                for k, cond in (('abandonados', r['aband']), ('concluidos', r['conc']), ('anonimos', r['anon']),
                                ('recuperaveis', r['recup'])):
                    if cond: p[k] += 1
            if r['aband']:
                p['unidades'] += int(i.get('quantity') or 1)
                p['valor'] += float(i.get('price') or 0) * int(i.get('quantity') or 1)
    produtos = sorted(({'titulo': p['titulos'].most_common(1)[0][0], 'sku': p['sku'], 'abandonados': p['abandonados'],
                        'concluidos': p['concluidos'], 'anonimos': p['anonimos'], 'unidades': p['unidades'],
                        'valor': p['valor'], 'recuperaveis': p['recuperaveis'],
                        'taxa': taxa(p['abandonados'], p['concluidos'])} for p in prod.values() if p['abandonados']),
                      key=lambda x: (-x['abandonados'], -x['valor'], x['titulo']))

    # -- combinações de carrinho: conjunto de produtos distintos (sem brindes e sem quantidade), sem anônimos
    por_comb = defaultdict(list)
    for r in rows:
        if r['itens'] and (r['aband'] or r['conc']):
            por_comb[frozenset(_chave_produto(i) for i in r['itens'])].append(r)
    titulo = {pid: p['titulos'].most_common(1)[0][0] for pid, p in prod.items()}
    combinacoes = sorted(({'produtos': sorted(titulo[p] for p in k), 'qtd_produtos': len(k), **ac(rs),
                           'valor_abandonado': soma(r for r in rs if r['aband']), 'ticket_medio': soma(rs) / len(rs)}
                          for k, rs in por_comb.items()),
                         key=lambda x: (-x['n'], -x['abandonados'], x['produtos']))

    # -- erros vistos no checkout (eventos alert_displayed)
    por_tipo = defaultdict(lambda: {'alertas': 0, 'rs': set()})
    por_rot = defaultdict(lambda: {'alertas': 0, 'rs': set(), 'tipo': None})
    cupons = defaultdict(lambda: {'alertas': 0, 'rs': set(), 'motivos': Counter()})
    pagamento = defaultdict(lambda: {'alertas': 0, 'rs': set(), 'mensagens': Counter()})
    for i, r in enumerate(rows):
        for tipo, msg in r['alertas']:
            t = por_tipo[tipo]; t['alertas'] += 1; t['rs'].add(i)
            g = por_rot[rotular(tipo, msg)]; g['alertas'] += 1; g['rs'].add(i); g['tipo'] = tipo
            if tipo == 'DISCOUNT_ERROR':
                c = cupons[cupom(msg)]; c['alertas'] += 1; c['rs'].add(i); c['motivos'][motivo_cupom(msg)] += 1
            if tipo == 'PAYMENT_ERROR':
                p = pagamento[motivo_pagamento(msg)]; p['alertas'] += 1; p['rs'].add(i); p['mensagens'][msg] += 1

    def afetados(rs_idx):
        rs = [rows[i] for i in rs_idx]
        a, c = sum(1 for r in rs if r['aband']), sum(1 for r in rs if r['conc'])
        return {'checkouts': len(rs), 'abandonados': a, 'concluidos': c, 'anonimos': sum(1 for r in rs if r['anon']),
                'taxa': taxa(a, c),
                'valor_abandonado': soma(r for r in rs if r['aband']), 'valor_concluido': soma(r for r in rs if r['conc'])}
    lista = lambda d: sorted(({'chave': k, 'alertas': v['alertas'], **afetados(v['rs'])} for k, v in d.items()),
                             key=lambda x: (-x['alertas'], x['chave']))
    erros_tipo = [{'tipo': TIPOS_ERRO.get(x['chave'], x['chave'] or '?'), 'codigo': x['chave'], **{k: v for k, v in x.items() if k != 'chave'},
                   'ultimo_antes_de_abandonar': ult_alerta.get(TIPOS_ERRO.get(x['chave'], x['chave'] or '?'), 0)}
                  for x in lista(por_tipo)]
    erros_msg = [{'rotulo': x['chave'], 'tipo': TIPOS_ERRO.get(por_rot[x['chave']]['tipo'], por_rot[x['chave']]['tipo']),
                  **{k: v for k, v in x.items() if k != 'chave'}} for x in lista(por_rot)]
    cup = [{'cupom': x['chave'], **{k: v for k, v in x.items() if k != 'chave'},
            'motivos': cont(cupons[x['chave']]['motivos'], 'motivo')} for x in lista(cupons)]
    pag = [{'motivo': x['chave'], **{k: v for k, v in x.items() if k != 'chave'},
            'mensagens': cont(pagamento[x['chave']]['mensagens'], 'mensagem')} for x in lista(pagamento)]
    com_alerta = [r for r in rows if r['alertas']]

    # -- tempo em cada passo (segundos), concluídos × abandonados
    tempo_passos = [{'rotulo': rot,
                     'concluidos': seg([r['tempos'].get(ev) for r in rows if r['conc']]),
                     'abandonados': seg([r['tempos'].get(ev) for r in rows if r['aband']])}
                    for ev, rot in TEMPOS]
    tempo = {'passos': tempo_passos,
             'total': {'concluidos': seg([r['duracao'] for r in rows if r['conc']]),
                       'abandonados': seg([r['duracao'] for r in rows if r['aband']])}}

    # -- frete escolhido
    por_frete = defaultdict(list)
    for r in rows:
        if r['frete']: por_frete[r['frete']].append(r)

    def linha_frete(rs):
        a, c = sum(1 for r in rs if r['aband']), sum(1 for r in rs if r['conc'])
        precos = [float(r['frete_preco']) for r in rs if r['frete_preco'] is not None]
        return {'n': len(rs), 'abandonados': a, 'concluidos': c, 'taxa': taxa(a, c),
                'preco_medio': sum(precos) / len(precos) if precos else None,
                'valor_abandonado': soma(r for r in rs if r['aband']),
                'ticket_medio': soma(rs) / len(rs) if rs else 0}
    com_frete = [r for r in rows if r['frete']]
    peso = lambda rs: [float(r['frete_preco']) / r['valor'] for r in rs if (r['frete_preco'] or 0) > 0 and r['valor'] > 0]
    sem_frete = [r for r in ab if not r['frete']]
    frete = {'opcoes': sorted(({'opcao': k, **linha_frete(v)} for k, v in por_frete.items()),
                              key=lambda x: (-x['n'], x['opcao'])),
             'gratis': linha_frete([r for r in com_frete if r['frete_preco'] == 0]),
             'pago': linha_frete([r for r in com_frete if (r['frete_preco'] or 0) > 0]),
             'peso_mediano_pago': {k: (statistics.median(v) if v else None) for k, v in
                                  (('concluidos', peso([r for r in com_frete if r['conc']])),
                                   ('abandonados', peso([r for r in com_frete if r['aband']])))},
             'abandonos_sem_frete': {'n': len(sem_frete), 'valor': soma(sem_frete)}}

    # -- recuperação depois do erro: quem tentou de novo e concluiu
    faixas = []
    for rot, lo, hi in FAIXAS_TENTATIVAS:
        rs = [r for r in rows if lo <= sum(1 for t, _ in r['alertas'] if t == 'PAYMENT_ERROR') <= hi]
        a, c = sum(1 for r in rs if r['aband']), sum(1 for r in rs if r['conc'])
        faixas.append({'faixa': rot, 'checkouts': len(rs), 'abandonados': a, 'concluidos': c, 'taxa': taxa(a, c)})

    # -- cruzamento com a base
    # (por pessoa: último abandono de quem não voltou para comprar)
    ab_sem = Counter(r['classe'] for r in ab_p if not r['any_opt'])
    pos = [r['valor'] for r in rec if r['valor'] > 0]
    via = Counter(r['via'] for r in rows if r['classe'] == 'base')
    ab_base = [r for r in ab_p if r['classe'] == 'base']
    dias = Counter(r['dt'].date() for r in rows if r['dt'])

    curto = bool(dias_nome and dias_real < dias_nome - 1)
    parcial = bool(disp and colet and colet < disp)
    avisos = ([f'Coleta parcial: {colet} de {disp} checkouts no arquivo.'] if parcial else []) + \
             ([f'Dados cobrem {dias_real:.1f} dias; o export pedia {dias_nome}.'] if curto else [])

    return {
        'avisos': avisos,
        'fonte': {'arquivo': os.path.basename(nome_arquivo), 'loja': meta.get('shop'), 'exportado_em': meta.get('exported_at'),
                  'arquivos_clientes': n_arquivos_clientes, 'clientes': len(clientes), 'moeda': moeda},
        'periodo': {'inicio': dmin.isoformat(), 'fim': dmax.isoformat(), 'dias_real': dias_real, 'dias_nome': dias_nome,
                    'curto': curto, 'fuso': str(TZ),
                    'disponivel': disp, 'coletado': colet, 'erros_coleta': meta.get('erros') or 0,
                    'parcial': parcial},
        'checkouts': N,
        'taxa_abandono': taxa(len(ab_p), len(conc_p)),
        'pessoas': {'total': len({r['pessoa'] for r in rows}), 'abandonados': len(ab_p), 'concluidos': len(conc_p),
                    'taxa': taxa(len(ab_p), len(conc_p)), 'valor_abandonado': soma(ab_p),
                    'voltaram_para_finalizar': {'n': len(voltaram), 'valor': soma(voltaram)}},
        'abandonados': len(ab), 'recuperaveis': NR,
        'valor_abandonado': soma(ab), 'valor_recuperavel': soma(rec),
        'desfecho': {'anonimo': sum(1 for r in rows if r['anon']),
                     'anonimo_com_erro': sum(1 for r in rows if r['anon'] and r['st'] != 'anonimo'), 'abandonou_sem_erro': sum(1 for r in ab if not r['src'].get('error_type')),
                     'abandonou_apos_erro': sum(1 for r in ab if r['src'].get('error_type')),
                     'finalizou': st['concluido'], 'em_andamento': st['em_andamento']},
        'funil': funil,
        'parou': parou,
        'abandonos_fim_em_alerta': {'n': len(fim_alerta), 'por_tipo': cont(ult_alerta, 'tipo')},
        'pagamento': {'metodos': metodos, 'chegaram': sum(m['n'] for m in metodos),
                      'abandonos_sem_metodo': {'n': len(sem_pm), 'valor': soma(sem_pm)}},
        'regioes': regioes,
        'produtos': produtos, 'brindes_ignorados': sum(r['brindes'] for r in rows), 'combinacoes': combinacoes,
        'erros': {'alertas': sum(t['alertas'] for t in por_tipo.values()), 'checkouts_com_alerta': len(com_alerta),
                  'abandonados_com_alerta': sum(1 for r in com_alerta if r['aband']),
                  'concluidos_com_alerta': sum(1 for r in com_alerta if r['conc']),
                  'tipos': erros_tipo, 'mensagens': erros_msg, 'cupons': cup, 'pagamento': pag,
                  'tentativas_pagamento': faixas},
        'tempo': tempo, 'frete': frete,
        'clientes': {
            'abandonados_sem_optin': {'base': ab_sem['base'], 'fora': ab_sem['fora']},
            'optin_abandonados': {k: sum(1 for r in ab_p if r['opt'][k]) for k, _ in CANAIS},
            'base_sem_optin': {k: sum(1 for c in clientes if not yes(c[col])) for k, col in CANAIS},
            'abandonados_na_base': len(ab_base),
            'recorrentes': {'n': sum(1 for r in ab_base if r['recorrente']),
                            'valor': soma(r for r in ab_base if r['recorrente'])},
            'novos_na_base': {'n': sum(1 for r in ab_base if not r['recorrente']),
                              'valor': soma(r for r in ab_base if not r['recorrente'])},
            'recuperaveis': {'ticket_medio': sum(pos) / len(pos) if pos else 0, 'com_valor': len(pos),
                             'multicanal': sum(1 for r in rec if sum(r['opt'].values()) > 1),
                             'recorrentes': sum(1 for r in rec if r['recorrente']),
                             'sem_erro': sum(1 for r in rec if not r['src'].get('error_type')),
                             'por_canal': {k: {'n': sum(1 for r in rec if r['opt'][k]), 'valor': soma(r for r in rec if r['opt'][k])}
                                           for k, _ in CANAIS},
                             'por_ponto': [{'rotulo': PASSOS[i][2], 'n': sum(1 for r in rec if r['ponto'] == i),
                                            'valor': soma(r for r in rec if r['ponto'] == i)} for i in range(len(PASSOS))],
                             'por_pagamento': cont(Counter(r['pm'] or 'Não chegou ao pagamento' for r in rec), 'metodo'),
                             'por_uf': cont(Counter(_nome_uf(r['uf']) for r in rec), 'estado')},
            'matches': {'email': via['e-mail'], 'telefone': via['telefone']},
        },
        'por_dia': [{'data': d.isoformat(), 'total': c, 'abandonados': sum(1 for r in ab if r['dt'] and r['dt'].date() == d)}
                    for d, c in sorted(dias.items())],
    }
