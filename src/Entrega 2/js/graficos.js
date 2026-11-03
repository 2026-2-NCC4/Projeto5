const timersAnimacao = {};
let observadorGraficos = null;
const graficosPendentesAnimacao = new Map();

function limparTimerAnimacao(id) {
  if (timersAnimacao[id]) {
    clearInterval(timersAnimacao[id]);
    delete timersAnimacao[id];
  }
}

function limparTodosTimersAnimacao() {
  Object.keys(timersAnimacao).forEach(id => limparTimerAnimacao(id));
  if (typeof limparKpiTimeouts === 'function') limparKpiTimeouts();
  if (typeof limparMapaTimeouts === 'function') limparMapaTimeouts();
  if (typeof limparAchadosTimeouts === 'function') limparAchadosTimeouts();
  if (typeof limparMapeamentoTimeouts === 'function') limparMapeamentoTimeouts();
  if (typeof limparTelaSobreTimeouts === 'function') limparTelaSobreTimeouts();
}

function estaVisivelNoViewport(el) {
  if (!el || el.offsetParent === null) return false;
  const rect = el.getBoundingClientRect();
  const alturaJanela = window.innerHeight || document.documentElement.clientHeight || 800;
  const larguraJanela = window.innerWidth || document.documentElement.clientWidth || 1200;

  const topoVisivel = rect.top < (alturaJanela - 80);
  const fundoVisivel = rect.bottom > 80;
  const horizontalVisivel = rect.left < larguraJanela && rect.right > 0;
  const temDimensoes = rect.height > 80 && rect.width > 80;

  return topoVisivel && fundoVisivel && horizontalVisivel && temDimensoes;
}

function checarGraficosVisiveis() {
  if (graficosPendentesAnimacao.size === 0) return;

  const idsParaExecutar = [];
  graficosPendentesAnimacao.forEach((fnAnimacao, idElemento) => {
    const el = $(idElemento);
    if (el && estaVisivelNoViewport(el)) {
      idsParaExecutar.push({ id: idElemento, fn: fnAnimacao });
    }
  });

  idsParaExecutar.forEach(({ id, fn }) => {
    graficosPendentesAnimacao.delete(id);
    if (observadorGraficos) {
      const el = $(id);
      if (el) observadorGraficos.unobserve(el);
    }
    fn();
  });
}

function registrarAnimacaoGrafico(idElemento, callbackAnimacao) {
  const el = $(idElemento);
  if (!el) return;

  const prefereReduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefereReduzido || estaVisivelNoViewport(el)) {
    callbackAnimacao();
    return;
  }

  graficosPendentesAnimacao.set(idElemento, callbackAnimacao);

  if (typeof IntersectionObserver !== 'undefined') {
    if (!observadorGraficos) {
      observadorGraficos = new IntersectionObserver(() => {
        checarGraficosVisiveis();
      }, {
        rootMargin: '0px 0px -70px 0px',
        threshold: [0, 0.1, 0.2]
      });
    }
    observadorGraficos.observe(el);
  }
}

window.addEventListener('scroll', checarGraficosVisiveis, { passive: true });
window.addEventListener('resize', checarGraficosVisiveis, { passive: true });

function comTemaClaro(fn) {
  const anterior = temaForcado;
  temaForcado = 'claro';
  try { return fn(); } finally { temaForcado = anterior; }
}

function legendaTopo(cores) {
  return {
    orientation: 'h',
    y: 1.05,
    yanchor: 'bottom',
    x: 0.02,
    xanchor: 'left',
    font: { color: cores.texto, size: 12, family: "'Montserrat', sans-serif" }
  };
}

function faixa(valores, folga = 0.12, incluirZero = false) {
  const v = valores.filter(tem);
  if (!v.length) return [0, 1];
  let mn = Math.min(...v), mx = Math.max(...v);
  if (incluirZero) { mn = Math.min(mn, 0); mx = Math.max(mx, 0); }
  const m = Math.max((mx - mn) * folga, 1e-9);
  return [mn - m, mx + m];
}

function animarLinhasProgressivas(idElemento, categorias, series, layout, animar = true, duracaoFrame = 130) {
  limparTimerAnimacao(idElemento);
  const criarTraces = (xVals, fnFatia) => series.map(s => ({
    x: xVals,
    y: fnFatia ? fnFatia(s.valores) : s.valores,
    name: s.nome,
    mode: 'lines+markers',
    line: { color: s.cor, width: s.largura || 2.5 },
    marker: { size: s.tamanhoPonto || 6, color: s.cor }
  }));

  if (!animar || categorias.length <= 1) {
    Plotly.react(idElemento, criarTraces(categorias), layout);
    return;
  }

  Plotly.react(idElemento, criarTraces([categorias[0]], vals => [vals[0]]), layout);

  registrarAnimacaoGrafico(idElemento, () => {
    let passo = 1;
    const totalPassos = categorias.length;
    timersAnimacao[idElemento] = setInterval(() => {
      if (passo >= totalPassos) {
        limparTimerAnimacao(idElemento);
        Plotly.react(idElemento, criarTraces(categorias), layout);
        return;
      }
      const xFatia = categorias.slice(0, passo + 1);
      Plotly.animate(idElemento, {
        data: series.map(s => ({
          x: xFatia,
          y: s.valores.slice(0, passo + 1)
        }))
      }, {
        transition: { duration: duracaoFrame, easing: 'cubic-in-out' },
        frame: { duration: duracaoFrame, redraw: false }
      });
      passo++;
    }, duracaoFrame + 20);
  });
}

