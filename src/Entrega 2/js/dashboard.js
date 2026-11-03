function calcularRiscos() {
  const d = resultado.dados;
  const cont = {};
  for (let i = 0; i < d.n.length; i++) {
    const n = d.n[i];
    if (!cont[n]) cont[n] = { total: 0, caixaNeg: 0, saldoNeg: 0 };
    cont[n].total++;
    if (d.caixa[i] < 0) cont[n].caixaNeg++;
    if (d.saldo_final[i] < 0) cont[n].saldoNeg++;
  }
  riscos = {};
  Object.keys(cont).forEach(n => {
    riscos[n] = {
      caixaNeg: cont[n].caixaNeg / cont[n].total,
      saldoNeg: cont[n].saldoNeg / cont[n].total
    };
  });
}

function avaliar(ano) {
  const l = resultado.por_ano.find(x => x.ano === Number(ano));
  const r = riscos[ano];
  const ant = resultado.por_ano.find(x => x.ano === Number(ano) - 1);
  const itens = [];

  const vRec = ant ? l.receita / ant.receita - 1 : null;
  itens.push({
    id: 'receita',
    nome: 'Receita média',
    valor: 'R$ ' + fmt(l.receita, 0) + ' mi',
    info: 'Faturamento bruto/líquido médio apurado nos cenários simulados para o ano.',
    status: vRec === null ? 'neutro' : (vRec >= 0 ? 'bom' : 'ruim'),
    motivo: vRec === null ? 'Sem comparação' : (vRec >= 0 ? 'Subiu ' : 'Caiu ') + Math.abs(vRec * 100).toFixed(1) + '%'
  });

  const vEbi = ant ? l.ebitda / ant.ebitda - 1 : null;
  itens.push({
    id: 'ebitda',
    nome: 'EBITDA médio',
    valor: 'R$ ' + fmt(l.ebitda, 0) + ' mi',
    info: 'Fôlego operacional recalculado: Resultado Operacional (EBIT) + |Depreciação e Amortização|.',
    formula: 'ebit + abs(depreciacao)',
    status: vEbi === null ? 'neutro' : (vEbi >= 0 ? 'bom' : 'ruim'),
    motivo: vEbi === null ? 'Sem comparação' : (vEbi >= 0 ? 'Subiu ' : 'Caiu ') + Math.abs(vEbi * 100).toFixed(1) + '%'
  });

  itens.push({
    id: 'caixa',
    nome: 'Geração de caixa',
    valor: 'R$ ' + fmt(l.caixa, 0) + ' mi',
    info: 'Geração de caixa operacional líquida média apurada nos fluxos financeiros.',
    status: l.caixa > 0 ? (r.caixaNeg > 0.1 ? 'atencao' : 'bom') : 'ruim',
    motivo: l.caixa > 0 ? (r.caixaNeg > 0.1 ? 'Risco alto' : 'Saudável') : 'Média negativa'
  });

  itens.push({
    id: 'conversao',
    nome: 'Conversão',
    valor: fmt(l.conversao, 2),
    info: 'Índice de Conversão (ICC) = Caixa / Lucro Líquido. Mede quantos centavos viram caixa por R$ 1 de lucro (Saudável ≥ 0,50).',
    formula: 'caixa / lucro_liquido',
    status: l.conversao > 0.5 ? 'bom' : 'atencao',
    motivo: l.conversao > 0.5 ? 'Conversão OK' : 'Conversão baixa'
  });

  itens.push({
    id: 'risco',
    nome: 'Risco de déficit',
    valor: (r.caixaNeg * 100).toFixed(1) + '%',
    info: 'Probabilidade de Caixa < 0 nos cenários simulados. Mede o risco de fechar o ano no vermelho.',
    formula: '(cenarios_caixa_neg / total) * 100',
    status: r.caixaNeg < 0.05 ? 'bom' : (r.caixaNeg < 0.2 ? 'atencao' : 'ruim'),
    motivo: r.caixaNeg < 0.05 ? 'Baixo' : 'Alerta'
  });

  (resultado.campos_extras || []).forEach(extra => {
    const valAtual = l[extra.id];
    const valAnt = ant ? ant[extra.id] : null;
    const variacao = (valAnt !== null && valAnt !== undefined && valAnt !== 0 && valAtual !== null && valAtual !== undefined)
      ? (valAtual / Math.abs(valAnt) - (valAnt > 0 ? 1 : -1))
      : null;
    const textoValor = valAtual === null || valAtual === undefined
      ? 'n/d'
      : (extra.dividir_milhao ? 'R$ ' + fmt(valAtual, 1) + ' mi' : fmt(valAtual, 2));

    let infoDesc = '';
    if (extra.tipo === 'formula') {
      infoDesc = `Fórmula utilizada: ${extra.formula}`;
    } else {
      infoDesc = `Conta do CSV: ${extra.conta_csv}${extra.dividir_milhao ? ' (dividido por 1 milhão)' : ''}`;
    }

    itens.push({
      id: extra.id,
      nome: extra.nome,
      valor: textoValor,
      info: infoDesc,
      formula: extra.tipo === 'formula' ? extra.formula : null,
      status: variacao === null ? 'neutro' : (variacao >= 0 ? 'bom' : 'atencao'),
      motivo: variacao === null
        ? (extra.tipo === 'formula' ? `Fórmula: ${extra.formula}` : 'Campo personalizado')
        : (variacao >= 0 ? 'Subiu ' : 'Caiu ') + Math.abs(variacao * 100).toFixed(1) + '%'
    });
  });

  if (typeof itensIndicesAno === 'function') {
    itensIndicesAno(ano).forEach(i => itens.push(i));
  }

  return itens;
}

let kpiTimeouts = [];
function limparKpiTimeouts() {
  kpiTimeouts.forEach(t => clearTimeout(t));
  kpiTimeouts = [];
}

function desenharKpis(animar = true) {
  limparKpiTimeouts();
  const selAno = $('filtro-ano');
  if (!selAno) return;
  const ano = selAno.value;
  const itens = avaliar(ano);
  const cont = { bom: 0, atencao: 0, ruim: 0 };
  itens.forEach(i => { if (cont[i.status] !== undefined) cont[i.status]++; });

  const resumoEl = $('resumo-ano');
  if (resumoEl) {
    resumoEl.innerHTML = `Ano ${ano}: <span class="chip ruim">${cont.ruim} problemas</span> <span class="chip atencao">${cont.atencao} alertas</span> <span class="chip bom">${cont.bom} ok</span>`;
  }

  const containerKpis = $('kpis');
  if (!containerKpis) return;

  const classeAnim = animar ? 'animar-entrada-card' : '';
  containerKpis.innerHTML = itens.map(i => {
    const temInfo = Boolean(i.info || i.formula);
    const tooltipConteudo = i.formula
      ? `Fórmula utilizada:<br><code>${esc(i.formula)}</code>${i.info && i.info !== i.formula ? `<br>${esc(i.info)}` : ''}`
      : esc(i.info || '');
    return `
    <div class="kpi ${i.status} ${classeAnim}">
      <div class="kpi-topo">
        <span class="selo ${i.status}">${ROTULO_STATUS[i.status]}</span>
        ${temInfo ? `
        <span class="kpi-info-btn" tabindex="0" title="${esc(i.info || '')}">
          ⓘ
          <span class="kpi-tooltip">${tooltipConteudo}</span>
        </span>` : ''}
      </div>
      <div class="nome">${esc(i.nome)}</div>
      <div class="valor">${esc(i.valor)}</div>
      <div class="motivo">${esc(i.motivo)}</div>
      ${i.formula ? `<div class="tag-formula-utilizada" title="Fórmula utilizada: ${esc(i.formula)}">fx: ${esc(i.formula)}</div>` : ''}
    </div>
  `;
  }).join('');

  if (!animar) return;

  registrarAnimacaoGrafico('kpis', () => {
    limparKpiTimeouts();
    const cards = containerKpis.querySelectorAll('.kpi.animar-entrada-card');
    cards.forEach((card, index) => {
      const t = setTimeout(() => {
        card.classList.add('ativo');
      }, index * 95);
      kpiTimeouts.push(t);
    });
  });
}

let mapaTimeouts = [];
function limparMapaTimeouts() {
  mapaTimeouts.forEach(t => clearTimeout(t));
  mapaTimeouts = [];
}

function desenharMapa(animar = true) {
  limparMapaTimeouts();
  const anos = resultado.resumo.anos;
  const idsIndices = indicesDisponiveis() ? itensIndicesAno(anos[0]).map(i => i.id) : [];
  const ids = ['receita', 'ebitda', 'caixa', 'conversao', 'risco'].concat(idsIndices);
  const porAno = {};
  anos.forEach(a => { porAno[a] = avaliar(a); });

  const classeAnim = animar ? 'animar-entrada-linha' : '';

  let html = `<tr class="${classeAnim}"><th>Indicador</th>` + anos.map(a => `<th>${a}</th>`).join('') + '</tr>';
  ids.forEach(id => {
    const itemRef = (porAno[anos[0]] || []).find(i => i.id === id);
    if (!itemRef) return;
    const nome = itemRef.nome;
    const temInfo = Boolean(itemRef.info || itemRef.formula);
    const tooltipConteudo = itemRef.formula
      ? `Fórmula utilizada:<br><code>${esc(itemRef.formula)}</code>${itemRef.info && itemRef.info !== itemRef.formula ? `<br>${esc(itemRef.info)}` : ''}`
      : esc(itemRef.info || '');
    const infoIcone = temInfo ? `
      <span class="kpi-info-btn mapa-info-btn" tabindex="0" title="${esc(itemRef.info || '')}">
        ⓘ
        <span class="kpi-tooltip tooltip-esquerda">${tooltipConteudo}</span>
      </span>` : '';
    html += `<tr class="${classeAnim}"><td><div class="nome-com-info-tabela"><span>${esc(nome)}</span>${infoIcone}</div></td>` + anos.map(a => {
      const it = (porAno[a] || []).find(i => i.id === id) || { status: 'neutro', motivo: 'N/D' };
      return `<td class="c ${it.status}" title="${esc(it.motivo)}">${it.status === 'bom' ? '✓' : (it.status === 'ruim' ? '✕' : (it.status === 'neutro' ? '–' : '!'))}</td>`;
    }).join('') + '</tr>';
  });

  const tabela = $('t-mapa');
  if (!tabela) return;
  tabela.innerHTML = html;

  if (!animar) return;

  registrarAnimacaoGrafico('t-mapa', () => {
    limparMapaTimeouts();
    const linhas = tabela.querySelectorAll('tr.animar-entrada-linha');
    linhas.forEach((linha, index) => {
      const t = setTimeout(() => {
        linha.classList.add('ativo');
      }, index * 85);
      mapaTimeouts.push(t);
    });
  });
}

