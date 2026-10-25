import sys
import numpy as np
import random

# Configuração
CENARIOS = int(sys.argv[1]) if len(sys.argv) > 1 else 100
ENCODING = sys.argv[2] if len(sys.argv) > 2 else 'latin-1'
SAIDA = sys.argv[3] if len(sys.argv) > 3 else 'demonstrativo_mapeamento.csv'

# Dicionário de variações para cada campo para testar o mapeamento
VARIACOES = {
    'DRE - Receita': ['Receita Bruta', 'Faturamento', 'Revenue', 'Sales', 'Vendas Totais'],
    'DRE - Resultado Líquido': ['Lucro Líquido', 'Net Income', 'Resultado Final', 'Net Profit'],
    'DRE - Resultado Operacional': ['EBIT', 'Lucro Operacional', 'Operating Income', 'Lajir'],
    'DRE - Depreciação e Amortização': ['D&A', 'Depreciacao', 'Depreciation', 'Amortizacao'],
    'DRE - EBITDA': ['EBITDA', 'Lajida', 'EBITDA Reportado'],
    'FLU - Geração de Caixa': ['Fluxo de Caixa', 'Cash Flow', 'Geracao de Caixa', 'FCO'],
    'FLU - Investimentos': ['CAPEX', 'Investimentos', 'Capital Expenditures', 'Compras de Ativo'],
    'FLU - Despesas Financeiras': ['Juros', 'Interest', 'Finance Cost', 'Despesa Financeira'],
    'FLU - Distribuição para Acionista': ['Dividendos', 'Dividends', 'Payout', 'Distribuicao'],
    'FLU - Saldo Final': ['Saldo de Caixa', 'Ending Cash', 'Caixa Final', 'Saldo Final'],
}

# Sorteia um nome aleatório para cada campo neste arquivo específico
MAPA_SORTEADO = {original: random.choice(lista) for original, lista in VARIACOES.items()}

rng = np.random.default_rng(42)

# Formata números no padrão brasileiro (1.000,00)
def br(valor):
    texto = f'{valor:,.4f}'
    return texto.replace(',', '#').replace('.', ',').replace('#', '.')

linhas = []
print("--- Títulos sorteados para este arquivo ---")
for original, sorteado in MAPA_SORTEADO.items():
    print(f"{original} -> {sorteado}")
print("-------------------------------------------")

for ano in range(1, 13):
    base_receita = 6.0e9 * (1.05 ** ano)
    for c in range(1, CENARIOS + 1):
        cen = f'Total Cen_{c:05d}'
        
        # Simulação matemática para gerar dados realistas
        receita = base_receita + rng.normal(0, 5e7)
        op = 0.64 * receita + rng.normal(0, 3e7)
        dep = -0.1 * receita
        capex = -(4.3e8 + rng.normal(0, 8e7))
        despfin = -(7e8 + rng.normal(0, 1e7))
        dist = -(1.5e9 * (1.1 ** ano)) if ano not in (4, 12) else -(2.2e9 + rng.normal(0, 6e7))
        caixa = 0.5 * (op - dep) + 1.1 * capex + despfin + dist * 0.2 + rng.normal(0, 4e7)
        
        valores = {
            'DRE - Receita': receita,
            'DRE - Resultado Líquido': 0.36 * receita,
            'DRE - Resultado Operacional': op,
            'DRE - Depreciação e Amortização': dep,
            'DRE - EBITDA': (op - dep) * 1.07,
            'FLU - Geração de Caixa': caixa,
            'FLU - Investimentos': capex,
            'FLU - Despesas Financeiras': despfin,
            'FLU - Distribuição para Acionista': dist,
            'FLU - Saldo Final': 1e9 + caixa,
        }
        
        # Linha de cabeçalho do cenário
        linhas.append(f'Ano {ano};{cen};;0,025')
        
        # Adiciona os valores usando os títulos sorteados
        for conta_original, valor in valores.items():
            titulo_sorteado = MAPA_SORTEADO[conta_original]
            linhas.append(f'Ano {ano};{cen};{titulo_sorteado};{br(valor)}')

# Grava no arquivo
with open(SAIDA, 'w', encoding=ENCODING, newline='') as f:
    f.write('\n'.join(linhas) + '\n')

print(f"\nSucesso! Arquivo '{SAIDA}' gerado com {len(linhas)} linhas.")
print("Agora carregue este arquivo no DataCore para testar o mapeamento manual.")
