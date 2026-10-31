import ast
import json
import re
import unicodedata
from math import erfc, exp, lgamma, log, sqrt
from statistics import NormalDist
import numpy as np
import pandas as pd

# Multiplicador para milhões
MILHAO = 1e6

# Parâmetros dos índices de valor econômico (EVA/MVA)
WACC_PADRAO = 0.08       # custo de capital de referência (editável na tela)
ALIQUOTA_PADRAO = 0.34   # usada só se IR e resultado antes do IR não forem mapeados

# Contas padrão do sistema
CONTAS_PADRAO = {
    'DRE - Receita': 'receita',
    'DRE - Resultado Líquido': 'lucro_liquido',
    'DRE - Resultado Operacional': 'resultado_operacional',
    'DRE - Depreciação e Amortização': 'dep_amort',
    'DRE - EBITDA': 'ebitda_arquivo',
    'FLU - Geração de Caixa': 'caixa',
    'FLU - Investimentos': 'capex',
    'FLU - Despesas Financeiras': 'despfin',
    'FLU - Distribuição para Acionista': 'dist',
    'FLU - Saldo Final': 'saldo_final',
    'BAL - Ativo Circulante': 'ativo_circulante',
    'BAL - Passivo Circulante': 'passivo_circulante',
    'BAL - Disponível': 'disponivel',
    'BAL - Estoques Diversos': 'estoques',
    'BAL - Realizável a Longo Prazo': 'realizavel_lp',
    'BAL - Exigível a Longo Prazo': 'exigivel_lp',
    'BAL - Patrimônio Líquido': 'patrimonio_liquido',
    'BAL - Permanente': 'ativo_permanente',
    'BAL - Total do Ativo': 'total_ativo',
    'BAL - Empréstimos': 'emprestimos',
    'DRE - Imposto de Renda e Contribuição Social': 'imposto_renda',
    'DRE - Resultado Antes do Imposto de Renda': 'resultado_antes_ir',
}

# Campos opcionais usados nos índices financeiros (liquidez, endividamento, rentabilidade e EVA/MVA)
CAMPOS_BALANCO = [
    'ativo_circulante', 'passivo_circulante', 'disponivel', 'estoques', 'realizavel_lp',
    'exigivel_lp', 'patrimonio_liquido', 'ativo_permanente', 'total_ativo', 'emprestimos',
]
CAMPOS_DRE_EXTRA = ['imposto_renda', 'resultado_antes_ir']
# Contas de natureza credora (passivo e PL) costumam vir negativas no arquivo: os índices usam o valor absoluto da média
CAMPOS_CREDORES = {'passivo_circulante', 'exigivel_lp', 'patrimonio_liquido', 'emprestimos'}

# Sinônimos e nomes comuns para mapeamento automático (em ordem de prioridade por campo)
SINONIMOS_CONTAS = {
    'receita': [
        'DRE - Receita', 'Receita Líquida', 'Receita Operacional Líquida',
        'Receita Bruta', 'Receita Operacional Bruta', 'Receita Operacional',
        'Receita de Vendas', 'Faturamento', 'Faturamento Bruto', 'Faturamento Líquido',
        'Vendas Totais', 'Vendas Líquidas', 'Vendas Brutas', 'Vendas',
        'Total Revenue', 'Net Revenue', 'Gross Revenue', 'Operating Revenue',
        'Revenue', 'Net Sales', 'Gross Sales', 'Sales', 'Receita', 'FLU - Receita',
    ],
    'lucro_liquido': [
        'DRE - Resultado Líquido', 'Resultado Líquido do Exercício',
        'Resultado Líquido', 'Lucro Líquido', 'Lucro Líquido do Exercício',
        'Lucro/Prejuízo Líquido', 'Resultado Final', 'Lucro do Período',
        'Resultado do Exercício', 'Net Income', 'Net Profit', 'Net Earnings',
        'Profit After Tax', 'Bottom Line', 'DRE - Resultado Líquido após Equivalência',
    ],
    'resultado_operacional': [
        'DRE - Resultado Operacional', 'Resultado Operacional (EBIT)',
        'Resultado Operacional', 'EBIT', 'Lucro Operacional', 'LAJIR',
        'Operating Income', 'Operating Profit', 'Operating Result',
        'Earnings Before Interest and Taxes',
        'Lucro Antes dos Juros e Impostos', 'Resultado Antes dos Juros e Impostos',
    ],
    'dep_amort': [
        'DRE - Depreciação e Amortização', 'Depreciação e Amortização',
        'D&A', 'D & A', 'Depreciação & Amortização',
        'Depreciation and Amortization', 'Depreciation & Amortization',
        'Depreciação', 'Depreciation', 'Amortização', 'Amortization',
        'Encargos de Depreciação e Amortização',
    ],
    'ebitda_arquivo': [
        'DRE - EBITDA', 'EBITDA (Original)', 'EBITDA', 'EBITDA Reportado',
        'EBITDA Ajustado', 'LAJIDA',
        'Earnings Before Interest, Taxes, Depreciation and Amortization',
        'Lucro Antes de Juros, Impostos, Depreciação e Amortização',
    ],
    'caixa': [
        'FLU - Geração de Caixa', 'Geração de Caixa', 'Fluxo de Caixa',
        'Fluxo de Caixa Livre', 'Fluxo de Caixa Operacional', 'Geração de Caixa Livre',
        'Geração Operacional de Caixa', 'Cash Flow', 'Free Cash Flow',
        'Operating Cash Flow', 'Net Cash Flow', 'FCO', 'FCL', 'FCF',
        'Variação de Caixa',
    ],
    'capex': [
        'FLU - Investimentos', 'Investimentos (CAPEX)', 'CAPEX',
        'Capital Expenditures', 'Capital Expenditure', 'Investimentos',
        'Compras de Ativo', 'Aquisição de Imobilizado', 'Investimento em Ativo Fixo',
        'Despesas de Capital', 'Adições ao Imobilizado',
    ],
    'despfin': [
        'FLU - Despesas Financeiras', 'DRE - Despesas Financeiras',
        'Despesas Financeiras', 'Despesa Financeira', 'Juros', 'Despesas com Juros',
        'Juros Pagos', 'Encargos Financeiros', 'Custo Financeiro',
        'Interest', 'Interest Expense', 'Interest Paid', 'Finance Cost',
        'Finance Costs', 'Financial Expenses',
    ],
    'dist': [
        'FLU - Distribuição para Acionista', 'Distribuição para Acionista',
        'Distribuição aos Acionistas', 'Distribuição de Lucros', 'Distribuição',
        'Dividendos', 'Dividendos Pagos', 'Dividends', 'Dividends Paid',
        'Payout', 'JCP', 'Juros sobre Capital Próprio', 'Proventos',
        'Remuneração aos Acionistas',
    ],
    'saldo_final': [
        'FLU - Saldo Final', 'Saldo Final de Caixa', 'Saldo Final',
        'Saldo de Caixa', 'Caixa Final', 'Ending Cash', 'Ending Cash Balance',
        'Closing Cash', 'Disponibilidades Finais', 'Caixa e Equivalentes Final',
    ],
    'ativo_circulante': [
        'BAL - Ativo Circulante', 'Ativo Circulante', 'Total do Ativo Circulante',
        'Current Assets', 'Total Current Assets',
    ],
    'passivo_circulante': [
        'BAL - Passivo Circulante', 'Passivo Circulante', 'Total do Passivo Circulante',
        'Current Liabilities', 'Total Current Liabilities',
    ],
    'disponivel': [
        'BAL - Disponível', 'Disponível', 'Disponibilidades', 'Caixa e Equivalentes de Caixa',
        'Caixa e Bancos', 'Cash and Cash Equivalents', 'Cash',
    ],
    'estoques': [
        'BAL - Estoques Diversos', 'Estoques', 'Estoque', 'Inventories', 'Inventory',
    ],
    'realizavel_lp': [
        'BAL - Realizável a Longo Prazo', 'Realizável a Longo Prazo',
        'Ativo Realizável a Longo Prazo', 'Long Term Receivables',
    ],
    'exigivel_lp': [
        'BAL - Exigível a Longo Prazo', 'Exigível a Longo Prazo', 'Passivo Não Circulante',
        'Long Term Liabilities', 'Non-Current Liabilities',
    ],
    'patrimonio_liquido': [
        'BAL - Patrimônio Líquido', 'Patrimônio Líquido', 'Total do Patrimônio Líquido',
        'Shareholders Equity', 'Total Equity', 'Equity', 'PL',
    ],
    'ativo_permanente': [
        'BAL - Permanente', 'Ativo Permanente', 'Permanente', 'Fixed Assets',
    ],
    'total_ativo': [
        'BAL - Total do Ativo', 'Total do Ativo', 'Ativo Total', 'Total Assets',
    ],
    'emprestimos': [
        'BAL - Empréstimos', 'Empréstimos', 'Empréstimos e Financiamentos', 'Financiamentos',
        'Dívida Bruta', 'Loans', 'Borrowings',
    ],
    'imposto_renda': [
        'DRE - Imposto de Renda e Contribuição Social', 'Imposto de Renda e Contribuição Social',
        'IRPJ e CSLL', 'Imposto de Renda', 'Provisão para IR e CSLL', 'Income Tax',
    ],
    'resultado_antes_ir': [
        'DRE - Resultado Antes do Imposto de Renda', 'Resultado Antes do Imposto de Renda',
        'Resultado Antes dos Impostos', 'Lucro Antes do Imposto de Renda', 'LAIR',
        'Earnings Before Tax', 'EBT',
    ],
}

