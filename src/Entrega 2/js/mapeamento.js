const CONTAS_SISTEMA = [
  { id: 'receita', nome: 'Receita', obrigatoria: true },
  { id: 'lucro_liquido', nome: 'Resultado Líquido', obrigatoria: true },
  { id: 'resultado_operacional', nome: 'Resultado Operacional (EBIT)', obrigatoria: true },
  { id: 'dep_amort', nome: 'Depreciação e Amortização', obrigatoria: true },
  { id: 'ebitda_arquivo', nome: 'EBITDA (Original)', obrigatoria: false },
  { id: 'caixa', nome: 'Geração de Caixa', obrigatoria: true },
  { id: 'capex', nome: 'Investimentos (CAPEX)', obrigatoria: true },
  { id: 'despfin', nome: 'Despesas Financeiras', obrigatoria: true },
  { id: 'dist', nome: 'Distribuição para Acionista', obrigatoria: true },
  { id: 'saldo_final', nome: 'Saldo Final de Caixa', obrigatoria: true },
  { id: 'ativo_circulante', nome: 'Ativo Circulante', obrigatoria: false },
  { id: 'passivo_circulante', nome: 'Passivo Circulante', obrigatoria: false },
  { id: 'disponivel', nome: 'Disponível', obrigatoria: false },
  { id: 'estoques', nome: 'Estoques Diversos', obrigatoria: false },
  { id: 'realizavel_lp', nome: 'Realizável a Longo Prazo', obrigatoria: false },
  { id: 'exigivel_lp', nome: 'Exigível a Longo Prazo', obrigatoria: false },
  { id: 'patrimonio_liquido', nome: 'Patrimônio Líquido', obrigatoria: false },
  { id: 'ativo_permanente', nome: 'Ativo Permanente', obrigatoria: false },
  { id: 'total_ativo', nome: 'Total do Ativo', obrigatoria: false },
  { id: 'emprestimos', nome: 'Empréstimos', obrigatoria: false },
  { id: 'imposto_renda', nome: 'Imposto de Renda e Contribuição Social', obrigatoria: false },
  { id: 'resultado_antes_ir', nome: 'Resultado Antes do Imposto de Renda', obrigatoria: false }
];

