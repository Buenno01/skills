/* Composição sugerida: o Raio-X do checkout completo (cabeçalho, 10 seções e rodapé).
 * É o padrão proposto, não uma obrigação: copie este arquivo, preencha NARRATIVA e remova, reordene ou troque
 * seções e gráficos conforme o pedido do usuário. Cada seção é independente. Gráficos alternativos: examples/galeria.html.
 * Contrato com scripts/montar.py: definir function pagina(K, Kit) que devolve o HTML da página. K é o kpis.json.
 * Nenhum número é digitado aqui: todos vêm de K.
 */
var NARRATIVA = {
  titulo: 'Raio-X do checkout',
  subtitulo: '',   // uma ou duas frases com a leitura geral do período
  secoes: {        // titulo = conclusão da seção; contexto = uma a três frases
    visao_geral: { titulo: '', contexto: '' },
    frete: { titulo: '', contexto: '' },
    estados: { titulo: '', contexto: '' },
    pagamento: { titulo: '', contexto: '' },
    cupons: { titulo: '', contexto: '' },
    produtos: { titulo: '', contexto: '' },
    combinacoes: { titulo: '', contexto: '' },
    recuperacao: { titulo: '', contexto: '' },
    formulario: { titulo: '', contexto: '' },
    tendencia: { titulo: '', contexto: '' }
  }
};