# Termos que invalidam a associação automática para evitar falsos positivos
EXCLUSOES_CONTAS = {
    'receita': ['financeir', 'diferid', 'a receber'],
    'lucro_liquido': ['acumulad', 'operacional', 'financeir', 'antes do imposto', 'retencao'],
    'resultado_operacional': ['outros resultados', 'liquido', 'financeir', 'ebitda', 'lajida', 'debito'],
    'dep_amort': ['acumulad', 'intangivel', 'ebitda', 'lajida', 'bal -', 'bal  -'],
    'ebitda_arquivo': [],
    'caixa': ['saldo', 'caixa final', 'ending cash'],
    'capex': ['bal -', 'bal  -'],
    'despfin': ['receita', 'resultado financeiro'],
    'dist': ['retencao'],
    'saldo_final': ['inicial', 'opening'],
    'ativo_circulante': ['nao circulante', 'passivo'],
    'passivo_circulante': ['nao circulante', 'ativo circulante'],
    'disponivel': ['saldo', 'final', 'flu -', 'dre -'],
    'estoques': ['provisao'],
    'realizavel_lp': ['dre -', 'flu -'],
    'exigivel_lp': ['realizavel', 'dre -', 'flu -'],
    'patrimonio_liquido': ['dre -', 'flu -'],
    'ativo_permanente': ['depreciacao', 'amortizacao', 'acumulad', 'dre -', 'flu -'],
    'total_ativo': ['passivo', 'dre -', 'flu -'],
    'emprestimos': ['dre -', 'flu -'],
    'imposto_renda': ['antes do', 'resultado', 'liquido', 'flu -'],
    'resultado_antes_ir': ['liquido', 'flu -'],
}

# Campos obrigatórios para a análise
OBRIGATORIAS = [
    'receita', 'lucro_liquido', 'resultado_operacional', 'dep_amort',
    'caixa', 'capex', 'despfin', 'dist', 'saldo_final',
]

# Colunas para gráficos e resumos
COLUNAS = ['receita', 'ebitda', 'lucro_liquido', 'caixa', 'dist', 'saldo_final', 'capex', 'despfin']
COLUNAS_DESCRITIVAS = ['receita', 'ebitda', 'lucro_liquido', 'caixa', 'dist', 'saldo_final']

# Detectar codificação do arquivo automaticamente
def detectar_encoding(caminho):
    with open(caminho, 'rb') as f:
        amostra = f.read(2_000_000)
    try:
        amostra.decode('utf-8')
        return 'utf-8'
    except UnicodeDecodeError:
        return 'latin-1'

# Converter strings numéricas para float (Padrão BR)
def converter_numero(serie):
    texto = serie.str.replace('.', '', regex=False).str.replace(',', '.', regex=False)
    return pd.to_numeric(texto, errors='coerce')

# Listar nomes únicos de contas no arquivo
def listar_contas_arquivo(caminho):
    encoding = detectar_encoding(caminho)
    # Lê apenas a coluna de nomes para agilizar
    df = pd.read_csv(caminho, sep=';', header=None, usecols=[2], names=['conta'], dtype=str, encoding=encoding)
    return sorted(df['conta'].dropna().str.strip().unique().tolist())

# Normalizar texto (minúsculas, sem acentos e espaços extras)
def normalizar_texto(texto):
    if not texto:
        return ''
    sem_acentos = ''.join(
        c for c in unicodedata.normalize('NFD', str(texto))
        if unicodedata.category(c) != 'Mn'
    )
    return re.sub(r'\s+', ' ', sem_acentos.lower()).strip()