function animarBarrasPlotly(idElemento, traceFinal, layout, animar = true, duracao = 1500) {
  limparTimerAnimacao(idElemento);
  if (!animar) {
    Plotly.react(idElemento, [traceFinal], layout);
    return;
  }

  const traceInicial = { ...traceFinal, y: traceFinal.x.map(() => 0) };
  Plotly.react(idElemento, [traceInicial], layout);

  registrarAnimacaoGrafico(idElemento, () => {
    Plotly.animate(idElemento, {
      data: [{ y: traceFinal.y }]
    }, {
      transition: { duration: duracao, easing: 'back-out' },
      frame: { duration: duracao, redraw: false }
    });
  });
}

function plotarFig(id, fig, animar) {
  limparTimerAnimacao(id);
  if (!$(id)) return;
  const { data, layout, tipo } = fig;
  const n = data[0] && data[0].x ? data[0].x.length : 0;
  if (!animar || n <= 1 || !tipo || tipo === 'estatico') {
    Plotly.react(id, data, layout);
    return;
  }
  if (tipo === 'barras') {
    Plotly.react(id, data.map(t => ({ ...t, y: t.y.map(() => 0) })), layout);
    registrarAnimacaoGrafico(id, () => {
      Plotly.animate(id, { data: data.map(t => ({ y: t.y })) },
        { transition: { duration: 1500, easing: 'back-out' }, frame: { duration: 1500, redraw: false } });
    });
    return;
  }
  Plotly.react(id, data.map(t => ({ ...t, x: [t.x[0]], y: [t.y[0]] })), layout);
  registrarAnimacaoGrafico(id, () => {
    let passo = 1;
    timersAnimacao[id] = setInterval(() => {
      if (passo >= n) { limparTimerAnimacao(id); Plotly.react(id, data, layout); return; }
      Plotly.animate(id, { data: data.map(t => ({ x: t.x.slice(0, passo + 1), y: t.y.slice(0, passo + 1) })) },
        { transition: { duration: 130, easing: 'cubic-in-out' }, frame: { duration: 130, redraw: false } });
      passo++;
    }, 150);
  });
}

function reiniciarAnimacoesGraficos() {
  limparTodosTimersAnimacao();
  graficosPendentesAnimacao.clear();

  if (observadorGraficos) {
    observadorGraficos.disconnect();
  }

  if ($('s-mapeamento') && !$('s-mapeamento').classList.contains('oculto')) {
    const cards = document.querySelectorAll('#lista-mapeamento .linha-mapa');
    if (cards.length > 0) {
      cards.forEach(card => card.classList.remove('ativo'));
      registrarAnimacaoGrafico('lista-mapeamento', () => {
        limparMapeamentoTimeouts();
        cards.forEach((card, index) => {
          const t = setTimeout(() => {
            card.classList.add('ativo');
          }, index * 80);
          mapeamentoTimeouts.push(t);
        });
      });
    }
  }

  if (resultado && $('painel') && !$('painel').classList.contains('oculto')) {
    desenharKpis(true);
    desenharMapa(true);
    desenharAchados(true);
    desenharEvolucao(true);
    desenharConversao(true);
    desenharDistribuicao();
    desenharRegressoes(true);
    if (typeof desenharIndices === 'function') desenharIndices(true);

    setTimeout(() => {
      checarGraficosVisiveis();
    }, 80);
  }
}

function obterLayoutBase(titulo, extras = {}) {
  const cores = obterCoresTema();
  const temLegenda = Boolean(extras.legend && extras.showlegend !== false);
  const margemTopo = (extras.margin && extras.margin.t !== undefined) ? extras.margin.t : (temLegenda ? 88 : 48);

  const baseTitle = {
    text: titulo,
    font: { color: cores.texto, size: 14, family: "'Montserrat', sans-serif" },
    x: 0.02,
    y: 0.98,
    xanchor: 'left',
    yanchor: 'top'
  };

  return {
    title: { ...baseTitle, ...(extras.title || {}) },
    paper_bgcolor: cores.fundo,
    plot_bgcolor: cores.fundo,
    font: { color: cores.texto, family: "'Montserrat', sans-serif" },
    margin: { l: 52, r: 25, t: margemTopo, b: 45, ...(extras.margin || {}) },
    xaxis: {
      gridcolor: cores.grade,
      zerolinecolor: cores.linhaZero,
      tickfont: { color: cores.texto, size: 11, family: "'Montserrat', sans-serif" },
      ...(extras.xaxis || {})
    },
    yaxis: {
      gridcolor: cores.grade,
      zerolinecolor: cores.linhaZero,
      tickfont: { color: cores.texto, size: 11, family: "'Montserrat', sans-serif" },
      ...(extras.yaxis || {})
    },
    transition: { duration: 350, easing: 'cubic-in-out' },
    ...extras
  };
}

