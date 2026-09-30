"""Rodar, a partir de scripts/json: python3 -m unittest discover ."""
import json
import os
import tempfile
import unittest

from load import ColunaFaltando, ler_checkouts
from metrics import calcular, norm_msg, norm_phone


def checkout(token, status, **kw):
    base = {'checkout_token': token, 'status': status, 'client_id': token, 'email': f'{token}@teste.com', 'phone': None,
            'province': 'AA', 'payment_method': None, 'cart_value': 100, 'cart_items': [], 'events': [], 'error_type': None,
            'error_message': None, 'first_event_at': '2026-09-20T12:00:00+00:00', 'last_event_at': '2026-09-20T12:05:00+00:00'}
    base.update(kw)
    return base


def evento(tipo, quando='2026-09-20T12:01:00+00:00', erro=None, msg=None):
    return {'event_type': tipo, 'created_at': quando, 'error_type': erro, 'error_message': msg}


def item(pid, price=100, quantity=1):
    return {'product_id': pid, 'title': f'item {pid}', 'sku': f'sku-{pid}', 'price': price, 'quantity': quantity}


CLIENTE = {'Customer ID': '1', 'Email': 'ana@x.com', 'Phone': '', 'Default Address Phone': '', 'Accepts Email Marketing': 'yes',
           'Accepts SMS Marketing': 'no', 'Accepts WhatsApp Marketing': 'no', 'Total Orders': '2'}


def calc(chk, meta=None, clientes=()):
    return calcular(meta or {}, chk, list(clientes), nome_arquivo='x_30d.json', n_arquivos_clientes=1)