# Remover prefixos contábeis padrão (DRE -, FLU -, BAL -)
def limpar_prefixo_conta(texto_norm):
    return re.sub(r'^(dre|flu|bal)\s*-\s*', '', texto_norm).strip()

# Calcular pontuação de similaridade entre uma conta do CSV e um campo do sistema
def pontuar_correspondencia(campo_id, conta_csv):
    c_norm = normalizar_texto(conta_csv)
    if not c_norm:
        return 0
    for termo_excluido in EXCLUSOES_CONTAS.get(campo_id, []):
        if termo_excluido in c_norm:
            return 0
    c_limpo = limpar_prefixo_conta(c_norm)
    sinonimos = SINONIMOS_CONTAS.get(campo_id, [])
    melhor = 0
    for indice, sinonimo in enumerate(sinonimos):
        s_norm = normalizar_texto(sinonimo)
        s_limpo = limpar_prefixo_conta(s_norm)
        penalidade = indice * 2
        if c_norm == s_norm:
            melhor = max(melhor, 1000 - penalidade)
        elif c_limpo == s_norm or c_limpo == s_limpo:
            melhor = max(melhor, 850 - penalidade)
        else:
            # Para siglas curtas (ex: EBIT, FCO, D&A), exigir fronteira de palavra
            if len(s_limpo) <= 4:
                padrao = r'(?:^|[\s\(\-/])' + re.escape(s_limpo) + r'(?:$|[\s\)\-/])'
                if re.search(padrao, c_limpo):
                    melhor = max(melhor, 650 - penalidade)
            else:
                if s_limpo in c_limpo or (len(c_limpo) >= 4 and c_limpo in s_limpo):
                    melhor = max(melhor, 600 - penalidade)
    return melhor

# Mapear automaticamente uma lista de contas do CSV para os campos do sistema
def auto_mapear_contas(contas):
    contas_limpas = [str(c).strip() for c in contas if c and str(c).strip()]
    candidatos = []
    for campo_id in SINONIMOS_CONTAS:
        for conta in contas_limpas:
            pontos = pontuar_correspondencia(campo_id, conta)
            if pontos > 0:
                candidatos.append((pontos, campo_id, conta))
    # Ordenar da maior pontuação para a menor para garantir atribuição 1-para-1 ótima
    candidatos.sort(key=lambda item: item[0], reverse=True)
    mapeado = {}
    contas_usadas = set()
    for pontos, campo_id, conta in candidatos:
        if campo_id not in mapeado and conta not in contas_usadas:
            mapeado[campo_id] = conta
            contas_usadas.add(conta)
    return mapeado

# Retornar sugestão de mapeamento em JSON (campo_sistema -> conta_csv)
def sugerir_mapeamento(contas):
    if isinstance(contas, str):
        contas = json.loads(contas)
    elif hasattr(contas, 'to_py'):
        contas = contas.to_py()
    return json.dumps(auto_mapear_contas(list(contas)))

# Carregar dados usando o mapeamento fornecido (ou auto-mapeamento) e campos extras
def carregar_base(caminho, mapa_usuario=None, campos_extras=None, mapeamento_extras=None):
    encoding = detectar_encoding(caminho)
    if mapa_usuario:
        mapa = mapa_usuario
    else:
        contas_arq = listar_contas_arquivo(caminho)
        sugestao = auto_mapear_contas(contas_arq)
        mapa = {conta_csv: campo_id for campo_id, conta_csv in sugestao.items()}
        if not mapa:
            mapa = CONTAS_PADRAO

    mapeamento_extras = mapeamento_extras or {}

    extras_simples = [
        c for c in (campos_extras or [])
        if c.get('tipo') == 'simples' and c.get('conta_csv') and c.get('id')
    ]
    contas_necessarias = set(mapa.keys()) | {c['conta_csv'] for c in extras_simples}

    partes = []
    linhas_lidas = 0
    leitor = pd.read_csv(
        caminho, sep=';', header=None, names=['ano', 'cen', 'conta', 'valor'],
        dtype=str, encoding=encoding, chunksize=200_000,
    )

    for pedaco in leitor:
        linhas_lidas += len(pedaco)
        pedaco = pedaco.dropna(subset=['conta'])
        pedaco['conta'] = pedaco['conta'].str.strip()
        # Filtrar apenas as contas mapeadas ou solicitadas em campos extras
        pedaco = pedaco[pedaco['conta'].isin(contas_necessarias)]
        partes.append(pedaco)

    longo = pd.concat(partes, ignore_index=True)
    if longo.empty:
        raise ValueError('Nenhuma conta mapeada encontrada no arquivo.')

    longo['valor'] = converter_numero(longo['valor'])
    longo['n'] = longo['ano'].str.extract(r'(\d+)')[0].astype(int)

    # Transformar linhas em colunas (pivoteamento)
    largo = longo.pivot_table(index=['n', 'cen'], columns='conta', values='valor', aggfunc='first')
    # Copiar colunas dos campos extras simples antes de renomear as contas padrão
    for extra in extras_simples:
        conta_origem = extra['conta_csv']
        if conta_origem in largo.columns:
            largo[extra['id']] = largo[conta_origem]
        else:
            raise ValueError(f"Conta '{conta_origem}' do campo extra '{extra.get('nome', extra['id'])}' não encontrada.")

    # Renomear para nomes internos do sistema
    largo = largo.rename(columns=mapa).reset_index()

    # Validar campos obrigatórios (ignora campos que venham de campos personalizados/fórmulas)
    faltando = [c for c in OBRIGATORIAS if c not in largo.columns and c not in mapeamento_extras]
    if faltando:
        raise ValueError('Campos obrigatórios ausentes: ' + ', '.join(faltando))

    return largo, linhas_lidas, encoding