function figEvolucao() {
  const cores = obterCoresTema(), t = resultado.por_ano, anos = t.map(l => 'Ano ' + l.ano);
  const e = t.map(l => l.ebitda), c = t.map(l => l.caixa);
  const lin = (y, nome, cor) => ({ x: anos, y, name: nome, mode: 'lines+markers', line: { color: cor, width: 3 }, marker: { size: 7, color: cor } });
  const layout = obterLayoutBase('Evolução das Médias (EBITDA vs Caixa)', {
    xaxis: { categoryorder: 'array', categoryarray: anos, gridcolor: cores.grade },
    yaxis: { range: faixa(e.concat(c), 0.12), gridcolor: cores.grade },
    legend: legendaTopo(cores)
  });
  return { data: [lin(e, 'EBITDA', cores.azul), lin(c, 'Caixa', cores.laranja)], layout };
}

function desenharEvolucao(animar = true) {
  const t = resultado.por_ano;
  const cores = obterCoresTema();
  const anos = t.map(l => 'Ano ' + l.ano);
  const ebitdaVals = t.map(l => l.ebitda);
  const caixaVals = t.map(l => l.caixa);

  const todosVals = [...ebitdaVals, ...caixaVals].filter(v => v !== null && !isNaN(v));
  const minVal = Math.min(...todosVals);
  const maxVal = Math.max(...todosVals);
  const margemVal = Math.max(1, (maxVal - minVal) * 0.12);

  const layout = obterLayoutBase('Evolução das Médias (EBITDA vs Caixa)', {
    xaxis: { categoryorder: 'array', categoryarray: anos, gridcolor: cores.grade },
    yaxis: { range: [minVal - margemVal, maxVal + margemVal], gridcolor: cores.grade },
    legend: legendaTopo(cores)
  });

  const series = [
    { nome: 'EBITDA', valores: ebitdaVals, cor: cores.azul, largura: 3, tamanhoPonto: 7 },
    { nome: 'Caixa', valores: caixaVals, cor: cores.laranja, largura: 3, tamanhoPonto: 7 }
  ];

  animarLinhasProgressivas('g-evolucao', anos, series, layout, animar);
}

function figConversao() {
  const cores = obterCoresTema(), t = resultado.por_ano, anos = t.map(l => 'Ano ' + l.ano), v = t.map(l => l.conversao);
  const col = t.map(l => (l.conversao >= 0.5 ? cores.verde : (l.conversao >= 0 ? cores.laranja : cores.vermelho)));
  const [mn, mx] = faixa(v.concat([0, 0.5]), 0.12);
  const layout = obterLayoutBase('Índice de Conversão (Caixa / Lucro Líquido)', { yaxis: { title: 'Conversão', range: [mn, mx], gridcolor: cores.grade } });
  return { data: [{ x: anos, y: v, type: 'bar', marker: { color: col } }], layout };
}

function desenharConversao(animar = true) {
  const t = resultado.por_ano;
  const cores = obterCoresTema();
  const anos = t.map(l => 'Ano ' + l.ano);
  const valores = t.map(l => l.conversao);
  const coresBarras = t.map(l => (l.conversao >= 0.5 ? cores.verde : (l.conversao >= 0 ? cores.laranja : cores.vermelho)));

  const validos = valores.filter(v => v !== null && !isNaN(v));
  const minV = Math.min(0, ...validos);
  const maxV = Math.max(0.5, ...validos);
  const pad = Math.max(0.08, (maxV - minV) * 0.12);

  const layout = obterLayoutBase('Índice de Conversão (Caixa / Lucro Líquido)', {
    yaxis: { title: 'Conversão', range: [minV < 0 ? minV - pad : -0.05, maxV + pad], gridcolor: cores.grade }
  });

  const traceFinal = {
    x: anos,
    y: valores,
    type: 'bar',
    marker: { color: coresBarras, opacity: 0.95 }
  };

  animarBarrasPlotly('g-conversao', traceFinal, layout, animar, 1600);
}

function figHist() {
  const cores = obterCoresTema(), conta = $('filtro-conta').value, anoH = Number($('filtro-ano-hist').value);
  const d = resultado.dados, vals = [];
  for (let i = 0; i < d.n.length; i++) if (d.n[i] === anoH && d[conta] && tem(d[conta][i])) vals.push(d[conta][i]);
  const nome = ROTULOS[conta] || conta;
  const layout = obterLayoutBase(`Distribuição nos Cenários — ${nome} (Ano ${anoH})`, { bargap: 0.05, xaxis: { title: nome, gridcolor: cores.grade }, yaxis: { title: 'Frequência', gridcolor: cores.grade } });
  return { data: [{ x: vals, type: 'histogram', marker: { color: cores.azul, line: { color: cores.grade, width: 1 } } }], layout };
}

