"""Rodar, a partir de scripts/csv: python3 -m unittest discover ."""
import csv
import io
import json
import os
import tempfile
import unittest
from contextlib import redirect_stdout

from indicadores import main
from load import CHK_COLS, CLI_COLS
from metrics import calcular, norm_msg, norm_phone, top_n
from tabela import COLUNAS, indicadores, markdown


def linha(**kw):
    r = {c: '' for c in CHK_COLS}
    r.update({'Status': 'abandonado', 'Valor': '100', 'Última atividade': '2026-09-20T12:00:00+00:00'})
    r.update(kw)
    return r


CLI = {'Customer ID': '1', 'Email': 'Ana@X.com', 'Phone': '', 'Default Address Phone': '+1 555 123 4567',
       'Accepts Email Marketing': 'yes', 'Accepts SMS Marketing': 'no', 'Accepts WhatsApp Marketing': 'no'}


def por_chave(m):
    return {r['chave']: r for r in indicadores(m)}


class RegrasSinteticas(unittest.TestCase):
    def calc(self, rows, **kw):
        return calcular(rows, [CLI], nome_arquivo='checkouts-export-7d-x.csv', n_arquivos_clientes=1, **kw)

    def test_uf_sozinha_nao_conta_como_entrega_por_padrao(self):
        rows = [linha(UF='MG')]
        self.assertEqual(self.calc(rows)['etapas']['nada']['n'], 1)
        self.assertEqual(self.calc(rows, uf_conta_entrega=True)['etapas']['ship']['n'], 1)

    def test_match_por_email_normalizado(self):
        m = self.calc([linha(Email=' ana@x.COM ')])
        self.assertEqual(m['recuperaveis'], 1)
        self.assertEqual(m['matches'], {'email': 1, 'telefone': 0})

    def test_frete_filtra_mais_de_duas_mudancas(self):
        rows = [linha(**{'Client ID': 'a', 'Email': 'ana@x.com', 'Cidade': 'cidade-1', 'UF': 'AA',
                         'Tipo de erro': 'DELIVERY_ERROR', 'Mensagem de erro': 'mensagem de erro 1'})]
        rows += [linha(**{'Client ID': 'b', 'Cidade': c, 'UF': 'BB', 'Tipo de erro': 'DELIVERY_ERROR',
                          'Mensagem de erro': 'mensagem de erro 1'}) for c in ('A', 'B', 'C', 'D')]
        m = self.calc(rows)
        fr = m['erros_recuperaveis']['frete']
        self.assertEqual((fr['no_export'], fr['excluidos'], fr['n']), (5, 4, 1))
        self.assertEqual(fr['por_uf'], [('AA', 1)])
        t = por_chave(m)
        self.assertEqual(t['erros_recuperaveis.frete.excluidos']['valor'], 4)
        self.assertEqual(t['erros_recuperaveis.frete.uf.AA']['pct'], 100.0)

    def test_percentual_e_base_na_tabela(self):
        m = self.calc([linha(Email='ana@x.com'), linha(), linha(Status='concluido')])
        t = por_chave(m)
        self.assertEqual(t['abandonados']['valor'], 2)
        self.assertAlmostEqual(t['abandonados']['pct'], 66.67, places=2)
        self.assertEqual(t['abandonados']['base_pct'], 'checkouts')
        self.assertEqual(t['recuperaveis']['pct'], 50.0)
        self.assertEqual(t['checkouts']['pct'], None)

    def test_chaves_unicas_e_colunas(self):
        rows = indicadores(self.calc([linha(Email='ana@x.com', **{'Tipo de erro': 'PAYMENT_ERROR',
                                                                   'Mensagem de erro': 'mensagem de erro 1'})]))
        chaves = [r['chave'] for r in rows]
        self.assertEqual(len(chaves), len(set(chaves)))
        self.assertTrue(all(list(r) == COLUNAS for r in rows))

    def test_moeda_em_reais(self):
        rows = [linha(Valor='1234.5')]
        self.assertIn('R$ 1.234,50', markdown(self.calc(rows)))
        self.assertEqual(self.calc(rows)['fonte']['moeda'], 'R$')
        # o JSON de métricas reimprime a mesma tabela
        self.assertEqual(markdown(json.loads(json.dumps(self.calc(rows)))), markdown(self.calc(rows)))

    def test_saida_sem_html(self):
        md = markdown(self.calc([linha(Email='ana@x.com')]))
        self.assertNotRegex(md, r'<[a-zA-Z/]')

    def test_cupom_e_pagamento_pela_mensagem_exata(self):
        rows = [linha(Email='ana@x.com', **{'Tipo de erro': 'DISCOUNT_ERROR', 'Mensagem de erro': 'mensagem  de erro 1'}),
                linha(**{'Tipo de erro': 'DISCOUNT_ERROR', 'Mensagem de erro': 'mensagem de erro 1'}),
                linha(**{'Tipo de erro': 'PAYMENT_ERROR', 'Mensagem de erro': 'mensagem de erro 2'})]
        an = self.calc(rows)['anexo']
        self.assertEqual([(c['mensagem'], c['tentativas']) for c in an['cupons']], [('mensagem de erro 1', 2)])
        self.assertEqual([x['mensagem'] for x in an['pagamento']], ['mensagem de erro 2'])
        self.assertEqual(norm_msg(''), '(sem mensagem)')

    def test_telefone_com_e_sem_codigo_de_pais(self):
        self.assertEqual(norm_phone('+99 55 99999-8888'), norm_phone('(55) 99999-8888'))
        self.assertEqual(norm_phone('123'), '')

    def test_top5_agrupa_empate_na_quinta_posicao(self):
        c = {'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 1}
        self.assertEqual(top_n(c)[-1], (['E', 'F'], 1))
        self.assertEqual(len(top_n(c)), 5)

    def test_fuso_configuravel(self):
        m = self.calc([linha()], fuso='Etc/GMT+3')
        self.assertTrue(m['periodo']['inicio'].endswith('-03:00'))
        self.assertTrue(self.calc([linha()])['periodo']['inicio'].endswith('+00:00'))


class Cli(unittest.TestCase):
    def test_ponta_a_ponta_json_csv_e_de_json(self):
        with tempfile.TemporaryDirectory() as d:
            chk, cli = os.path.join(d, 'checkouts-export-7d.csv'), os.path.join(d, 'clientes.csv')
            for path, cols, rows in [(chk, CHK_COLS, [linha(Email='ana@x.com'), linha(Status='concluido')]),
                                     (cli, CLI_COLS, [CLI])]:
                with open(path, 'w', encoding='utf-8', newline='') as f:
                    w = csv.DictWriter(f, fieldnames=cols); w.writeheader(); w.writerows(rows)
            js, cs = os.path.join(d, 'm.json'), os.path.join(d, 'i.csv')
            buf = io.StringIO()
            with redirect_stdout(buf):
                main([chk, '--clientes', cli, '--json', js, '--csv', cs])
            out = buf.getvalue()
            self.assertIn('## Indicadores', out)
            self.assertIn('R$ 100,00', out)
            pacote = json.load(open(js, encoding='utf-8'))
            self.assertIn('indicadores', pacote)
            self.assertIn('frete_checkouts', pacote['anexo'])
            with open(cs, encoding='utf-8-sig') as f:
                self.assertEqual(next(csv.reader(f)), COLUNAS)
            buf2 = io.StringIO()
            with redirect_stdout(buf2):
                main(['--de-json', js])
            self.assertEqual(buf2.getvalue(), out.split('\n', 2)[2])


if __name__ == '__main__':
    unittest.main()
