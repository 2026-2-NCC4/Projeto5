const $ = id => document.getElementById(id);

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

const ROTULOS = {
  receita: 'Receita',
  ebitda: 'EBITDA (recalculado)',
  lucro_liquido: 'Resultado líquido',
  resultado_operacional: 'Resultado operacional (EBIT)',
  dep_amort: 'Depreciação e amortização',
  ebitda_arquivo: 'EBITDA (Original)',
  caixa: 'Geração de caixa',
  dist: 'Distribuição ao acionista',
  saldo_final: 'Saldo final',
  capex: 'CAPEX',
  despfin: 'Despesas financeiras',
  margem_ebitda: 'Margem EBITDA',
  ativo_circulante: 'Ativo circulante',
  passivo_circulante: 'Passivo circulante',
  disponivel: 'Disponível',
  estoques: 'Estoques',
  realizavel_lp: 'Realizável a longo prazo',
  exigivel_lp: 'Exigível a longo prazo',
  patrimonio_liquido: 'Patrimônio líquido',
  ativo_permanente: 'Ativo permanente',
  total_ativo: 'Total do ativo',
  emprestimos: 'Empréstimos',
  imposto_renda: 'Imposto de renda e CSLL',
  resultado_antes_ir: 'Resultado antes do IR'
};

const LIMITES = {
  conversaoBoa: 0.5,
  quedaForte: -0.05,
  quedaMargemPp: -0.01,
  riscoCaixaAlto: 0.2,
  riscoCaixaMedio: 0.05
};

const ROTULO_STATUS = {
  bom: 'OK',
  atencao: 'ATENÇÃO',
  ruim: 'PROBLEMA',
  neutro: 'SEM BASE'
};

const VARIAVEIS_FORMULA_BASE = [
  'receita', 'ebitda', 'lucro_liquido', 'resultado_operacional',
  'dep_amort', 'caixa', 'capex', 'despfin', 'dist', 'saldo_final'
];

const OPERADORES_FORMULA = ['+', '-', '*', '/', '(', ')', 'abs()'];

const ANO_ENCERRAMENTO = 12;
let wacc = 0.08;
let temaForcado = null;

const VAR_NOME = {
  ebitda: 'EBITDA',
  capex: 'CAPEX',
  despfin: 'Despesas financeiras',
  dist: 'Distribuição'
};

// Estado global compartilhado da aplicação
let pyodide = null;
let analise = null;
let resultado = null;
let riscos = {};
let textoAchados = '';
let contasArquivo = [];
let sugestaoAuto = {};
let camposPersonalizados = [];
let contadorExtras = 0;

// Formatadores e utilitários
const tem = x => x !== null && x !== undefined && isFinite(x);

function status(txt, tipo) {
  const el = $('status');
  if (el) {
    el.textContent = txt;
    el.className = tipo || '';
  }
}

function carregando(ativo) {
  const el = $('progresso');
  if (el) el.style.display = ativo ? 'block' : 'none';
}

function fmt(v, c = 2) {
  return v === null || v === undefined || isNaN(v)
    ? 'n/d'
    : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
}

const fmtP = p => !tem(p) ? 'n/d' : (p < 0.001 ? '< 0,001' : fmt(p, 3));
const fmtPct = (v, c = 1) => tem(v) ? fmt(v * 100, c) + '%' : 'N/D';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ==========================================================================
   Índices Financeiros: Estrutura, Identificadores e Acesso
   ========================================================================== */