function figBox() {
  const cores = obterCoresTema(), conta = $('filtro-conta').value, d = resultado.dados, porA = {};
  for (let i = 0; i < d.n.length; i++) { const v = d[conta] ? d[conta][i] : null; if (!tem(v)) continue; (porA[d.n[i]] = porA[d.n[i]] || []).push(v); }
  const nome = ROTULOS[conta] || conta;
  const layout = obterLayoutBase(`Variabilidade por Ano — ${nome}`, { showlegend: false, yaxis: { title: nome, gridcolor: cores.grade } });
  return { data: Object.keys(porA).map(a => ({ y: porA[a], type: 'box', name: 'Ano ' + a, marker: { color: cores.azul }, line: { width: 1.5 } })), layout };
}

function desenharDistribuicao() {
  const conta = $('filtro-conta').value;
  const anoH = Number($('filtro-ano-hist').value);
  const nomeConta = ROTULOS[conta] || conta;
  const d = resultado.dados;
  const cores = obterCoresTema();
  const vals = [];
  const porA = {};
  for (let i = 0; i < d.n.length; i++) {
    const v = d[conta] ? d[conta][i] : null;
    if (v === null || v === undefined) continue;
    if (!porA[d.n[i]]) porA[d.n[i]] = [];
    porA[d.n[i]].push(v);
    if (d.n[i] === anoH) vals.push(v);
  }

  const layoutHist = obterLayoutBase(`Distribuição nos Cenários — ${nomeConta} (Ano ${anoH})`, {
    bargap: 0.05,
    xaxis: { title: nomeConta, gridcolor: cores.grade },
    yaxis: { title: 'Frequência', gridcolor: cores.grade }
  });
  Plotly.react('g-hist', [{
    x: vals,
    type: 'histogram',
    marker: { color: cores.azul, line: { color: cores.grade, width: 1 } }
  }], layoutHist);

  const layoutBox = obterLayoutBase(`Variabilidade por Ano — ${nomeConta}`, {
    showlegend: false,
    xaxis: { gridcolor: cores.grade },
    yaxis: { title: nomeConta, gridcolor: cores.grade }
  });
  Plotly.react('g-box', Object.keys(porA).map(a => ({
    y: porA[a],
    type: 'box',
    name: 'Ano ' + a,
    marker: { color: cores.azul },
    line: { width: 1.5 }
  })), layoutBox);

  const desc = resultado.descritivas.map(l => `<tr><td>${ROTULOS[l.conta] || l.conta}</td><td>${fmt(l.media, 1)}</td><td>${fmt(l.mediana, 1)}</td><td>${fmt(l.desvio, 1)}</td><td>${l.pct_outliers}%</td></tr>`).join('');
  $('t-descritivas').innerHTML = `<tr><th>Conta</th><th>Média</th><th>Mediana</th><th>Desvio</th><th>Outliers</th></tr>${desc}`;
}

/* ==========================================================================
   Figuras dos Índices Financeiros
   ========================================================================== */
function seriesReg(ids, regulares = true) {
  const L = indicesPorAno().filter(l => !regulares || l.ano < ANO_ENCERRAMENTO);
  const anos = L.map(l => 'Ano ' + l.ano);
  const vals = id => { const d = INDICES.find(x => x.id === id); return L.map(l => valorIdx(d, l)); };
  return { anos, vals };
}

function traceLinhaIdx(x, y, nome, cor, extra = {}) {
  return { x, y, name: nome, mode: 'lines+markers', line: { color: cor, width: 2.5 }, marker: { size: 6, color: cor }, ...extra };
}

function figIdxEbitda() {
  const cores = obterCoresTema();
  const L = indicesPorAno();
  const anos = L.map(l => 'Ano ' + l.ano);
  const arq = resultado.por_ano.map(l => tem(l.ebitda_arquivo) ? l.ebitda_arquivo : null);
  const data = [
    { x: anos, y: L.map(l => l.ebitda), name: 'EBITDA recalculado', type: 'bar', marker: { color: cores.azul } }
  ];
  if (arq.some(v => v !== null)) data.push({ x: anos, y: arq, name: 'EBITDA do arquivo', type: 'bar', marker: { color: cores.amarelo } });
  data.push(traceLinhaIdx(anos, L.map(l => l.margem_ebitda), 'Margem EBITDA (eixo direito)', cores.verde, { yaxis: 'y2' }));
  const layout = obterLayoutBase('EBITDA e Margem EBITDA', {
    barmode: 'group', legend: legendaTopo(cores), margin: { r: 50 },
    xaxis: { categoryorder: 'array', categoryarray: anos, gridcolor: cores.grade },
    yaxis: { title: 'R$ milhões', gridcolor: cores.grade },
    yaxis2: { overlaying: 'y', side: 'right', tickformat: '.0%', range: [0, 1], showgrid: false, tickfont: { color: cores.texto, size: 11 } }
  });
  return { data, layout, tipo: 'estatico' };
}