function gerarAchados() {
  const t = resultado.por_ano;
  const regulares = t.filter(l => l.ano <= 11);
  const achados = [];

  const anosCaixaNeg = regulares.filter(l => l.caixa <= 0).map(l => l.ano);
  const conversoes = regulares.filter(l => l.conversao !== null && l.lucro_liquido > 0);
  const maxConv = conversoes.length ? conversoes.reduce((m, l) => (l.conversao > m.conversao ? l : m), conversoes[0]) : { ano: 'n/d', conversao: 0 };
  const mediaConv = conversoes.length ? conversoes.reduce((s, l) => s + l.conversao, 0) / conversoes.length : 0;
  const lucroTotal = regulares.reduce((s, l) => s + l.lucro_liquido, 0);
  const caixaTotal = regulares.reduce((s, l) => s + l.caixa, 0);
  const razao = lucroTotal > 0 ? caixaTotal / lucroTotal : null;
  const baixa = razao !== null && razao < LIMITES.conversaoBoa;
  achados.push({
    tipo: baixa ? 'ruim' : 'bom',
    titulo: baixa ? 'O lucro contábil não se transforma em caixa' : 'O lucro contábil se converte em caixa em nível aceitável',
    texto: 'Somando os anos 1 a 11, o resultado líquido médio acumulado é de R$ ' + fmt(lucroTotal, 0) + ' mi e a geração de caixa acumulada é de R$ ' + fmt(caixaTotal, 0) +
      ' mi, ou seja, R$ ' + fmt(razao, 2) + ' de caixa para cada R$ 1,00 de lucro. A conversão média anual é ' + fmt(mediaConv, 2) + ' e o melhor ano (Ano ' + maxConv.ano + ') chega a ' + fmt(maxConv.conversao, 2) + '. ' +
      (baixa ? 'Olhar só o lucro faz a empresa parecer mais saudável do que o caixa mostra.' : 'O lucro é um bom retrato do caixa neste conjunto de dados.')
  });

  if (anosCaixaNeg.length) {
    achados.push({
      tipo: 'ruim',
      titulo: 'Anos em que a empresa consome caixa em média',
      texto: 'Nos anos ' + anosCaixaNeg.join(', ') + ' a geração de caixa média é negativa. Nesses anos é preciso ter reserva ou financiamento para fechar as contas.'
    });
  }

  const piorRisco = Object.keys(riscos).map(Number).filter(a => a <= 11).sort((a, b) => riscos[b].caixaNeg - riscos[a].caixaNeg)[0];
  if (piorRisco !== undefined && riscos[piorRisco].caixaNeg > 0) {
    achados.push({
      tipo: riscos[piorRisco].caixaNeg >= LIMITES.riscoCaixaAlto ? 'ruim' : 'atencao',
      titulo: 'Ano de maior risco de caixa negativo',
      texto: 'O Ano ' + piorRisco + ' tem caixa negativo em ' + fmt(riscos[piorRisco].caixaNeg * 100, 0) + '% dos cenários simulados.'
    });
  }

  const ag = resultado.regressoes.agrupado;
  if (ag) {
    const c = nome => ag.coeficientes.find(x => x.variavel === nome).coef;
    const explicaPouco = ag.r2_modelo1 < 0.5;
    achados.push({
      tipo: 'info',
      titulo: explicaPouco ? 'EBITDA sozinho explica pouco do caixa' : 'EBITDA explica boa parte do caixa, mas não tudo',
      texto: 'Considerando só o EBITDA, o R² dos anos 1 a 11 é ' + fmt(ag.r2_modelo1, 2) + '. No modelo completo, o R² interno é ' + fmt(ag.r2_interno, 2) + '.'
    });
    const efeito = v => (v >= 0 ? 'aumenta em R$ ' : 'reduz em R$ ') + fmt(Math.abs(v), 2);
    achados.push({
      tipo: 'info',
      titulo: 'Pesos no caixa',
      texto: 'Cada R$ 1,00 a mais de EBITDA ' + efeito(c('ebitda')) + ' o caixa; cada R$ 1,00 a mais de CAPEX ' + efeito(c('capex')) +
        '; e cada R$ 1,00 a mais de despesa financeira ' + efeito(c('despfin')) + '.'
    });
  }

  if (typeof achadosIndices === 'function') {
    achados.push(...achadosIndices());
  }

  const ult = t[t.length - 1];
  if (ult && ult.ano === 12) {
    achados.push({
      tipo: 'atencao',
      titulo: 'O Ano 12 não é comparável aos demais',
      texto: 'O Ano 12 é o encerramento da concessão e possui dinâmicas financeiras diferentes dos anos anteriores.'
    });
  }
  return achados;
}

let achadosTimeouts = [];
function limparAchadosTimeouts() {
  achadosTimeouts.forEach(t => clearTimeout(t));
  achadosTimeouts = [];
}

function desenharAchados(animar = true) {
  limparAchadosTimeouts();
  const achados = gerarAchados();
  const conteiner = $('achados');
  if (!conteiner) return;

  const badgeAchados = $('badge-total-achados');
  if (badgeAchados) {
    badgeAchados.textContent = `${achados.length} conclusões`;
  }

  const classeAnim = animar ? 'animar-entrada-cima' : '';

  conteiner.innerHTML = achados.map(a =>
    `<div class="achado ${a.tipo} ${classeAnim}"><h3>${esc(a.titulo)}</h3><p>${esc(a.texto)}</p></div>`
  ).join('');

  textoAchados = '# Conclusões da análise\n\n' +
    achados.map(a => '## ' + a.titulo + '\n\n' + a.texto + '\n').join('\n');

  const btnBaixar = $('baixar-relatorio');
  if (btnBaixar) {
    btnBaixar.onclick = () => {
      const blob = new Blob([textoAchados], { type: 'text/markdown' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'conclusoes.md';
      a.click();
    };
  }

  const detalhesAchados = $('detalhes-achados');
  if (detalhesAchados && !detalhesAchados._configurado) {
    detalhesAchados._configurado = true;
    detalhesAchados.addEventListener('toggle', () => {
      if (detalhesAchados.open) {
        const cards = conteiner.querySelectorAll('.achado.animar-entrada-cima');
        cards.forEach((card, index) => {
          setTimeout(() => card.classList.add('ativo'), index * 60);
        });
      }
    });
    const infoBtn = detalhesAchados.querySelector('.resumo-secao-dropdown .kpi-info-btn');
    if (infoBtn) {
      infoBtn.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
      });
    }
  }

  if (!animar) {
    conteiner.querySelectorAll('.achado.animar-entrada-cima').forEach(c => c.classList.add('ativo'));
    return;
  }

  registrarAnimacaoGrafico('achados', () => {
    limparAchadosTimeouts();
    const cards = conteiner.querySelectorAll('.achado.animar-entrada-cima');
    cards.forEach((card, index) => {
      const t = setTimeout(() => {
        card.classList.add('ativo');
      }, index * 90);
      achadosTimeouts.push(t);
    });
  });
}

/* ==========================================================================
   Índices Financeiros: Tabelas, Notas, Cartões e Seção
   ========================================================================== */
function tabelaIndices() {
  const linhas = indicesPorAno();
  const cab = ['Indicador'].concat(linhas.map(l => String(l.ano)));
  const corpo = [];
  let grupoAtual = null;
  indicesAtivos().forEach(def => {
    if (def.grupo && def.grupo !== grupoAtual) { grupoAtual = def.grupo; corpo.push({ grupo: def.grupo }); }
    let nome = def.nome;
    if (['eva', 'eva_ci', 'mva'].includes(def.id)) nome += ` · WACC ${fmt(wacc * 100, 1)}%`;
    corpo.push({ nome, celulas: linhas.map(l => fmtIdx(def, l)) });
  });
  return { cab, corpo };
}

function notasIndices() {
  const notas = [
    'Cada índice usa a média dos cenários de cada ano (razão das médias), como no relatório de Contabilidade e Finanças.',
    'Passivo circulante, exigível a longo prazo, patrimônio líquido e empréstimos vêm com sinal negativo no arquivo (natureza credora); os índices usam o valor absoluto da média.',
    `NOPAT = Resultado operacional × (1 − alíquota). Alíquota: ${resultado.indices.origem_aliquota}. Capital investido = Patrimônio líquido + Empréstimos. EVA = NOPAT − WACC × Capital investido. MVA aproximado = EVA ÷ WACC (perpetuidade).`,
    'Liquidez seca: estoques ausentes em um ano são tratados como zero.'
  ];
  if (resultado.resumo.anos.includes(ANO_ENCERRAMENTO)) {
    notas.push(`Ano ${ANO_ENCERRAMENTO} (encerramento da concessão): contas como patrimônio líquido e exigível a longo prazo deixam de existir, então LG, PCT, CE, IPL, ROE, EVA e MVA ficam N/D. O ROA aparece como n/c (não comparável) porque o total do ativo é quase zero. Os demais valores desse ano não são comparáveis aos anos 1 a ${ANO_ENCERRAMENTO - 1}.`);
  }
  return notas;
}