class Metricas(unittest.TestCase):
    def test_pagamento_regiao_produto_e_erro(self):
        chk = [
            checkout('a', 'abandonado', payment_method='METODO_1', cart_items=[item('p1', quantity=2), item('p2')],
                     events=[evento('checkout_started'), evento('payment_info_submitted', '2026-09-20T12:02:00+00:00')]),
            checkout('b', 'concluido', payment_method='METODO_1', cart_items=[item('p1')]),
            checkout('c', 'com_erro', payment_method='METODO_2', province='BB', error_type='PAYMENT_ERROR',
                     events=[evento('checkout_started'), evento('alert_displayed', '2026-09-20T12:03:00+00:00', 'PAYMENT_ERROR',
                                                                'mensagem de erro 1')]),
            checkout('d', 'anonimo', province='BB'),
        ]
        m = calc(chk)
        self.assertEqual((m['checkouts'], m['abandonados'], m['desfecho']['anonimo']), (4, 2, 1))
        pm = {x['metodo']: x for x in m['pagamento']['metodos']}
        self.assertEqual((pm['METODO_1']['abandonados'], pm['METODO_1']['concluidos'], pm['METODO_1']['taxa']), (1, 1, 0.5))
        self.assertIn('METODO_2', pm)  # método sai como veio no checkout, sem mapeamento
        self.assertEqual([(r['uf'], r['abandonados']) for r in m['regioes']], [('AA', 1), ('BB', 1)])  # UF crua
        p = {x['product_id']: x for x in m['produtos']}
        self.assertEqual((p['p1']['abandonados'], p['p1']['concluidos'], p['p1']['unidades'], p['p1']['valor']), (1, 1, 2, 200.0))
        self.assertEqual(p['p2']['abandonados'], 1)  # todo item do carrinho entra
        self.assertEqual(m['erros']['tipos'][0]['codigo'], 'PAYMENT_ERROR')
        self.assertEqual(m['erros']['mensagens'][0]['mensagem'], 'mensagem de erro 1')  # mensagem exata
        self.assertEqual(m['abandonos_fim_em_alerta']['n'], 1)
        # funil sem o anônimo, cumulativo: 'a' chegou ao pagamento, 'b' concluiu, 'c' só abriu
        self.assertEqual([f['n'] for f in m['funil']], [3, 2, 2, 2, 2, 1])

    def test_mensagens_agrupadas_pelo_texto_exato(self):
        chk = [checkout('a', 'abandonado', events=[evento('alert_displayed', erro='DISCOUNT_ERROR', msg='mensagem  de erro 1 ')]),
               checkout('b', 'concluido', events=[evento('alert_displayed', erro='DISCOUNT_ERROR', msg='mensagem de erro 1')]),
               checkout('c', 'abandonado', events=[evento('alert_displayed', erro='DISCOUNT_ERROR', msg='mensagem de erro 2')])]
        msgs = {x['mensagem']: x for x in calc(chk)['erros']['mensagens']}
        self.assertEqual(set(msgs), {'mensagem de erro 1', 'mensagem de erro 2'})
        self.assertEqual((msgs['mensagem de erro 1']['checkouts'], msgs['mensagem de erro 1']['taxa']), (2, 0.5))
        self.assertEqual(norm_msg(None), '(sem mensagem)')

    def test_etapa_do_alerta_pela_sequencia_de_eventos(self):
        t = lambda s: f'2026-09-20T12:{s}+00:00'
        chk = [checkout('a', 'abandonado', events=[
            evento('checkout_started', t('00:00')), evento('alert_displayed', t('00:10'), 'INPUT_INVALID', 'mensagem 1'),
            evento('checkout_contact_info_submitted', t('00:20')), evento('checkout_address_info_submitted', t('00:30')),
            evento('checkout_shipping_info_submitted', t('00:40')), evento('alert_displayed', t('00:50'), 'INPUT_INVALID', 'mensagem 2'),
            evento('payment_info_submitted', t('01:00')), evento('alert_displayed', t('01:10'), 'PAYMENT_ERROR', 'mensagem 3')])]
        etapas = {x['mensagem']: x['etapa'] for x in calc(chk)['erros']['por_etapa']}
        self.assertEqual(etapas, {'mensagem 1': 'Contato', 'mensagem 2': 'Pagamento', 'mensagem 3': 'Pagamento'})

    def test_combinacoes_de_carrinho(self):
        chk = [checkout('a', 'abandonado', cart_items=[item('p1'), item('p2')]),
               checkout('b', 'concluido', cart_items=[item('p2'), item('p1', quantity=3)]),
               checkout('c', 'abandonado', cart_items=[item('p1')]),
               checkout('d', 'anonimo', cart_items=[item('p1'), item('p2')])]
        cb = calc(chk)['combinacoes']
        self.assertEqual([(c['ids'], c['n'], c['abandonados'], c['concluidos']) for c in cb],
                         [(['p1', 'p2'], 2, 1, 1), (['p1'], 1, 1, 0)])

    def test_frete_por_estado(self):
        chk = [checkout('a', 'concluido', selected_shipping_title='opcao-1', shipping_price=0),
               checkout('b', 'abandonado', selected_shipping_title='opcao-2', shipping_price=99),
               checkout('c', 'abandonado', selected_shipping_title='opcao-2', shipping_price=99),
               checkout('d', 'abandonado')]
        f = calc(chk)['regioes'][0]['frete']
        self.assertEqual((f['com_frete'], f['gratis']['taxa'], f['pago']['taxa'], f['pago']['preco_medio']), (3, 0.0, 1.0, 99.0))
        self.assertEqual([(o['opcao'], o['n']) for o in f['opcoes']], [('opcao-2', 2), ('opcao-1', 1)])

    def test_tempo_frete_e_recuperacao(self):
        t0, t1, t2 = '2026-09-20T12:00:00+00:00', '2026-09-20T12:00:30+00:00', '2026-09-20T12:02:30+00:00'
        alerta = evento('alert_displayed', t1, 'PAYMENT_ERROR', 'mensagem de erro 1')
        chk = [
            checkout('a', 'concluido', selected_shipping_title='opcao-1', shipping_price=0, cart_value=500,
                     events=[evento('checkout_started', t0), evento('checkout_contact_info_submitted', t1), alerta,
                             evento('checkout_completed', t2)]),
            checkout('b', 'abandonado', selected_shipping_title='opcao-2', shipping_price=100, cart_value=400,
                     events=[evento('checkout_started', t0), evento('checkout_contact_info_submitted', t1), alerta, alerta]),
        ]
        m = calc(chk)
        contato = m['tempo']['passos'][0]
        self.assertEqual((contato['concluidos']['mediana'], contato['abandonados']['mediana']), (30, 30))
        self.assertEqual(m['tempo']['total']['concluidos']['mediana'], 150)
        fr = {o['opcao']: o for o in m['frete']['opcoes']}
        self.assertEqual((fr['opcao-1']['taxa'], fr['opcao-2']['taxa']), (0.0, 1.0))
        self.assertEqual((m['frete']['gratis']['n'], m['frete']['pago']['n'], m['frete']['peso_mediano_pago']['abandonados']), (1, 1, 0.25))
        tipo = m['erros']['tipos'][0]
        self.assertEqual((tipo['concluidos'], tipo['valor_concluido'], tipo['valor_abandonado']), (1, 500.0, 400.0))
        faixas = {f['faixa']: f for f in m['erros']['tentativas_pagamento']}
        self.assertEqual((faixas['1 tentativa']['concluidos'], faixas['2 tentativas']['abandonados']), (1, 1))

    def test_recuperavel_e_recorrente(self):
        m = calc([checkout('a', 'abandonado', email='ANA@x.com', cart_value=300)], clientes=[CLIENTE])
        self.assertEqual((m['recuperaveis'], m['valor_recuperavel']), (1, 300.0))
        self.assertEqual(m['clientes']['recorrentes']['n'], 1)

    def test_quem_voltou_para_comprar_nao_e_abandono(self):
        chk = [checkout('a1', 'abandonado', email='ana@x.com', last_event_at='2026-09-20T12:05:00+00:00'),
               checkout('a2', 'abandonado', email='ANA@x.com', last_event_at='2026-09-20T13:00:00+00:00'),
               checkout('a3', 'concluido', email='ana@x.com', cart_value=250, last_event_at='2026-09-21T10:00:00+00:00'),
               checkout('b1', 'abandonado', email='bia@x.com', last_event_at='2026-09-20T12:05:00+00:00'),
               checkout('b2', 'abandonado', email='bia@x.com', cart_value=80, last_event_at='2026-09-22T12:05:00+00:00'),
               checkout('c', 'anonimo')]
        m = calc(chk, clientes=[CLIENTE, {**CLIENTE, 'Customer ID': '2', 'Email': 'bia@x.com', 'Total Orders': '0'}])
        self.assertEqual(m['abandonados'], 4)  # por checkout, sem deduplicar
        p = m['pessoas']
        self.assertEqual((p['total'], p['abandonados'], p['concluidos'], p['voltaram_para_finalizar']['n']), (3, 1, 1, 1))
        self.assertEqual((m['taxa_abandono'], p['valor_abandonado'], p['voltaram_para_finalizar']['valor']), (0.5, 80.0, 250.0))
        self.assertEqual((m['recuperaveis'], m['valor_recuperavel']), (1, 80.0))
        self.assertEqual((m['clientes']['recorrentes']['n'], m['clientes']['novos_na_base']['n']), (0, 1))

    def test_tempo_ignora_alertas_e_duracao_vai_ate_o_ultimo_evento(self):
        t = lambda s: f'2026-09-20T12:{s}+00:00'
        chk = [checkout('a', 'com_erro', first_event_at=t('00:00'), events=[
            evento('checkout_started', t('00:00')), evento('alert_displayed', t('00:20'), 'INPUT_INVALID', 'x'),
            evento('checkout_contact_info_submitted', t('00:30')), evento('payment_info_submitted', t('01:00')),
            evento('alert_displayed', t('01:10'), 'PAYMENT_ERROR', 'y'),
            evento('payment_info_submitted', t('05:00'))])]
        m = calc(chk)
        self.assertEqual(m['tempo']['passos'][0]['abandonados']['mediana'], 30)  # contato: desde o início, não do alerta
        self.assertEqual(m['tempo']['total']['abandonados']['mediana'], 300)
        self.assertEqual(m['periodo']['inicio'], '2026-09-20T12:00:00+00:00')  # first_event_at, em UTC

    def test_abandono_sem_contato_e_anonimo(self):
        alerta = evento('alert_displayed', erro='DISCOUNT_ERROR', msg='mensagem de erro 1')
        chk = [checkout('a', 'com_erro', email=None, error_type='DISCOUNT_ERROR', events=[evento('checkout_started'), alerta]),
               checkout('b', 'abandonado', email=None, phone='+99 21 98765-4321'),
               checkout('c', 'concluido', events=[alerta])]
        m = calc(chk)
        self.assertEqual((m['abandonados'], m['desfecho']['anonimo'], m['desfecho']['anonimo_com_erro']), (1, 1, 1))
        self.assertEqual((m['pessoas']['abandonados'], m['taxa_abandono']), (1, 0.5))
        c = m['erros']['mensagens'][0]
        self.assertEqual((c['checkouts'], c['abandonados'], c['concluidos'], c['anonimos']), (2, 0, 1, 1))

    def test_aviso_de_coleta_parcial(self):
        m = calc([checkout('a', 'abandonado')], meta={'total_disponivel': 10, 'total_coletado': 1, 'period': '30d'})
        self.assertTrue(m['periodo']['parcial'])
        self.assertTrue(m['periodo']['curto'])

    def test_produto_so_com_concluidos_entra(self):
        m = calc([checkout('a', 'concluido', cart_items=[item('p1')])])
        self.assertEqual([(p['product_id'], p['abandonados'], p['concluidos']) for p in m['produtos']], [('p1', 0, 1)])

    def test_por_dia_com_ticket_e_frete(self):
        d1, d2 = '2026-09-20T12:05:00+00:00', '2026-09-21T12:05:00+00:00'
        chk = [checkout('a', 'concluido', cart_value=300, last_event_at=d1, selected_shipping_title='opcao-1', shipping_price=0),
               checkout('b', 'abandonado', cart_value=100, last_event_at=d1, selected_shipping_title='opcao-2', shipping_price=20),
               checkout('c', 'abandonado', cart_value=200, last_event_at=d1),
               checkout('d', 'anonimo', cart_value=999, last_event_at=d1),
               checkout('e', 'concluido', cart_value=50, last_event_at=d2, selected_shipping_title='opcao-2', shipping_price=10)]
        dias = calc(chk)['por_dia']
        self.assertEqual([d['data'] for d in dias], ['2026-09-20', '2026-09-21'])
        d = dias[0]
        self.assertEqual((d['total'], d['abandonados'], d['concluidos'], d['anonimos']), (4, 2, 1, 1))
        self.assertEqual(d['ticket_medio'], {'geral': 200.0, 'abandonados': 150.0, 'concluidos': 300.0})
        self.assertEqual(d['frete_medio'], {'geral': 10.0, 'abandonados': 20.0, 'concluidos': 0.0, 'com_frete': 2})
        self.assertEqual(dias[1]['frete_medio']['abandonados'], None)

    def test_moeda_em_reais(self):
        self.assertEqual(calc([checkout('a', 'abandonado')])['fonte']['moeda'], 'R$')


