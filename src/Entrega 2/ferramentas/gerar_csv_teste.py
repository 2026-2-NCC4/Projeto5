import sys
import numpy as np

CENARIOS = int(sys.argv[1]) if len(sys.argv) > 1 else 200
ENCODING = sys.argv[2] if len(sys.argv) > 2 else 'latin-1'
SAIDA = sys.argv[3] if len(sys.argv) > 3 else 'demonstrativo_teste.csv'

rng = np.random.default_rng(42)


def br(valor):
    texto = f'{valor:,.4f}'
    return texto.replace(',', '#').replace('.', ',').replace('#', '.')


linhas = []
for ano in range(1, 13):
    base_receita = 6.0e9 * (1.05 ** ano)
    for c in range(1, CENARIOS + 1):
        cen = f'Total Cen_{c:05d}'
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
            'BAL - Total do Ativo': 1e10,
        }
        linhas.append(f'Ano {ano};{cen};;0,025138815')
        for conta, valor in valores.items():
            linhas.append(f'Ano {ano};{cen};{conta};{br(valor)}')

with open(SAIDA, 'w', encoding=ENCODING, newline='') as f:
    f.write('\n'.join(linhas) + '\n')
print(SAIDA, len(linhas), 'linhas')