function figIdxLiquidez() {
  const cores = obterCoresTema();
  const s = seriesReg();
  const defs = [
    ['lc', 'LC', cores.azul],
    ['ls', 'LS', cores.verde],
    ['li', 'LI', cores.laranja],
    ['lg', 'LG', cores.roxo]
  ].filter(([id]) => idxTemDados(INDICES.find(x => x.id === id)));
  if (!defs.length) return null;
  const data = defs.map(([id, nome, cor]) => traceLinhaIdx(s.anos, s.vals(id), nome, cor));
  const todos = defs.flatMap(([id]) => s.vals(id)).filter(v => v !== null && isFinite(v));
  const [mn, mx] = faixa(todos.concat([0, 1]), 0.1);
  const layout = obterLayoutBase('Liquidez (Anos 1 a 11)', {
    legend: legendaTopo(cores),
    xaxis: { categoryorder: 'array', categoryarray: s.anos, gridcolor: cores.grade },
    yaxis: { range: [Math.max(0, mn), mx], gridcolor: cores.grade },
    shapes: [{ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 1, y1: 1, line: { color: cores.vermelho, width: 1.5, dash: 'dash' } }],
    annotations: [{ xref: 'paper', x: 1, y: 1, text: 'referência 1,0', showarrow: false, xanchor: 'right', yanchor: 'bottom', font: { size: 10, color: cores.vermelho } }]
  });
  return { data, layout, tipo: 'linhas' };
}

function figIdxEndiv() {
  const cores = obterCoresTema();
  const s = seriesReg();
  const defs = [
    ['pct', 'PCT (x)', cores.azul, {}],
    ['ipl', 'IPL (x)', cores.laranja, {}],
    ['ce', 'CE (%, eixo direito)', cores.vermelho, { yaxis: 'y2', line: { color: cores.vermelho, width: 2.5, dash: 'dot' } }]
  ].filter(([id]) => idxTemDados(INDICES.find(x => x.id === id)));
  if (!defs.length) return null;
  const data = defs.map(([id, nome, cor, extra]) => traceLinhaIdx(s.anos, s.vals(id), nome, cor, extra));
  const temPct = idxTemDados(INDICES.find(x => x.id === 'pct'));
  const temIpl = idxTemDados(INDICES.find(x => x.id === 'ipl'));
  const temCe = idxTemDados(INDICES.find(x => x.id === 'ce'));
  const valsEixo1 = [
    ...(temPct ? s.vals('pct') : []),
    ...(temIpl ? s.vals('ipl') : [])
  ].filter(v => v !== null && isFinite(v));
  const valsEixo2 = temCe ? s.vals('ce').filter(v => v !== null && isFinite(v)) : [];

  const extrasLayout = {
    legend: legendaTopo(cores), margin: { r: 50 },
    xaxis: { categoryorder: 'array', categoryarray: s.anos, gridcolor: cores.grade }
  };
  if (valsEixo1.length) {
    extrasLayout.yaxis = { range: faixa(valsEixo1, 0.12, true), title: 'vezes', gridcolor: cores.grade };
  }
  if (valsEixo2.length) {
    extrasLayout.yaxis2 = { overlaying: 'y', side: 'right', tickformat: '.0%', range: faixa(valsEixo2, 0.15, true), showgrid: false, tickfont: { color: cores.texto, size: 11 } };
  }
  const layout = obterLayoutBase('Endividamento (Anos 1 a 11)', extrasLayout);
  return { data, layout, tipo: 'linhas' };
}

function figIdxRent() {
  const cores = obterCoresTema();
  const s = seriesReg();
  const temRoa = idxTemDados(INDICES.find(x => x.id === 'roa'));
  const temRoe = idxTemDados(INDICES.find(x => x.id === 'roe'));
  if (!temRoa && !temRoe) return null;

  const defs = [
    ['roa', 'ROA', cores.azul],
    ['roe', 'ROE', cores.rosa],
    ['margem_liquida', 'Margem líquida', cores.verde],
    ['margem_operacional', 'Margem operacional', cores.laranja]
  ].filter(([id]) => idxTemDados(INDICES.find(x => x.id === id)));

  const data = defs.map(([id, nome, cor]) => traceLinhaIdx(s.anos, s.vals(id), nome, cor));
  const todos = defs.flatMap(([id]) => s.vals(id)).filter(v => v !== null && isFinite(v));
  const layout = obterLayoutBase('Rentabilidade (Anos 1 a 11)', {
    legend: legendaTopo(cores),
    xaxis: { categoryorder: 'array', categoryarray: s.anos, gridcolor: cores.grade },
    yaxis: { range: faixa(todos, 0.1, true), tickformat: '.0%', gridcolor: cores.grade }
  });
  return { data, layout, tipo: 'linhas' };
}

