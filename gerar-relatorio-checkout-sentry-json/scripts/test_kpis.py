"""Rodar: python3 -m unittest discover .claude/skills/gerar-relatorio-checkout-sentry-json/scripts -p 'test_*.py'"""
import json
import os
import tempfile
import unittest

from load import ColunaFaltando, ler_checkouts
from metrics import calcular, cupom, motivo_cupom, norm_phone, rotular


def checkout(token, status, **kw):
    base = {'checkout_token': token, 'status': status, 'client_id': token, 'email': f'{token}@teste.com', 'phone': None, 'province': 'JAL',
            'payment_method': None, 'cart_value': 100, 'cart_items': [], 'events': [], 'error_type': None,
            'error_message': None, 'first_event_at': '2026-09-20T12:00:00+00:00', 'last_event_at': '2026-09-20T12:05:00+00:00'}
    base.update(kw)
    return base


def evento(tipo, quando='2026-09-20T12:01:00+00:00', erro=None, msg=None):
    return {'event_type': tipo, 'created_at': quando, 'error_type': erro, 'error_message': msg}


ITEM = {'product_id': '1', 'title': 'WineBox', 'sku': 'wb', 'price': 100, 'quantity': 2}
BRINDE = {'product_id': '2', 'title': 'Regalo: Wine Bag', 'sku': 'wbag', 'price': 100, 'quantity': 1}
CLIENTE = {'Customer ID': '1', 'Email': 'ana@x.com', 'Phone': '', 'Default Address Phone': '', 'Accepts Email Marketing': 'yes',
           'Accepts SMS Marketing': 'no', 'Accepts WhatsApp Marketing': 'no', 'Total Orders': '2'}


def calc(chk, meta=None, clientes=()):
    return calcular(meta or {}, chk, list(clientes), nome_arquivo='x_30d.json', n_arquivos_clientes=1)