function pagina(K, Kit) {
  var arr = Kit.arr, int = Kit.int, din = Kit.din, pct = Kit.pct, esc = Kit.esc, soma = Kit.soma, uf = Kit.uf;
  var S = NARRATIVA.secoes, num = 0;
  function sec(id, rotulo, corpo) { num++; return Kit.secao({ id: id, num: num, rotulo: rotulo, titulo: (S[id] || {}).titulo, contexto: (S[id] || {}).contexto, corpo: corpo }); }
  var f = K.fonte || {}, p = K.periodo || {}, H = '';

  /* ---------- cabeçalho ---------- */
  var topo = Kit.cabecalho({
    sobretitulo: f.loja || 'Loja', titulo: NARRATIVA.titulo, subtitulo: NARRATIVA.subtitulo, avisos: K.avisos,
    meta: ['Período <b>' + Kit.data(p.inicio) + ' a ' + Kit.data(p.fim) + '</b> (' + (p.dias_real != null ? p.dias_real.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : 'n/d') + ' dias)',
      '<b>' + int(K.checkouts) + '</b> checkouts no arquivo' + (p.disponivel ? ' de ' + int(p.disponivel) + ' disponíveis' : ''),
      'Base de clientes <b>' + int(f.clientes) + '</b> cadastros']
  });

  /* ---------- 1. visão geral ---------- */
  (function () {
    var pe = K.pessoas || {}, d = K.desfecho || {};
    var h = Kit.heroi({ v: pct(K.taxa_abandono), r: 'Taxa de abandono', d: int(pe.abandonados) + ' de ' + int((pe.abandonados || 0) + (pe.concluidos || 0)) + ' pessoas com contato abandonaram' }, [
      { v: din(pe.valor_abandonado), r: 'Valor abandonado', d: 'Último carrinho de cada pessoa que abandonou', tom: 'critico' },
      { v: int(d.finalizou), r: 'Compras concluídas', d: int((pe.voltaram_para_finalizar || {}).n) + ' pessoas abandonaram antes e voltaram', tom: 'ok' },
      { v: int(K.recuperaveis), r: 'Pessoas recuperáveis', d: din(K.valor_recuperavel) + ' em carrinhos, com opt-in na base' },
      { v: int(d.anonimo), r: 'Checkouts anônimos', d: 'Sem e-mail e sem telefone, fora das taxas' }]);
    H += sec('visao_geral', 'Visão geral', h + Kit.funil(K.funil, K.parou, { titulo: 'Funil do checkout (sem anônimos)' }) +
      Kit.nota('A taxa de abandono conta cada pessoa uma vez, pelo último checkout. O funil conta checkouts, e quem concluiu entra em todas as etapas.'));
  })();

  /* ---------- 2. frete ---------- */
  (function () {
    var fr = K.frete || {}, g = fr.gratis || {}, pg = fr.pago || {}, pe = fr.peso_mediano_pago || {}, sf = fr.abandonos_sem_frete || {};
    var dest = Kit.destaques([
      { v: pct(g.taxa) + ' × ' + pct(pg.taxa), r: 'Abandono: frete grátis × pago', d: 'Ticket médio ' + din(g.ticket_medio) + ' no grátis e ' + din(pg.ticket_medio) + ' no pago', tom: (pg.taxa != null && g.taxa != null && pg.taxa > g.taxa) ? 'critico' : '' },
      { v: pct(pe.abandonados) + ' × ' + pct(pe.concluidos), r: 'Peso mediano do frete no carrinho', d: 'Quem abandonou × quem concluiu, só onde o frete é pago' },
      { v: int(sf.n), r: 'Abandonos antes de escolher o frete', d: din(sf.valor) + ' em carrinhos', tom: 'atencao' }]);
    var op = arr(fr.opcoes).map(function (o) { return { rotulo: o.opcao, concluidos: o.concluidos, abandonados: o.abandonados, taxa: o.taxa, amostra_pequena: o.amostra_pequena, sub: 'preço médio ' + din(o.preco_medio, 2) + ' · ticket ' + din(o.ticket_medio, 2), tipExtra: 'Valor abandonado: ' + din(o.valor_abandonado) }; });
    H += sec('frete', 'Frete', dest + Kit.empilhadas(op, { titulo: 'Abandono por opção de frete' }) +
      Kit.nota('Os grupos de frete grátis e pago diferem também no tamanho do pedido. Parte da diferença de taxa vem do carrinho, não só do frete.') +
      Kit.tabela('Todas as opções de frete', [{ t: 'Opção', f: function (l) { return l.opcao; } }, { t: 'Checkouts', n: 1, f: function (l) { return int(l.n); } }].concat(Kit.COLS_CA, [
        { t: 'Preço médio', n: 1, f: function (l) { return din(l.preco_medio, 2); } }, { t: 'Ticket médio', n: 1, f: function (l) { return din(l.ticket_medio, 2); } }, { t: 'Valor abandonado', n: 1, f: function (l) { return din(l.valor_abandonado); } }]), fr.opcoes));
  })();

  /* ---------- 3. estados (UF sempre pela sigla) ---------- */
  (function () {
    var todas = arr(K.regioes), semUF = todas.filter(function (r) { return r.uf == null || r.uf === ''; })[0], reg = todas.filter(function (r) { return r !== semUF; });
    var maiorTaxa = reg.filter(function (r) { return !r.amostra_pequena && r.taxa != null; }).sort(function (a, b) { return b.taxa - a.taxa; })[0];
    var dest = Kit.destaques([
      reg[0] && { txt: 1, v: esc(uf(reg[0].uf)), r: 'UF com mais abandonos', d: int(reg[0].abandonados) + ' abandonos · ' + din(reg[0].valor_abandonado) + ' · taxa ' + pct(reg[0].taxa), tom: 'critico' },
      maiorTaxa && { v: pct(maiorTaxa.taxa), r: 'Maior taxa entre UFs com amostra suficiente', d: esc(uf(maiorTaxa.uf)) + ' · ' + int(maiorTaxa.abandonados + maiorTaxa.concluidos) + ' checkouts com desfecho' },
      semUF && { v: int(semUF.checkouts), r: 'Checkouts sem UF informada', d: int(semUF.abandonados) + ' abandonos, ' + int(semUF.concluidos) + ' concluídos. Sinal de quem não avançou no formulário', tom: 'atencao' }]);
    var grupos = reg.filter(function (r) { return r.frete && r.frete.com_frete; }).sort(function (a, b) { return b.frete.com_frete - a.frete.com_frete; }).map(function (r) {
      return { nome: uf(r.uf), linhas: [['Grátis', r.frete.gratis], ['Pago', r.frete.pago]].map(function (x) { var g = x[1] || {}; return { rotulo: x[0], concluidos: g.concluidos, abandonados: g.abandonados, taxa: g.taxa, amostra_pequena: g.amostra_pequena, sub: x[0] === 'Pago' && g.preco_medio != null ? 'frete médio ' + din(g.preco_medio, 2) : '' }; }) };
    });
    var geral = reg.slice().sort(function (a, b) { return b.checkouts - a.checkouts; }).map(function (r) { return { rotulo: uf(r.uf), concluidos: r.concluidos, abandonados: r.abandonados, taxa: r.taxa, amostra_pequena: r.amostra_pequena, sub: int(r.checkouts) + ' checkouts · ' + din(r.valor_abandonado) + ' abandonados' }; });
    H += sec('estados', 'Estados', dest + (grupos.length ? Kit.agrupadas(grupos, { titulo: 'Frete grátis × pago por UF' }) : '') + Kit.empilhadas(geral, { titulo: 'Abandono por UF' }) +
      Kit.tabela('Todas as UFs', [{ t: 'UF', f: function (l) { return uf(l.uf); } }, { t: 'Checkouts', n: 1, f: function (l) { return int(l.checkouts); } }].concat(Kit.COLS_CA, [
        { t: 'Anônimos', n: 1, f: function (l) { return int(l.anonimos); } }, { t: 'Recuperáveis', n: 1, f: function (l) { return int(l.recuperaveis); } }, { t: 'Valor abandonado', n: 1, f: function (l) { return din(l.valor_abandonado); } }]), todas));
  })();

  /* mensagens de erro, reaproveitadas em pagamento, cupons e formulário */
  function msgsDe(codigo) { return arr((K.erros || {}).mensagens).filter(function (m) { return m.codigo === codigo; }); }
  function barrasMsg(lista, comEtapa) {
    return lista.map(function (m) { return { rotulo: m.mensagem, valor: m.checkouts, parte: m.abandonados, amostra_pequena: m.amostra_pequena,
      sub: (comEtapa ? 'etapa ' + String(m.etapa).toLowerCase() + ' · ' : '') + int(m.abandonados) + ' abandonaram · taxa ' + pct(m.taxa),
      tip: m.mensagem + (m.etapa ? '\nEtapa: ' + m.etapa : '') + '\n' + int(m.checkouts) + ' checkouts · ' + int(m.abandonados) + ' abandonaram · ' + int(m.alertas) + ' alertas' }; });
  }
  var COLS_MSG = [{ t: 'Mensagem exibida', f: function (l) { return l.mensagem; } }, { t: 'Alertas', n: 1, f: function (l) { return int(l.alertas); } }, { t: 'Checkouts', n: 1, f: function (l) { return int(l.checkouts); } },
    { t: 'Abandonaram', n: 1, f: function (l) { return int(l.abandonados); } }, { t: 'Concluíram', n: 1, f: function (l) { return int(l.concluidos); } }, { t: 'Anônimos', n: 1, f: function (l) { return int(l.anonimos); } },
    { t: 'Taxa de abandono', n: 1, f: function (l) { return pct(l.taxa) + (l.amostra_pequena ? ' *' : ''); } }, { t: 'Valor abandonado', n: 1, f: function (l) { return din(l.valor_abandonado); } }];
  function tipoErro(codigo) { return arr((K.erros || {}).tipos).filter(function (t) { return t.codigo === codigo; })[0]; }

  /* ---------- 4. pagamento ---------- */
  (function () {
    var pg = K.pagamento || {}, tipo = tipoErro('PAYMENT_ERROR'), msgs = msgsDe('PAYMENT_ERROR');
    var fx = arr((K.erros || {}).tentativas_pagamento).filter(function (x) { return x.checkouts; }), um = fx[0], ultima = fx.length > 1 ? fx[fx.length - 1] : null;
    var dest = Kit.destaques([
      { v: int(tipo ? tipo.checkouts : 0), r: 'Checkouts com erro de pagamento', d: tipo ? ('Taxa de abandono entre eles: ' + pct(tipo.taxa) + ' · ' + din(tipo.valor_abandonado) + ' abandonados') : 'Nenhum erro de pagamento no período', tom: tipo ? 'critico' : 'ok' },
      um && { v: pct(um.taxa) + (ultima ? ' → ' + pct(ultima.taxa) : ''), r: 'Abandono por número de tentativas', d: esc(um.faixa) + (ultima ? ' → ' + esc(ultima.faixa) : '') + ', entre quem viu erro de pagamento', tom: 'atencao' },
      { v: int((pg.abandonos_sem_metodo || {}).n), r: 'Abandonos antes de escolher o método', d: din((pg.abandonos_sem_metodo || {}).valor) + ' em carrinhos' }]);
    var mt = arr(pg.metodos).map(function (m) { return { rotulo: m.metodo, concluidos: m.concluidos, abandonados: m.abandonados, taxa: m.taxa, amostra_pequena: m.amostra_pequena, sub: int(m.n) + ' chegaram · ' + int(m.com_erro) + ' com erro', tipExtra: 'Valor abandonado: ' + din(m.valor_abandonado) }; });
    var tent = fx.map(function (x) { return { rotulo: x.faixa, concluidos: x.concluidos, abandonados: x.abandonados, taxa: x.taxa, amostra_pequena: x.amostra_pequena, sub: int(x.checkouts) + ' checkouts' }; });
    H += sec('pagamento', 'Métodos de pagamento', dest + Kit.empilhadas(mt, { titulo: 'Abandono por método de pagamento' }) +
      Kit.nota('Métodos com o identificador exatamente como veio do checkout.') +
      Kit.simples(barrasMsg(msgs), { titulo: 'Mensagens de erro de pagamento (checkouts afetados)', legenda: Kit.LEG_MSG }) +
      Kit.nota('Mensagens exatamente como o checkout exibiu. Um checkout pode aparecer em mais de uma mensagem, então os valores não somam.') +
      Kit.empilhadas(tent, { titulo: 'Resultado pelo número de tentativas com erro' }) + Kit.tabela('Todas as mensagens de erro de pagamento', COLS_MSG, msgs));
  })();

  /* ---------- 5. cupons ---------- */
  (function () {
    var tipo = tipoErro('DISCOUNT_ERROR'), msgs = msgsDe('DISCOUNT_ERROR');
    var dest = Kit.destaques([
      { v: tipo ? pct(tipo.taxa) : 'n/d', r: 'Abandono entre quem teve erro de cupom', d: tipo ? (int(tipo.checkouts) + ' checkouts com erro de cupom' + (tipo.amostra_pequena ? ', amostra pequena' : '')) : 'Nenhum erro de cupom no período', tom: tipo && !tipo.amostra_pequena ? 'critico' : '' },
      { v: int(tipo ? tipo.anonimos : 0), r: 'Visitantes anônimos com erro de cupom', d: 'Viram o erro e saíram sem deixar contato', tom: 'atencao' },
      { v: int(msgs.length), r: 'Mensagens distintas de erro de cupom', d: tipo ? (int(tipo.alertas) + ' alertas no período') : '' }]);
    H += sec('cupons', 'Cupons', dest + Kit.simples(barrasMsg(msgs), { titulo: 'Mensagens de erro de cupom (checkouts afetados)', legenda: Kit.LEG_MSG }) +
      Kit.nota('Mensagens exatamente como o checkout exibiu.') + Kit.tabela('Todas as mensagens de erro de cupom', COLS_MSG, msgs));
  })();

  /* ---------- 6. produtos ---------- */
  (function () {
    var pr = arr(K.produtos), porValor = pr.slice().sort(function (a, b) { return b.valor - a.valor; });
    var dest = Kit.destaques([
      pr[0] && { txt: 1, v: esc(pr[0].titulo), r: 'Produto com mais abandonos', d: int(pr[0].abandonados) + ' abandonos · taxa ' + pct(pr[0].taxa), tom: 'critico' },
      porValor[0] && { v: din(porValor[0].valor), r: 'Maior valor em carrinhos abandonados', d: esc(porValor[0].titulo) + ' · ' + int(porValor[0].unidades) + ' unidades' },
      { v: int(pr.length), r: 'Produtos nos carrinhos', d: int(pr.filter(function (x) { return x.abandonados; }).length) + ' com pelo menos um abandono' }]);
    var linhas = pr.map(function (x) { return { rotulo: x.titulo, concluidos: x.concluidos, abandonados: x.abandonados, taxa: x.taxa, amostra_pequena: x.amostra_pequena, sub: din(x.valor) + ' abandonados · ' + int(x.unidades) + ' un.' }; });
    H += sec('produtos', 'Produtos', dest + Kit.empilhadas(linhas, { titulo: 'Abandono por produto' }) +
      Kit.nota('Todos os itens dos carrinhos entram. Um checkout com vários produtos conta em cada um deles. O valor usa preço × quantidade dos carrinhos abandonados.') +
      Kit.tabela('Todos os produtos', [{ t: 'Produto', f: function (l) { return l.titulo; } }, { t: 'ID', f: function (l) { return l.product_id; } }, { t: 'SKU', f: function (l) { return l.sku || ''; } }].concat(Kit.COLS_CA, [
        { t: 'Unidades abandonadas', n: 1, f: function (l) { return int(l.unidades); } }, { t: 'Valor abandonado', n: 1, f: function (l) { return din(l.valor); } }, { t: 'Anônimos', n: 1, f: function (l) { return int(l.anonimos); } }]), pr));
  })();

  /* ---------- 7. combinações ---------- */
  (function () {
    var cb = arr(K.combinacoes), uni = cb.filter(function (c) { return c.qtd_produtos === 1; }), mul = cb.filter(function (c) { return c.qtd_produtos > 1; });
    var tot = soma(cb, function (c) { return c.n; }), nU = soma(uni, function (c) { return c.n; });
    function tx(g) { var a = soma(g, function (c) { return c.abandonados; }), c = soma(g, function (c) { return c.concluidos; }); return a + c ? a / (a + c) : null; }
    function tk(g) { var n = soma(g, function (c) { return c.n; }); return n ? soma(g, function (c) { return c.ticket_medio * c.n; }) / n : null; }
    var melhor = cb.filter(function (c) { return !c.amostra_pequena && c.taxa != null; }).sort(function (a, b) { return a.taxa - b.taxa; })[0];
    var dest = Kit.destaques([
      { v: tot ? pct(nU / tot) : 'n/d', r: 'Carrinhos de produto único', d: int(nU) + ' de ' + int(tot) + ' carrinhos com desfecho' },
      { v: pct(tx(uni)) + ' × ' + pct(tx(mul)), r: 'Abandono: produto único × vários', d: 'Ticket médio ' + din(tk(uni), 2) + ' × ' + din(tk(mul), 2) },
      melhor && { v: pct(melhor.taxa), r: 'Composição que mais converte', d: esc(melhor.produtos.join(' + ')) + ' · ' + int(melhor.n) + ' carrinhos', tom: 'ok' }]);
    var linhas = cb.map(function (c) { return { rotulo: c.produtos.join(' + '), concluidos: c.concluidos, abandonados: c.abandonados, taxa: c.taxa, amostra_pequena: c.amostra_pequena, sub: int(c.n) + ' carrinhos · ticket ' + din(c.ticket_medio, 2) }; });
    H += sec('combinacoes', 'Combinações de carrinho', dest + Kit.empilhadas(linhas, { titulo: 'Abandono por composição de carrinho' }) +
      Kit.tabela('Todas as combinações', [{ t: 'Produtos', f: function (l) { return l.produtos.join(' + '); } }, { t: 'Carrinhos', n: 1, f: function (l) { return int(l.n); } }].concat(Kit.COLS_CA, [
        { t: 'Ticket médio', n: 1, f: function (l) { return din(l.ticket_medio, 2); } }, { t: 'Valor abandonado', n: 1, f: function (l) { return din(l.valor_abandonado); } }]), cb));
  })();

  /* ---------- 8. recuperação ---------- */
  (function () {
    var cl = K.clientes || {}, rc = cl.recuperaveis || {}, sem = cl.abandonados_sem_optin || {}, pe = K.pessoas || {}, bso = cl.base_sem_optin || {}, totBase = f.clientes || 0;
    var barra = Kit.segmentada([{ valor: K.recuperaveis || 0, cor: 'concluiu', rotulo: 'Com opt-in na base' }, { valor: sem.base || 0, cor: 'atencao', rotulo: 'Na base sem opt-in' }, { valor: sem.fora || 0, cor: 'critico', rotulo: 'Fora da base' }],
      { titulo: 'Quem abandonou e pode ser contatado (' + int(pe.abandonados) + ' pessoas)' });
    var canais = Kit.cartoes(Object.keys(rc.por_canal || {}).map(function (k) {
      var c = rc.por_canal[k], semColeta = totBase && bso[k] === totBase;
      return { v: int(c.n), r: k, d: din(c.valor) + ' em carrinhos' + (semColeta ? '<div style="margin-top:8px">' + Kit.pilula('nenhum opt-in na base: coleta pode estar desativada', 'atencao') + '</div>' : ''), tom: c.n ? 'ok' : (semColeta ? 'atencao' : '') };
    }));
    var dest = Kit.destaques([
      { v: din(K.valor_recuperavel), r: 'Valor em carrinhos recuperáveis', d: 'Ticket médio ' + din(rc.ticket_medio, 2), tom: 'ok' },
      { v: int(rc.recorrentes), r: 'Recuperáveis que já compraram antes', d: int((K.recuperaveis || 0) - (rc.recorrentes || 0)) + ' nunca compraram' },
      { v: int(rc.multicanal), r: 'Contatáveis por mais de um canal', d: int(rc.sem_erro) + ' abandonaram sem ver erro' },
      { v: int((pe.voltaram_para_finalizar || {}).n), r: 'Voltaram sozinhos para comprar', d: din((pe.voltaram_para_finalizar || {}).valor) + ' e já fora da lista' }]);
    var pt = arr(rc.por_ponto).map(function (x) { return { rotulo: x.rotulo, valor: x.n, sub: din(x.valor), tip: x.rotulo + '\n' + int(x.n) + ' pessoas · ' + din(x.valor) }; });
    H += sec('recuperacao', 'Recuperação', barra + canais + dest + Kit.simples(pt, { titulo: 'Onde as pessoas recuperáveis pararam', cor: 'c' }) +
      Kit.nota('A etapa em que a pessoa parou orienta a mensagem: quem parou antes do frete precisa de outro argumento que quem parou no pagamento.'));
  })();

  /* ---------- 9. formulário ---------- */
  (function () {
    var val = arr((K.erros || {}).por_etapa).filter(function (m) { return m.codigo === 'INPUT_INVALID' || m.codigo === 'INPUT_REQUIRED'; });
    var pag = val.filter(function (m) { return m.etapa === 'Pagamento'; }), outros = val.filter(function (m) { return m.etapa !== 'Pagamento'; });
    H += sec('formulario', 'Formulário', Kit.ladoALado(Kit.simples(barrasMsg(pag), { titulo: 'Na etapa de pagamento', legenda: Kit.LEG_MSG }), Kit.simples(barrasMsg(outros, true), { titulo: 'Nas etapas de contato, endereço e frete', legenda: Kit.LEG_MSG })) +
      Kit.nota('Alertas de validação (dado inválido ou campo obrigatório) com a mensagem exatamente como o checkout exibiu. A etapa vem da sequência de eventos: é a que o cliente preenchia quando o alerta apareceu. Um checkout pode ter mais de um alerta, então os valores não somam.') +
      Kit.tabela('Todos os alertas de validação', [{ t: 'Etapa', f: function (l) { return l.etapa; } }, { t: 'Tipo', f: function (l) { return l.tipo; } }].concat(COLS_MSG), val));
  })();

  /* ---------- 10. tendência ---------- */
  (function () {
    var dias = arr(K.por_dia);
    if (!dias.length) { H += sec('tendencia', 'Tendência', Kit.vazio('Sem dados diários.')); return; }
    var vol = dias.map(function (d) { var o = Math.max(0, (d.total || 0) - (d.abandonados || 0) - (d.concluidos || 0));
      return { rotulo: Kit.diaCurto(d.data), tip: Kit.diaCurto(d.data) + '\nTotal: ' + int(d.total) + '\nConcluiu: ' + int(d.concluidos) + ' · Abandonou: ' + int(d.abandonados) + '\nAnônimo ou em andamento: ' + int(o), partes: [['c', d.concluidos], ['a', d.abandonados], ['o', o]] }; });
    function pares(campo) { return dias.map(function (d) { var m = d[campo] || {};
      return { rotulo: Kit.diaCurto(d.data), media: m.geral, barras: [['critico', m.abandonados], ['concluiu', m.concluidos]], tip: Kit.diaCurto(d.data) + '\nAbandonou: ' + din(m.abandonados, 2) + '\nConcluiu: ' + din(m.concluidos, 2) + '\nMédia geral: ' + din(m.geral, 2) }; }); }
    var LEG_P = [['critico', 'Abandonou'], ['concluiu', 'Concluiu'], ['dado', 'Média geral']];
    var cols = [{ t: 'Dia', f: function (l) { return Kit.diaCurto(l.data); } }, { t: 'Checkouts', n: 1, f: function (l) { return int(l.total); } }, { t: 'Concluiu', n: 1, f: function (l) { return int(l.concluidos); } }, { t: 'Abandonou', n: 1, f: function (l) { return int(l.abandonados); } },
      { t: 'Ticket abandonou', n: 1, f: function (l) { return din((l.ticket_medio || {}).abandonados, 2); } }, { t: 'Ticket concluiu', n: 1, f: function (l) { return din((l.ticket_medio || {}).concluidos, 2); } },
      { t: 'Frete abandonou', n: 1, f: function (l) { return din((l.frete_medio || {}).abandonados, 2); } }, { t: 'Frete concluiu', n: 1, f: function (l) { return din((l.frete_medio || {}).concluidos, 2); } }];
    H += sec('tendencia', 'Tendência', Kit.colunasEmpilhadas(vol, { titulo: 'Checkouts por dia', legenda: [['concluiu', 'Concluiu'], ['critico', 'Abandonou'], ['outros', 'Anônimo ou em andamento']] }) +
      Kit.colunasPares(pares('ticket_medio'), { titulo: 'Ticket médio por dia', legenda: LEG_P }) +
      Kit.colunasPares(pares('frete_medio'), { titulo: 'Frete médio por dia (grátis conta como zero)', legenda: LEG_P }) +
      Kit.nota('Dias pela data da última atividade do checkout, em UTC. Ticket e frete médios não incluem anônimos.') + Kit.tabela('Valores por dia', cols, dias));
  })();

  /* ---------- rodapé ---------- */
  var pe = rodapeMetodologia(K, Kit);
  return topo + '<main class="pagina">' + H + '</main>' + pe;
}