const SINONIMOS_CONTAS = {
  receita: [
    'DRE - Receita', 'Receita Líquida', 'Receita Operacional Líquida',
    'Receita Bruta', 'Receita Operacional Bruta', 'Receita Operacional',
    'Receita de Vendas', 'Faturamento', 'Faturamento Bruto', 'Faturamento Líquido',
    'Vendas Totais', 'Vendas Líquidas', 'Vendas Brutas', 'Vendas',
    'Total Revenue', 'Net Revenue', 'Gross Revenue', 'Operating Revenue',
    'Revenue', 'Net Sales', 'Gross Sales', 'Sales', 'Receita', 'FLU - Receita'
  ],
  lucro_liquido: [
    'DRE - Resultado Líquido', 'Resultado Líquido do Exercício',
    'Resultado Líquido', 'Lucro Líquido', 'Lucro Líquido do Exercício',
    'Lucro/Prejuízo Líquido', 'Resultado Final', 'Lucro do Período',
    'Resultado do Exercício', 'Net Income', 'Net Profit', 'Net Earnings',
    'Profit After Tax', 'Bottom Line', 'DRE - Resultado Líquido após Equivalência'
  ],
  resultado_operacional: [
    'DRE - Resultado Operacional', 'Resultado Operacional (EBIT)',
    'Resultado Operacional', 'EBIT', 'Lucro Operacional', 'LAJIR',
    'Operating Income', 'Operating Profit', 'Operating Result',
    'Earnings Before Interest and Taxes',
    'Lucro Antes dos Juros e Impostos', 'Resultado Antes dos Juros e Impostos'
  ],
  dep_amort: [
    'DRE - Depreciação e Amortização', 'Depreciação e Amortização',
    'D&A', 'D & A', 'Depreciação & Amortização',
    'Depreciation and Amortization', 'Depreciation & Amortization',
    'Depreciação', 'Depreciation', 'Amortização', 'Amortization',
    'Encargos de Depreciação e Amortização'
  ],
  ebitda_arquivo: [
    'DRE - EBITDA', 'EBITDA (Original)', 'EBITDA', 'EBITDA Reportado',
    'EBITDA Ajustado', 'LAJIDA',
    'Earnings Before Interest, Taxes, Depreciation and Amortization',
    'Lucro Antes de Juros, Impostos, Depreciação e Amortização'
  ],
  caixa: [
    'FLU - Geração de Caixa', 'Geração de Caixa', 'Fluxo de Caixa',
    'Fluxo de Caixa Livre', 'Fluxo de Caixa Operacional', 'Geração de Caixa Livre',
    'Geração Operacional de Caixa', 'Cash Flow', 'Free Cash Flow',
    'Operating Cash Flow', 'Net Cash Flow', 'FCO', 'FCL', 'FCF',
    'Variação de Caixa'
  ],
  capex: [
    'FLU - Investimentos', 'Investimentos (CAPEX)', 'CAPEX',
    'Capital Expenditures', 'Capital Expenditure', 'Investimentos',
    'Compras de Ativo', 'Aquisição de Imobilizado', 'Investimento em Ativo Fixo',
    'Despesas de Capital', 'Adições ao Imobilizado'
  ],
  despfin: [
    'FLU - Despesas Financeiras', 'DRE - Despesas Financeiras',
    'Despesas Financeiras', 'Despesa Financeira', 'Juros', 'Despesas com Juros',
    'Juros Pagos', 'Encargos Financeiros', 'Custo Financeiro',
    'Interest', 'Interest Expense', 'Interest Paid', 'Finance Cost',
    'Finance Costs', 'Financial Expenses'
  ],
  dist: [
    'FLU - Distribuição para Acionista', 'Distribuição para Acionista',
    'Distribuição aos Acionistas', 'Distribuição de Lucros', 'Distribuição',
    'Dividendos', 'Dividendos Pagos', 'Dividends', 'Dividends Paid',
    'Payout', 'JCP', 'Juros sobre Capital Próprio', 'Proventos',
    'Remuneração aos Acionistas'
  ],
  saldo_final: [
    'FLU - Saldo Final', 'Saldo Final de Caixa', 'Saldo Final',
    'Saldo de Caixa', 'Caixa Final', 'Ending Cash', 'Ending Cash Balance',
    'Closing Cash', 'Disponibilidades Finais', 'Caixa e Equivalentes Final'
  ],
  ativo_circulante: [
    'BAL - Ativo Circulante', 'Ativo Circulante', 'Total do Ativo Circulante',
    'Ativo Circulante Total', 'Ativo Corrente', 'Current Assets', 'Total Current Assets'
  ],
  passivo_circulante: [
    'BAL - Passivo Circulante', 'Passivo Circulante', 'Total do Passivo Circulante',
    'Passivo Circulante Total', 'Passivo Corrente', 'Passivo de Curto Prazo',
    'Current Liabilities', 'Total Current Liabilities'
  ],
  disponivel: [
    'BAL - Disponível', 'Disponível', 'Disponibilidades', 'Caixa e Equivalentes de Caixa',
    'Caixa e Equivalentes', 'Caixa e Bancos', 'Cash and Cash Equivalents', 'Cash',
    'Disponibilidades Financeiras', 'Recursos Disponíveis', 'Aplicações Financeiras',
    'Disponibilidades e Aplicações'
  ],
  estoques: [
    'BAL - Estoques Diversos', 'Estoques', 'Estoque', 'Inventories', 'Inventory',
    'Almoxarifado', 'Mercadorias', 'Produtos Acabados', 'Materiais e Suprimentos'
  ],
  realizavel_lp: [
    'BAL - Realizável a Longo Prazo', 'Realizável a Longo Prazo', 'Realizavel a Longo Prazo',
    'Realizável a LP', 'Realizavel LP', 'Ativo Realizável a Longo Prazo', 'Ativo Realizável a LP',
    'Ativo Não Circulante Realizável', 'Long Term Receivables', 'BAL - Outros Créditos LP',
    'Outros Créditos LP', 'Créditos de Longo Prazo'
  ],
  exigivel_lp: [
    'BAL - Exigível a Longo Prazo', 'Exigível a Longo Prazo', 'Exigivel a Longo Prazo',
    'Exigível a LP', 'Exigivel LP', 'Passivo Não Circulante', 'Passivo Nao Circulante',
    'Passivo de Longo Prazo', 'Long Term Liabilities', 'Non-Current Liabilities'
  ],
  patrimonio_liquido: [
    'BAL - Patrimônio Líquido', 'BAL  - Patrimônio Líquido', 'Patrimônio Líquido',
    'Patrimonio Liquido', 'Total do Patrimônio Líquido', 'Total do Patrimonio Liquido',
    'Shareholders Equity', 'Total Equity', 'Equity', 'PL', 'Capital Próprio'
  ],
  ativo_permanente: [
    'BAL - Permanente', 'Ativo Permanente', 'Permanente', 'Fixed Assets',
    'Imobilizado', 'Ativo Imobilizado', 'BAL - Investimentos - Imobilizado',
    'BAL - Investimentos - Intangível', 'Investimentos - Imobilizado', 'Ativo Fixo'
  ],
  total_ativo: [
    'BAL - Total do Ativo', 'Total do Ativo', 'Ativo Total', 'Total Ativo',
    'Total Assets', 'Soma do Ativo'
  ],
  emprestimos: [
    'BAL - Empréstimos', 'BAL - Emprést', 'Empréstimos', 'Emprést', 'Emprestimos',
    'Empréstimos e Financiamentos', 'Financiamentos', 'Financiamentos e Empréstimos',
    'Dívida Bruta', 'Divida Bruta', 'Loans', 'Borrowings', 'Debêntures', 'Debentures'
  ],
  imposto_renda: [
    'DRE - Imposto de Renda e Contribuição Social', 'Imposto de Renda e Contribuição Social',
    'IRPJ e CSLL', 'IR e CSLL', 'Imposto de Renda', 'Provisão para IR e CSLL',
    'Impostos sobre o Lucro', 'Tributos sobre o Lucro', 'Income Tax'
  ],
  resultado_antes_ir: [
    'DRE - Resultado Antes do Imposto de Renda', 'Resultado Antes do Imposto de Renda',
    'Resultado Antes dos Impostos', 'Resultado Antes do IR', 'Lucro Antes do Imposto de Renda',
    'Lucro Antes do IR', 'LAIR', 'Lucro Antes dos Tributos', 'Resultado Antes dos Tributos',
    'Earnings Before Tax', 'EBT'
  ]
};

