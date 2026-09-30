/* Galeria de padrões visuais do kit. Todos os dados abaixo são sintéticos e servem só para mostrar o formato.
 * Em um relatório real, cada valor vem do kpis.json (o bloco indicado na ficha de cada exemplo).
 * Gerar a página: python3 scripts/montar.py --pagina examples/galeria.js --saida examples/galeria.html --titulo "Galeria do Raio-X" */
function pagina(_K, Kit) {
  var K = Kit, H = '';
  function exemplo(nome, funcao, quando, blocos, corpo) {
    H += '<div class="exemplo" id="' + funcao.replace(/[^a-z]/gi, '') + '"><h2>' + K.esc(nome) + '</h2><div class="ficha"><b>Função:</b> <code>' + K.esc(funcao) + '</code><br><b>Quando usar:</b> ' + quando +
      '<br><b>Blocos do kpis.json:</b> ' + blocos + '</div>' + corpo + '</div>';
  }
  var dias = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07'];

  exemplo('Cabeçalho com avisos', 'Kit.cabecalho', 'Abertura de qualquer página. Os avisos do export aparecem sempre, antes dos números.', '<code>fonte</code>, <code>periodo</code>, <code>avisos</code>',
    K.cabecalho({ sobretitulo: 'loja-exemplo', titulo: 'Raio-X do checkout', subtitulo: 'Subtítulo com a leitura geral do período em uma ou duas frases.',
      meta: ['Período <b>01/01/2026 a 07/01/2026</b> (7 dias)', '<b>420</b> checkouts no arquivo de 450 disponíveis', 'Base de clientes <b>1.200</b> cadastros'],
      avisos: ['Coleta parcial: 420 de 450 checkouts disponíveis.'] }));

  exemplo('Número-herói com grade de cards', 'Kit.heroi', 'Visão geral: um indicador principal e até quatro de apoio.', '<code>taxa_abandono</code>, <code>pessoas</code>, <code>desfecho</code>, <code>recuperaveis</code>',
    K.heroi({ v: K.pct(0.584), r: 'Taxa de abandono', d: '146 de 250 pessoas com contato abandonaram' }, [
      { v: K.din(48250), r: 'Valor abandonado', tom: 'critico' }, { v: K.int(104), r: 'Compras concluídas', tom: 'ok' },
      { v: K.int(61), r: 'Pessoas recuperáveis', d: K.din(19800) + ' em carrinhos' }, { v: K.int(38), r: 'Checkouts anônimos' }]));

  exemplo('Linha de destaques', 'Kit.destaques', 'Topo de seção: dois a quatro números que sustentam o título-conclusão.', 'qualquer bloco',
    K.destaques([{ v: K.pct(0.62) + ' × ' + K.pct(0.48), r: 'Abandono: grupo 1 × grupo 2', d: 'Detalhe de apoio', tom: 'critico' },
      { v: K.int(27), r: 'Contagem de apoio', d: 'Detalhe', tom: 'atencao' }, { txt: 1, v: 'Rótulo textual', r: 'Destaque em texto', d: 'Para nomes vindos dos dados' }]));

  exemplo('Funil com queda entre etapas', 'Kit.funil', 'Mostrar onde a jornada perde mais gente e dinheiro. A maior queda fica em vermelho.', '<code>funil</code> e <code>parou</code>',
    K.funil([{ rotulo: 'Início', n: 380 }, { rotulo: 'Contato', n: 300 }, { rotulo: 'Endereço', n: 240 }, { rotulo: 'Frete', n: 210 }, { rotulo: 'Pagamento', n: 190 }, { rotulo: 'Concluiu', n: 104 }],
      [{ n: 80, valor: 9100 }, { n: 60, valor: 7200 }, { n: 30, valor: 4100 }, { n: 20, valor: 2600 }, { n: 86, valor: 25250 }], { titulo: 'Funil do checkout (sem anônimos)' }));

  exemplo('Barras empilhadas concluiu × abandonou', 'Kit.empilhadas', 'Comparar categorias (opção de frete, UF, método, produto, combinação). Largura = volume, número = taxa de abandono.', '<code>frete.opcoes</code>, <code>regioes</code>, <code>pagamento.metodos</code>, <code>produtos</code>, <code>combinacoes</code>',
    K.empilhadas([{ rotulo: 'Categoria A', concluidos: 40, abandonados: 60, taxa: 0.6, sub: '100 checkouts' }, { rotulo: 'Categoria B', concluidos: 35, abandonados: 25, taxa: 0.4167 },
      { rotulo: 'Categoria C', concluidos: 2, abandonados: 1, taxa: 0.3333, amostra_pequena: true }], { titulo: 'Abandono por categoria' }));

  exemplo('Barras simples com parte destacada', 'Kit.simples', 'Contagens (mensagens de erro, etapa de parada). O trecho vermelho é quantos daqueles abandonaram.', '<code>erros.mensagens</code>, <code>erros.por_etapa</code>, <code>clientes.recuperaveis.por_ponto</code>',
    K.simples([{ rotulo: 'Mensagem de erro 1', valor: 18, parte: 12, sub: '12 abandonaram' }, { rotulo: 'Mensagem de erro 2', valor: 9, parte: 3 }, { rotulo: 'Mensagem de erro 3', valor: 4, parte: 4 }],
      { titulo: 'Checkouts afetados por mensagem', legenda: K.LEG_MSG }));

  exemplo('Empilhadas agrupadas', 'Kit.agrupadas', 'Um subgrupo dentro de cada grupo, com escala comum (ex.: frete grátis × pago por UF).', '<code>regioes[].frete</code>',
    K.agrupadas([{ nome: 'AA', linhas: [{ rotulo: 'Grátis', concluidos: 30, abandonados: 20, taxa: 0.4 }, { rotulo: 'Pago', concluidos: 10, abandonados: 25, taxa: 0.7143, sub: 'frete médio ' + K.din(24.9, 2) }] },
      { nome: 'BB', linhas: [{ rotulo: 'Grátis', concluidos: 12, abandonados: 8, taxa: 0.4 }, { rotulo: 'Pago', concluidos: 2, abandonados: 1, taxa: 0.3333, amostra_pequena: true }] }], { titulo: 'Frete grátis × pago por UF' }));

  exemplo('Barra 100% segmentada', 'Kit.segmentada', 'Composição de um total (ex.: quem abandonou por possibilidade de contato).', '<code>recuperaveis</code>, <code>clientes.abandonados_sem_optin</code>',
    K.segmentada([{ valor: 61, cor: 'concluiu', rotulo: 'Com opt-in na base' }, { valor: 45, cor: 'atencao', rotulo: 'Na base sem opt-in' }, { valor: 40, cor: 'critico', rotulo: 'Fora da base' }], { titulo: 'Quem abandonou e pode ser contatado' }));

  exemplo('Cartões por item', 'Kit.cartoes', 'Um cartão por canal, método ou etapa quando cada item tem poucos números.', '<code>clientes.recuperaveis.por_canal</code>',
    K.cartoes([{ v: K.int(52), r: 'Canal 1', d: K.din(16900) + ' em carrinhos', tom: 'ok' }, { v: K.int(14), r: 'Canal 2', d: K.din(4200) + ' em carrinhos', tom: 'ok' },
      { v: K.int(0), r: 'Canal 3', d: K.pilula('nenhum opt-in na base: coleta pode estar desativada', 'atencao'), tom: 'atencao' }]));

  exemplo('Colunas empilhadas por dia', 'Kit.colunasEmpilhadas', 'Volume diário por desfecho.', '<code>por_dia</code> (<code>total</code>, <code>concluidos</code>, <code>abandonados</code>)',
    K.colunasEmpilhadas(dias.map(function (d, i) { var c = 12 + i, a = 18 - i, o = 5; return { rotulo: K.diaCurto(d), partes: [['c', c], ['a', a], ['o', o]], tip: K.diaCurto(d) + '\nConcluiu: ' + c + ' · Abandonou: ' + a }; }),
      { titulo: 'Checkouts por dia', legenda: [['concluiu', 'Concluiu'], ['critico', 'Abandonou'], ['outros', 'Anônimo ou em andamento']] }));

  exemplo('Colunas lado a lado com média', 'Kit.colunasPares', 'Médias por dia (ticket, frete). Médias não se empilham.', '<code>por_dia[].ticket_medio</code>, <code>por_dia[].frete_medio</code>',
    K.colunasPares(dias.map(function (d, i) { return { rotulo: K.diaCurto(d), barras: [['critico', 310 + i * 12], ['concluiu', 260 + i * 5]], media: 285 + i * 8 }; }),
      { titulo: 'Ticket médio por dia', legenda: [['critico', 'Abandonou'], ['concluiu', 'Concluiu'], ['dado', 'Média geral']] }));

  exemplo('Linha no tempo', 'Kit.linhaTempo', 'Direção de uma taxa ou média ao longo dos dias, quando a forma da curva importa mais que o valor de cada dia.', '<code>por_dia</code> (taxa derivada: diga que é derivada)',
    K.linhaTempo(dias.map(K.diaCurto), [{ rotulo: 'Abandonados', cor: 'critico', valores: [18, 17, 16, 15, 14, 13, 12] }, { rotulo: 'Concluídos', cor: 'concluiu', valores: [12, 13, 14, 15, 16, null, 18] }],
      { titulo: 'Abandonados × concluídos por dia' }));

  exemplo('Tabela de calor', 'Kit.calor', 'Cruzar duas dimensões com contagem (ex.: etapa × tipo de alerta).', '<code>erros.por_etapa</code>',
    K.calor(['Contato', 'Endereço', 'Frete', 'Pagamento'], ['INPUT_INVALID', 'INPUT_REQUIRED', 'PAYMENT_ERROR'], function (l, c) { return { Contato: [6, 2, 0], 'Endereço': [9, 4, 0], Frete: [1, 0, 0], Pagamento: [3, 1, 22] }[l][['INPUT_INVALID', 'INPUT_REQUIRED', 'PAYMENT_ERROR'].indexOf(c)]; },
      { titulo: 'Checkouts com alerta por etapa e tipo' }));

  exemplo('Tabela recolhível', 'Kit.tabela', 'Números completos embaixo de todo gráfico, para quem quer conferir.', 'o mesmo bloco do gráfico',
    K.tabela('Todas as categorias', [{ t: 'Categoria', f: function (l) { return l.rotulo; } }].concat(K.COLS_CA),
      [{ rotulo: 'Categoria A', concluidos: 40, abandonados: 60, taxa: 0.6 }, { rotulo: 'Categoria B', concluidos: 35, abandonados: 25, taxa: 0.4167 }], { aberta: true }));

  exemplo('Dois gráficos lado a lado', 'Kit.ladoALado', 'Mesma medida em dois recortes que o leitor deve comparar.', 'qualquer bloco',
    K.ladoALado(K.simples([{ rotulo: 'Mensagem 1', valor: 8, parte: 5 }, { rotulo: 'Mensagem 2', valor: 3, parte: 1 }], { titulo: 'Recorte 1', legenda: K.LEG_MSG }),
      K.simples([{ rotulo: 'Mensagem 3', valor: 6, parte: 2 }], { titulo: 'Recorte 2', legenda: K.LEG_MSG })));

  exemplo('Seção completa', 'Kit.secao', 'Envolve qualquer combinação acima com título-conclusão e contexto.', 'narrativa escrita pelo agente',
    K.secao({ num: 1, rotulo: 'Rótulo da seção', titulo: 'Título que afirma a conclusão da seção', contexto: 'Uma a três frases que explicam o porquê e o que fazer, citando no máximo dois números que a seção mostra.',
      corpo: K.destaques([{ v: K.pct(0.41), r: 'Número de apoio' }]) }));

  exemplo('Rodapé de metodologia', 'Kit.rodape', 'Fecho da página com as definições usadas.', '<code>fonte</code>, <code>periodo</code>',
    K.rodape({ itens: ['Definição da taxa.', 'Regra de pessoa.', 'Critério de recuperável.', 'Valores em ' + K.MOEDA + '.'] }));

  return '<main class="pagina"><h1 style="margin-top:40px">Galeria do Raio-X</h1><div class="barra-verde"></div><p class="subtitulo">Padrões visuais do kit, com dados sintéticos. Escolha os que respondem ao pedido e combine como quiser.</p>' + H + '</main>';
}
