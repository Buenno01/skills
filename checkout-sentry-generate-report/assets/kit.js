/* Kit de componentes do checkout-sentry-generate-report.
 * Funções puras que devolvem HTML (string) a partir de dados já calculados pelo kpis.py.
 * Nenhuma função calcula KPI: elas só desenham o que recebem. Veja examples/galeria.html e references/GALERIA.md.
 * Cores: c = concluiu (verde), a = abandonou (vermelho), d = dado neutro (azul), w = atenção (amarelo), o = outros (roxo).
 */
(function (global) {
  'use strict';
  var MOEDA = 'R$';

  /* ---------- formatação ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function int(v) { return v == null ? 'n/d' : Math.round(v).toLocaleString('pt-BR'); }
  /* dinheiro em R$. Sem dec: acima de mil sai sem centavos */
  function din(v, dec) { if (v == null) return 'n/d'; dec = dec == null ? (Math.abs(v) >= 1000 ? 0 : 2) : dec; return MOEDA + ' ' + v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  /* taxa de 0 a 1 em percentual com uma casa */
  function pct(v) { return v == null ? 'n/d' : (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'; }
  function data(iso) { if (!iso) return 'n/d'; return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }); }
  function diaCurto(iso) { var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1]; }
  function seg(v) { if (v == null) return 'n/d'; if (v < 60) return Math.round(v) + ' s'; return (v / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' min'; }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function soma(a, f) { return arr(a).reduce(function (s, x) { return s + (f(x) || 0); }, 0); }
  /* UF sempre pela sigla que veio no dado; vazio vira "Sem UF" */
  function uf(v) { return v == null || v === '' ? 'Sem UF' : String(v); }

  /* ---------- peças básicas ---------- */
  function pilula(texto, tom, tip) { return '<span class="pilula ' + (tom || 'dado') + '"' + (tip ? ' data-tip="' + esc(tip) + '"' : '') + '>' + esc(texto) + '</span>'; }
  function pilPequena() { return ' ' + pilula('amostra pequena', 'atencao', 'Menos de 5 checkouts com desfecho. A taxa não deve ser lida como conclusão.'); }
  /* card: {v (HTML já formatado), r (rótulo), d (detalhe HTML), tom: 'critico'|'ok'|'atencao'|'principal', txt: valor textual, tip} */
  function card(o) { return '<div class="card ' + (o.tom || '') + '"' + (o.tip ? ' data-tip="' + esc(o.tip) + '"' : '') + '><div class="v' + (o.txt ? ' txt' : '') + '">' + o.v + '</div><div class="r">' + esc(o.r) + '</div>' + (o.d ? '<div class="d">' + o.d + '</div>' : '') + '</div>'; }
  function destaques(lista) { lista = arr(lista).filter(Boolean); return lista.length ? '<div class="destaques">' + lista.map(card).join('') + '</div>' : ''; }
  /* número-herói à esquerda e grade de cards à direita */
  function heroi(principal, lista) { principal.tom = 'principal'; return '<div class="heroi">' + card(principal) + '<div class="grade">' + arr(lista).filter(Boolean).map(card).join('') + '</div></div>'; }
  /* itens: [[token de cor CSS sem "--", rótulo]] */
  function legenda(itens) { return '<div class="legenda">' + itens.map(function (i) { return '<span><i style="background:var(--' + i[0] + ')"></i>' + esc(i[1]) + '</span>'; }).join('') + '</div>'; }
  var LEG_CA = [['concluiu', 'Concluiu'], ['critico', 'Abandonou']];
  var LEG_MSG = [['critico', 'Abandonou'], ['dado', 'Concluiu ou anônimo']];
  function nota(t) { return '<p class="nota">' + t + '</p>'; }
  function vazio(t) { return '<div class="vazio">' + esc(t || 'Sem ocorrências no período.') + '</div>'; }
  function titulo(t) { return t ? '<div class="grafico-titulo">' + esc(t) + '</div>' : ''; }
  function longa(n, limite) { return n > (limite || 25) ? ' class="lista-longa"' : ''; }
  function ladoALado(a, b) { return '<div class="lado-a-lado"><div>' + a + '</div><div>' + b + '</div></div>'; }

  /* ---------- barras horizontais ---------- */
  /* Empilhadas concluiu × abandonou. Largura = volume relativo ao maior grupo; valor à direita = taxa de abandono.
   * linhas: [{rotulo, concluidos, abandonados, taxa, amostra_pequena, sub (HTML), tipExtra}] */
  function empilhadas(linhas, opt) {
    opt = opt || {}; linhas = arr(linhas);
    if (!linhas.length) return vazio('Sem dados no período.');
    var max = Math.max.apply(null, linhas.map(function (l) { return (l.concluidos || 0) + (l.abandonados || 0); })) || 1;
    return '<div class="grafico">' + titulo(opt.titulo) + (opt.semLegenda ? '' : legenda(LEG_CA)) + '<div' + longa(linhas.length) + '>' + linhas.map(function (l) {
      var c = l.concluidos || 0, a = l.abandonados || 0, t = c + a;
      var tip = l.rotulo + '\nConcluiu: ' + int(c) + ' · Abandonou: ' + int(a) + '\nTaxa de abandono: ' + pct(l.taxa) + (l.tipExtra ? '\n' + l.tipExtra : '');
      return '<div class="linha' + (l.amostra_pequena ? ' pequena' : '') + '" data-tip="' + esc(tip) + '"><div class="rot">' + esc(l.rotulo) + (l.amostra_pequena ? pilPequena() : '') + (l.sub ? '<small>' + l.sub + '</small>' : '') + '</div>' +
        '<div class="trilho"><div class="barra" style="width:' + (t / max * 100).toFixed(2) + '%">' + (t ? '<div class="seg c" style="width:' + (c / t * 100) + '%"></div><div class="seg a" style="width:' + (a / t * 100) + '%"></div>' : '') + '</div></div>' +
        '<div class="val">' + pct(l.taxa) + '</div></div>';
    }).join('') + '</div></div>';
  }

  /* Barras simples de contagem. parte = trecho destacado dentro da barra (ex.: quantos abandonaram).
   * linhas: [{rotulo, valor, parte, valTxt, sub, tip, amostra_pequena}]; opt: {titulo, legenda, cor, corParte} */
  function simples(linhas, opt) {
    opt = opt || {}; linhas = arr(linhas);
    if (!linhas.length) return vazio();
    var max = Math.max.apply(null, linhas.map(function (l) { return l.valor || 0; })) || 1, cor = opt.cor || 'd', corParte = opt.corParte || 'a';
    return '<div class="grafico">' + titulo(opt.titulo) + (opt.legenda ? legenda(opt.legenda) : '') + '<div' + longa(linhas.length) + '>' + linhas.map(function (l) {
      var v = l.valor || 0, p = l.parte == null ? null : Math.min(l.parte, v);
      var inner = p == null ? '<div class="seg ' + cor + '" style="width:100%"></div>' : '<div class="seg ' + corParte + '" style="width:' + (v ? p / v * 100 : 0) + '%"></div><div class="seg ' + cor + '" style="width:' + (v ? (v - p) / v * 100 : 0) + '%"></div>';
      return '<div class="linha' + (l.amostra_pequena ? ' pequena' : '') + '"' + (l.tip ? ' data-tip="' + esc(l.tip) + '"' : '') + '><div class="rot">' + esc(l.rotulo) + (l.amostra_pequena ? pilPequena() : '') + (l.sub ? '<small>' + l.sub + '</small>' : '') + '</div>' +
        '<div class="trilho"><div class="barra" style="width:' + (v / max * 100).toFixed(2) + '%">' + inner + '</div></div><div class="val">' + (l.valTxt != null ? l.valTxt : int(v)) + '</div></div>';
    }).join('') + '</div></div>';
  }

  /* Empilhadas agrupadas: um bloco por grupo (ex.: UF), com uma linha por subgrupo (ex.: frete grátis e pago).
   * grupos: [{nome, linhas: [linha de empilhadas]}]. A escala é comum a todos os grupos. */
  function agrupadas(grupos, opt) {
    opt = opt || {}; grupos = arr(grupos);
    if (!grupos.length) return vazio('Sem dados no período.');
    var max = Math.max.apply(null, [].concat.apply([], grupos.map(function (g) { return arr(g.linhas).map(function (l) { return (l.concluidos || 0) + (l.abandonados || 0); }); }))) || 1;
    return '<div class="grafico">' + titulo(opt.titulo) + legenda(LEG_CA) + '<div' + longa(grupos.length, 12) + '>' + grupos.map(function (g) {
      return '<div class="grupo"><div class="nome">' + esc(g.nome) + '</div>' + arr(g.linhas).map(function (l) {
        var c = l.concluidos || 0, a = l.abandonados || 0, t = c + a;
        return '<div class="linha' + (l.amostra_pequena ? ' pequena' : '') + '" data-tip="' + esc(g.nome + ', ' + l.rotulo + '\nConcluiu: ' + int(c) + ' · Abandonou: ' + int(a) + '\nTaxa: ' + pct(l.taxa)) + '"><div class="rot">' + esc(l.rotulo) + (l.amostra_pequena && t ? pilPequena() : '') + (l.sub ? '<small>' + l.sub + '</small>' : '') + '</div>' +
          '<div class="trilho"><div class="barra" style="width:' + (t / max * 100).toFixed(2) + '%">' + (t ? '<div class="seg c" style="width:' + (c / t * 100) + '%"></div><div class="seg a" style="width:' + (a / t * 100) + '%"></div>' : '') + '</div></div><div class="val">' + (t ? pct(l.taxa) : 'n/d') + '</div></div>';
      }).join('') + '</div>';
    }).join('') + '</div></div>';
  }

  /* Funil: etapas [{rotulo, n}] e quedas [{n, valor}] entre uma etapa e a seguinte (o "parou" da etapa).
   * A maior queda fica em vermelho. A última etapa (concluiu) em verde. */
  function funil(etapas, quedas, opt) {
    opt = opt || {}; etapas = arr(etapas); quedas = arr(quedas);
    if (!etapas.length) return vazio('Sem dados no período.');
    var topo = etapas[0].n || 1, maior = -1, iMaior = -1;
    quedas.forEach(function (x, i) { if ((x.n || 0) > maior) { maior = x.n || 0; iMaior = i; } });
    var h = '<div class="grafico funil">' + titulo(opt.titulo);
    etapas.forEach(function (e, i) {
      var ult = i === etapas.length - 1;
      h += '<div class="etapa" data-tip="' + esc(e.rotulo + '\n' + int(e.n) + ' checkouts (' + pct(e.n / topo) + ' do início)') + '"><div class="rot" style="font-size:13px">' + esc(e.rotulo) + '</div>' +
        '<div class="trilho" style="height:26px"><div class="barra" style="width:' + (e.n / topo * 100).toFixed(2) + '%"><div class="seg ' + (ult ? 'c' : 'd') + '" style="width:100%"></div></div></div>' +
        '<div class="val" style="font-size:13px;font-weight:600;text-align:right">' + int(e.n) + '</div></div>';
      if (!ult && quedas[i]) {
        var m = i === iMaior && maior > 0;
        h += '<div class="queda' + (m ? ' maior' : '') + '"><span>' + int(quedas[i].n) + ' saíram aqui · ' + din(quedas[i].valor) + (m ? ' · maior queda' : '') + '</span></div>';
      }
    });
    return h + '</div>';
  }

  /* Barra 100% dividida em partes: [{valor, cor (token CSS), rotulo}] */
  function segmentada(partes, opt) {
    opt = opt || {}; partes = arr(partes);
    var t = soma(partes, function (p) { return p.valor; }) || 1;
    return titulo(opt.titulo) + '<div class="segmentada">' + partes.map(function (p) {
      return '<div style="width:' + (p.valor / t * 100) + '%;background:var(--' + p.cor + ')" data-tip="' + esc(p.rotulo + ': ' + int(p.valor) + ' (' + pct(p.valor / t) + ')') + '">' + (p.valor / t > .12 ? int(p.valor) : '') + '</div>';
    }).join('') + '</div>' + legenda(partes.map(function (p) { return [p.cor, p.rotulo + ' · ' + int(p.valor) + ' (' + pct(p.valor / t) + ')']; }));
  }

  /* Grade de cartões (ex.: um por canal de opt-in). lista: [card] */
  function cartoes(lista) { return '<div class="canais">' + arr(lista).filter(Boolean).map(card).join('') + '</div>'; }

  /* ---------- séries por dia ---------- */
  function eixoDias(dias) { return '<div class="eixo">' + dias.map(function (d, i) { return '<span>' + (dias.length <= 16 || i % 2 === 0 ? esc(d.rotulo) : '') + '</span>'; }).join('') + '</div>'; }

  /* Colunas empilhadas. dias: [{rotulo, tip, partes: [[classe de cor c|a|o|d|w, valor]]}] (partes de baixo para cima) */
  function colunasEmpilhadas(dias, opt) {
    opt = opt || {}; dias = arr(dias);
    if (!dias.length) return vazio('Sem dados diários.');
    var tot = dias.map(function (d) { return soma(d.partes, function (p) { return p[1]; }); }), max = Math.max.apply(null, tot) || 1;
    return '<div class="grafico">' + titulo(opt.titulo) + (opt.legenda ? legenda(opt.legenda) : '') + '<div class="escala">topo da escala: ' + (opt.fmt || int)(max) + '</div><div class="rolagem"><div class="colunas">' + dias.map(function (d, i) {
      return '<div class="dia"' + (d.tip ? ' data-tip="' + esc(d.tip) + '"' : '') + '><div class="pilha" style="height:' + (tot[i] / max * 100) + '%">' +
        d.partes.map(function (p) { return '<div class="seg ' + p[0] + '" style="height:' + (tot[i] ? (p[1] || 0) / tot[i] * 100 : 0) + '%"></div>'; }).join('') + '</div></div>';
    }).join('') + '</div>' + eixoDias(dias) + '</div></div>';
  }

  /* Colunas lado a lado (médias não se empilham) com marcador da média geral.
   * dias: [{rotulo, tip, barras: [[token de cor CSS, valor]], media}]; opt.fmt formata a escala (padrão din com 2 casas) */
  function colunasPares(dias, opt) {
    opt = opt || {}; dias = arr(dias);
    if (!dias.length) return vazio('Sem dados diários.');
    var fmt = opt.fmt || function (v) { return din(v, 2); }, vals = [0];
    dias.forEach(function (d) { arr(d.barras).forEach(function (b) { if (b[1] != null) vals.push(b[1]); }); if (d.media != null) vals.push(d.media); });
    var max = Math.max.apply(null, vals) || 1;
    return '<div class="grafico">' + titulo(opt.titulo) + (opt.legenda ? legenda(opt.legenda) : '') + '<div class="escala">topo da escala: ' + fmt(max) + '</div><div class="rolagem"><div class="colunas">' + dias.map(function (d) {
      return '<div class="dia"' + (d.tip ? ' data-tip="' + esc(d.tip) + '"' : '') + '><div class="par">' +
        arr(d.barras).map(function (b) { return '<div class="b" style="background:var(--' + b[0] + ');height:' + ((b[1] || 0) / max * 100) + '%"></div>'; }).join('') +
        (d.media != null ? '<div class="marca" style="bottom:' + (d.media / max * 100) + '%"></div>' : '') + '</div></div>';
    }).join('') + '</div>' + eixoDias(dias) + '</div></div>';
  }

  /* Linha no tempo em SVG. series: [{rotulo, cor (token CSS), valores: [número|null]}]; rotulos: eixo x.
   * opt: {titulo, fmt (formata o eixo y), max} */
  function linhaTempo(rotulos, series, opt) {
    opt = opt || {}; rotulos = arr(rotulos); series = arr(series);
    if (!rotulos.length) return vazio('Sem dados diários.');
    var W = 720, H = 200, E = 44, B = 22, fmt = opt.fmt || int;
    var vals = [].concat.apply([], series.map(function (s) { return s.valores.filter(function (v) { return v != null; }); }));
    var max = opt.max || Math.max.apply(null, vals.concat([0])) || 1;
    var x = function (i) { return E + (rotulos.length === 1 ? (W - E) / 2 : i * (W - E - 8) / (rotulos.length - 1)); };
    var y = function (v) { return 8 + (H - B - 8) * (1 - v / max); };
    var g = [0, .5, 1].map(function (f) { var v = max * f; return '<line class="grade-y" x1="' + E + '" x2="' + W + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="rotulo-y" x="' + (E - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + esc(fmt(v)) + '</text>'; }).join('');
    var passo = Math.ceil(rotulos.length / 12);
    var rx = rotulos.map(function (r, i) { return i % passo ? '' : '<text class="rotulo-x" x="' + x(i) + '" y="' + (H - 4) + '" text-anchor="middle">' + esc(r) + '</text>'; }).join('');
    var ls = series.map(function (s) {
      var d = '', pts = '';
      s.valores.forEach(function (v, i) { if (v == null) return; d += (d ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1); pts += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="3" fill="var(--' + s.cor + ')"><title>' + esc(rotulos[i] + ' · ' + s.rotulo + ': ' + fmt(v)) + '</title></circle>'; });
      return '<path d="' + d + '" fill="none" stroke="var(--' + s.cor + ')" stroke-width="2"/>' + pts;
    }).join('');
    return '<div class="grafico linha-tempo">' + titulo(opt.titulo) + legenda(series.map(function (s) { return [s.cor, s.rotulo]; })) +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opt.titulo || 'Série no tempo') + '">' + g + rx + ls + '</svg></div>';
  }

  /* ---------- tabelas ---------- */
  /* Tabela recolhível. cols: [{t: título, f: função da linha, n: numérica, html: f devolve HTML}]; opt.aberta abre por padrão */
  function tabela(tit, cols, linhas, opt) {
    opt = opt || {}; linhas = arr(linhas);
    if (!linhas.length) return '';
    return '<details' + (opt.aberta ? ' open' : '') + '><summary>' + esc(tit) + ' (' + linhas.length + ')</summary><div class="tabela-wrap"><table class="dados"><thead><tr>' +
      cols.map(function (c) { return '<th' + (c.n ? ' class="n"' : '') + '>' + esc(c.t) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      linhas.map(function (l) { return '<tr>' + cols.map(function (c) { var v = c.f(l); return '<td' + (c.n ? ' class="n"' : '') + '>' + (c.html ? v : esc(v)) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div></details>';
  }
  var COLS_CA = [{ t: 'Concluiu', n: 1, f: function (l) { return int(l.concluidos); } }, { t: 'Abandonou', n: 1, f: function (l) { return int(l.abandonados); } },
    { t: 'Taxa de abandono', n: 1, f: function (l) { return pct(l.taxa) + (l.amostra_pequena ? ' *' : ''); } }];

  /* Tabela de calor: linhas × colunas, intensidade pelo valor. valor(linha, coluna) devolve número ou null.
   * opt: {titulo, cor ('critico'|'dado'|'concluiu'|'atencao'), fmt} */
  function calor(linhas, colunas, valor, opt) {
    opt = opt || {}; linhas = arr(linhas); colunas = arr(colunas);
    if (!linhas.length || !colunas.length) return vazio();
    var fmt = opt.fmt || int, cor = opt.cor || 'critico', max = 0;
    linhas.forEach(function (l) { colunas.forEach(function (c) { var v = valor(l, c); if (v > max) max = v; }); });
    max = max || 1;
    return '<div class="grafico">' + titulo(opt.titulo) + '<div class="tabela-wrap"><table class="calor"><thead><tr><th></th>' + colunas.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      linhas.map(function (l) {
        return '<tr><th>' + esc(l) + '</th>' + colunas.map(function (c) {
          var v = valor(l, c);
          if (!v) return '<td class="zero">' + (v == null ? '' : fmt(v)) + '</td>';
          var a = (0.12 + 0.78 * v / max).toFixed(2);
          return '<td style="background:color-mix(in srgb, var(--' + cor + ') ' + Math.round(a * 100) + '%, #fff);color:' + (a > .55 ? '#fff' : '#000') + '" data-tip="' + esc(l + ' · ' + c + ': ' + fmt(v)) + '">' + fmt(v) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  /* ---------- estrutura da página ---------- */
  /* cabecalho({sobretitulo, titulo, subtitulo, meta: [HTML], avisos: [texto]}). Sem avisos, pílula verde de coleta completa */
  function cabecalho(o) {
    var av = arr(o.avisos).map(function (a) { return '<span class="pilula atencao aviso-cabecalho">' + esc(a) + '</span>'; }).join('');
    return '<header class="cabecalho"><div class="pagina">' + (o.sobretitulo ? '<div class="sobretitulo">' + esc(o.sobretitulo) + '</div>' : '') + '<h1>' + esc(o.titulo) + '</h1><div class="barra-verde"></div>' +
      (o.subtitulo ? '<p class="subtitulo">' + esc(o.subtitulo) + '</p>' : '') +
      (arr(o.meta).length ? '<div class="meta">' + o.meta.map(function (m) { return '<span>' + m + '</span>'; }).join('') + '</div>' : '') +
      '<div class="pilulas">' + (av || '<span class="pilula ok">Coleta completa para o período</span>') + '</div></div></header>';
  }
  /* secao({id, num, rotulo, titulo (conclusão), contexto, corpo}) */
  function secao(o) {
    return '<section class="secao"' + (o.id ? ' id="' + esc(o.id) + '"' : '') + '>' + (o.rotulo ? '<div class="num">' + (o.num ? o.num + '. ' : '') + esc(o.rotulo) + '</div>' : '') +
      '<h2>' + esc(o.titulo || o.rotulo) + '</h2>' + (o.contexto ? '<p class="contexto">' + esc(o.contexto) + '</p>' : '') + (o.corpo || '') + '</section>';
  }
  /* rodape({titulo, itens: [HTML], nota}) */
  function rodape(o) {
    return '<footer class="rodape"><div class="pagina"><h3>' + esc(o.titulo || 'Metodologia') + '</h3><ul>' + arr(o.itens).map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>' +
      (o.nota ? '<p class="nota" style="margin-top:12px">' + o.nota + '</p>' : '') + '</div></footer>';
  }
  /* Tooltip para todo elemento com data-tip. Chame uma vez depois de montar a página. */
  function tooltip() {
    var tip = document.getElementById('tip');
    if (!tip) { tip = document.createElement('div'); tip.id = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    document.addEventListener('mousemove', function (e) {
      var alvo = e.target.closest && e.target.closest('[data-tip]');
      if (!alvo) { tip.classList.remove('on'); return; }
      tip.textContent = alvo.getAttribute('data-tip'); tip.classList.add('on');
      var x = e.clientX + 14, y = e.clientY + 14, w = tip.offsetWidth, h = tip.offsetHeight;
      if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14;
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    });
    document.addEventListener('mouseleave', function () { tip.classList.remove('on'); });
  }

  global.Kit = {
    MOEDA: MOEDA, esc: esc, int: int, din: din, pct: pct, data: data, diaCurto: diaCurto, seg: seg, arr: arr, soma: soma, uf: uf,
    pilula: pilula, pilPequena: pilPequena, card: card, destaques: destaques, heroi: heroi, legenda: legenda, LEG_CA: LEG_CA, LEG_MSG: LEG_MSG,
    nota: nota, vazio: vazio, ladoALado: ladoALado, empilhadas: empilhadas, simples: simples, agrupadas: agrupadas, funil: funil,
    segmentada: segmentada, cartoes: cartoes, colunasEmpilhadas: colunasEmpilhadas, colunasPares: colunasPares, linhaTempo: linhaTempo,
    tabela: tabela, COLS_CA: COLS_CA, calor: calor, cabecalho: cabecalho, secao: secao, rodape: rodape, tooltip: tooltip
  };
})(window);