const EXCLUSOES_CONTAS = {
  receita: ['financeir', 'diferid', 'a receber'],
  lucro_liquido: ['acumulad', 'operacional', 'financeir', 'antes do imposto', 'retencao'],
  resultado_operacional: ['outros resultados', 'liquido', 'financeir', 'ebitda', 'lajida', 'debito'],
  dep_amort: ['acumulad', 'intangivel', 'ebitda', 'lajida', 'bal -', 'bal  -'],
  ebitda_arquivo: [],
  caixa: ['saldo', 'caixa final', 'ending cash'],
  capex: ['bal -', 'bal  -'],
  despfin: ['receita', 'resultado financeiro'],
  dist: ['retencao'],
  saldo_final: ['inicial', 'opening'],
  ativo_circulante: ['nao circulante', 'passivo'],
  passivo_circulante: ['nao circulante', 'ativo circulante'],
  disponivel: ['saldo', 'final', 'flu -', 'dre -'],
  estoques: ['provisao'],
  realizavel_lp: ['dre -', 'flu -'],
  exigivel_lp: ['realizavel', 'dre -', 'flu -'],
  patrimonio_liquido: ['dre -', 'flu -'],
  ativo_permanente: ['depreciacao', 'amortizacao', 'acumulad', 'dre -', 'flu -'],
  total_ativo: ['passivo', 'dre -', 'flu -'],
  emprestimos: ['dre -', 'flu -'],
  imposto_renda: ['antes do', 'resultado', 'liquido', 'flu -'],
  resultado_antes_ir: ['liquido', 'flu -']
};