function figIdxEva() {
  const cores = obterCoresTema();
  const s = seriesReg();
  const temEva = idxTemDados(INDICES.find(x => x.id === 'eva'));
  const temEvaCi = idxTemDados(INDICES.find(x => x.id === 'eva_ci'));
  if (!temEva && !temEvaCi) return null;

  const data = [];
  const extrasLayout = {
    legend: legendaTopo(cores), margin: { r: 50 },
    xaxis: { categoryorder: 'array', categoryarray: s.anos, gridcolor: cores.grade }
  };
  if (temEva) {
    const eva = s.vals('eva');
    data.push({ x: s.anos, y: eva, name: 'EVA (R$ mi)', type: 'bar', marker: { color: eva.map(v => v !== null && v < 0 ? cores.vermelho : cores.teal) } });
    extrasLayout.yaxis = { range: faixa(eva.filter(v => v !== null && isFinite(v)), 0.12, true), title: 'R$ milhões', gridcolor: cores.grade };
  }
  if (temEvaCi) {
    const valsCi = s.vals('eva_ci');
    data.push(traceLinhaIdx(s.anos, valsCi, 'EVA / Capital investido (eixo direito)', cores.laranja, { yaxis: 'y2' }));
    extrasLayout.yaxis2 = { overlaying: 'y', side: 'right', tickformat: '.0%', range: faixa(valsCi.filter(v => v !== null && isFinite(v)), 0.15, true), showgrid: false, tickfont: { color: cores.texto, size: 11 } };
  }
  const layout = obterLayoutBase(`EVA e EVA / Capital Investido (WACC ${fmt(wacc * 100, 1)}%)`, extrasLayout);
  return { data, layout, tipo: 'estatico' };
}

function figIdxCapital() {
  const cores = obterCoresTema();
  const s = seriesReg();
  const temNopat = idxTemDados(INDICES.find(x => x.id === 'nopat'));
  const temCi = idxTemDados(INDICES.find(x => x.id === 'capital_investido'));
  if (!temCi) return null;

  const data = [];
  if (temNopat) data.push(traceLinhaIdx(s.anos, s.vals('nopat'), 'NOPAT', cores.azul));
  data.push(traceLinhaIdx(s.anos, s.vals('capital_investido'), 'Capital investido', cores.laranja));
  const todos = (temNopat ? s.vals('nopat') : []).concat(s.vals('capital_investido')).filter(v => v !== null && isFinite(v));
  const layout = obterLayoutBase('NOPAT e Capital Investido (R$ milhões)', {
    legend: legendaTopo(cores),
    xaxis: { categoryorder: 'array', categoryarray: s.anos, gridcolor: cores.grade },
    yaxis: { range: faixa(todos, 0.12, true), gridcolor: cores.grade }
  });
  return { data, layout, tipo: 'linhas' };
}

const FIGURAS_INDICES = [
  ['g-idx-ebitda', figIdxEbitda, ['ebitda']],
  ['g-idx-liquidez', figIdxLiquidez, ['lc', 'ls', 'li', 'lg']],
  ['g-idx-endiv', figIdxEndiv, ['pct', 'ipl', 'ce']],
  ['g-idx-rent', figIdxRent, ['roa', 'roe']],
  ['g-idx-eva', figIdxEva, ['eva', 'eva_ci', 'mva']],
  ['g-idx-capital', figIdxCapital, ['capital_investido']]
];
const figuraIndiceDisponivel = ids => ids.some(id => idxTemDados(INDICES.find(d => d.id === id)));

/* ==========================================================================
   Figuras da Regressão
   ========================================================================== */
function figR2() {
  const cores = obterCoresTema();
  const pa = REG().por_ano, anos = pa.map(l => 'Ano ' + l.ano);
  const layout = obterLayoutBase('Qualidade do Modelo por Ano (R²)', { showlegend: false, yaxis: { range: [0, 1], gridcolor: cores.grade } });
  return { data: [{ x: anos, y: pa.map(l => l.r2), type: 'bar', name: 'R²', marker: { color: cores.teal } }], layout, tipo: 'barras' };
}

function figCoef() {
  const cores = obterCoresTema();
  const pa = REG().por_ano, anos = pa.map(l => 'Ano ' + l.ano);
  const ex = v => pa.map(l => { const it = (l.coeficientes || []).find(x => x.variavel === v); return it ? it.coef : null; });
  const cE = ex('ebitda'), cC = ex('capex'), cD = ex('despfin');
  const layout = obterLayoutBase('Sensibilidade do Caixa aos Determinantes', {
    xaxis: { categoryorder: 'array', categoryarray: anos, gridcolor: cores.grade },
    yaxis: { range: faixa(cE.concat(cC, cD), 0.12), gridcolor: cores.grade },
    legend: legendaTopo(cores)
  });
  const lin = (y, nome, cor) => ({ x: anos, y, name: nome, mode: 'lines+markers', line: { color: cor, width: 2.5 }, marker: { size: 6, color: cor } });
  return { data: [lin(cE, 'EBITDA', cores.azul), lin(cC, 'CAPEX', cores.laranja), lin(cD, 'Desp. Fin.', cores.vermelho)], layout, tipo: 'linhas' };
}