const INDICES = [
  { id: 'ebitda', grupo: 'EBITDA', nome: 'EBITDA (R$ mi)', tipo: 'mi', kpi: false, info: 'EBIT + Depreciação e Amortização', formula: 'ebit + abs(depreciacao)' },
  { id: 'margem_ebitda', grupo: 'EBITDA', nome: 'Margem EBITDA', tipo: 'pct', regra: 'alto', info: 'Margem sobre receita: EBITDA ÷ Receita', formula: 'ebitda / receita' },
  { id: 'lc', grupo: 'Liquidez', nome: 'Liquidez Corrente (LC)', tipo: 'x', regra: 'liquidez', balanco: true, info: 'Solvência de curto prazo: Ativo Circulante ÷ Passivo Circulante', formula: 'ativo_circulante / passivo_circulante' },
  { id: 'ls', grupo: 'Liquidez', nome: 'Liquidez Seca (LS)', tipo: 'x', regra: 'liquidez', balanco: true, info: 'Solvência sem estoques: (Ativo Circulante - Estoques) ÷ Passivo Circulante', formula: '(ativo_circulante - estoques) / passivo_circulante' },
  { id: 'li', grupo: 'Liquidez', nome: 'Liquidez Imediata (LI)', tipo: 'x', regra: 'liquidez', balanco: true, info: 'Liquidação imediata: Disponível ÷ Passivo Circulante', formula: 'disponivel / passivo_circulante' },
  { id: 'lg', grupo: 'Liquidez', nome: 'Liquidez Geral (LG)', tipo: 'x', regra: 'liquidez', balanco: true, info: 'Solvência global: (AC + RLP) ÷ (PC + ELP)', formula: '(ac + realizavel_lp) / (pc + exigivel_lp)' },
  { id: 'pct', grupo: 'Endividamento', nome: 'Part. de Capital de Terceiros (PCT)', tipo: 'x', sufixo: 'x', regra: 'baixo', balanco: true, info: 'Alavancagem: (PC + ELP) ÷ Patrimônio Líquido', formula: '(pc + exigivel_lp) / patrimonio_liquido' },
  { id: 'ce', grupo: 'Endividamento', nome: 'Composição do Endividamento (CE)', tipo: 'pct', regra: 'baixo', balanco: true, info: 'Dívida de curto prazo: Passivo Circulante ÷ Dívida Total', formula: 'passivo_circulante / (pc + exigivel_lp)' },
  { id: 'ipl', grupo: 'Endividamento', nome: 'Imobilização do PL (IPL)', tipo: 'x', sufixo: 'x', regra: 'baixo', balanco: true, info: 'Recursos próprios imobilizados: Ativo Permanente ÷ Patrimônio Líquido', formula: 'ativo_permanente / patrimonio_liquido' },
  { id: 'roa', grupo: 'Rentabilidade', nome: 'ROA', tipo: 'pct', regra: 'alto', balanco: true, info: 'Retorno sobre o total do ativo: Lucro Líquido ÷ Total do Ativo', formula: 'lucro_liquido / total_ativo' },
  { id: 'roe', grupo: 'Rentabilidade', nome: 'ROE', tipo: 'pct', regra: 'alto', balanco: true, info: 'Retorno sobre o patrimônio líquido: Lucro Líquido ÷ Patrimônio Líquido', formula: 'lucro_liquido / patrimonio_liquido' },
  { id: 'margem_liquida', grupo: 'Rentabilidade', nome: 'Margem Líquida', tipo: 'pct', regra: 'alto', info: 'Lucratividade líquida: Lucro Líquido ÷ Receita', formula: 'lucro_liquido / receita' },
  { id: 'margem_operacional', grupo: 'Rentabilidade', nome: 'Margem Operacional', tipo: 'pct', regra: 'alto', info: 'Margem operacional líquida: EBIT ÷ Receita', formula: 'resultado_operacional / receita' },
  { id: 'nopat', grupo: 'Valor econômico', nome: 'NOPAT (R$ mi)', tipo: 'mi', regra: 'alto', info: 'Lucro operacional líquido tributado: EBIT × (1 - alíquota)', formula: 'ebit * (1 - aliquota)' },
  { id: 'capital_investido', grupo: 'Valor econômico', nome: 'Capital Investido (R$ mi)', tipo: 'mi', kpi: false, balanco: true, info: 'Base de capital oneroso: Patrimônio Líquido + Empréstimos', formula: 'patrimonio_liquido + emprestimos' },
  { id: 'eva', grupo: 'Valor econômico', nome: 'EVA (R$ mi)', tipo: 'mi', regra: 'sinal', balanco: true, info: 'Valor econômico agregado: NOPAT - WACC × Capital Investido', formula: 'nopat - wacc * capital_investido' },
  { id: 'eva_ci', grupo: 'Valor econômico', nome: 'EVA / Capital Investido', tipo: 'pct', regra: 'alto', balanco: true, info: 'Retorno residual por unidade de capital investido', formula: 'eva / capital_investido' },
  { id: 'mva', grupo: 'Valor econômico', nome: 'MVA aproximado (R$ mi)', tipo: 'mi', regra: 'alto', balanco: true, info: 'Valor de mercado agregado estimado: EVA ÷ WACC', formula: 'eva / wacc' }
];

function linhaIndices(ano) {
  if (!resultado || !resultado.indices || !resultado.indices.por_ano) return null;
  const base = resultado.indices.por_ano.find(l => l.ano === Number(ano));
  if (!base) return null;
  const l = { ...base };
  if (tem(l.nopat) && tem(l.capital_investido) && l.capital_investido !== 0) {
    l.eva = l.nopat - wacc * l.capital_investido;
    l.eva_ci = l.eva / l.capital_investido;
    l.mva = wacc > 0 ? l.eva / wacc : null;
  } else {
    l.eva = null;
    l.eva_ci = null;
    l.mva = null;
  }
  return l;
}