function normalizarTexto(txt) {
  return String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function limparPrefixoConta(txtNorm) {
  return String(txtNorm || '').replace(/^(dre|flu|bal)\s*-\s*/, '').trim();
}

function pontuarCorrespondencia(campoId, contaCsv) {
  const cNorm = normalizarTexto(contaCsv);
  if (!cNorm) return 0;
  const exclusoes = EXCLUSOES_CONTAS[campoId] || [];
  for (let i = 0; i < exclusoes.length; i++) {
    if (cNorm.includes(exclusoes[i])) return 0;
  }
  const cLimpo = limparPrefixoConta(cNorm);
  const sinonimos = SINONIMOS_CONTAS[campoId] || [];
  let melhor = 0;
  for (let indice = 0; indice < sinonimos.length; indice++) {
    const sNorm = normalizarTexto(sinonimos[indice]);
    const sLimpo = limparPrefixoConta(sNorm);
    const penalidade = indice * 2;
    if (cNorm === sNorm) {
      melhor = Math.max(melhor, 1000 - penalidade);
    } else if (cLimpo === sNorm || cLimpo === sLimpo) {
      melhor = Math.max(melhor, 850 - penalidade);
    } else {
      if (sLimpo.length <= 4) {
        const re = new RegExp('(?:^|[\\s\\(\\-/])' + sLimpo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:$|[\\s\\)\\-/])');
        if (re.test(cLimpo)) {
          melhor = Math.max(melhor, 650 - penalidade);
        }
      } else {
        if (cLimpo.includes(sLimpo) || (cLimpo.length >= 4 && sLimpo.includes(cLimpo))) {
          melhor = Math.max(melhor, 600 - penalidade);
        }
      }
    }
  }
  return melhor;
}

function autoMapearContasJS(contas) {
  const contasLimpas = (contas || []).map(c => String(c || '').trim()).filter(Boolean);
  const candidatos = [];
  Object.keys(SINONIMOS_CONTAS).forEach(campoId => {
    contasLimpas.forEach(conta => {
      const pontos = pontuarCorrespondencia(campoId, conta);
      if (pontos > 0) {
        candidatos.push({ pontos, campoId, conta });
      }
    });
  });
  candidatos.sort((a, b) => b.pontos - a.pontos);
  const mapeado = {};
  const contasUsadas = new Set();
  candidatos.forEach(item => {
    if (!mapeado[item.campoId] && !contasUsadas.has(item.conta)) {
      mapeado[item.campoId] = item.conta;
      contasUsadas.add(item.conta);
    }
  });
  return mapeado;
}

function obterMapeamentoAutomatico(contas) {
  let mapaPy = {};
  if (analise && typeof analise.sugerir_mapeamento === 'function') {
    try {
      mapaPy = JSON.parse(analise.sugerir_mapeamento(JSON.stringify(contas))) || {};
    } catch (_) {}
  }
  const mapaJS = autoMapearContasJS(contas);
  return Object.assign({}, mapaJS, mapaPy);
}

function normalizarIdentificadorConta(conta) {
  if (!conta) return '';
  let s = normalizarTexto(conta).replace(/^(dre|flu|bal)\s*[-:_]\s*/i, '');
  s = s.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return s;
}

function atualizarOpcoesSeletoresMapeamento() {
  CONTAS_SISTEMA.forEach(s => {
    const seletor = $(`mapa-${s.id}`);
    if (!seletor) return;
    const valorAtual = seletor.value;

    let html = '<option value="">-- Ignorar --</option>';

    if (contasArquivo && contasArquivo.length > 0) {
      html += '<optgroup label="Contas do Arquivo CSV">';
      contasArquivo.forEach(c => {
        html += `<option value="${c.replace(/"/g, '&quot;')}">${c}</option>`;
      });
      html += '</optgroup>';
    }

    if (camposPersonalizados && camposPersonalizados.length > 0) {
      html += '<optgroup label="Campos Personalizados / Fórmulas">';
      camposPersonalizados.forEach(item => {
        const idVal = `__custom__:${item.id}`;
        const nomeExib = item.nome ? item.nome : item.id;
        const tipoTxt = item.tipo === 'formula' ? 'Fórmula' : 'Simples';
        html += `<option value="${idVal}">${nomeExib} (${tipoTxt})</option>`;
      });
      html += '</optgroup>';
    }

    seletor.innerHTML = html;

    if (valorAtual) {
      seletor.value = valorAtual;
    }
  });

  atualizarStatusMapeamento();
}