function figRegIC() {
  const cores = obterCoresTema();
  const pa = REG().por_ano, anos = pa.map(l => 'Ano ' + l.ano);
  const c = pa.map(l => l.coeficientes.find(x => x.variavel === 'ebitda'));
  const layout = obterLayoutBase('Coeficiente do EBITDA por ano (IC 95%)', {
    showlegend: false,
    xaxis: { categoryorder: 'array', categoryarray: anos, gridcolor: cores.grade },
    yaxis: { range: faixa(c.flatMap(x => [x.ic_inf, x.ic_sup, 0, 1]), 0.1), title: 'R$ de caixa por R$ 1 de EBITDA', gridcolor: cores.grade },
    shapes: [
      { type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 0, y1: 0, line: { color: cores.linhaZero, width: 1.5 } },
      { type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 1, y1: 1, line: { color: cores.verde, width: 1.5, dash: 'dash' } }
    ],
    annotations: [{ xref: 'paper', x: 1, y: 1, text: 'lucro vira caixa 1 para 1', showarrow: false, xanchor: 'right', yanchor: 'bottom', font: { size: 10, color: cores.verde } }]
  });
  const data = [{
    x: anos,
    y: c.map(x => x.coef),
    mode: 'markers',
    marker: { size: 8, color: cores.azul },
    error_y: { type: 'data', symmetric: false, array: c.map(x => x.ic_sup - x.coef), arrayminus: c.map(x => x.coef - x.ic_inf), color: cores.azul, thickness: 1.5, width: 4 }
  }];
  return { data, layout, tipo: 'estatico' };
}

function figRegRmse() {
  const cores = obterCoresTema();
  const r = REG().agrupado.rmse_por_ano, anos = r.map(x => 'Ano ' + x.ano);
  const layout = obterLayoutBase('Erro do Modelo 3 em cada ano (RMSE, R$ mi)', {
    showlegend: false, yaxis: { range: [0, faixa(r.map(x => x.rmse), 0.12)[1]], gridcolor: cores.grade }
  });
  return { data: [{ x: anos, y: r.map(x => x.rmse), type: 'bar', marker: { color: cores.roxo } }], layout, tipo: 'barras' };
}

function figDiagRes() {
  const cores = obterCoresTema(), g = REG().diagnosticos.graficos;
  const layout = obterLayoutBase('Resíduos × valores ajustados (Modelo 3)', {
    showlegend: false, xaxis: { title: 'Valor ajustado (R$ mi)', gridcolor: cores.grade }, yaxis: { title: 'Resíduo (R$ mi)', gridcolor: cores.grade },
    shapes: [{ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 0, y1: 0, line: { color: cores.laranja, width: 1.5 } }]
  });
  return { data: [{ x: g.ajustados, y: g.residuos, mode: 'markers', marker: { size: 3, color: cores.azul, opacity: 0.35 } }], layout, tipo: 'estatico' };
}

function figDiagQQ() {
  const cores = obterCoresTema(), g = REG().diagnosticos.graficos;
  const x0 = g.qq_teorico[0], x1 = g.qq_teorico[g.qq_teorico.length - 1];
  const [media, dp] = g.qq_reta;
  const layout = obterLayoutBase('Gráfico Q-Q dos resíduos', {
    showlegend: false, xaxis: { title: 'Quantis da normal', gridcolor: cores.grade }, yaxis: { title: 'Quantis dos resíduos (R$ mi)', gridcolor: cores.grade }
  });
  return { data: [
    { x: g.qq_teorico, y: g.qq_amostra, mode: 'markers', marker: { size: 5, color: cores.azul } },
    { x: [x0, x1], y: [media + dp * x0, media + dp * x1], mode: 'lines', line: { color: cores.laranja, width: 1.5 } }
  ], layout, tipo: 'estatico' };
}

function figDiagHist() {
  const cores = obterCoresTema(), g = REG().diagnosticos.graficos;
  const layout = obterLayoutBase('Distribuição dos resíduos', {
    showlegend: false, bargap: 0.02, xaxis: { title: 'Resíduo (R$ mi)', gridcolor: cores.grade }, yaxis: { title: 'Frequência', gridcolor: cores.grade }
  });
  return { data: [{ x: g.hist_x, y: g.hist_y, type: 'bar', marker: { color: cores.azul } }], layout, tipo: 'estatico' };
}

function figValid() {
  const cores = obterCoresTema(), v = REG().validacao;
  const todos = v.previsto.concat(v.observado);
  const lim = [Math.min(...todos), Math.max(...todos)];
  const layout = obterLayoutBase('Cenários de teste: observado × previsto', {
    showlegend: false, xaxis: { title: 'Previsto (R$ mi)', gridcolor: cores.grade }, yaxis: { title: 'Observado (R$ mi)', gridcolor: cores.grade }
  });
  return { data: [
    { x: v.previsto, y: v.observado, mode: 'markers', marker: { size: 3, color: cores.azul, opacity: 0.35 } },
    { x: lim, y: lim, mode: 'lines', line: { color: cores.laranja, width: 1.5 } }
  ], layout, tipo: 'estatico' };
}