class Leitura(unittest.TestCase):
    def _grava(self, nome, texto):
        d = tempfile.mkdtemp()
        p = os.path.join(d, nome)
        with open(p, 'w', encoding='utf-8') as f: f.write(texto)
        return p

    def test_json_e_jsonl_dao_o_mesmo(self):
        chk = [checkout('a', 'abandonado'), checkout('b', 'concluido')]
        meta, l1 = ler_checkouts(self._grava('a.json', json.dumps({'shop': 's', 'checkouts': chk})))
        self.assertEqual((meta['shop'], len(l1)), ('s', 2))
        _, l2 = ler_checkouts(self._grava('a.jsonl', '\n'.join(json.dumps(c) for c in chk)))
        self.assertEqual([c['checkout_token'] for c in l2], ['a', 'b'])

    def test_campo_faltando(self):
        with self.assertRaises(ColunaFaltando):
            ler_checkouts(self._grava('a.json', json.dumps({'checkouts': [{'checkout_token': 'x', 'status': 'abandonado'}]})))


class Saida(unittest.TestCase):
    def test_json_sem_dados_pessoais(self):
        chk = [checkout('a', 'abandonado', email='ana@x.com', phone='+9921987654321', cart_items=[item('p1')])]
        texto = json.dumps(calc(chk, clientes=[CLIENTE]), ensure_ascii=False)
        for pii in ('ana@x.com', '987654321'):
            self.assertNotIn(pii, texto)

    def test_amostra_pequena_e_avisos(self):
        m = calc([checkout('a', 'abandonado', payment_method='METODO_1')], meta={'total_disponivel': 2, 'total_coletado': 1})
        self.assertTrue(m['pagamento']['metodos'][0]['amostra_pequena'])
        self.assertTrue(any(a.startswith('Coleta parcial: 1 de 2') for a in m['avisos']))

    def test_telefone_com_e_sem_codigo_de_pais(self):
        self.assertEqual(norm_phone('+99 21 98765-4321'), norm_phone('(21) 98765-4321'))
        self.assertEqual(norm_phone('+1 555 123 4567'), norm_phone('555 123 4567'))
        self.assertEqual(norm_phone('123'), '')


if __name__ == '__main__':
    unittest.main()