function atualizarStatusMapeamento() {
  let totalMapeados = 0, obrigatoriasFaltando = 0;
  CONTAS_SISTEMA.forEach(s => {
    const seletor = $(`mapa-${s.id}`);
    const linha = $(`linha-${s.id}`);
    const etiqueta = $(`etiqueta-${s.id}`);
    if (!seletor || !linha || !etiqueta) return;
    const valor = seletor.value;
    if (valor) {
      totalMapeados++;
      linha.className = 'linha-mapa mapeado';
      if (valor.startsWith('__custom__:')) {
        const idExt = valor.replace('__custom__:', '');
        const campoExt = camposPersonalizados.find(c => c.id === idExt);
        const tipoTxt = campoExt && campoExt.tipo === 'formula' ? 'Fórmula' : 'Personalizado';
        etiqueta.className = 'etiqueta-mapa formula';
        etiqueta.textContent = tipoTxt;
      } else {
        const ehAuto = sugestaoAuto[s.id] === valor;
        etiqueta.className = 'etiqueta-mapa ' + (ehAuto ? 'auto' : 'manual');
        etiqueta.textContent = ehAuto ? 'Auto-mapeado' : 'Manual';
      }
    } else if (s.obrigatoria) {
      obrigatoriasFaltando++;
      linha.className = 'linha-mapa pendente';
      etiqueta.className = 'etiqueta-mapa pendente';
      etiqueta.textContent = 'Obrigatório';
    } else {
      linha.className = 'linha-mapa opcional';
      etiqueta.className = 'etiqueta-mapa opcional';
      etiqueta.textContent = 'Opcional';
    }
  });
  const resumo = $('resumo-mapeamento');
  if (obrigatoriasFaltando === 0) {
    resumo.innerHTML = `<span class="chip bom">Pronto</span> <span>${totalMapeados} de ${CONTAS_SISTEMA.length} campos mapeados. Confira ou clique em <em>Confirmar e Analisar</em>.</span>`;
    status('Contas mapeadas.', 'ok');
  } else {
    resumo.innerHTML = `<span class="chip atencao">${obrigatoriasFaltando} pendente(s)</span> <span>${totalMapeados} de ${CONTAS_SISTEMA.length} campos mapeados. Selecione manualmente os campos obrigatórios restantes.</span>`;
    status(`Atenção: ${obrigatoriasFaltando} campo(s) obrigatório(s) aguardando seleção manual.`, '');
  }
}

function aplicarAutoMapeamento() {
  sugestaoAuto = obterMapeamentoAutomatico(contasArquivo);
  CONTAS_SISTEMA.forEach(s => {
    const seletor = $(`mapa-${s.id}`);
    if (seletor) {
      if (seletor.value && seletor.value.startsWith('__custom__:')) return;
      seletor.value = sugestaoAuto[s.id] || '';
    }
  });
  atualizarStatusMapeamento();
}

let mapeamentoTimeouts = [];
function limparMapeamentoTimeouts() {
  mapeamentoTimeouts.forEach(t => clearTimeout(t));
  mapeamentoTimeouts = [];
}

