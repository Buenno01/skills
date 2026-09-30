async function coletarCheckouts({
  pages = null,        // nº de páginas (20 checkouts por página, igual à UI)
  limit = null,        // nº máximo de checkouts (tem prioridade se menor)
  period = new URLSearchParams(location.search).get('period') || '30d',
  status = 'all',
  pageSize = 20,       // tamanho da página (a API aceita até 100)
  concurrency = 4,     // detalhes buscados em paralelo
  delayMs = 150,       // pausa entre lotes
  download = true,
} = {}) {
  const shop = location.pathname.split('/')[1];
  // progresso legível por outra chamada enquanto a coleta roda
  const progresso = (window.__coletaProgresso = { fase: 'listagem', paginas: 0, listados: 0, total: null, detalhes: 0 });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const b64url = (s) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  // Extrai o objeto "checkout" do payload RSC da página de detalhes
  const extrairJson = (s, key) => {
    const i = s.indexOf(`"${key}":{`);
    if (i < 0) return null;
    const j = s.indexOf('{', i);
    let depth = 0, inStr = false;
    for (let k = j; k < s.length; k++) {
      const c = s[k];
      if (inStr) { if (c === '\\') k++; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) return JSON.parse(s.slice(j, k + 1));
    }
    return null;
  };

  const buscarDetalhe = async (item) => {
    const id = b64url(`${item.checkout_token}::${item.client_id}`);
    const url = `/${shop}/checkouts/${id}?period=${period}`;
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      try {
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const rsc = [...html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)]
          .map((m) => JSON.parse(`"${m[1]}"`))
          .join('');
        const detalhe = extrairJson(rsc, 'checkout');
        if (!detalhe) throw new Error('objeto checkout não encontrado');
        return { detail_url: location.origin + url, ...item, ...detalhe };
      } catch (e) {
        if (tentativa === 3) return { detail_url: location.origin + url, ...item, _erro: e.message };
        await sleep(500 * tentativa);
      }
    }
  };

  // 1) Listagem, página por página, do primeiro ao último
  const lista = [];
  let summary = null, total = 0;
  for (let page = 1; ; page++) {
    const q = new URLSearchParams({ shop, period, status, page, pageSize });
    const res = await fetch(`/api/checkouts?${q}`, { credentials: 'include' });
    const semSessao = res.status === 401 || res.status === 403 || res.redirected ||
      !(res.headers.get('content-type') || '').includes('json');
    if (semSessao) throw new Error(`SEM_LOGIN: a listagem não devolveu dados (HTTP ${res.status}). Faça login no Checkout Sentry.`);
    if (!res.ok) throw new Error(`Falha na listagem (página ${page}): HTTP ${res.status}`);
    const data = await res.json();
    summary ??= data.summary;
    total = data.total;
    lista.push(...data.items.map((it, i) => ({ _pagina: page, _posicao: lista.length + i + 1, ...it })));
    Object.assign(progresso, { paginas: page, listados: lista.length, total });
    console.log(`Página ${page}: ${data.items.length} checkouts (acumulado ${lista.length}/${total})`);
    const acabou = data.items.length < pageSize || lista.length >= total;
    if (acabou || (pages && page >= pages) || (limit && lista.length >= limit)) break;
    await sleep(delayMs);
  }
  const alvo = limit ? lista.slice(0, limit) : lista;

  // 2) Detalhes de cada checkout (carrinho, eventos, endereço, pagamento...)
  const checkouts = new Array(alvo.length);
  Object.assign(progresso, { fase: 'detalhes', alvo: alvo.length });
  for (let i = 0; i < alvo.length; i += concurrency) {
    const lote = alvo.slice(i, i + concurrency);
    const res = await Promise.all(lote.map(buscarDetalhe));
    res.forEach((r, k) => (checkouts[i + k] = r));
    progresso.detalhes = Math.min(i + concurrency, alvo.length);
    console.log(`Detalhes: ${Math.min(i + concurrency, alvo.length)}/${alvo.length}`);
    await sleep(delayMs);
  }

  const resultado = {
    shop,
    period,
    status,
    exported_at: new Date().toISOString(),
    total_disponivel: total,
    total_coletado: checkouts.length,
    erros: checkouts.filter((c) => c._erro).length,
    summary,
    checkouts,
  };

  const arquivo = `checkouts_${shop}_${period}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  if (download) {
    const blob = new Blob([JSON.stringify(resultado, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: arquivo });
    a.click();
    URL.revokeObjectURL(a.href);
  }
  progresso.fase = 'concluido';
  resultado.arquivo = download ? arquivo : null; // fora do arquivo baixado: só informa o nome
  console.log(`Concluído: ${resultado.total_coletado} checkouts, ${resultado.erros} erro(s).`);
  return resultado;
}
