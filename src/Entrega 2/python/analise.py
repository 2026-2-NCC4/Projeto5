import json
import numpy as np
import pandas as pd

MILHAO = 1e6

CONTAS = {
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

OBRIGATORIAS = [
    'receita', 'lucro_liquido', 'resultado_operacional', 'dep_amort',
    'caixa', 'capex', 'despfin', 'dist', 'saldo_final',
]

COLUNAS = ['receita', 'ebitda', 'lucro_liquido', 'caixa', 'dist', 'saldo_final', 'capex', 'despfin']
COLUNAS_DESCRITIVAS = ['receita', 'ebitda', 'lucro_liquido', 'caixa', 'dist', 'saldo_final']


def detectar_encoding(caminho):
    with open(caminho, 'rb') as f:
        amostra = f.read(2_000_000)
    try:
        amostra.decode('utf-8')
        return 'utf-8'
    except UnicodeDecodeError as e:
        if e.start >= len(amostra) - 4:
            return 'utf-8'
        return 'latin-1'


def converter_numero(serie):
    texto = serie.str.replace('.', '', regex=False).str.replace(',', '.', regex=False)
    return pd.to_numeric(texto, errors='coerce')


def carregar_base(caminho):
    encoding = detectar_encoding(caminho)
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
        pedaco = pedaco[pedaco['conta'].isin(CONTAS)]
        partes.append(pedaco)
    longo = pd.concat(partes, ignore_index=True)
    if longo.empty:
        raise ValueError(
            'Nenhuma das contas esperadas foi encontrada. Confira se o arquivo é o '
            'Demonstrativo_Fecap_v3.csv (separador ";", sem cabeçalho, colunas Ano;Cenário;Conta;Valor).'
        )
    longo['valor'] = converter_numero(longo['valor'])
    longo['n'] = longo['ano'].str.extract(r'(\d+)')[0].astype(int)
    largo = longo.pivot_table(index=['n', 'cen'], columns='conta', values='valor', aggfunc='first')
    largo = largo.rename(columns=CONTAS).reset_index()
    faltando = [c for c in OBRIGATORIAS if c not in largo.columns]
    if faltando:
        raise ValueError('Contas ausentes no arquivo: ' + ', '.join(faltando))
    return largo, linhas_lidas, encoding


def montar_base_analitica(largo):
    base = pd.DataFrame({'n': largo['n'], 'cen': largo['cen']})
    base['receita'] = largo['receita'] / MILHAO
    base['lucro_liquido'] = largo['lucro_liquido'] / MILHAO
    base['ebitda'] = (largo['resultado_operacional'] + largo['dep_amort'].abs()) / MILHAO
    base['caixa'] = largo['caixa'] / MILHAO
    base['dist'] = largo['dist'].abs() / MILHAO
    base['saldo_final'] = largo['saldo_final'] / MILHAO
    base['capex'] = largo['capex'].abs() / MILHAO
    base['despfin'] = largo['despfin'].abs() / MILHAO
    if 'ebitda_arquivo' in largo.columns:
        base['ebitda_arquivo'] = largo['ebitda_arquivo'] / MILHAO
    return base


def limpar(valor, casas=4):
    if valor is None:
        return None
    valor = float(valor)
    if not np.isfinite(valor):
        return None
    return round(valor, casas)


def tabela_por_ano(base):
    medias = base.groupby('n')[COLUNAS + (['ebitda_arquivo'] if 'ebitda_arquivo' in base else [])].mean()
    linhas = []
    for ano, linha in medias.iterrows():
        item = {'ano': int(ano)}
        for coluna in COLUNAS:
            item[coluna] = limpar(linha[coluna], 3)
        item['margem_ebitda'] = limpar(linha['ebitda'] / linha['receita'])
        item['conversao'] = limpar(linha['caixa'] / linha['lucro_liquido'])
        if 'ebitda_arquivo' in medias.columns:
            item['divergencia_ebitda'] = limpar(abs(linha['ebitda_arquivo'] - linha['ebitda']) / abs(linha['ebitda']))
        linhas.append(item)
    return linhas


def descritivas(base):
    saida = []
    for coluna in COLUNAS_DESCRITIVAS:
        s = base[coluna]
        q1, q3 = s.quantile(0.25), s.quantile(0.75)
        iqr = q3 - q1
        fora = ((s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)).mean() * 100
        saida.append({
            'conta': coluna,
            'media': limpar(s.mean(), 2),
            'mediana': limpar(s.median(), 2),
            'desvio': limpar(s.std(), 2),
            'minimo': limpar(s.min(), 2),
            'maximo': limpar(s.max(), 2),
            'pct_outliers': limpar(fora, 2),
        })
    return saida


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


def resumo_modelo(nome, beta, erro, r2, rmse, variaveis):
    return {
        'modelo': nome,
        'r2': limpar(r2),
        'rmse': limpar(rmse, 2),
        'coeficientes': [
            {'variavel': v, 'coef': limpar(beta[i + 1]), 'erro_padrao': limpar(erro[i + 1])}
            for i, v in enumerate(variaveis)
        ],
    }


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
            'r2_modelo1': limpar(r1),
            'coef_ebitda_modelo1': limpar(b1[1]),
            'r2_interno': limpar(r2_interno),
            'rmse': limpar(np.sqrt((residuo ** 2).mean()), 2),
            'n': int(len(regulares)),
            'coeficientes': [
                {'variavel': v, 'coef': limpar(beta[i])} for i, v in enumerate(variaveis)
            ],
        }

    d12 = base[base['n'] == 12]
    if len(d12) > 5:
        especificacoes = [
            ('A: só EBITDA', ['ebitda']),
            ('B: só distribuição', ['dist']),
            ('C: EBITDA + distribuição', ['ebitda', 'dist']),
            ('E: EBITDA + distribuição + CAPEX + desp. fin.', ['ebitda', 'dist', 'capex', 'despfin']),
        ]
        for nome, variaveis in especificacoes:
            b, e, r2, rmse = mqo(d12['caixa'], d12[variaveis])
            saida['ano12'].append(resumo_modelo(nome, b, e, r2, rmse, variaveis))
    return saida


def dados_graficos(base):
    saida = {'n': base['n'].astype(int).tolist()}
    for coluna in COLUNAS:
        saida[coluna] = base[coluna].round(3).tolist()
    return saida


def processar(caminho):
    largo, linhas_lidas, encoding = carregar_base(caminho)
    base = montar_base_analitica(largo)
    resultado = {
        'resumo': {
            'linhas_lidas': int(linhas_lidas),
            'encoding': encoding,
            'cenarios': int(base['cen'].nunique()),
            'anos': [int(a) for a in sorted(base['n'].unique())],
            'observacoes': int(len(base)),
        },
        'por_ano': tabela_por_ano(base),
        'descritivas': descritivas(base),
        'regressoes': regressoes(base),
        'dados': dados_graficos(base),
    }
    return json.dumps(resultado)