function exibirMapeamento(contas) {
  limparMapeamentoTimeouts();
  sugestaoAuto = obterMapeamentoAutomatico(contas);
  const conteiner = $('lista-mapeamento');
  conteiner.innerHTML = '';

  const opcoesHtml = [`<option value="">-- Ignorar --</option>`]
    .concat(contas.map(c => `<option value="${c.replace(/"/g, '&quot;')}">${c}</option>`))
    .join('');

  CONTAS_SISTEMA.forEach(s => {
    const div = document.createElement('div');
    div.className = 'linha-mapa animar-entrada-cima';
    div.id = `linha-${s.id}`;
    div.innerHTML = `
      <label for="mapa-${s.id}">
        <span>${s.nome}</span>
        ${s.obrigatoria ? '<span style="color:var(--erro);font-weight:700" title="Campo obrigatório">*</span>' : ''}
      </label>
      <select id="mapa-${s.id}">${opcoesHtml}</select>
      <span class="etiqueta-mapa" id="etiqueta-${s.id}"></span>
    `;
    conteiner.appendChild(div);

    const sel = div.querySelector('select');
    if (sugestaoAuto[s.id]) sel.value = sugestaoAuto[s.id];
    sel.onchange = () => atualizarStatusMapeamento();
  });

  $('s-mapeamento').classList.remove('oculto');
  $('s-mapeamento').classList.add('animar-surgir');

  renderizarCamposExtras();
  atualizarStatusMapeamento();

  if (typeof registrarAnimacaoGrafico === 'function') {
    registrarAnimacaoGrafico('lista-mapeamento', () => {
      limparMapeamentoTimeouts();
      const cards = conteiner.querySelectorAll('.linha-mapa.animar-entrada-cima');
      cards.forEach((card, index) => {
        const t = setTimeout(() => {
          card.classList.add('ativo');
        }, index * 80);
        mapeamentoTimeouts.push(t);
      });
    });
  }
}

function gerarIdentificadorCampo(nome, indicePadrao) {
  const base = normalizarTexto(nome).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!base || /^\d/.test(base) || VARIAVEIS_FORMULA_BASE.includes(base) || ['n', 'cen', 'ebitda_arquivo'].includes(base)) {
    return base ? `campo_${base}` : `campo_extra_${indicePadrao}`;
  }
  return base;
}

function obterVariaveisDisponiveis(indiceAtual) {
  const vars = [...VARIAVEIS_FORMULA_BASE];
  camposPersonalizados.forEach((c, idx) => {
    if (idx < indiceAtual && c.id && !vars.includes(c.id)) vars.push(c.id);
  });
  (contasArquivo || []).forEach(c => {
    const slug = normalizarIdentificadorConta(c);
    if (slug && !vars.includes(slug)) {
      vars.push(slug);
    }
  });
  return vars;
}

function adicionarCampoExtra(tipoInicial = 'simples') {
  contadorExtras++;
  camposPersonalizados.push({
    uid: contadorExtras,
    id: `campo_extra_${contadorExtras}`,
    nome: '',
    tipo: tipoInicial,
    conta_csv: '',
    dividir_milhao: true,
    formula: ''
  });
  renderizarCamposExtras();
  atualizarOpcoesSeletoresMapeamento();
}

function removerCampoExtra(uid) {
  camposPersonalizados = camposPersonalizados.filter(c => c.uid !== uid);
  renderizarCamposExtras();
  atualizarOpcoesSeletoresMapeamento();
}

function inserirNaFormula(uid, token) {
  const item = camposPersonalizados.find(c => c.uid === uid);
  const input = $(`extra-formula-${uid}`);
  if (!item || !input) return;
  const inicio = input.selectionStart ?? input.value.length;
  const fim = input.selectionEnd ?? input.value.length;
  const antes = input.value.slice(0, inicio);
  const depois = input.value.slice(fim);
  const espacoAntes = antes.length > 0 && !/[\s(]$/.test(antes) ? ' ' : '';
  const espacoDepois = depois.length > 0 && !/^[\s)]/.test(depois) ? ' ' : '';
  const insercao = token === 'abs()' ? 'abs()' : `${espacoAntes}${token}${espacoDepois}`;
  input.value = antes + insercao + depois;
  item.formula = input.value;
  const badgeF = $(`badge-formula-${uid}`);
  if (badgeF) badgeF.innerHTML = `<span class="badge-formula-label">Fórmula em uso:</span> <code>${item.formula.trim() || 'Nenhuma fórmula digitada'}</code>`;
  input.focus();
  const novaPos = inicio + (token === 'abs()' ? 4 : insercao.length);
  input.setSelectionRange(novaPos, novaPos);
}