const indicesPorAno = () => (resultado && resultado.indices && resultado.indices.por_ano)
  ? resultado.indices.por_ano.map(l => linhaIndices(l.ano))
  : [];

function valorIdx(def, l) {
  if (!def || !l) return null;
  if (def.id === 'roa' && l.roa_nc) return null;
  return tem(l[def.id]) ? l[def.id] : null;
}

function idxTemDados(def) {
  if (!def) return false;
  return indicesPorAno().some(l => valorIdx(def, l) !== null || (def.id === 'roa' && l.roa_nc));
}

const indicesAtivos = () => INDICES.filter(idxTemDados);

function indicesDisponiveis() {
  if (!resultado || !resultado.indices || !resultado.indices.por_ano || !resultado.indices.por_ano.length) {
    return false;
  }
  return INDICES.some(d => d.balanco && idxTemDados(d));
}

function fmtIdx(def, l) {
  if (def.id === 'roa' && l && l.roa_nc) return 'n/c';
  const v = valorIdx(def, l);
  if (v === null) return 'N/D';
  if (def.tipo === 'pct') return fmt(v * 100, 1) + '%';
  if (def.tipo === 'mi') return fmt(v, 0);
  return fmt(v, 2) + (def.sufixo || '');
}

function textoKpiIdx(def, l) {
  const t = fmtIdx(def, l);
  return def.tipo === 'mi' && t !== 'N/D' ? 'R$ ' + t + ' mi' : t;
}

function avaliarIndice(def, ano, l, lAnt) {
  const base = { id: def.id, nome: def.nome, valor: textoKpiIdx(def, l), info: def.info || '', formula: def.formula || null };
  const v = valorIdx(def, l);
  if (def.balanco && Number(ano) === ANO_ENCERRAMENTO) {
    return { ...base, status: 'neutro', motivo: 'Encerramento da concessão: não comparável' };
  }
  if (v === null) {
    return { ...base, status: 'neutro', motivo: 'Conta ausente neste ano' };
  }
  if (def.regra === 'liquidez') {
    return {
      ...base,
      status: v >= 1 ? 'bom' : (v >= 0.5 ? 'atencao' : 'ruim'),
      motivo: v >= 1 ? 'Cobre as obrigações (≥ 1,0)' : (v >= 0.5 ? 'Abaixo de 1,0' : 'Abaixo de 0,5')
    };
  }
  if (def.regra === 'sinal') {
    return {
      ...base,
      status: v > 0 ? 'bom' : 'ruim',
      motivo: v > 0 ? 'Cria valor (EVA > 0)' : 'Não cobre o custo de capital'
    };
  }
  const va = valorIdx(def, lAnt);
  if (va === null) return { ...base, status: 'neutro', motivo: 'Sem comparação' };
  const subiu = v >= va;
  const melhora = def.regra === 'baixo' ? !subiu || v === va : subiu;
  const delta = def.tipo === 'pct' ? fmt(Math.abs(v - va) * 100, 1) + ' p.p.' : (va !== 0 ? fmt(Math.abs(v / va - 1) * 100, 1) + '%' : '');
  return { ...base, status: melhora ? 'bom' : 'atencao', motivo: (subiu ? 'Subiu ' : 'Caiu ') + delta };
}

function itensIndicesAno(ano) {
  if (!indicesDisponiveis()) return [];
  const l = linhaIndices(ano), lAnt = linhaIndices(Number(ano) - 1);
  return indicesAtivos()
    .filter(d => d.kpi !== false && d.balanco && valorIdx(d, l) !== null)
    .map(d => avaliarIndice(d, ano, l, lAnt));
}

function htmlCartoes(lista) {
  return (lista || []).map(c => `<div class="achado ${c.tipo || 'info'}"><h3>${esc(c.titulo)}</h3>${
    String(c.texto || '').split('\n').map(p => `<p>${esc(p)}</p>`).join('')}</div>`).join('');
}

function htmlTabela(t) {
  if (!t || !t.cab) return '';
  const txt = new Set(t.txt || []);
  const cab = '<tr>' + t.cab.map((c, i) => `<th class="${txt.has(i) ? 'txt' : ''}">${esc(c)}</th>`).join('') + '</tr>';
  const corpo = (t.linhas || []).map(l => '<tr>' + l.map((c, i) => `<td class="${txt.has(i) ? 'txt' : ''}">${esc(c)}</td>`).join('') + '</tr>').join('');
  return cab + corpo;
}