function cartoesIndices() {
  if (!indicesDisponiveis()) return [];
  const L = indicesPorAno();
  const reg = L.filter(l => l.ano < ANO_ENCERRAMENTO);
  if (!reg.length) return [];
  const pri = reg[0], ult = reg[reg.length - 1];
  const serie = id => reg.map(l => ({ ano: l.ano, v: l[id] })).filter(x => tem(x.v));
  const extremo = (id, max) => { const s = serie(id); return s.length ? s.reduce((m, x) => (max ? x.v > m.v : x.v < m.v) ? x : m, s[0]) : null; };
  const out = [];

  let t = 'O que é: EBITDA = Resultado operacional + Depreciação e amortização. É uma aproximação do que a operação gera antes de juros, impostos e desgaste do ativo. A margem EBITDA mostra quanto de cada R$ 1,00 de receita sobra da operação.';
  if (tem(pri.margem_ebitda) && tem(ult.margem_ebitda)) {
    t += `\nNos dados: a margem EBITDA vai de ${fmtPct(pri.margem_ebitda)} (Ano ${pri.ano}) para ${fmtPct(ult.margem_ebitda)} (Ano ${ult.ano}) e o EBITDA médio de R$ ${fmt(pri.ebitda, 0)} mi para R$ ${fmt(ult.ebitda, 0)} mi.`;
  }
  const div = resultado.por_ano.map(x => x.divergencia_ebitda).filter(tem);
  if (div.length) t += ` O EBITDA que vem pronto no arquivo difere do recalculado em ${fmt(Math.min(...div) * 100, 1)}% a ${fmt(Math.max(...div) * 100, 1)}% conforme o ano; usamos sempre o recalculado, que pode ser conferido com a DRE.`;
  out.push({ tipo: tem(ult.margem_ebitda) && ult.margem_ebitda >= pri.margem_ebitda ? 'bom' : 'atencao', titulo: 'EBITDA e Margem EBITDA', texto: t });

  const sLc = serie('lc');
  const sLs = serie('ls');
  const sLi = serie('li');
  const sLg = serie('lg');
  if (sLc.length || sLs.length || sLi.length || sLg.length) {
    let tLiq = 'O que é: LC = Ativo circulante ÷ Passivo circulante. LS tira os estoques do ativo. LI usa só o disponível. LG inclui também o longo prazo: (Ativo circulante + Realizável a LP) ÷ (Passivo circulante + Exigível a LP). Acima de 1,0 a empresa cobre o que vence com o que tem; abaixo, depende de novas entradas de caixa ou de refinanciamento (1,0 é uma referência usual, não uma regra absoluta).';
    let detalhes = [];
    if (sLc.length) {
      const piorLc = extremo('lc', false);
      detalhes.push(`a LC vai de ${fmt(sLc[0].v, 2)} (Ano ${sLc[0].ano}) para ${fmt(sLc[sLc.length - 1].v, 2)} (Ano ${sLc[sLc.length - 1].ano}), com ponto mais baixo de ${fmt(piorLc.v, 2)} no Ano ${piorLc.ano}`);
    }
    if (sLg.length) {
      const ultLg = sLg[sLg.length - 1];
      detalhes.push(`a LG fica em ${fmt(ultLg.v, 2)} no Ano ${ultLg.ano}${ultLg.v < 1 ? ' (os ativos totais a receber não cobririam todas as obrigações)' : ''}`);
    }
    if (detalhes.length) tLiq += '\nNos dados: ' + detalhes.join('; ') + '.';
    const tipo = sLc.length ? (sLc[sLc.length - 1].v >= 1 ? 'bom' : (sLc[sLc.length - 1].v >= 0.5 ? 'atencao' : 'ruim')) : 'info';
    out.push({ tipo, titulo: 'Liquidez (LC, LS, LI, LG)', texto: tLiq });
  }

  const sPct = serie('pct');
  const sCe = serie('ce');
  const sIpl = serie('ipl');
  if (sPct.length || sCe.length || sIpl.length) {
    let tEndiv = 'O que é: PCT = (Passivo circulante + Exigível a LP) ÷ Patrimônio líquido, ou seja, quantos reais de obrigações existem para cada R$ 1,00 de capital próprio. CE = Passivo circulante ÷ (Passivo circulante + Exigível a LP): a fatia da dívida que vence no curto prazo. IPL = Ativo permanente ÷ Patrimônio líquido: quanto do capital próprio está preso em ativo fixo.';
    let detalhes = [];
    if (sPct.length) {
      const pico = extremo('pct', true);
      const ultPct = sPct[sPct.length - 1];
      detalhes.push(`o PCT chega ao pico de ${fmt(pico.v, 2)}x no Ano ${pico.ano} e termina em ${fmt(ultPct.v, 2)}x no Ano ${ultPct.ano}`);
    }
    if (sCe.length >= 2) {
      const priCe = sCe[0], ultCe = sCe[sCe.length - 1];
      detalhes.push(`a composição do endividamento vai de ${fmtPct(priCe.v)} para ${fmtPct(ultCe.v)}: ${ultCe.v > priCe.v ? 'a dívida está ficando mais concentrada no curto prazo' : 'a dívida está ficando menos concentrada no curto prazo'}`);
    }
    if (detalhes.length) tEndiv += '\nNos dados: ' + detalhes.join('; ') + '.';
    const tipo = (sCe.length >= 2 && sCe[sCe.length - 1].v > sCe[0].v) ? 'atencao' : 'info';
    out.push({ tipo, titulo: 'Endividamento (PCT, CE, IPL)', texto: tEndiv });
  }

  const sRoa = serie('roa');
  const sRoe = serie('roe');
  if (sRoa.length || sRoe.length) {
    let tRent = 'O que é: ROA = Resultado líquido ÷ Total do ativo (retorno de tudo que a empresa tem). ROE = Resultado líquido ÷ Patrimônio líquido (retorno do capital próprio, inflado por dívida). Margem líquida = Resultado líquido ÷ Receita. Margem operacional = Resultado operacional ÷ Receita.';
    let detalhes = [];
    if (sRoa.length >= 2) {
      detalhes.push(`o ROA vai de ${fmtPct(sRoa[0].v)} para ${fmtPct(sRoa[sRoa.length - 1].v)}`);
    }
    if (sRoe.length) {
      const picoRoe = extremo('roe', true);
      const ultRoe = sRoe[sRoe.length - 1];
      detalhes.push(`o ROE tem pico de ${fmtPct(picoRoe.v)} no Ano ${picoRoe.ano} e termina em ${fmtPct(ultRoe.v)}`);
    }
    if (tem(pri.margem_liquida) && tem(ult.margem_liquida)) {
      detalhes.push(`a margem líquida vai de ${fmtPct(pri.margem_liquida)} para ${fmtPct(ult.margem_liquida)}`);
    }
    if (detalhes.length) tRent += '\nNos dados: ' + detalhes.join('; ') + '.';
    if (sRoa.length >= 2 && sRoa[sRoa.length - 1].v > sRoa[0].v) {
      tRent += ' Atenção: parte da alta do ROA pode vir de um total do ativo que encolhe, e não só de uma operação mais lucrativa.';
    }
    out.push({ tipo: 'info', titulo: 'Rentabilidade (ROA, ROE, margens)', texto: tRent.trim() });
  }

  const evas = serie('eva');
  if (evas.length) {
    const positivos = evas.filter(x => x.v > 0).length;
    let tEva = `O que é: NOPAT é o resultado operacional depois do imposto. Capital investido = Patrimônio líquido + Empréstimos. EVA = NOPAT − WACC × Capital investido: o que sobra depois de remunerar o capital pelo custo mínimo exigido (WACC, hoje ${fmt(wacc * 100, 1)}% ao ano). EVA positivo significa que a empresa cria valor econômico, e não só lucro contábil. O MVA aproximado é o EVA ÷ WACC (valor presente do EVA como perpetuidade).`;
    tEva += `\nNos dados: o EVA é positivo em ${positivos} de ${evas.length} anos comparáveis.`;
    const sEvaCi = serie('eva_ci');
    if (sEvaCi.length >= 2) {
      const priCi = sEvaCi[0], ultCi = sEvaCi[sEvaCi.length - 1];
      tEva += ` A relação EVA ÷ Capital investido vai de ${fmtPct(priCi.v)} para ${fmtPct(ultCi.v)}${ultCi.v < priCi.v ? ': a empresa continua criando valor, mas cada real novo de capital rende proporcionalmente menos' : ''}.`;
    }
    out.push({ tipo: positivos === evas.length ? 'bom' : (positivos === 0 ? 'ruim' : 'atencao'), titulo: 'Valor econômico (NOPAT, EVA, MVA)', texto: tEva });
  }
  return out;
}

function achadosIndices() {
  const cartoes = cartoesIndices();
  return cartoes.map(c => ({ tipo: c.tipo, titulo: c.titulo, texto: c.texto.split('\n').slice(1).join(' ').replace(/^Nos dados: /, '') }))
    .filter(a => a.texto);
}