function gerarOpcoesPicklistVariaveis(indiceAtual) {
  let html = '<option value="">+ Selecionar campo para adicionar...</option>';

  html += '<optgroup label="Variáveis do Sistema">';
  VARIAVEIS_FORMULA_BASE.forEach(v => {
    const rotulo = ROTULOS[v] || v;
    html += `<option value="${v}">${v} (${rotulo})</option>`;
  });
  html += '</optgroup>';

  const extrasAnteriores = camposPersonalizados.filter((c, idx) => idx < indiceAtual && c.id);
  if (extrasAnteriores.length > 0) {
    html += '<optgroup label="Campos Personalizados">';
    extrasAnteriores.forEach(c => {
      const nomeExib = c.nome ? c.nome : c.id;
      html += `<option value="${c.id}">${c.id} (${nomeExib})</option>`;
    });
    html += '</optgroup>';
  }

  if (contasArquivo && contasArquivo.length > 0) {
    html += '<optgroup label="Contas do Arquivo CSV">';
    contasArquivo.forEach(conta => {
      const slug = normalizarIdentificadorConta(conta);
      if (slug && !VARIAVEIS_FORMULA_BASE.includes(slug)) {
        html += `<option value="${slug}">${slug} (${conta})</option>`;
      }
    });
    html += '</optgroup>';
  }

  return html;
}

function renderizarCamposExtras() {
  const conteiner = $('lista-campos-extras');
  if (!conteiner) return;
  conteiner.innerHTML = '';

  camposPersonalizados.forEach((item, idx) => {
    const cartao = document.createElement('div');
    cartao.className = 'cartao-extra';

    const opcoesContas = [`<option value="">-- Selecione uma conta do CSV --</option>`]
      .concat(contasArquivo.map(c => `<option value="${c.replace(/"/g, '&quot;')}" ${item.conta_csv === c ? 'selected' : ''}>${c}</option>`))
      .join('');

    const opcoesPicklist = gerarOpcoesPicklistVariaveis(idx);
    const botoesOps = OPERADORES_FORMULA.map(op =>
      `<button type="button" class="chip-var" data-uid="${item.uid}" data-token="${op}" title="Inserir operador ${op}">${op}</button>`
    ).join('');

    cartao.innerHTML = `
      <div class="cabecalho-extra">
        <div>
          <span>Campo personalizado #${idx + 1}</span>
          <span class="codigo-id" id="extra-id-badge-${item.uid}" title="Identificador para uso em fórmulas">${item.id}</span>
        </div>
        <button type="button" class="acao perigo" data-remover="${item.uid}">Remover</button>
      </div>
      <div class="grade-extra">
        <div class="campo-form">
          <label for="extra-tipo-${item.uid}">Tipo de campo</label>
          <select id="extra-tipo-${item.uid}">
            <option value="simples" ${item.tipo === 'simples' ? 'selected' : ''}>Campo simples (conta do CSV)</option>
            <option value="formula" ${item.tipo === 'formula' ? 'selected' : ''}>Campo personalizado com fórmula</option>
          </select>
        </div>
        <div class="campo-form">
          <label for="extra-nome-${item.uid}">Nome de exibição</label>
          <input type="text" id="extra-nome-${item.uid}" placeholder="${item.tipo === 'simples' ? 'Ex: Tributos, Ativo Total' : 'Ex: Margem Líquida, Fluxo Livre'}" value="${item.nome.replace(/"/g, '&quot;')}">
        </div>
        ${item.tipo === 'simples' ? `
          <div class="campo-form">
            <label for="extra-conta-${item.uid}">Conta correspondente no CSV</label>
            <select id="extra-conta-${item.uid}">${opcoesContas}</select>
            <label class="opcoes-escala">
              <input type="checkbox" id="extra-milhao-${item.uid}" ${item.dividir_milhao ? 'checked' : ''}>
              Converter para R$ milhões (dividir por 1.000.000)
            </label>
          </div>
        ` : `
          <div class="campo-form" style="grid-column: 1 / -1">
            <label for="extra-formula-${item.uid}">Fórmula matemática</label>
            <input type="text" id="extra-formula-${item.uid}" placeholder="Ex: amortizacao + depreciacao   ou   ebitda - capex" value="${item.formula.replace(/"/g, '&quot;')}">
            <div class="badge-formula-ativa" id="badge-formula-${item.uid}">
              <span class="badge-formula-label">Fórmula em uso:</span> <code>${item.formula.trim() || 'Nenhuma fórmula digitada'}</code>
            </div>
            <div class="barra-insercao-formula">
              <div class="seletor-variavel-bloco">
                <select id="extra-var-select-${item.uid}">
                  ${opcoesPicklist}
                </select>
              </div>
              <div class="operadores-formula">
                <span class="label-ops">Operadores:</span>
                ${botoesOps}
              </div>
            </div>
          </div>
        `}
      </div>
    `;

    conteiner.appendChild(cartao);

    const selTipo = $(`extra-tipo-${item.uid}`);
    const inpNome = $(`extra-nome-${item.uid}`);
    const btnRemover = cartao.querySelector(`[data-remover="${item.uid}"]`);

    selTipo.onchange = e => {
      item.tipo = e.target.value;
      renderizarCamposExtras();
      atualizarOpcoesSeletoresMapeamento();
    };
    inpNome.oninput = e => {
      item.nome = e.target.value;
      item.id = gerarIdentificadorCampo(item.nome, item.uid);
      const badge = $(`extra-id-badge-${item.uid}`);
      if (badge) badge.textContent = item.id;
      atualizarOpcoesSeletoresMapeamento();
    };
    btnRemover.onclick = () => removerCampoExtra(item.uid);

    if (item.tipo === 'simples') {
      const selConta = $(`extra-conta-${item.uid}`);
      const chkMilhao = $(`extra-milhao-${item.uid}`);
      selConta.onchange = e => {
        item.conta_csv = e.target.value;
        if (!item.nome && item.conta_csv) {
          item.nome = item.conta_csv.replace(/^(DRE|FLU|BAL)\s*-\s*/i, '').trim();
          item.id = gerarIdentificadorCampo(item.nome, item.uid);
          inpNome.value = item.nome;
          const badge = $(`extra-id-badge-${item.uid}`);
          if (badge) badge.textContent = item.id;
          atualizarOpcoesSeletoresMapeamento();
        }
      };
      chkMilhao.onchange = e => { item.dividir_milhao = e.target.checked; };
    } else {
      const inpFormula = $(`extra-formula-${item.uid}`);
      inpFormula.oninput = e => {
        item.formula = e.target.value;
        const b = $(`badge-formula-${item.uid}`);
        if (b) b.innerHTML = `<span class="badge-formula-label">Fórmula em uso:</span> <code>${item.formula.trim() || 'Nenhuma fórmula digitada'}</code>`;
      };

      const selVar = $(`extra-var-select-${item.uid}`);
      if (selVar) {
        selVar.onchange = e => {
          const val = e.target.value;
          if (val) {
            inserirNaFormula(item.uid, val);
            selVar.value = '';
          }
        };
      }

      cartao.querySelectorAll('.chip-var').forEach(btn => {
        btn.onclick = () => inserirNaFormula(item.uid, btn.getAttribute('data-token'));
      });
    }
  });

  atualizarOpcoesSeletoresMapeamento();
}