function rodapeMetodologia(K, Kit) {
  var f = K.fonte || {}, p = K.periodo || {};
  return Kit.rodape({ itens: [
    'Taxa de abandono = pessoas que abandonaram ÷ (abandonaram + concluíram). Cada pessoa conta uma vez, pelo desfecho do último checkout. Quem abandonou e depois comprou conta como concluída.',
    'Pessoa é identificada por e-mail, senão telefone, senão pelo identificador do cliente no Checkout Sentry.',
    'Checkouts sem e-mail e sem telefone são anônimos e ficam fora de todas as taxas.',
    'Recuperável é quem abandonou, não voltou para comprar e tem ao menos um opt-in na base de clientes, cruzada por e-mail e, sem match, pelos 10 últimos dígitos do telefone.',
    'Taxas com menos de 5 checkouts com desfecho aparecem esmaecidas e não devem ser lidas como conclusão.',
    'Fonte: ' + Kit.esc(f.arquivo || 'n/d') + ', exportado em ' + Kit.data(f.exportado_em) + ', cruzado com ' + Kit.int(f.clientes) + ' cadastros da base de clientes Shopify (' + Kit.int(f.arquivos_clientes) + ' arquivo(s)).',
    'Fuso ' + Kit.esc(p.fuso || 'UTC') + '. Valores em ' + Kit.MOEDA + '.'] });
}