# Avaliar expressão matemática de forma segura usando AST sobre colunas da base
def avaliar_formula_segura(base, expressao):
    texto = (expressao or '').strip()
    if not texto:
        raise ValueError('Fórmula vazia.')
    try:
        arvore = ast.parse(texto, mode='eval')
    except SyntaxError as erro:
        raise ValueError(f'Erro de sintaxe na fórmula "{texto}": {erro.msg}')

    colunas_proibidas = {'n', 'cen'}

    def avaliar_no(no):
        if isinstance(no, ast.Expression):
            return avaliar_no(no.body)
        if isinstance(no, ast.Constant) and isinstance(no.value, (int, float)):
            return float(no.value)
        if hasattr(ast, 'Num') and isinstance(no, ast.Num):
            return float(no.n)
        if isinstance(no, ast.Name):
            nome_var = no.id
            if nome_var in base.columns and nome_var not in colunas_proibidas:
                return base[nome_var].astype(float)
            raise ValueError(f"Campo '{nome_var}' não encontrado para cálculo da fórmula.")
        if isinstance(no, ast.UnaryOp):
            operando = avaliar_no(no.operand)
            if isinstance(no.op, ast.UAdd):
                return +operando
            if isinstance(no.op, ast.USub):
                return -operando
            raise ValueError('Operador unário não suportado.')
        if isinstance(no, ast.BinOp):
            esq = avaliar_no(no.left)
            dir_val = avaliar_no(no.right)
            if isinstance(no.op, ast.Add):
                return esq + dir_val
            if isinstance(no.op, ast.Sub):
                return esq - dir_val
            if isinstance(no.op, ast.Mult):
                return esq * dir_val
            if isinstance(no.op, ast.Div):
                with np.errstate(divide='ignore', invalid='ignore'):
                    res = esq / dir_val
                if isinstance(res, pd.Series):
                    return res.replace([np.inf, -np.inf], np.nan)
                return np.nan if not np.isfinite(res) else float(res)
            if isinstance(no.op, ast.Pow):
                return esq ** dir_val
            raise ValueError('Operador matemático não suportado.')
        if isinstance(no, ast.Call) and isinstance(no.func, ast.Name) and no.func.id == 'abs':
            if len(no.args) != 1:
                raise ValueError('A função abs() requer exatamente 1 argumento.')
            return np.abs(avaliar_no(no.args[0]))
        raise ValueError(f'Elemento não permitido na fórmula: {ast.dump(no)}')

    resultado = avaliar_no(arvore)
    if isinstance(resultado, (int, float, np.number)):
        resultado = pd.Series(float(resultado), index=base.index)
    return pd.Series(resultado, index=base.index).replace([np.inf, -np.inf], np.nan)

# Calcular métricas derivadas e campos personalizados
def montar_base_analitica(largo, campos_extras=None, mapeamento_extras=None):
    mapeamento_extras = mapeamento_extras or {}
    base = pd.DataFrame({'n': largo['n'], 'cen': largo['cen']})

    colunas_diretas = [
        'receita', 'lucro_liquido', 'resultado_operacional',
        'caixa', 'saldo_final', 'capex', 'despfin', 'dist'
    ]
    for col in colunas_diretas:
        if col in largo.columns:
            if col in ['capex', 'despfin', 'dist']:
                base[col] = largo[col].abs() / MILHAO
            else:
                base[col] = largo[col] / MILHAO
        elif col not in mapeamento_extras:
            base[col] = 0.0

    if 'dep_amort' in largo.columns:
        base['dep_amort'] = largo['dep_amort'].abs() / MILHAO
    elif 'dep_amort' not in mapeamento_extras:
        base['dep_amort'] = 0.0

    if 'ebitda_arquivo' in largo.columns:
        base['ebitda_arquivo'] = largo['ebitda_arquivo'] / MILHAO

    # Contas de balanço e de IR (opcionais): só entram se foram mapeadas, mantendo o sinal do arquivo
    for col in CAMPOS_BALANCO + CAMPOS_DRE_EXTRA:
        if col in largo.columns:
            base[col] = largo[col] / MILHAO

    extras = campos_extras or []
    # Primeiro aplica os campos extras simples (vindos diretamente do CSV)
    for extra in extras:
        if extra.get('tipo') == 'simples' and extra.get('id') in largo.columns:
            divisor = MILHAO if extra.get('dividir_milhao', True) else 1.0
            base[extra['id']] = largo[extra['id']] / divisor

    # Depois calcula os campos baseados em fórmula (podem referenciar campos padrão ou simples)
    for extra in extras:
        if extra.get('tipo') == 'formula' and extra.get('id'):
            base[extra['id']] = avaliar_formula_segura(base, extra.get('formula', ''))

    # Aplicar mapeamento de campos do sistema vinculados a campos personalizados (fórmulas ou simples)
    for campo_sistema, id_extra in mapeamento_extras.items():
        if id_extra in base.columns:
            valor = base[id_extra]
            if campo_sistema in ['dep_amort', 'capex', 'despfin', 'dist']:
                base[campo_sistema] = valor.abs()
            else:
                base[campo_sistema] = valor
        else:
            raise ValueError(f"Campo personalizado '{id_extra}' mapeado para '{campo_sistema}' não encontrado.")

    # Calcular ou atualizar EBITDA a partir do resultado operacional e dep_amort
    if 'resultado_operacional' in base.columns and 'dep_amort' in base.columns:
        base['ebitda'] = base['resultado_operacional'] + base['dep_amort'].abs()
    elif 'resultado_operacional' in base.columns:
        base['ebitda'] = base['resultado_operacional']

    return base

# Arredondar valores para o JSON
def limpar(valor, casas=4):
    if valor is None: return None
    valor = float(valor)
    if not np.isfinite(valor): return None
    return round(valor, casas)

# Agrupar médias por ano
def tabela_por_ano(base, ids_extras=None):
    extras = [c for c in (ids_extras or []) if c in base.columns]
    colunas_media = COLUNAS + (['ebitda_arquivo'] if 'ebitda_arquivo' in base else []) + extras
    medias = base.groupby('n')[colunas_media].mean()
    linhas = []
    for ano, linha in medias.iterrows():
        item = {'ano': int(ano)}
        for coluna in COLUNAS + extras:
            item[coluna] = limpar(linha[coluna], 3)
        item['margem_ebitda'] = limpar(linha['ebitda'] / linha['receita'])
        item['conversao'] = limpar(linha['caixa'] / linha['lucro_liquido'])
        if 'ebitda_arquivo' in medias.columns:
            item['ebitda_arquivo'] = limpar(linha['ebitda_arquivo'], 3)
            item['divergencia_ebitda'] = limpar(abs(linha['ebitda_arquivo'] - linha['ebitda']) / abs(linha['ebitda']))
        linhas.append(item)
    return linhas

# Gerar estatísticas descritivas
def descritivas(base, ids_extras=None):
    extras = [c for c in (ids_extras or []) if c in base.columns]
    saida = []
    for coluna in COLUNAS_DESCRITIVAS + extras:
        s = base[coluna].dropna()
        if s.empty:
            continue
        q1, q3 = s.quantile(0.25), s.quantile(0.75)
        iqr = q3 - q1
        fora = ((s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)).mean() * 100
        saida.append({
            'conta': coluna, 'media': limpar(s.mean(), 2), 'mediana': limpar(s.median(), 2),
            'desvio': limpar(s.std(), 2), 'minimo': limpar(s.min(), 2), 'maximo': limpar(s.max(), 2),
            'pct_outliers': limpar(fora, 2),
        })
    return saida