function desenharIndices(animar = true) {
  const secao = $('s-indices');
  if (!secao) return;
  if (!indicesDisponiveis()) {
    secao.classList.add('oculto');
    FIGURAS_INDICES.forEach(([id]) => {
      const el = $(id);
      if (el) { el.classList.add('oculto'); Plotly.purge(id); }
    });
    return;
  }
  secao.classList.remove('oculto');

  const temWaccIndices = ['eva', 'eva_ci', 'mva'].some(id => idxTemDados(INDICES.find(d => d.id === id)));
  const divFiltrosWacc = $('filtros-wacc');
  if (divFiltrosWacc) divFiltrosWacc.classList.toggle('oculto', !temWaccIndices);

  const aviso = $('aviso-indices');
  if (aviso) { aviso.innerHTML = ''; aviso.classList.add('oculto'); }

  const t = tabelaIndices();
  const wrapTIndices = $('wrap-t-indices');
  if (wrapTIndices) wrapTIndices.classList.toggle('oculto', t.corpo.length === 0);
  if (t.corpo.length > 0) {
    $('t-indices').innerHTML = '<tr>' + t.cab.map(c => `<th>${esc(c)}</th>`).join('') + '</tr>' +
      t.corpo.map(l => l.grupo
        ? `<tr class="grupo"><td colspan="${t.cab.length}">${esc(l.grupo)}</td></tr>`
        : `<tr><td>${esc(l.nome)}</td>${l.celulas.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
  }

  const notas = notasIndices();
  const notaEl = $('nota-indices');
  if (notaEl) {
    notaEl.classList.toggle('oculto', notas.length === 0);
    notaEl.innerHTML = notas.map(n => `<p>${esc(n)}</p>`).join('');
  }

  let graficosVisiveis = 0;
  FIGURAS_INDICES.forEach(([id, fn, ids]) => {
    const el = $(id);
    if (!el) return;
    const ok = figuraIndiceDisponivel(ids);
    if (ok) {
      const fig = fn();
      if (fig && fig.data && fig.data.length > 0) {
        el.classList.remove('oculto');
        plotarFig(id, fig, animar);
        graficosVisiveis++;
        return;
      }
    }
    el.classList.add('oculto');
    Plotly.purge(id);
  });

  const gradeIndices = $('grade-indices');
  if (gradeIndices) {
    gradeIndices.classList.toggle('oculto', graficosVisiveis === 0);
  }

  const cartoes = cartoesIndices();
  const detalhesIndices = $('detalhes-leitura-indices');
  if (detalhesIndices) {
    detalhesIndices.classList.toggle('oculto', cartoes.length === 0);
    if (!detalhesIndices._configurado) {
      detalhesIndices._configurado = true;
      const infoBtn = detalhesIndices.querySelector('.resumo-secao-dropdown .kpi-info-btn');
      if (infoBtn) {
        infoBtn.addEventListener('click', e => {
          e.stopPropagation();
          e.preventDefault();
        });
      }
    }
  }
  const badgeIndices = $('badge-total-indices');
  if (badgeIndices) {
    badgeIndices.textContent = `${cartoes.length} grupos`;
  }
  const divLeitura = $('leitura-indices');
  if (divLeitura) {
    divLeitura.classList.toggle('oculto', cartoes.length === 0);
    divLeitura.innerHTML = cartoes.length ? htmlCartoes(cartoes) : '';
  }
}

function configurarWacc() {
  const campo = $('entrada-wacc');
  if (!campo) return;
  campo.value = fmt(wacc * 100, 1);
  const aplicar = () => {
    const n = parseFloat(String(campo.value).replace('%', '').replace(',', '.'));
    if (!isFinite(n) || n <= 0 || n > 100) { campo.value = fmt(wacc * 100, 1); return; }
    wacc = n / 100;
    campo.value = fmt(wacc * 100, 1);
    if (resultado) {
      desenharIndices(false);
      desenharKpis(false);
      desenharMapa(false);
      desenharAchados(false);
    }
  };
  campo.onchange = aplicar;
  campo.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); aplicar(); } };
  const btnPadrao = $('btn-wacc-padrao');
  if (btnPadrao) {
    btnPadrao.onclick = () => { campo.value = '8,0'; aplicar(); };
  }
}

/* ==========================================================================
   Regressão Linear e Diagnósticos
   ========================================================================== */
const REG = () => resultado.regressoes;

const GLOSSARIO_REG = [
  ['R²', 'Parcela (de 0 a 1) da variação do caixa entre cenários que o modelo explica. R² = 0,60 quer dizer que o modelo explica 60% das diferenças; os outros 40% vêm de fatores que ficaram fora do modelo. Perto de 1 o ajuste é muito bom; perto de 0 a variável quase não explica nada.'],
  ['R² ajustado', 'R² corrigido pelo número de variáveis. Só sobe se a variável nova ajuda de verdade, por isso serve para comparar modelos com quantidades diferentes de variáveis.'],
  ['R² interno (within)', 'No Modelo 3, mede quanto o modelo explica além da média de cada ano. É o número mais honesto: o R² total é inflado porque o caixa médio muda muito de um ano para o outro, e isso o modelo "acerta" só pelo efeito de ano.'],
  ['Coeficiente', 'Quantos reais o caixa muda, em média, quando a variável sobe R$ 1,00, mantendo as outras constantes. Coeficiente do EBITDA perto de 1 significaria lucro virando caixa quase 1 para 1; entre 0 e 1, só parte do lucro vira caixa; negativo, mais EBITDA vem acompanhado de menos caixa.'],
  ['Erro-padrão robusto', 'Mede a incerteza do coeficiente. Usamos erros robustos (HC3) nos modelos por ano e erros agrupados por cenário no Modelo 3, porque os resíduos não têm variância constante e o mesmo cenário aparece em vários anos.'],
  ['p-valor', 'Probabilidade de observar um coeficiente tão distante de zero se, na verdade, a variável não tivesse efeito. p < 0,05 costuma ser lido como "estatisticamente significativo". Com p alto não dá para distinguir o efeito de zero. Significativo não é o mesmo que importante: olhe também o tamanho do coeficiente.'],
  ['IC 95%', 'Faixa em que o coeficiente verdadeiro deve estar, com 95% de confiança. Se a faixa inclui o zero, o efeito pode ser nulo. Faixa estreita significa estimativa precisa.'],
  ['RMSE', 'Erro típico do modelo, na mesma unidade do caixa (R$ milhões). RMSE de 90 quer dizer que as previsões erram, em média, cerca de R$ 90 milhões para mais ou para menos. Compare com o tamanho do caixa para julgar se é muito ou pouco.'],
  ['Efeito de +1 DP', 'Quanto o caixa muda (R$ mi) quando a variável sobe um desvio-padrão dentro do ano. Permite comparar a força das variáveis mesmo com escalas diferentes (EBITDA e CAPEX, por exemplo).'],
  ['VIF', 'Mede se duas variáveis explicativas carregam a mesma informação (multicolinearidade). VIF perto de 1 é ótimo; acima de 5 merece atenção; acima de 10 é problema, pois os coeficientes ficam instáveis.'],
  ['Breusch-Pagan', 'Testa se o erro do modelo varia igualmente em todos os níveis (variância constante). Com p < 0,05 a variância muda, os erros-padrão comuns ficam errados e por isso usamos os robustos.'],
  ['Jarque-Bera, assimetria e curtose', 'Testam se os erros têm formato de sino (distribuição normal). Curtose alta indica caudas pesadas: erros grandes aparecem mais do que o esperado. Com muitos dados os coeficientes continuam confiáveis, mas previsões individuais pedem cautela.'],
  ['Distância de Cook', 'Mede quanto uma única observação puxa o modelo. Pontos acima de 4/N são os mais influentes e merecem ser olhados.'],
  ['Validação em cenários novos', 'O modelo é ajustado em 70% dos cenários e testado nos 30% restantes. Se o erro no teste for parecido com o do treino, o modelo generaliza bem.']
];

function cartoesIntroReg() {
  return [
    { tipo: 'info', titulo: 'A pergunta', texto: 'O lucro operacional vira caixa? A regressão linear mede quanto da Geração de Caixa dos cenários simulados é explicada pelo EBITDA e por outros itens do fluxo de caixa. Ela mostra associação média entre as variáveis nos dados simulados; não prova causa e efeito.' },
    { tipo: 'info', titulo: 'Os modelos', texto: 'Modelo 1: Caixa ~ EBITDA, o teste direto da tese.\nModelo 2: Caixa ~ EBITDA + CAPEX + Despesas financeiras, um para cada ano (compara cenários do mesmo ano).\nModelo 3: os anos 1 a 11 juntos, com efeito fixo de ano e erros agrupados por cenário.\nAno 12: modelo separado, porque é o encerramento da concessão e a Distribuição ao acionista passa a variar entre cenários.' },
    { tipo: 'info', titulo: 'Unidades e sinais', texto: 'Valores em R$ milhões. CAPEX, despesas financeiras e distribuição entram em módulo (são saídas de caixa). Por isso um coeficiente negativo se lê como "quanto maior a saída, menor o caixa".' }
  ];
}

function textoCoef(v, c) {
  if (!c) return '';
  const sig = tem(c.p_valor) && c.p_valor < 0.05;
  const ic = `IC 95%: ${fmt(c.ic_inf, 2)} a ${fmt(c.ic_sup, 2)}`;
  const pTxt = `p ${c.p_valor !== null && c.p_valor < 0.001 ? '< 0,001' : '= ' + fmtP(c.p_valor)}`;
  const quanto = fmt(Math.abs(c.coef), 2);
  const veredito = sig ? `Efeito estatisticamente significativo (${pTxt}).` : `Efeito que não se distingue de zero (${pTxt}).`;
  if (v === 'ebitda') {
    const extra = c.coef < 0 ? ' Sinal negativo: nos cenários com mais EBITDA o caixa é menor, depois de descontar as outras variáveis. O lucro não está virando caixa.'
      : (c.coef < 1 ? ' Menos de R$ 1,00 de caixa para cada R$ 1,00 de EBITDA: parte do lucro não vira caixa.' : ' Pelo menos R$ 1,00 de caixa para cada R$ 1,00 de EBITDA.');
    return `EBITDA: cada R$ 1,00 a mais de EBITDA se associa a R$ ${quanto} ${c.coef >= 0 ? 'a mais' : 'a menos'} de caixa (${ic}), mantendo as demais variáveis constantes. ${veredito}${extra}`;
  }
  if (v === 'dist') {
    return `Distribuição: cada R$ 1,00 a mais distribuído se associa a R$ ${quanto} ${c.coef >= 0 ? 'a mais' : 'a menos'} de caixa (${ic}). ${veredito}`;
  }
  const nome = VAR_NOME[v] || v;
  const esperado = c.coef < 0;
  const extra = esperado ? '' : ' Sinal positivo, contrário ao esperado para uma saída de caixa: dentro do ano essa variável também carrega efeitos de outros fatores do cenário e não deve ser lida como causa.';
  return `${nome}: cada R$ 1,00 a mais se associa a R$ ${quanto} ${c.coef >= 0 ? 'a mais' : 'a menos'} de caixa (${ic}). ${veredito}${extra}`;
}

function cartoesResumoReg() {
  const reg = REG(), out = [], pa = reg.por_ano, ag = reg.agrupado;
  if (!pa.length) return out;
  const intervalo = a => { const v = a.filter(tem); return v.length ? [Math.min(...v), Math.max(...v)] : null; };
  const i1 = intervalo(pa.map(x => x.r2_modelo1)), i2 = intervalo(pa.map(x => x.r2));
  let t = '';
  if (ag) t += `Com os anos 1 a 11 juntos, o EBITDA sozinho tem R² de ${fmt(ag.r2_modelo1, 2)}: explica cerca de ${fmt(ag.r2_modelo1 * 100, 0)}% da variação do caixa. `;
  if (i1) t += `Olhando um ano de cada vez, o R² do EBITDA sozinho vai de ${fmt(i1[0], 2)} a ${fmt(i1[1], 2)}. `;
  if (i2) t += `Quando entram CAPEX e despesas financeiras (Modelo 2), o R² por ano passa a ficar entre ${fmt(i2[0], 2)} e ${fmt(i2[1], 2)}.`;
  const pior = pa.filter(x => x.coeficientes[0] && tem(x.coeficientes[0].coef) && x.coeficientes[0].coef < 0).map(x => x.ano);
  if (pior.length) t += `\nNos anos ${pior.join(', ')} o coeficiente do EBITDA é negativo: nos cenários com mais EBITDA o caixa é menor, depois de descontar CAPEX e despesas financeiras.`;
  out.push({ tipo: 'info', titulo: 'O EBITDA explica o caixa?', texto: t });

  if (ag) {
    const c = ag.coeficientes;
    const forte = c.reduce((m, x) => Math.abs(x.efeito_1dp) > Math.abs(m.efeito_1dp) ? x : m, c[0]);
    out.push({
      tipo: 'info',
      titulo: 'Modelo 3: todos os anos juntos',
      texto: `O R² total é ${fmt(ag.r2_total, 2)}, mas só com o efeito de ano ele já é ${fmt(ag.r2_ano_apenas, 2)}: a maior parte vem de o caixa médio mudar de um ano para o outro. O R² interno, que mede o que o modelo explica das diferenças entre cenários, é ${fmt(ag.r2_interno, 2)}.\nA variável com maior efeito (+1 desvio-padrão dentro do ano) é ${VAR_NOME[forte.variavel]}: ${fmt(forte.efeito_1dp, 1)} milhões de caixa.`
    });
  }
  const A = reg.ano12.find(m => m.modelo.startsWith('A')), B = reg.ano12.find(m => m.modelo.startsWith('B')), C = reg.ano12.find(m => m.modelo.startsWith('C'));
  if (A && B && C) {
    const ce = C.coeficientes.find(x => x.variavel === 'ebitda');
    out.push({
      tipo: 'atencao',
      titulo: `Ano ${ANO_ENCERRAMENTO}: a distribuição domina`,
      texto: `No Ano ${ANO_ENCERRAMENTO}, o EBITDA sozinho tem R² de ${fmt(A.r2, 2)} e a distribuição sozinha tem R² de ${fmt(B.r2, 2)}. Com os dois juntos, o EBITDA ${tem(ce.p_valor) && ce.p_valor >= 0.05 ? 'perde a significância' : 'continua significativo'} (${fmtP(ce.p_valor) === '< 0,001' ? 'p < 0,001' : 'p = ' + fmtP(ce.p_valor)}).`
    });
  }
  return out;
}

function cartoesAnoReg(ano) {
  const it = REG().por_ano.find(x => x.ano === Number(ano));
  if (!it) return [];
  const m1 = it.modelo1.coeficiente;
  const texto = [
    `O Modelo 2 explica ${fmt(it.r2 * 100, 0)}% da variação do caixa entre os cenários do Ano ${it.ano} (R² ajustado ${fmt(it.r2_aj, 2)}); só com o EBITDA seriam ${fmt(it.r2_modelo1 * 100, 0)}%. O erro típico (RMSE) é de R$ ${fmt(it.rmse, 1)} milhões.`,
    `Sozinho (Modelo 1), o coeficiente do EBITDA é ${fmt(m1.coef, 2)} (${fmtP(m1.p_valor) === '< 0,001' ? 'p < 0,001' : 'p = ' + fmtP(m1.p_valor)}).`
  ].concat(it.coeficientes.map(c => textoCoef(c.variavel, c)));
  return [{ tipo: 'info', titulo: `Como ler o Ano ${it.ano}`, texto: texto.join('\n') }];
}

function cartoesModelo3() {
  const ag = REG().agrupado;
  if (!ag) return [];
  return [{
    tipo: 'info',
    titulo: 'Como ler o Modelo 3',
    texto: ag.coeficientes.map(c => textoCoef(c.variavel, c)).join('\n') +
      `\nO erro típico (RMSE) é de R$ ${fmt(ag.rmse, 1)} milhões em ${fmt(ag.n, 0)} observações (${fmt(ag.n_cenarios, 0)} cenários × anos 1 a ${ag.n / ag.n_cenarios}).`
  }];
}

function tabelaRegPorAno() {
  const pa = REG().por_ano;
  const g = (it, v) => it.coeficientes.find(c => c.variavel === v);
  return {
    cab: ['Ano', 'R² (só EBITDA)', 'R² (Modelo 2)', 'R² aj.', 'RMSE', 'EBITDA', 'p', 'CAPEX', 'p', 'Desp. fin.', 'p'],
    linhas: pa.map(it => [
      String(it.ano),
      fmt(it.r2_modelo1, 3),
      fmt(it.r2, 3),
      fmt(it.r2_aj, 3),
      fmt(it.rmse, 1),
      fmt(g(it, 'ebitda').coef, 3),
      fmtP(g(it, 'ebitda').p_valor),
      fmt(g(it, 'capex').coef, 3),
      fmtP(g(it, 'capex').p_valor),
      fmt(g(it, 'despfin').coef, 3),
      fmtP(g(it, 'despfin').p_valor)
    ])
  };
}

function leituraSig(c) { return !tem(c.p_valor) ? 'n/d' : (c.p_valor < 0.05 ? 'Significativo' : 'Não significativo'); }
const fmtIC = (c, d = 3) => `[${fmt(c.ic_inf, d)} ; ${fmt(c.ic_sup, d)}]`;

function tabelaDetalheAno(ano) {
  const it = REG().por_ano.find(x => x.ano === Number(ano));
  if (!it) return { cab: [], linhas: [] };
  const m1 = it.modelo1.coeficiente;
  const linhas = [['Modelo 1 · EBITDA', fmt(m1.coef, 3), fmt(m1.erro_padrao, 3), fmtP(m1.p_valor), fmtIC(m1), leituraSig(m1)]]
    .concat(it.coeficientes.map(c => ['Modelo 2 · ' + VAR_NOME[c.variavel], fmt(c.coef, 3), fmt(c.erro_padrao, 3), fmtP(c.p_valor), fmtIC(c), leituraSig(c)]));
  return { cab: ['Variável', 'Coeficiente', 'Erro-padrão', 'p-valor', 'IC 95%', 'Leitura'], linhas, txt: [5] };
}

function tabelaModelo3() {
  const ag = REG().agrupado;
  if (!ag) return { cab: [], linhas: [] };
  return {
    cab: ['Variável', 'Coeficiente', 'Erro-padrão (por cenário)', 'p-valor', 'IC 95%', 'Efeito de +1 DP (R$ mi)', 'Leitura'],
    linhas: ag.coeficientes.map(c => [VAR_NOME[c.variavel], fmt(c.coef, 4), fmt(c.erro_padrao, 4), fmtP(c.p_valor), fmtIC(c, 4), fmt(c.efeito_1dp, 1), leituraSig(c)]),
    txt: [6]
  };
}

function tabelaR2Modelo3() {
  const ag = REG().agrupado;
  if (!ag) return { cab: [], linhas: [] };
  return {
    cab: ['Medida', 'Valor', 'O que significa'],
    linhas: [
      ['R² total', fmt(ag.r2_total, 3), 'Inclui o efeito de ano: inflado porque o caixa médio muda muito entre os anos.'],
      ['R² só com o efeito de ano', fmt(ag.r2_ano_apenas, 3), 'Quanto já se explica só sabendo em que ano a observação está.'],
      ['R² interno (within)', fmt(ag.r2_interno, 3), 'O que EBITDA, CAPEX e despesas financeiras explicam além da média do ano.'],
      ['R² ajustado', fmt(ag.r2_aj, 3), 'R² total corrigido pelo número de variáveis.'],
      ['RMSE (R$ mi)', fmt(ag.rmse, 1), 'Erro típico do modelo.']
    ],
    txt: [2]
  };
}

function tabelaVif() {
  const ag = REG().agrupado;
  if (!ag) return { cab: [], linhas: [] };
  return {
    cab: ['Variável', 'VIF', 'Leitura'],
    linhas: ag.vif.map(v => [VAR_NOME[v.variavel], fmt(v.vif, 2), !tem(v.vif) ? 'Colinearidade perfeita' : (v.vif < 5 ? 'Sem problema' : (v.vif < 10 ? 'Atenção: moderada' : 'Problema: alta'))]),
    txt: [2]
  };
}

function tabelaDiagnosticos() {
  const d = REG().diagnosticos;
  if (!d) return { cab: [], linhas: [] };
  const pTxt = p => p !== null && p < 0.001 ? '< 0,001' : fmt(p, 3);
  return {
    cab: ['Teste', 'Valor', 'O que mede', 'Resultado'],
    linhas: [
      ['Breusch-Pagan', `LM = ${fmt(d.bp_lm, 1)} (p ${pTxt(d.bp_p)})`, 'Se a variância dos erros é constante', d.bp_p < 0.05 ? 'Variância não constante: usamos erros robustos' : 'Variância aproximadamente constante'],
      ['Jarque-Bera', `${fmt(d.jb, 0)} (p ${pTxt(d.jb_p)})`, 'Se os erros seguem a normal', d.jb_p < 0.05 ? 'Erros não normais' : 'Compatível com a normal'],
      ['Assimetria', fmt(d.assimetria, 2), 'Simetria dos erros (0 = simétrico)', Math.abs(d.assimetria) < 0.5 ? 'Aproximadamente simétrico' : (d.assimetria > 0 ? 'Cauda longa para valores positivos' : 'Cauda longa para valores negativos')],
      ['Curtose em excesso', fmt(d.curtose, 2), 'Peso das caudas (0 = normal)', d.curtose > 1 ? 'Caudas pesadas: erros grandes mais frequentes' : 'Caudas próximas do normal'],
      ['Pontos influentes (Cook > 4/N)', `${fmt(d.cook_n, 0)} (${fmt(d.cook_pct, 1)}%)`, 'Observações que puxam o modelo', d.cook_pct < 5 ? 'Poucos pontos influentes' : 'Muitos pontos influentes: vale investigar'],
      ['Correlação entre anos seguidos', fmt(d.autocorrelacao, 2), 'Se o erro de um ano se repete no seguinte, no mesmo cenário', Math.abs(d.autocorrelacao) > 0.3 ? 'Há dependência: por isso agrupamos os erros por cenário' : 'Dependência fraca']
    ],
    txt: [2, 3]
  };
}

function cartoesDiagnosticos() {
  const d = REG().diagnosticos, ag = REG().agrupado;
  if (!d) return [];
  const prob = [];
  if (d.bp_p < 0.05) prob.push('a variância dos erros não é constante');
  if (d.jb_p < 0.05) prob.push('os erros têm caudas pesadas e não seguem a normal');
  if (Math.abs(d.autocorrelacao) > 0.3) prob.push('o erro de um ano se repete no ano seguinte do mesmo cenário');
  const maxVif = Math.max(...ag.vif.map(v => v.vif).filter(tem));
  let t = prob.length ? `Os pressupostos não são perfeitos: ${prob.join('; ')}. Na prática, isso torna os erros-padrão comuns pouco confiáveis, e por isso usamos erros robustos e agrupados por cenário. Os coeficientes continuam interpretáveis, mas previsões individuais devem ser lidas com cautela.` : 'Os pressupostos principais ficaram dentro do esperado.';
  t += `\nMulticolinearidade: o maior VIF é ${fmt(maxVif, 2)}, ${maxVif < 5 ? 'então as variáveis não se confundem entre si' : 'o que merece atenção'}.`;
  return [{ tipo: prob.length ? 'atencao' : 'bom', titulo: 'O que o diagnóstico diz', texto: t }];
}

function tabelaValidacao() {
  const v = REG().validacao;
  if (!v) return { cab: [], linhas: [] };
  return {
    cab: ['Modelo', 'RMSE treino', 'RMSE teste', 'MAE teste', 'R² teste'],
    linhas: v.modelos.map(m => [m.modelo, fmt(m.rmse_treino, 1), fmt(m.rmse_teste, 1), fmt(m.mae_teste, 1), fmt(m.r2_teste, 3)])
  };
}

function cartoesValidacao() {
  const v = REG().validacao;
  if (!v) return [];
  const base = v.modelos[0], ult = v.modelos[v.modelos.length - 1];
  const ganho = base.rmse_teste > 0 ? (1 - ult.rmse_teste / base.rmse_teste) * 100 : null;
  return [{
    tipo: 'info',
    titulo: 'Funciona em cenários novos?',
    texto: `O modelo foi ajustado com ${v.n_treino} cenários e testado em ${v.n_teste} cenários que não viu. No teste, o Modelo 3 erra em média R$ ${fmt(ult.rmse_teste, 1)} milhões (RMSE), contra R$ ${fmt(base.rmse_teste, 1)} milhões de quem só usa a média do ano${tem(ganho) ? `, uma redução de ${fmt(ganho, 0)}% do erro` : ''}. O RMSE no teste (${fmt(ult.rmse_teste, 1)}) é ${Math.abs(ult.rmse_teste - ult.rmse_treino) / ult.rmse_treino < 0.1 ? 'parecido com' : 'diferente de'} o do treino (${fmt(ult.rmse_treino, 1)}), ${Math.abs(ult.rmse_teste - ult.rmse_treino) / ult.rmse_treino < 0.1 ? 'sinal de que o modelo generaliza.' : 'sinal de possível sobreajuste.'}`
  }];
}

function tabelaAno12() {
  const reg = REG();
  const cel = (m, v) => { const c = m.coeficientes.find(x => x.variavel === v); return c ? `${fmt(c.coef, 2)} (${fmtP(c.p_valor)})` : '-'; };
  const linhas = reg.ano12.map(m => [m.modelo, fmt(m.r2, 3), fmt(m.r2_aj, 3), fmt(m.rmse, 1), cel(m, 'ebitda'), cel(m, 'dist'), cel(m, 'capex'), cel(m, 'despfin')]);
  reg.ano_dist_variavel.forEach(m => linhas.push([`Ano ${m.ano}: E`, fmt(m.r2, 3), fmt(m.r2_aj, 3), fmt(m.rmse, 1), cel(m, 'ebitda'), cel(m, 'dist'), cel(m, 'capex'), cel(m, 'despfin')]));
  return { cab: ['Especificação', 'R²', 'R² aj.', 'RMSE', 'EBITDA: coef. (p)', 'Distrib.: coef. (p)', 'CAPEX: coef. (p)', 'Desp. fin.: coef. (p)'], linhas, txt: [0] };
}

function tabelaVariacao() {
  const v = REG().variacao_por_ano;
  const f = x => !tem(x) ? 'n/d' : (x === 0 ? '0,0% (fixa)' : fmt(x, 1) + '%');
  return {
    cab: ['Ano', 'EBITDA', 'CAPEX', 'Desp. fin.', 'Distribuição'],
    linhas: v.map(x => [String(x.ano), f(x.cv_ebitda), f(x.cv_capex), f(x.cv_despfin), f(x.cv_dist)])
  };
}

function cartoesLimitacoes() {
  const v = REG().variacao_por_ano;
  const fixos = v.filter(x => x.cv_dist === 0).map(x => x.ano);
  const lista = [
    'Os dados são simulados estatisticamente: os resultados valem para o modelo da CTI, não para dados reais observados.',
    'Associação não é causalidade: CAPEX e despesas financeiras carregam efeitos de outros fatores do cenário (por exemplo, o calendário da dívida).',
    'A Geração de Caixa costuma ser composta pelos próprios itens do fluxo (como CAPEX e despesas financeiras), então parte do R² dos modelos que incluem esses itens é mecânica.'
  ];
  if (fixos.length) lista.push(`A distribuição é igual em todos os cenários em ${fixos.length} dos ${v.length} anos regulares (anos ${fixos.join(', ')}), então só entra nos modelos dos anos em que varia.`);
  if (resultado.resumo.anos.includes(ANO_ENCERRAMENTO)) lista.push(`O Ano ${ANO_ENCERRAMENTO} é o encerramento da concessão, tem contas ausentes e não é comparável aos demais; por isso fica fora do Modelo 3.`);
  return [{ tipo: 'atencao', titulo: 'Limitações', texto: lista.join('\n') }];
}

function desenharDetalheRegressao(animar = true) {
  const reg = REG();
  if (!reg.por_ano.length) return;
  const resEl = $('reg-resumo');
  if (resEl) resEl.innerHTML = htmlCartoes(cartoesResumoReg());
  const tRegAnoEl = $('t-reg-ano');
  if (tRegAnoEl) tRegAnoEl.innerHTML = htmlTabela(tabelaRegPorAno());

  const sel = $('filtro-ano-reg');
  if (sel && !sel.options.length) {
    reg.por_ano.forEach(l => { const o = document.createElement('option'); o.value = l.ano; o.textContent = 'Ano ' + l.ano; sel.appendChild(o); });
    sel.value = reg.por_ano[reg.por_ano.length - 1].ano;
    sel.onchange = () => desenharDetalheAnoReg();
  }
  desenharDetalheAnoReg();

  const temAg = !!reg.agrupado;
  ['bloco-modelo3', 'bloco-diagnostico', 'bloco-validacao'].forEach(id => {
    const el = $(id);
    if (el) el.classList.toggle('oculto', !temAg);
  });
  if (temAg) {
    const tAg = $('t-agrupado'); if (tAg) tAg.innerHTML = htmlTabela(tabelaModelo3());
    const tR2M3 = $('t-r2-modelo3'); if (tR2M3) tR2M3.innerHTML = htmlTabela(tabelaR2Modelo3());
    const tVif = $('t-vif'); if (tVif) tVif.innerHTML = htmlTabela(tabelaVif());
    const lM3 = $('leitura-modelo3'); if (lM3) lM3.innerHTML = htmlCartoes(cartoesModelo3());
    const tDiag = $('t-diag'); if (tDiag) tDiag.innerHTML = htmlTabela(tabelaDiagnosticos());
    const lDiag = $('leitura-diag'); if (lDiag) lDiag.innerHTML = htmlCartoes(cartoesDiagnosticos());
  }
  const temVal = !!reg.validacao;
  const bVal = $('bloco-validacao');
  if (bVal) bVal.classList.toggle('oculto', !temVal);
  if (temVal) {
    const tVal = $('t-valid'); if (tVal) tVal.innerHTML = htmlTabela(tabelaValidacao());
    const lVal = $('leitura-valid'); if (lVal) lVal.innerHTML = htmlCartoes(cartoesValidacao());
  }
  const bAno12 = $('bloco-ano12');
  if (bAno12) bAno12.classList.toggle('oculto', !reg.ano12.length);
  if (reg.ano12.length) {
    const tAno12 = $('t-ano12'); if (tAno12) tAno12.innerHTML = htmlTabela(tabelaAno12());
  }
  const tVar = $('t-variacao'); if (tVar) tVar.innerHTML = htmlTabela(tabelaVariacao());
  const lLim = $('leitura-limites'); if (lLim) lLim.innerHTML = htmlCartoes(cartoesLimitacoes());

  if (typeof FIGURAS_REG !== 'undefined') {
    FIGURAS_REG.forEach(([id, fn]) => {
      const el = $(id);
      if (!el) return;
      const ok = (id === 'g-reg-ic') || (id === 'g-valid' ? temVal : temAg);
      el.classList.toggle('oculto', !ok);
      if (ok) plotarFig(id, fn(), animar);
    });
  }
}

function desenharDetalheAnoReg() {
  const sel = $('filtro-ano-reg');
  if (!sel) return;
  const ano = sel.value;
  const tDet = $('t-reg-detalhe');
  if (tDet) tDet.innerHTML = htmlTabela(tabelaDetalheAno(ano));
  const lAno = $('leitura-ano-reg');
  if (lAno) lAno.innerHTML = htmlCartoes(cartoesAnoReg(ano));
}

/* ==========================================================================
   Exportação para PDF
   ========================================================================== */
const COR_PDF = {
  azul: [82, 103, 197], texto: [42, 37, 52], suave: [84, 79, 94], linha: [196, 186, 189],
  bom: [159, 193, 82], atencao: [224, 115, 70], ruim: [198, 82, 78], info: [82, 103, 197], neutro: [168, 163, 179],
  fundo: { bom: [240, 246, 227], atencao: [251, 237, 230], ruim: [248, 232, 231], info: [233, 227, 243] }
};

function limparPdf(t) {
  return String(t)
    .replace(/[−–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...')
    .replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/≈/g, '~').replace(/→/g, '->').replace(/✓/g, 'OK').replace(/✕/g, 'X').replace(/⚡/g, '').replace(/²/g, '2').replace(/³/g, '3')
    .replace(/[^\x00-\xFF]/g, '');
}

function criarPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const M = { x: 14, topo: 20, base: 283, w: 182 };
  const P = { doc, y: M.topo, M };

  P.nova = () => { doc.addPage(); P.y = M.topo; };
  P.garantir = h => { if (P.y + h > M.base) P.nova(); };
  P.texto = (t, { tam = 9.5, estilo = 'normal', cor = COR_PDF.texto, x = M.x, largura = M.w, entre = 1.8 } = {}) => {
    doc.setFont('helvetica', estilo); doc.setFontSize(tam); doc.setTextColor(...cor);
    const lh = tam * 0.4;
    String(t).split('\n').forEach(par => {
      let linhas = doc.splitTextToSize(limparPdf(par), largura);
      while (linhas.length) {
        const cabem = Math.max(1, Math.floor((M.base - P.y) / lh));
        if (linhas.length > cabem && cabem < 2) { P.nova(); continue; }
        const parte = linhas.slice(0, cabem);
        linhas = linhas.slice(cabem);
        doc.text(parte, x, P.y + lh * 0.8);
        P.y += parte.length * lh;
        if (linhas.length) P.nova();
      }
      P.y += entre;
    });
  };
  P.titulo = (t, nivel = 1) => {
    P.garantir(nivel === 1 ? 16 : 11);
    if (nivel === 1) {
      P.y += 3;
      doc.setFillColor(...COR_PDF.azul); doc.rect(M.x, P.y, M.w, 8, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
      doc.text(limparPdf(t), M.x + 3, P.y + 5.6);
      P.y += 12;
    } else {
      P.texto(t, { tam: 10.5, estilo: 'bold', cor: COR_PDF.azul, entre: 1.2 });
    }
  };
  P.cartao = (c) => {
    const tipo = c.tipo || 'info', tam = 9, lh = tam * 0.4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(tam);
    const corpo = String(c.texto).split('\n').flatMap(par => doc.splitTextToSize(limparPdf(par), M.w - 8).concat(['']));
    corpo.pop();
    const altura = 5 + 5 + corpo.length * lh + 3;
    if (altura > M.base - M.topo) { P.texto(c.titulo, { estilo: 'bold' }); P.texto(c.texto, { tam: 9 }); return; }
    P.garantir(altura);
    doc.setFillColor(...COR_PDF.fundo[tipo]); doc.rect(M.x, P.y, M.w, altura, 'F');
    doc.setFillColor(...COR_PDF[tipo]); doc.rect(M.x, P.y, 1.4, altura, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...COR_PDF.texto);
    doc.text(limparPdf(c.titulo), M.x + 5, P.y + 5.2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(tam);
    doc.text(corpo, M.x + 5, P.y + 10.2 + lh * 0.3, { lineHeightFactor: 1.15 });
    P.y += altura + 3;
  };
  P.cartoes = lista => lista.forEach(P.cartao);
  P.tabela = (t, opcoes = {}) => {
    if (!t.cab || !t.cab.length) return;
    const txt = new Set(t.txt || []);
    const colunas = {};
    t.cab.forEach((_, i) => { colunas[i] = { halign: i === 0 || txt.has(i) ? 'left' : 'right' }; });
    doc.autoTable({
      startY: P.y, head: [t.cab.map(limparPdf)], body: t.linhas.map(l => l.map(c => (c && c.content !== undefined ? { ...c, content: limparPdf(c.content) } : limparPdf(c)))),
      theme: 'grid', margin: { left: M.x, right: M.x, top: M.topo, bottom: 14 },
      styles: { font: 'helvetica', fontSize: opcoes.fonte || 7.5, cellPadding: 1.4, textColor: COR_PDF.texto, lineColor: COR_PDF.linha, lineWidth: 0.1, overflow: 'linebreak' },
      headStyles: { fillColor: COR_PDF.azul, textColor: 255, halign: 'right', fontStyle: 'bold' },
      columnStyles: colunas, didParseCell: opcoes.aoCelula
    });
    P.y = doc.lastAutoTable.finalY + 5;
  };
  P.imagem = (png, proporcao) => {
    const h = M.w * proporcao;
    P.garantir(h + 2);
    doc.addImage(png, 'PNG', M.x, P.y, M.w, h, undefined, 'FAST');
    P.y += h + 3;
  };
  return P;
}

async function imagemDaFigura(fn, w = 800, h = 440) {
  const fig = comTemaClaro(() => {
    const f = fn();
    const layout = JSON.parse(JSON.stringify(f.layout));
    delete layout.transition;
    layout.paper_bgcolor = '#FFFFFF'; layout.plot_bgcolor = '#FFFFFF';
    return { data: f.data, layout };
  });
  const png = await Plotly.toImage(fig, { format: 'png', width: w, height: h, scale: 1.6 });
  return { png, proporcao: h / w };
}

const pausa = () => new Promise(r => setTimeout(r, 0));

function tabelaMediasPorAno() {
  const t = resultado.por_ano;
  const f0 = v => fmt(v, 0);
  return {
    cab: ['Ano', 'Receita', 'EBITDA', 'Marg. EBITDA', 'Lucro líq.', 'Caixa', 'Conversão', 'CAPEX', 'Desp. fin.', 'Distrib.', 'Saldo final'],
    linhas: t.map(l => [String(l.ano), f0(l.receita), f0(l.ebitda), fmtPct(l.margem_ebitda), f0(l.lucro_liquido), f0(l.caixa), fmt(l.conversao, 2), f0(l.capex), f0(l.despfin), f0(l.dist), f0(l.saldo_final)])
  };
}

function tabelaMapaPdf() {
  const anos = resultado.resumo.anos, porAno = {};
  anos.forEach(a => { porAno[a] = avaliar(a); });
  const ids = porAno[anos[0]].filter(i => !(resultado.campos_extras || []).some(c => c.id === i.id)).map(i => i.id);
  const statusMatriz = [];
  const linhas = ids.map(id => {
    const st = [];
    const cel = anos.map(a => {
      const it = porAno[a].find(i => i.id === id);
      const s = it ? it.status : 'neutro';
      st.push(s);
      return s === 'bom' ? 'OK' : (s === 'ruim' ? 'X' : (s === 'neutro' ? '-' : '!'));
    });
    statusMatriz.push(st);
    const itemEncontrado = porAno[anos[0]].find(i => i.id === id);
    return [itemEncontrado ? itemEncontrado.nome : id].concat(cel);
  });
  return { cab: ['Indicador'].concat(anos.map(String)), linhas, status: statusMatriz };
}

async function exportarPdf() {
  const btn = $('btn-exportar-pdf'), st = $('status-pdf'), barra = $('progresso-pdf');
  if (!resultado) return;
  if (!window.jspdf || !window.Plotly) {
    if (st) {
      st.textContent = 'Biblioteca de PDF não carregada. Verifique a conexão e recarregue a página.';
      st.className = 'nota erro';
    }
    return;
  }
  if (btn) btn.disabled = true;
  if (barra) barra.style.display = 'block';
  if (st) { st.textContent = 'Iniciando exportação...'; st.className = 'nota'; }

  try {
    const P = criarPdf();
    const regOk = resultado.regressoes && resultado.regressoes.por_ano.length;
    let feitas = 0;
    const total = 8 + (indicesDisponiveis() ? 6 : 0) + (regOk ? 8 : 0);
    const passo = async (msg) => { if (st) st.textContent = `${msg} (${Math.min(++feitas, total)}/${total})`; await pausa(); };
    const grafico = async (fn, msg, w, h) => {
      await passo(msg);
      try {
        const img = await imagemDaFigura(fn, w, h);
        P.imagem(img.png, img.proporcao);
      } catch (e) {
        P.texto('(gráfico indisponível: ' + e.message + ')', { cor: COR_PDF.suave });
      }
    };

    // Capa
    const agora = new Date();
    P.y = 28;
    P.texto('DataCore', { tam: 26, estilo: 'bold', cor: COR_PDF.azul, entre: 0 });
    P.texto('Relatório da simulação CTI Global', { tam: 15, estilo: 'bold', entre: 3 });
    const r = resultado.resumo;
    P.texto(`Análise de ${fmt(r.observacoes, 0)} observações: ${fmt(r.cenarios, 0)} cenários simulados × ${r.anos.length} anos. Valores em R$ milhões, salvo indicação.`, { tam: 10, cor: COR_PDF.suave });
    P.texto(`Gerado em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. O arquivo de dados é processado no seu navegador e não é enviado a nenhum servidor.`, { tam: 9, cor: COR_PDF.suave, entre: 5 });
    if (indicesDisponiveis()) {
      P.texto(`Parâmetro dos índices de valor econômico: WACC de ${fmt(wacc * 100, 1)}% ao ano.`, { tam: 9, cor: COR_PDF.suave });
    }

    // 1. Conclusões e visão geral
    await passo('Montando conclusões');
    P.titulo('1. O que os dados dizem');
    P.cartoes(gerarAchados().map(a => ({ tipo: a.tipo, titulo: a.titulo, texto: a.texto })));
    P.titulo('2. Médias por ano (R$ milhões)');
    P.tabela(tabelaMediasPorAno(), { fonte: 7 });
    P.titulo('3. Mapa de saúde: todos os anos', 1);
    P.texto('OK = melhorou ou cumpre o critério; ! = atenção; X = problema; - = sem base de comparação.', { tam: 8.5, cor: COR_PDF.suave });
    const mapa = tabelaMapaPdf();
    P.tabela(mapa, {
      fonte: 7,
      aoCelula: d => {
        if (d.section !== 'body' || d.column.index === 0) return;
        const s = mapa.status[d.row.index][d.column.index - 1];
        d.cell.styles.fillColor = COR_PDF[s] || COR_PDF.neutro;
        d.cell.styles.textColor = 255;
        d.cell.styles.halign = 'center';
        d.cell.styles.fontStyle = 'bold';
      }
    });

    // 4. Lucro versus caixa e distribuição
    P.titulo('4. Lucro versus caixa');
    await grafico(figEvolucao, 'Gráfico de evolução');
    await grafico(figConversao, 'Gráfico de conversão');
    P.titulo('5. Distribuição entre os cenários');
    P.texto(`Conta: ${ROTULOS[$('filtro-conta').value] || $('filtro-conta').value}; histograma do Ano ${$('filtro-ano-hist').value} (selecionados na tela).`, { tam: 8.5, cor: COR_PDF.suave });
    await grafico(figHist, 'Histograma');
    await grafico(figBox, 'Boxplot');
    P.tabela({ cab: ['Conta', 'Média', 'Mediana', 'Desvio', 'Outliers'], linhas: resultado.descritivas.map(l => [ROTULOS[l.conta] || l.conta, fmt(l.media, 1), fmt(l.mediana, 1), fmt(l.desvio, 1), l.pct_outliers + '%']) });

    // 6. Índices
    if (indicesDisponiveis()) {
      P.titulo('6. Índices financeiros');
      const t = tabelaIndices();
      P.tabela({
        cab: t.cab,
        linhas: t.corpo.map(l => l.grupo ? [{ content: l.grupo, colSpan: t.cab.length, styles: { fillColor: [243, 240, 246], fontStyle: 'bold', halign: 'left', textColor: COR_PDF.azul } }] : [l.nome].concat(l.celulas))
      }, { fonte: 6.6 });
      notasIndices().forEach(n => P.texto(n, { tam: 8, cor: COR_PDF.suave, entre: 1.2 }));
      P.y += 3;
      for (const [id, fn, ids] of FIGURAS_INDICES) {
        if (figuraIndiceDisponivel(ids)) await grafico(fn, 'Gráfico de índices');
      }
      P.cartoes(cartoesIndices());
    }

    // 7. Regressões
    if (regOk) {
      const reg = REG();
      P.titulo('7. Regressões: determinantes da geração de caixa');
      P.cartoes(cartoesIntroReg());
      P.titulo('Como ler os resultados', 2);
      GLOSSARIO_REG.forEach(([termo, txt]) => P.texto(`${termo}. ${txt}`, { tam: 8.5, entre: 1.6 }));
      P.titulo('Resumo em linguagem simples', 2);
      P.cartoes(cartoesResumoReg());
      P.titulo('Modelos por ano', 2);
      await grafico(figR2, 'Gráfico de R²');
      await grafico(figCoef, 'Gráfico de coeficientes');
      await grafico(figRegIC, 'Gráfico com intervalos de confiança');
      P.tabela(tabelaRegPorAno(), { fonte: 7 });
      const sel = $('filtro-ano-reg').value;
      P.titulo(`Detalhe do Ano ${sel} (selecionado na tela)`, 2);
      P.tabela(tabelaDetalheAno(sel));
      P.cartoes(cartoesAnoReg(sel));
      if (reg.agrupado) {
        P.titulo('Modelo 3: anos 1 a 11 juntos', 2);
        P.tabela(tabelaModelo3());
        P.tabela(tabelaR2Modelo3());
        P.tabela(tabelaVif());
        P.cartoes(cartoesModelo3());
        await grafico(figRegRmse, 'Gráfico de RMSE por ano');
        P.titulo('Diagnóstico dos resíduos', 2);
        P.tabela(tabelaDiagnosticos());
        P.cartoes(cartoesDiagnosticos());
        await grafico(figDiagRes, 'Resíduos');
        await grafico(figDiagQQ, 'Gráfico Q-Q');
        await grafico(figDiagHist, 'Histograma dos resíduos');
      }
      if (reg.validacao) {
        P.titulo('Validação em cenários novos', 2);
        P.tabela(tabelaValidacao());
        P.cartoes(cartoesValidacao());
        await grafico(figValid, 'Validação');
      }
      if (reg.ano12.length) {
        P.titulo(`Ano ${ANO_ENCERRAMENTO} e anos com distribuição variável`, 2);
        P.tabela(tabelaAno12());
      }
      P.titulo('Quanto cada variável varia entre cenários (coeficiente de variação)', 2);
      P.tabela(tabelaVariacao());
      P.cartoes(cartoesLimitacoes());
    }

    // Cabeçalho e rodapé em todas as páginas
    const n = P.doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      P.doc.setPage(i);
      P.doc.setFont('helvetica', 'normal');
      P.doc.setFontSize(8);
      P.doc.setTextColor(...COR_PDF.suave);
      if (i > 1) P.doc.text('DataCore · Simulação CTI Global', 14, 10);
      P.doc.text(`Página ${i} de ${n}`, 196, 290, { align: 'right' });
    }
    if (st) st.textContent = 'Salvando arquivo...';
    await pausa();
    P.doc.save(`DataCore_Relatorio_CTI_${agora.toISOString().slice(0, 10)}.pdf`);
    if (st) { st.textContent = `PDF gerado (${n} páginas).`; st.className = 'nota ok'; }
  } catch (e) {
    console.error(e);
    if (st) { st.textContent = 'Não foi possível gerar o PDF: ' + e.message; st.className = 'nota erro'; }
  } finally {
    if (btn) btn.disabled = false;
    if (barra) barra.style.display = 'none';
  }
}

function configurarExportacaoPdf() {
  const btn = $('btn-exportar-pdf');
  if (btn) btn.onclick = exportarPdf;
}