class Metricas(unittest.TestCase):
    def test_pagamento_regiao_produto_e_erro(self):
        chk = [
            checkout('a', 'abandonado', payment_method='VISA', cart_items=[ITEM, BRINDE],
                     events=[evento('checkout_started'), evento('payment_info_submitted', '2026-09-20T12:02:00+00:00')]),
            checkout('b', 'concluido', payment_method='VISA', cart_items=[ITEM]),
            checkout('c', 'com_erro', payment_method='informado', province='DF', error_type='PAYMENT_ERROR',
                     events=[evento('checkout_started'), evento('alert_displayed', '2026-09-20T12:03:00+00:00', 'PAYMENT_ERROR',
                                                                'Tu tarjeta fue rechazada. Inténtalo de nuevo.')]),
            checkout('d', 'anonimo', province='DF'),
        ]
        m = calc(chk)
        self.assertEqual((m['checkouts'], m['abandonados'], m['desfecho']['anonimo']), (4, 2, 1))
        pm = {x['metodo']: x for x in m['pagamento']['metodos']}
        self.assertEqual((pm['Visa']['abandonados'], pm['Visa']['concluidos'], pm['Visa']['taxa']), (1, 1, 0.5))
        self.assertIn('Não identificado', pm)
        self.assertEqual(m['pagamento']['abandonos_sem_metodo']['n'], 0)
        self.assertEqual([(r['uf'], r['abandonados']) for r in m['regioes']], [('DF', 1), ('JAL', 1)])
        p = m['produtos'][0]
        self.assertEqual((p['titulo'], p['abandonados'], p['unidades'], p['valor']), ('WineBox', 1, 2, 200.0))
        self.assertEqual(m['brindes_ignorados'], 1)
        self.assertEqual(m['erros']['tipos'][0]['codigo'], 'PAYMENT_ERROR')
        self.assertEqual(m['erros']['mensagens'][0]['rotulo'], 'Pagamento: cartão recusado')
        self.assertEqual(m['abandonos_fim_em_alerta']['n'], 1)
        # funil sem o anônimo, cumulativo: 'a' chegou ao pagamento, 'b' concluiu, 'c' só abriu
        self.assertEqual([f['n'] for f in m['funil']], [3, 2, 2, 2, 2, 1])

    def test_so_regalo_e_brinde(self):
        bag = {**BRINDE, 'title': 'Wine Bag'}  # mesmo produto do brinde, mas vendido
        m = calc([checkout('a', 'abandonado', cart_items=[ITEM, BRINDE]), checkout('b', 'abandonado', cart_items=[bag])])
        self.assertEqual(sorted(p['titulo'] for p in m['produtos']), ['Wine Bag', 'WineBox'])
        self.assertEqual(m['brindes_ignorados'], 1)

    def test_combinacoes_de_carrinho(self):
        bag = {**BRINDE, 'title': 'Wine Bag'}
        chk = [checkout('a', 'abandonado', cart_items=[ITEM, bag, BRINDE]),
               checkout('b', 'concluido', cart_items=[bag, {**ITEM, 'quantity': 1}]),
               checkout('c', 'abandonado', cart_items=[ITEM]),
               checkout('d', 'anonimo', cart_items=[ITEM, bag])]
        cb = calc(chk)['combinacoes']
        self.assertEqual([(c['produtos'], c['n'], c['abandonados'], c['concluidos']) for c in cb],
                         [(['Wine Bag', 'WineBox'], 2, 1, 1), (['WineBox'], 1, 1, 0)])

    def test_frete_por_estado(self):
        chk = [checkout('a', 'concluido', province='JAL', selected_shipping_title='Envío Gratis', shipping_price=0),
               checkout('b', 'abandonado', province='JAL', selected_shipping_title='Envío Standard', shipping_price=99),
               checkout('c', 'abandonado', province='JAL', selected_shipping_title='Envío Standard', shipping_price=99),
               checkout('d', 'abandonado', province='JAL')]
        f = calc(chk)['regioes'][0]['frete']
        self.assertEqual((f['com_frete'], f['gratis']['taxa'], f['pago']['taxa'], f['pago']['preco_medio']), (3, 0.0, 1.0, 99.0))
        self.assertEqual([(o['opcao'], o['n']) for o in f['opcoes']], [('Envío Standard', 2), ('Envío Gratis', 1)])

    def test_tempo_frete_e_recuperacao(self):
        t0, t1, t2 = '2026-09-20T12:00:00+00:00', '2026-09-20T12:00:30+00:00', '2026-09-20T12:02:30+00:00'
        alerta = evento('alert_displayed', t1, 'PAYMENT_ERROR', 'Tu tarjeta fue rechazada.')
        chk = [
            checkout('a', 'concluido', selected_shipping_title='Envío Gratis', shipping_price=0, cart_value=500,
                     events=[evento('checkout_started', t0), evento('checkout_contact_info_submitted', t1), alerta,
                             evento('checkout_completed', t2)]),
            checkout('b', 'abandonado', selected_shipping_title='Envío Standard', shipping_price=100, cart_value=400,
                     events=[evento('checkout_started', t0), evento('checkout_contact_info_submitted', t1), alerta, alerta]),
        ]
        m = calc(chk)
        contato = m['tempo']['passos'][0]
        self.assertEqual((contato['concluidos']['mediana'], contato['abandonados']['mediana']), (30, 30))
        self.assertEqual(m['tempo']['total']['concluidos']['mediana'], 150)
        fr = {o['opcao']: o for o in m['frete']['opcoes']}
        self.assertEqual((fr['Envío Gratis']['taxa'], fr['Envío Standard']['taxa']), (0.0, 1.0))
        self.assertEqual((m['frete']['gratis']['n'], m['frete']['pago']['n'], m['frete']['peso_mediano_pago']['abandonados']), (1, 1, 0.25))
        tipo = m['erros']['tipos'][0]
        self.assertEqual((tipo['concluidos'], tipo['valor_concluido'], tipo['valor_abandonado']), (1, 500.0, 400.0))
        faixas = {f['faixa']: f for f in m['erros']['tentativas_pagamento']}
        self.assertEqual((faixas['1 tentativa']['concluidos'], faixas['2 tentativas']['abandonados']), (1, 1))

    def test_recuperavel_e_recorrente(self):
        chk = [checkout('a', 'abandonado', email='ANA@x.com', cart_value=300)]
        m = calc(chk, clientes=[CLIENTE])
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
        # Ana voltou e comprou: não é recuperável nem conta como recorrente abandonada
        self.assertEqual((m['recuperaveis'], m['valor_recuperavel']), (1, 80.0))
        self.assertEqual((m['clientes']['recorrentes']['n'], m['clientes']['novos_na_base']['n']), (0, 1))

    def test_tempo_ignora_alertas_e_duracao_vai_ate_o_ultimo_evento(self):
        t = lambda s: f'2026-09-20T12:{s}+00:00'
        chk = [checkout('a', 'com_erro', first_event_at=t('00:00'), events=[
            evento('checkout_started', t('00:00')), evento('alert_displayed', t('00:20'), 'INPUT_INVALID', 'x'),
            evento('checkout_contact_info_submitted', t('00:30')), evento('payment_info_submitted', t('01:00')),
            evento('alert_displayed', t('01:10'), 'PAYMENT_ERROR', 'rechazada'),
            evento('payment_info_submitted', t('05:00'))])]
        m = calc(chk)
        self.assertEqual(m['tempo']['passos'][0]['abandonados']['mediana'], 30)  # contato: desde o início, não do alerta
        self.assertEqual(m['tempo']['total']['abandonados']['mediana'], 300)
        self.assertEqual(m['periodo']['inicio'], '2026-09-20T12:00:00+00:00')  # first_event_at, em UTC

    def test_abandono_sem_contato_e_anonimo(self):
        cupom_err = evento('alert_displayed', erro='DISCOUNT_ERROR', msg='El código de descuento X no está disponible')
        chk = [checkout('a', 'com_erro', email=None, error_type='DISCOUNT_ERROR', events=[evento('checkout_started'), cupom_err]),
               checkout('b', 'abandonado', email=None, phone='+52 55 1234 5678'),
               checkout('c', 'concluido', events=[cupom_err])]
        m = calc(chk)
        self.assertEqual((m['abandonados'], m['desfecho']['anonimo'], m['desfecho']['anonimo_com_erro']), (1, 1, 1))
        self.assertEqual((m['pessoas']['abandonados'], m['taxa_abandono']), (1, 0.5))
        c = m['erros']['cupons'][0]
        self.assertEqual((c['checkouts'], c['abandonados'], c['concluidos'], c['anonimos']), (2, 0, 1, 1))

    def test_aviso_de_coleta_parcial(self):
        m = calc([checkout('a', 'abandonado')], meta={'total_disponivel': 10, 'total_coletado': 1, 'period': '30d'})
        self.assertTrue(m['periodo']['parcial'])
        self.assertTrue(m['periodo']['curto'])

    def test_cupom_sem_codigo_nao_pega_a_palavra_o(self):
        self.assertEqual(cupom('Introduce un código de descuento o tarjeta de regalo válido(a)'), '(código não informado)')
        self.assertEqual(cupom('El código de descuento ABC no está disponible para ti'), 'ABC')
        self.assertEqual(motivo_cupom('El código de descuento X no es válido para los artículos de tu carrito'), 'Válido, mas não aplicável')

    def test_rotulos_agrupam_mensagens(self):
        self.assertEqual(rotular('INPUT_INVALID', 'Introduce el código de seguridad (CVV) de tu tarjeta'), 'Cartão: CVV')
        self.assertEqual(rotular('INPUT_REQUIRED', 'Introduce un código de descuento o tarjeta de regalo válido(a)'),
                         'Cupom: código inválido')


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
        chk = [checkout('a', 'abandonado', email='ana@x.com', phone='+5215512345678', cart_items=[ITEM])]
        texto = json.dumps(calc(chk, clientes=[CLIENTE]), ensure_ascii=False)
        for pii in ('ana@x.com', '5512345678', 'Ana'):
            self.assertNotIn(pii, texto)

    def test_amostra_pequena_e_avisos(self):
        m = calc([checkout('a', 'abandonado', payment_method='VISA')], meta={'total_disponivel': 2, 'total_coletado': 1})
        self.assertTrue(m['pagamento']['metodos'][0]['amostra_pequena'])
        self.assertTrue(any(a.startswith('Coleta parcial: 1 de 2') for a in m['avisos']))

    def test_telefone_mexicano(self):
        # 55 é DDD da Cidade do México: não pode ser tratado como código de país
        self.assertEqual(norm_phone('5512345678'), '5512345678')
        self.assertEqual(norm_phone('+52 55 1234 5678'), '5512345678')
        self.assertEqual(norm_phone('+521 55 1234 5678'), '5512345678')
        self.assertEqual(norm_phone('123'), '')


if __name__ == '__main__':
    unittest.main()