# ---------------------------------------------------------------------------
# Índices financeiros (liquidez, endividamento, rentabilidade, EVA/MVA)
# ---------------------------------------------------------------------------

# Divisão segura entre séries: denominador zero vira N/D
def _dividir(a, b):
    with np.errstate(divide='ignore', invalid='ignore'):
        r = a / b.where(b != 0)
    return r.replace([np.inf, -np.inf], np.nan)

# Calcular os índices por ano, usando a média dos cenários de cada ano (razão das médias)
def indices_por_ano(base, wacc=WACC_PADRAO):
    desejadas = ['receita', 'resultado_operacional', 'lucro_liquido', 'ebitda'] + CAMPOS_BALANCO + CAMPOS_DRE_EXTRA
    cols = [c for c in desejadas if c in base.columns]
    m = base.groupby('n')[cols].mean()
    vazio = pd.Series(np.nan, index=m.index)

    def conta(nome):
        if nome not in m.columns:
            return vazio
        s = m[nome]
        return s.abs() if nome in CAMPOS_CREDORES else s

    ac, pc, disp = conta('ativo_circulante'), conta('passivo_circulante'), conta('disponivel')
    rlp, elp, pl = conta('realizavel_lp'), conta('exigivel_lp'), conta('patrimonio_liquido')
    perm, ta, emp = conta('ativo_permanente'), conta('total_ativo'), conta('emprestimos')
    receita, ebit, ll, ebitda = conta('receita'), conta('resultado_operacional'), conta('lucro_liquido'), conta('ebitda')

    # Estoques ausentes em um ano (como no encerramento da concessão) contam como zero
    if 'estoques' in m.columns:
        liquidez_seca = _dividir(ac - m['estoques'].fillna(0.0), pc)
    else:
        liquidez_seca = vazio

    # Alíquota efetiva = IR / resultado antes do IR; sem essas contas, usa a alíquota padrão
    if 'imposto_renda' in m.columns and 'resultado_antes_ir' in m.columns:
        aliquota = _dividir(m['imposto_renda'].abs(), m['resultado_antes_ir'])
        aliquota = aliquota.where((aliquota >= 0) & (aliquota < 1)).fillna(ALIQUOTA_PADRAO)
        origem_aliquota = 'efetiva (IR ÷ resultado antes do IR)'
    else:
        aliquota = pd.Series(ALIQUOTA_PADRAO, index=m.index)
        origem_aliquota = 'padrão de %.0f%% (contas de IR não mapeadas)' % (ALIQUOTA_PADRAO * 100)

    nopat = ebit * (1 - aliquota)
    capital_investido = pl + emp
    eva = nopat - wacc * capital_investido
    mva = eva / wacc if wacc else vazio

    # Total do ativo quase zero (encerramento da concessão) deixa o ROA sem sentido
    roa = _dividir(ll, ta)
    ref_ativo = ta.abs().median()
    roa_nc = (ta.abs() < 0.01 * ref_ativo) if pd.notna(ref_ativo) and ref_ativo > 0 else pd.Series(False, index=m.index)

    tabela = pd.DataFrame({
        'ebitda': ebitda, 'margem_ebitda': _dividir(ebitda, receita),
        'lc': _dividir(ac, pc), 'ls': liquidez_seca, 'li': _dividir(disp, pc), 'lg': _dividir(ac + rlp, pc + elp),
        'pct': _dividir(pc + elp, pl), 'ce': _dividir(pc, pc + elp), 'ipl': _dividir(perm, pl),
        'roa': roa, 'roe': _dividir(ll, pl),
        'margem_liquida': _dividir(ll, receita), 'margem_operacional': _dividir(ebit, receita),
        'aliquota': aliquota, 'nopat': nopat, 'capital_investido': capital_investido,
        'eva': eva, 'eva_ci': _dividir(eva, capital_investido), 'mva': mva,
    })
    linhas = []
    for ano, linha in tabela.iterrows():
        item = {'ano': int(ano), 'roa_nc': bool(roa_nc.loc[ano])}
        for nome, valor in linha.items():
            item[nome] = limpar(valor, 4)
        linhas.append(item)

    faltando = [c for c in CAMPOS_BALANCO if c not in m.columns]
    return {
        'wacc': wacc, 'origem_aliquota': origem_aliquota,
        'campos_ausentes': faltando, 'por_ano': linhas,
    }


# ---------------------------------------------------------------------------
# Estatística da regressão (MQO com erros-padrão robustos, igual ao notebook da Entrega 2)
# ---------------------------------------------------------------------------

Z95 = 1.959963984540054

# Probabilidade P(Z > |z|) dupla da normal padrão (valor-p bicaudal)
def _p_normal(z):
    return erfc(abs(z) / sqrt(2.0))

# Cauda superior da gama incompleta regularizada Q(a, x), por série ou fração contínua
def _gama_superior(a, x):
    if x <= 0:
        return 1.0
    if x < a + 1.0:
        termo = soma = 1.0 / a
        ap = a
        for _ in range(1000):
            ap += 1.0
            termo *= x / ap
            soma += termo
            if abs(termo) < abs(soma) * 1e-15:
                break
        return max(0.0, 1.0 - soma * exp(-x + a * log(x) - lgamma(a)))
    tiny = 1e-300
    b = x + 1.0 - a
    c = 1.0 / tiny
    d = 1.0 / b
    h = d
    for i in range(1, 1000):
        an = -i * (i - a)
        b += 2.0
        d = an * d + b
        d = tiny if abs(d) < tiny else d
        c = b + an / c
        c = tiny if abs(c) < tiny else c
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < 1e-15:
            break
    return exp(-x + a * log(x) - lgamma(a)) * h

# Valor-p do qui-quadrado com gl graus de liberdade
def _p_qui2(x, gl):
    return _gama_superior(gl / 2.0, x / 2.0)