const FIGURAS_REG = [
  ['g-reg-ic', figRegIC], ['g-reg-rmse', figRegRmse], ['g-diag-res', figDiagRes],
  ['g-diag-qq', figDiagQQ], ['g-diag-hist', figDiagHist], ['g-valid', figValid]
];

function desenharRegressoes(animar = true) {
  limparTimerAnimacao('g-coef');
  const reg = resultado.regressoes;
  const cores = obterCoresTema();
  const anos = reg.por_ano.map(l => 'Ano ' + l.ano);
  const r2Valores = reg.por_ano.map(l => l.r2);

  const layoutR2 = obterLayoutBase('Qualidade do Modelo por Ano (R²)', {
    showlegend: false,
    yaxis: { range: [0, 1], gridcolor: cores.grade }
  });

  const traceR2Final = {
    x: anos,
    y: r2Valores,
    type: 'bar',
    name: 'R²',
    marker: { color: cores.teal }
  };

  if (!animar) {
    Plotly.react('g-r2', [traceR2Final], layoutR2);
  } else {
    Plotly.react('g-r2', [{
      x: anos,
      y: anos.map(() => 0),
      type: 'bar',
      name: 'R²',
      marker: { color: cores.teal }
    }], layoutR2);

    registrarAnimacaoGrafico('g-r2', () => {
      Plotly.animate('g-r2', {
        data: [{ y: r2Valores }]
      }, {
        transition: { duration: 1500, easing: 'back-out' },
        frame: { duration: 1500, redraw: false }
      });
    });
  }

  if ($('g-coef') && reg.por_ano && reg.por_ano.length > 0) {
    const extrairCoef = nomeVar => reg.por_ano.map(l => {
      const it = (l.coeficientes || []).find(x => x.variavel === nomeVar);
      return it ? it.coef : null;
    });

    const cEbitda = extrairCoef('ebitda');
    const cCapex = extrairCoef('capex');
    const cDesp = extrairCoef('despfin');

    const todosCoefs = [...cEbitda, ...cCapex, ...cDesp].filter(v => v !== null && !isNaN(v));
    const minC = Math.min(...todosCoefs);
    const maxC = Math.max(...todosCoefs);
    const margemC = Math.max(0.1, (maxC - minC) * 0.12);
    const rangeY = [minC - margemC, maxC + margemC];

    const layoutCoef = obterLayoutBase('Sensibilidade do Caixa aos Determinantes', {
      xaxis: { categoryorder: 'array', categoryarray: anos, gridcolor: cores.grade },
      yaxis: { range: rangeY, gridcolor: cores.grade },
      legend: {
        orientation: 'h',
        y: 1.05,
        yanchor: 'bottom',
        x: 0.02,
        xanchor: 'left',
        font: { color: cores.texto, size: 12, family: "'Montserrat', sans-serif" }
      }
    });

    const traceLinha = (xVals, yVals, nome, cor) => ({
      x: xVals,
      y: yVals,
      name: nome,
      mode: 'lines+markers',
      line: { color: cor, width: 2.5 },
      marker: { size: 6, color: cor }
    });

    if (!animar || anos.length <= 1) {
      Plotly.react('g-coef', [
        traceLinha(anos, cEbitda, 'EBITDA', cores.azul),
        traceLinha(anos, cCapex, 'CAPEX', cores.laranja),
        traceLinha(anos, cDesp, 'Desp. Fin.', cores.vermelho)
      ], layoutCoef);
    } else {
      Plotly.react('g-coef', [
        traceLinha([anos[0]], [cEbitda[0]], 'EBITDA', cores.azul),
        traceLinha([anos[0]], [cCapex[0]], 'CAPEX', cores.laranja),
        traceLinha([anos[0]], [cDesp[0]], 'Desp. Fin.', cores.vermelho)
      ], layoutCoef);

      registrarAnimacaoGrafico('g-coef', () => {
        let passo = 1;
        const totalPassos = anos.length;
        timersAnimacao['g-coef'] = setInterval(() => {
          if (passo >= totalPassos) {
            limparTimerAnimacao('g-coef');
            Plotly.react('g-coef', [
              traceLinha(anos, cEbitda, 'EBITDA', cores.azul),
              traceLinha(anos, cCapex, 'CAPEX', cores.laranja),
              traceLinha(anos, cDesp, 'Desp. Fin.', cores.vermelho)
            ], layoutCoef);
            return;
          }

          const sliceX = anos.slice(0, passo + 1);
          Plotly.animate('g-coef', {
            data: [
              { x: sliceX, y: cEbitda.slice(0, passo + 1) },
              { x: sliceX, y: cCapex.slice(0, passo + 1) },
              { x: sliceX, y: cDesp.slice(0, passo + 1) }
            ]
          }, {
            transition: { duration: 130, easing: 'cubic-in-out' },
            frame: { duration: 130, redraw: false }
          });

          passo++;
        }, 150);
      });
    }
  }

  if (typeof desenharDetalheRegressao === 'function') {
    desenharDetalheRegressao(animar);
  }
}