function coletarCamposExtrasValidados() {
  const idsUsados = new Set(VARIAVEIS_FORMULA_BASE);
  return camposPersonalizados.map((item, idx) => {
    const nomeLimpo = (item.nome || '').trim();
    if (!nomeLimpo) {
      throw new Error(`Informe um nome para o Campo personalizado #${idx + 1}.`);
    }
    let idFinal = item.id || gerarIdentificadorCampo(nomeLimpo, item.uid);
    while (idsUsados.has(idFinal)) {
      idFinal = `${idFinal}_${item.uid}`;
    }
    idsUsados.add(idFinal);
    item.id = idFinal;

    if (item.tipo === 'simples') {
      if (!item.conta_csv) {
        throw new Error(`Selecione uma conta do CSV para o campo personalizado "${nomeLimpo}".`);
      }
      return {
        id: idFinal,
        nome: nomeLimpo,
        tipo: 'simples',
        conta_csv: item.conta_csv,
        dividir_milhao: Boolean(item.dividir_milhao)
      };
    } else {
      const formulaLimpa = (item.formula || '').trim();
      if (!formulaLimpa) {
        throw new Error(`Informe uma fórmula para o campo personalizado "${nomeLimpo}".`);
      }
      return {
        id: idFinal,
        nome: nomeLimpo,
        tipo: 'formula',
        formula: formulaLimpa,
        dividir_milhao: false
      };
    }
  });
}