# Ajustar MQO e calcular erros-padrão robustos (HC3, ou agrupados por cenário quando cov='cluster')
def ajustar_mqo(y, X, cov='hc3', grupos=None):
    y = np.asarray(y, dtype=float)
    X = np.asarray(X, dtype=float)
    if X.ndim == 1:
        X = X[:, None]
    X1 = np.column_stack([np.ones(len(y)), X])
    n, k = X1.shape
    beta = np.linalg.lstsq(X1, y, rcond=None)[0]
    XtX_inv = np.linalg.pinv(X1.T @ X1)
    ajustados = X1 @ beta
    u = y - ajustados
    h = np.einsum('ij,jk,ik->i', X1, XtX_inv, X1)
    ssr = float(u @ u)
    sst = float(((y - y.mean()) ** 2).sum())
    if cov == 'cluster' and grupos is not None:
        codigos, _ = pd.factorize(np.asarray(grupos))
        g = int(codigos.max()) + 1
        escores = np.zeros((g, k))
        np.add.at(escores, codigos, X1 * u[:, None])
        miolo = escores.T @ escores
        correcao = (g / (g - 1.0)) * ((n - 1.0) / max(n - k, 1))
    else:
        peso = (u / np.clip(1.0 - h, 1e-12, None)) ** 2
        miolo = (X1 * peso[:, None]).T @ X1
        correcao = 1.0
    V = correcao * (XtX_inv @ miolo @ XtX_inv)
    erro = np.sqrt(np.clip(np.diag(V), 0, None))
    r2 = 1 - ssr / sst if sst > 0 else np.nan
    r2_aj = 1 - (1 - r2) * (n - 1) / max(n - k, 1) if np.isfinite(r2) else np.nan
    return {
        'beta': beta, 'erro': erro, 'u': u, 'h': h, 'ajustados': ajustados,
        'ssr': ssr, 'sst': sst, 'n': n, 'k': k, 'r2': r2, 'r2_aj': r2_aj, 'rmse': sqrt(ssr / n),
        'X1': X1, 'y': y,
    }

# Resumir coeficientes de um ajuste (a partir do índice 1, pois 0 é o intercepto)
def resumir_coeficientes(nomes, ajuste):
    saida = []
    for i, nome in enumerate(nomes):
        b, e = float(ajuste['beta'][i + 1]), float(ajuste['erro'][i + 1])
        z = b / e if e > 0 else np.nan
        saida.append({
            'variavel': nome, 'coef': limpar(b), 'erro_padrao': limpar(e),
            'z': limpar(z, 3), 'p_valor': limpar(_p_normal(z), 6) if np.isfinite(z) else None,
            'ic_inf': limpar(b - Z95 * e), 'ic_sup': limpar(b + Z95 * e),
        })
    return saida

# Resumo completo de um modelo (usado nos modelos por ano e no Ano 12)
def resumo_modelo(nome, ajuste, variaveis):
    return {
        'modelo': nome, 'n': int(ajuste['n']), 'r2': limpar(ajuste['r2']), 'r2_aj': limpar(ajuste['r2_aj']),
        'rmse': limpar(ajuste['rmse'], 2), 'intercepto': limpar(ajuste['beta'][0]),
        'coeficientes': resumir_coeficientes(variaveis, ajuste),
    }

# Matriz do modelo com efeito fixo de ano (uma dummy por ano, exceto o primeiro)
def _matriz_com_anos(df, variaveis, anos):
    colunas = [df[v].values for v in variaveis] + [(df['n'].values == a).astype(float) for a in anos[1:]]
    return np.column_stack(colunas)

# Fator de inflação da variância de cada variável (multicolinearidade), nos dados centrados por ano
def calcular_vif(dados_centrados, variaveis):
    Xd = dados_centrados[variaveis].values
    saida = []
    for j, nome in enumerate(variaveis):
        outras = np.delete(Xd, j, axis=1)
        Z = np.column_stack([np.ones(len(Xd)), outras])
        coef = np.linalg.lstsq(Z, Xd[:, j], rcond=None)[0]
        res = Xd[:, j] - Z @ coef
        sst = float(((Xd[:, j] - Xd[:, j].mean()) ** 2).sum())
        r2 = 1 - float(res @ res) / sst if sst > 0 else np.nan
        vif = 1.0 / (1.0 - r2) if np.isfinite(r2) and r2 < 1 - 1e-12 else np.nan
        saida.append({'variavel': nome, 'vif': limpar(vif, 3), 'r2_auxiliar': limpar(r2)})
    return saida

# Diagnóstico dos resíduos do modelo agrupado (variância, normalidade, pontos influentes, dependência entre anos)
def diagnosticos_residuos(regulares, ajuste):
    u, h, n, k = ajuste['u'], ajuste['h'], ajuste['n'], ajuste['k']
    X1 = ajuste['X1']

    # Breusch-Pagan: regressão do resíduo ao quadrado sobre os regressores
    u2 = u ** 2
    coef_bp = np.linalg.lstsq(X1, u2, rcond=None)[0]
    res_bp = u2 - X1 @ coef_bp
    sst_bp = float(((u2 - u2.mean()) ** 2).sum())
    r2_bp = 1 - float(res_bp @ res_bp) / sst_bp if sst_bp > 0 else 0.0
    lm = n * r2_bp
    gl_bp = k - 1

    # Jarque-Bera (normalidade), assimetria e curtose em excesso
    media = u.mean()
    m2 = float(((u - media) ** 2).mean())
    m3 = float(((u - media) ** 3).mean())
    m4 = float(((u - media) ** 4).mean())
    assimetria = m3 / m2 ** 1.5 if m2 > 0 else np.nan
    curtose = m4 / m2 ** 2 - 3 if m2 > 0 else np.nan
    jb = n / 6.0 * (assimetria ** 2 + curtose ** 2 / 4.0)

    # Distância de Cook
    s2 = ajuste['ssr'] / max(n - k, 1)
    cook = (u ** 2 / (k * s2)) * h / np.clip(1 - h, 1e-12, None) ** 2
    limite_cook = 4.0 / n
    acima = int((cook > limite_cook).sum())

    # Correlação dos resíduos entre anos seguidos do mesmo cenário
    tabela_res = pd.DataFrame({'cen': regulares['cen'].values, 'n': regulares['n'].values, 'res': u})
    pivo = tabela_res.pivot(index='cen', columns='n', values='res')
    correlacoes = []
    for ano in pivo.columns:
        if ano + 1 in pivo.columns:
            c = pivo[ano].corr(pivo[ano + 1])
            if pd.notna(c):
                correlacoes.append(c)
    lag1 = float(np.mean(correlacoes)) if correlacoes else np.nan

    # Amostras para os gráficos (resíduos x ajustados, Q-Q e histograma)
    rng = np.random.default_rng(1)
    idx = rng.choice(n, size=min(2000, n), replace=False)
    probs = (np.arange(1, 121) - 0.5) / 120.0
    teorico = [NormalDist().inv_cdf(float(p)) for p in probs]
    amostra_q = np.quantile(u, probs)
    contagens, bordas = np.histogram(u, bins=60)
    centros = (bordas[:-1] + bordas[1:]) / 2

    return {
        'bp_lm': limpar(lm, 2), 'bp_gl': int(gl_bp), 'bp_p': limpar(_p_qui2(lm, gl_bp), 6),
        'jb': limpar(jb, 2), 'jb_p': limpar(exp(-jb / 2.0), 6),
        'assimetria': limpar(assimetria, 3), 'curtose': limpar(curtose, 3),
        'cook_n': acima, 'cook_pct': limpar(acima / n * 100, 2), 'cook_limite': limpar(limite_cook, 6),
        'autocorrelacao': limpar(lag1, 3),
        'graficos': {
            'ajustados': [limpar(v, 2) for v in ajuste['ajustados'][idx]],
            'residuos': [limpar(v, 2) for v in u[idx]],
            'qq_teorico': [limpar(v, 4) for v in teorico],
            'qq_amostra': [limpar(v, 3) for v in amostra_q],
            'qq_reta': [limpar(media, 3), limpar(sqrt(m2), 3)],
            'hist_x': [limpar(v, 2) for v in centros],
            'hist_y': [int(v) for v in contagens],
        },
    }

