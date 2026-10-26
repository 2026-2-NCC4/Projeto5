import ast
import json
import re
import unicodedata
import numpy as np
import pandas as pd

# Multiplicador para milhões
MILHAO = 1e6

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
}

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

# Regressão linear simples (MQO)
def mqo(y, X):
    y = np.asarray(y, dtype=float)
    X1 = np.column_stack([np.ones(len(y)), np.asarray(X, dtype=float)])
    beta = np.linalg.lstsq(X1, y, rcond=None)[0]
    residuo = y - X1 @ beta
    ssr = float(residuo @ residuo)
    sst = float(((y - y.mean()) ** 2).sum())
    gl = max(len(y) - X1.shape[1], 1)
    cov = (ssr / gl) * np.linalg.pinv(X1.T @ X1)
    erro = np.sqrt(np.diag(cov))
    r2 = 1 - ssr / sst if sst > 0 else np.nan
    return beta, erro, r2, np.sqrt(ssr / len(y))

# Resumo do modelo estatístico
def resumo_modelo(nome, beta, erro, r2, rmse, variaveis):
    return {
        'modelo': nome, 'r2': limpar(r2), 'rmse': limpar(rmse, 2),
        'coeficientes': [{'variavel': v, 'coef': limpar(beta[i + 1]), 'erro_padrao': limpar(erro[i + 1])}
                         for i, v in enumerate(variaveis)],
    }

# Executar modelos de regressão
def regressoes(base):
    regulares = base[base['n'] <= 11]
    saida = {'por_ano': [], 'agrupado': None, 'ano12': []}
    for ano in sorted(regulares['n'].unique()):
        d = regulares[regulares['n'] == ano]
        b1, e1, r1, _ = mqo(d['caixa'], d[['ebitda']])
        variaveis = ['ebitda', 'capex', 'despfin']
        b2, e2, r2, rmse2 = mqo(d['caixa'], d[variaveis])
        item = resumo_modelo('Modelo 2', b2, e2, r2, rmse2, variaveis)
        item['ano'] = int(ano)
        item['r2_modelo1'] = limpar(r1)
        item['coef_ebitda_modelo1'] = limpar(b1[1])
        saida['por_ano'].append(item)
    if len(regulares):
        b1, e1, r1, _ = mqo(regulares['caixa'], regulares[['ebitda']])
        variaveis = ['ebitda', 'capex', 'despfin']
        grupo = regulares.groupby('n')
        yd = regulares['caixa'] - grupo['caixa'].transform('mean')
        Xd = regulares[variaveis] - grupo[variaveis].transform('mean')
        beta = np.linalg.lstsq(Xd.values, yd.values, rcond=None)[0]
        residuo = yd.values - Xd.values @ beta
        r2_interno = 1 - float(residuo @ residuo) / float((yd.values ** 2).sum())
        saida['agrupado'] = {
            'r2_modelo1': limpar(r1), 'coef_ebitda_modelo1': limpar(b1[1]),
            'r2_interno': limpar(r2_interno), 'rmse': limpar(np.sqrt((residuo ** 2).mean()), 2),
            'n': int(len(regulares)), 'coeficientes': [{'variavel': v, 'coef': limpar(beta[i])} for i, v in enumerate(variaveis)],
        }
    d12 = base[base['n'] == 12]
    if len(d12) > 5:
        especificacoes = [
            ('A: só EBITDA', ['ebitda']), ('B: só distribuição', ['dist']),
            ('C: EBITDA + distribuição', ['ebitda', 'dist']),
            ('E: EBITDA + distribuição + CAPEX + desp. fin.', ['ebitda', 'dist', 'capex', 'despfin']),
        ]
        for nome, variaveis in especificacoes:
            b, e, r2, rmse = mqo(d12['caixa'], d12[variaveis])
            saida['ano12'].append(resumo_modelo(nome, b, e, r2, rmse, variaveis))
    return saida

# Extrair dados para gráficos Plotly
def dados_graficos(base, ids_extras=None):
    extras = [c for c in (ids_extras or []) if c in base.columns]
    saida = {'n': base['n'].astype(int).tolist()}
    for coluna in COLUNAS + extras:
        saida[coluna] = [limpar(v, 3) for v in base[coluna]]
    return saida

# Função principal de processamento
def processar(caminho, mapa_json=None, extras_json=None):
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
    campos_extras_expandidos = list(campos_extras)
    ids_existentes = {c.get('id') for c in campos_extras_expandidos}
    for extra in campos_extras:
        if extra.get('tipo') == 'formula' and extra.get('formula'):
            tokens = set(re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', extra['formula']))
            for tok in tokens:
                if tok in mapa_slug_csv and tok not in ids_existentes and tok not in COLUNAS:
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
        'regressoes': regressoes(base),
        'dados': dados_graficos(base, ids_extras),
    }
    return json.dumps(resultado)