# Validação em cenários novos: 70% dos cenários para treino e 30% para teste
def validar_em_cenarios_novos(regulares, variaveis, anos):
    cenarios = regulares['cen'].unique()
    rng = np.random.default_rng(42)
    teste_ids = rng.choice(cenarios, size=int(0.3 * len(cenarios)), replace=False)
    em_teste = regulares['cen'].isin(teste_ids).values
    treino, teste = regulares[~em_teste], regulares[em_teste]
    if len(treino) < 30 or len(teste) < 30:
        return None

    modelos = [
        ('Só a média do ano', []),
        ('EBITDA + ano', ['ebitda']),
        ('EBITDA + CAPEX + desp. fin. + ano (Modelo 3)', variaveis),
    ]
    linhas, pontos = [], None
    for nome, vars_modelo in modelos:
        Xt, Xe = _matriz_com_anos(treino, vars_modelo, anos), _matriz_com_anos(teste, vars_modelo, anos)
        ajuste = ajustar_mqo(treino['caixa'], Xt)
        prev_treino = ajuste['ajustados']
        prev_teste = np.column_stack([np.ones(len(Xe)), Xe]) @ ajuste['beta']
        obs = teste['caixa'].values
        erro = obs - prev_teste
        sst = float(((obs - obs.mean()) ** 2).sum())
        linhas.append({
            'modelo': nome,
            'rmse_treino': limpar(sqrt(float(np.mean((treino['caixa'].values - prev_treino) ** 2))), 2),
            'rmse_teste': limpar(sqrt(float(np.mean(erro ** 2))), 2),
            'mae_teste': limpar(float(np.mean(np.abs(erro))), 2),
            'r2_teste': limpar(1 - float(erro @ erro) / sst if sst > 0 else np.nan),
        })
        pontos = (prev_teste, obs)
    rng2 = np.random.default_rng(7)
    idx = rng2.choice(len(pontos[1]), size=min(1500, len(pontos[1])), replace=False)
    return {
        'n_treino': int(treino['cen'].nunique()), 'n_teste': int(teste['cen'].nunique()),
        'modelos': linhas,
        'previsto': [limpar(v, 2) for v in pontos[0][idx]], 'observado': [limpar(v, 2) for v in pontos[1][idx]],
    }

# Quanto cada variável varia entre cenários dentro de cada ano (coeficiente de variação, em %)
def variacao_por_ano(regulares):
    colunas = [c for c in ['ebitda', 'capex', 'despfin', 'dist'] if c in regulares.columns]
    dp = regulares.groupby('n')[colunas].std()
    media = regulares.groupby('n')[colunas].mean().abs()
    cv = (dp / media.where(media > 0)) * 100
    saida = []
    for ano, linha in cv.iterrows():
        item = {'ano': int(ano)}
        for c in colunas:
            item['cv_' + c] = limpar(linha[c], 2) if pd.notna(linha[c]) else 0.0
        saida.append(item)
    return saida

# Executar modelos de regressão
def regressoes(base):
    variaveis = ['ebitda', 'capex', 'despfin']
    obrigatorias = ['caixa'] + variaveis
    regulares = base[base['n'] <= 11].dropna(subset=obrigatorias)
    saida = {
        'por_ano': [], 'agrupado': None, 'ano12': [], 'ano_dist_variavel': [],
        'diagnosticos': None, 'validacao': None, 'variacao_por_ano': [],
        'especificacao': {'erros': 'HC3 (robustos à heterocedasticidade) nos modelos por ano; agrupados por cenário no Modelo 3'},
    }
    anos = sorted(regulares['n'].unique())

    for ano in anos:
        d = regulares[regulares['n'] == ano]
        a1 = ajustar_mqo(d['caixa'], d[['ebitda']])
        a2 = ajustar_mqo(d['caixa'], d[variaveis])
        item = resumo_modelo('Modelo 2', a2, variaveis)
        item['ano'] = int(ano)
        m1 = resumo_modelo('Modelo 1', a1, ['ebitda'])
        item['modelo1'] = {
            'r2': m1['r2'], 'r2_aj': m1['r2_aj'], 'rmse': m1['rmse'],
            'intercepto': m1['intercepto'], 'coeficiente': m1['coeficientes'][0],
        }
        item['r2_modelo1'] = limpar(a1['r2'])
        item['coef_ebitda_modelo1'] = limpar(a1['beta'][1])
        saida['por_ano'].append(item)
    saida['variacao_por_ano'] = variacao_por_ano(regulares)

    if len(anos) >= 2 and len(regulares) >= 50:
        a_m1 = ajustar_mqo(regulares['caixa'], regulares[['ebitda']])
        m1_pool = resumo_modelo('Modelo 1 agrupado', a_m1, ['ebitda'])

        # Modelo 3: efeito fixo de ano + erros-padrão agrupados por cenário
        X3 = _matriz_com_anos(regulares, variaveis, anos)
        a3 = ajustar_mqo(regulares['caixa'], X3, cov='cluster', grupos=regulares['cen'].values)
        a0 = ajustar_mqo(regulares['caixa'], _matriz_com_anos(regulares, [], anos))
        r2_interno = 1 - a3['ssr'] / a0['ssr'] if a0['ssr'] > 0 else np.nan

        grupo = regulares.groupby('n')
        centrados = regulares[variaveis] - grupo[variaveis].transform('mean')
        coeficientes = resumir_coeficientes(variaveis, a3)[:3]
        for c in coeficientes:
            c['efeito_1dp'] = limpar(c['coef'] * float(centrados[c['variavel']].std()), 2)

        rmse_ano = pd.Series(a3['u'] ** 2, index=regulares.index).groupby(regulares['n']).mean() ** 0.5
        saida['agrupado'] = {
            'r2_modelo1': limpar(a_m1['r2']), 'coef_ebitda_modelo1': limpar(a_m1['beta'][1]),
            'modelo1': {
                'r2': m1_pool['r2'], 'n': m1_pool['n'], 'coeficiente': m1_pool['coeficientes'][0],
                'intercepto': m1_pool['intercepto'],
            },
            'r2_interno': limpar(r2_interno), 'r2_total': limpar(a3['r2']), 'r2_ano_apenas': limpar(a0['r2']),
            'r2_aj': limpar(a3['r2_aj']), 'rmse': limpar(a3['rmse'], 2),
            'n': int(len(regulares)), 'n_cenarios': int(regulares['cen'].nunique()),
            'coeficientes': coeficientes,
            'rmse_por_ano': [{'ano': int(a), 'rmse': limpar(v, 2)} for a, v in rmse_ano.items()],
            'vif': calcular_vif(centrados, variaveis),
        }
        saida['diagnosticos'] = diagnosticos_residuos(regulares, a3)
        saida['validacao'] = validar_em_cenarios_novos(regulares, variaveis, anos)

    # Anos em que a distribuição varia entre cenários (nos demais ela é uma política fixa)
    for ano in anos:
        d = regulares[regulares['n'] == ano]
        if len(d) > 5 and float(d['dist'].std()) > 1e-9:
            vars_e = ['ebitda', 'dist', 'capex', 'despfin']
            saida['ano_dist_variavel'].append(dict(
                resumo_modelo('EBITDA + distribuição + CAPEX + desp. fin.', ajustar_mqo(d['caixa'], d[vars_e]), vars_e),
                ano=int(ano)))

    d12 = base[base['n'] == 12].dropna(subset=obrigatorias + ['dist'])
    if len(d12) > 5:
        especificacoes = [
            ('A: só EBITDA', ['ebitda']), ('B: só distribuição', ['dist']),
            ('C: EBITDA + distribuição', ['ebitda', 'dist']),
            ('D: EBITDA + distribuição + CAPEX', ['ebitda', 'dist', 'capex']),
            ('E: EBITDA + distribuição + CAPEX + desp. fin.', ['ebitda', 'dist', 'capex', 'despfin']),
        ]
        for nome, vars_modelo in especificacoes:
            saida['ano12'].append(resumo_modelo(nome, ajustar_mqo(d12['caixa'], d12[vars_modelo]), vars_modelo))
    return saida

# Extrair dados para gráficos Plotly
def dados_graficos(base, ids_extras=None):
    extras = [c for c in (ids_extras or []) if c in base.columns]
    saida = {'n': base['n'].astype(int).tolist()}
    for coluna in COLUNAS + extras:
        saida[coluna] = [limpar(v, 3) for v in base[coluna]]
    return saida

# Função principal de processamento
def processar(caminho, mapa_json=None, extras_json=None, wacc=WACC_PADRAO):
    mapa = json.loads(mapa_json) if mapa_json else None
    campos_extras = json.loads(extras_json) if extras_json else []

    # 1. Separar mapeamento de contas do CSV do mapeamento para campos personalizados
    mapa_csv = {}
    mapeamento_extras = {}
    ids_extras_cadastrados = {c.get('id') for c in campos_extras if c.get('id')}

    if mapa:
        for k, v in mapa.items():
            if k.startswith('__custom__:'):
                id_ext = k.replace('__custom__:', '')
                mapeamento_extras[v] = id_ext
            elif k in ids_extras_cadastrados:
                mapeamento_extras[v] = k
            else:
                mapa_csv[k] = v

    # 2. Identificar contas do arquivo CSV que possam ter sido usadas em fórmulas diretamente
    contas_arq = listar_contas_arquivo(caminho)
    mapa_slug_csv = {}
    for c in contas_arq:
        s1 = unicodedata.normalize('NFKD', str(c)).encode('ASCII', 'ignore').decode('ASCII')
        s1 = re.sub(r'[^a-zA-Z0-9]+', '_', s1).strip('_').lower()
        if s1:
            mapa_slug_csv[s1] = c
        s2 = re.sub(r'^(dre|flu|bal)\s*[-:_]\s*', '', s1)
        if s2 and s2 != s1:
            mapa_slug_csv[s2] = c

    # Se alguma fórmula usa esses identificadores sem estarem explícitos nos extras, adiciona como campo simples
    # (campos do sistema já mapeados, como ativo_circulante, não podem ser duplicados como campo simples)
    ids_mapeados = set(mapa_csv.values()) if mapa_csv else set()
    campos_extras_expandidos = list(campos_extras)
    ids_existentes = {c.get('id') for c in campos_extras_expandidos}
    for extra in campos_extras:
        if extra.get('tipo') == 'formula' and extra.get('formula'):
            tokens = set(re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', extra['formula']))
            for tok in tokens:
                if tok in mapa_slug_csv and tok not in ids_existentes and tok not in COLUNAS and tok not in ids_mapeados:
                    campos_extras_expandidos.append({
                        'id': tok,
                        'nome': mapa_slug_csv[tok],
                        'tipo': 'simples',
                        'conta_csv': mapa_slug_csv[tok],
                        'dividir_milhao': True
                    })
                    ids_existentes.add(tok)

    largo, linhas_lidas, encoding = carregar_base(caminho, mapa_csv, campos_extras_expandidos, mapeamento_extras)
    base = montar_base_analitica(largo, campos_extras_expandidos, mapeamento_extras)

    ids_extras = [c['id'] for c in campos_extras if c.get('id')]
    resultado = {
        'resumo': {
            'linhas_lidas': int(linhas_lidas), 'encoding': encoding,
            'cenarios': int(base['cen'].nunique()), 'anos': [int(a) for a in sorted(base['n'].unique())],
            'observacoes': int(len(base)),
        },
        'campos_extras': [
            {
                'id': c['id'],
                'nome': c.get('nome', c['id']),
                'tipo': c.get('tipo', 'simples'),
                'dividir_milhao': bool(c.get('dividir_milhao', c.get('tipo') == 'simples')),
                'formula': c.get('formula', ''),
                'conta_csv': c.get('conta_csv', ''),
            }
            for c in campos_extras if c.get('id') in base.columns
        ],
        'por_ano': tabela_por_ano(base, ids_extras),
        'descritivas': descritivas(base, ids_extras),
        'indices': indices_por_ano(base, float(wacc)),
        'regressoes': regressoes(base),
        'dados': dados_graficos(base, ids_extras),
    }
    return json.dumps(resultado)
