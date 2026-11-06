# Entregas do PI
### **DECLARAÇÃO DE USO DE INTELIGÊNCIA ARTIFICIAL**

## Entrega 1
<br><br>

### Módulo do sistema 1 – Ingestão e tratamento de dados

| **Aluno(s) Responsável(veis)** | Bruno Rodrigues Da Costa, Guilherme Monteiro Da Silva, João Pedro Da Silva, Stefany Samira De Oliveira Cubertino |
| :--- | :--- |
| **Ferramenta utilizada** | Claude (Anthropic) |
| **Versão/modelo** | Claude Sonnet 5.5 |
| **Disciplina / Trabalho** | Projeto Interdisciplinar: Ciência de Dados – código de leitura, limpeza e integração da base `Demonstrativo_Fecap_v3.csv` |
| **Finalidade de uso** | Utilizamos a ferramenta como apoio (auxílio, não autoria integral): sugestões de trechos de código em Python/pandas para leitura do CSV (separador ";", decimal ","), conversão de valores, pivotagem para o formato wide e marcação "N/D" das contas ausentes no Ano 12. Executamos, testamos e ajustamos o código. |
| ***Prompts* principais utilizados** | 1) Solicitamos exemplo de leitura de CSV sem cabeçalho com formato numérico brasileiro. 2) Solicitamos exemplo de pivotagem da base longa (Ano × Cenário × Conta) para a base analítica. 3) Solicitamos sugestão para sinalizar contas inexistentes sem usar zero. |
| **Trechos ou entregas afetadas** | Notebook `Entrega_1_Projeto_Interdisciplinar_Ciência_de_Dados.ipynb` (seções 2, 6, 7 e 8) e geração dos arquivos `base_analitica_cti.csv` e `parametros_auxiliares.csv`. |


### Módulo do sistema 2 – Análise descritiva

| **Aluno(s) Responsável(veis)** | Bruno Rodrigues Da Costa, Guilherme Monteiro Da Silva, João Pedro Da Silva, Stefany Samira De Oliveira Cubertino |
| :--- | :--- |
| **Ferramenta utilizada** | Claude (Anthropic) |
| **Versão/modelo** | Claude Sonnet 5.5 |
| **Disciplina / Trabalho** | Análise Inferencial de Dados – código da análise descritiva das seis contas-chave |
| **Finalidade de uso** | Utilizamos a ferramenta como apoio (auxílio, não autoria integral): sugestões de código para medidas de posição e dispersão, moda aproximada por faixas, histogramas, boxplots por ano (com e sem outliers) e fração de outliers pela regra do IQR. Escolhemos as contas, executamos o notebook e conferimos os resultados. |
| ***Prompts* principais utilizados** | 1) Solicitamos código para média, mediana, moda aproximada, variância, desvio padrão e coeficiente de variação. 2) Solicitamos código para boxplots por ano. 3) Solicitamos função para calcular a fração de outliers por conta e por ano. |
| **Trechos ou entregas afetadas** | Notebook `entrega1_analise_descritiva.ipynb` (passos 5 a 11) e figuras e tabelas exportadas no arquivo `entrega1_resultados.zip`. |

### Módulo do sistema 3 – Indicadores financeiros (EBITDA, liquidez, endividamento, rentabilidade, EVA/MVA)

| **Aluno(s) Responsável(veis)** | Bruno Rodrigues Da Costa, Guilherme Monteiro Da Silva, João Pedro Da Silva, Stefany Samira De Oliveira Cubertino |
| :--- | :--- |
| **Ferramenta utilizada** | Claude (Anthropic) |
| **Versão/modelo** | Claude Sonnet 5.5 |
| **Disciplina / Trabalho** | Contabilidade e Finanças – cálculo e validação dos indicadores a partir da base tratada |
| **Finalidade de uso** | Utilizamos a ferramenta como apoio (auxílio, não autoria integral): esclarecimento de fórmulas e sugestão de lógica para o cálculo do EBITDA recalculado, dos índices e do ranking dos anos. Conferimos os valores na planilha de validação com fórmulas ativas. |
| ***Prompts* principais utilizados** | 1) Solicitamos explicação das fórmulas dos índices. 2) Solicitamos sugestão de lógica para o ranking por pontuação com empates. 3) Solicitamos revisão do tratamento do Ano 12 como não comparável. |
| **Trechos ou entregas afetadas** | Lógica de cálculo dos indicadores e do ranking, e planilha de validação dos indicadores. |

## Entrega 2
<br><br>

### Módulo do sistema 1 – Modelos de regressão

| **Aluno(s) Responsável(veis)** | Bruno Rodrigues Da Costa, Guilherme Monteiro Da Silva, João Pedro Da Silva, Stefany Samira De Oliveira Cubertino |
| :--- | :--- |
| **Ferramenta utilizada** | Claude (Anthropic) |
| **Versão/modelo** | Claude Sonnet 5.5 |
| **Disciplina / Trabalho** | Análise Inferencial de Dados – código de regressão da Geração de Caixa (statsmodels, scipy, scikit-learn) |
| **Finalidade de uso** | Utilizamos a ferramenta como apoio (auxílio, não autoria integral): sugestões de código para os modelos OLS (simples, múltiplo por ano, com efeito fixo de ano e específicos do Ano 12), erros-padrão robustos (HC3) e agrupados por cenário, VIF, testes de resíduos e validação com separação treino/teste por cenário. Definimos as variáveis e a semente fixa, executamos o código e validamos os números. |
| ***Prompts* principais utilizados** | 1) Solicitamos código para regressão com erros-padrão robustos por ano. 2) Solicitamos código para o modelo com efeito fixo de ano e cálculo do R² interno. 3) Solicitamos código para diagnóstico de resíduos e validação em cenários não vistos. |
| **Trechos ou entregas afetadas** | Notebook `Entrega02_Analise_Regressao_CTI.ipynb` (seções 3 a 8) e tabelas e figuras geradas nas pastas `tabelas/` e `figuras/`. |


### Módulo do sistema 2 – Dashboard (Streamlit)

| **Aluno(s) Responsável(veis)** | Bruno Rodrigues Da Costa, Guilherme Monteiro Da Silva, João Pedro Da Silva, Stefany Samira De Oliveira Cubertino |
| :--- | :--- |
| **Ferramenta utilizada** | Claude (Anthropic) |
| **Versão/modelo** | Claude Sonnet 5.5 |
| **Disciplina / Trabalho** | Engenharia de Software e Arquitetura de Sistemas – telas do dashboard (indicadores, comparação lucro × caixa, distribuição dos cenários) |
| **Finalidade de uso** | Utilizamos a ferramenta como apoio (auxílio, não autoria integral): sugestões de organização do código em módulos (dados, cálculo, apresentação), exemplos de filtros por ano e gráficos interativos e revisão de boas práticas. Realizamos a implementação final, os testes e a publicação. |
| ***Prompts* principais utilizados** | 1) Solicitamos sugestão de estrutura modular para o app Streamlit. 2) Solicitamos exemplo de filtro por ano e gráficos de comparação entre lucro e caixa. 3) Solicitamos revisão de tratamento de erros no carregamento da base. |
| **Trechos ou entregas afetadas** | Arquivos do dashboard no diretório de código-fonte (carregamento de dados, funções de cálculo e telas). |

### Módulo do sistema 3 – Exportação e documentação técnica

| **Aluno(s) Responsável(veis)** | Bruno Rodrigues Da Costa, Guilherme Monteiro Da Silva, João Pedro Da Silva, Stefany Samira De Oliveira Cubertino |
| :--- | :--- |
| **Ferramenta utilizada** | Claude (Anthropic) |
| **Versão/modelo** | Claude Sonnet 5.5 |
| **Disciplina / Trabalho** | Engenharia de Software e Arquitetura de Sistemas – exportação de tabelas, `requirements.txt` e docstrings |
| **Finalidade de uso** | Utilizamos a ferramenta como apoio (auxílio, não autoria integral): sugestão de funções de exportação de tabelas em CSV/XLSX, redação de docstrings e comentários, e organização do arquivo de dependências. Revisamos, testamos e aprovamos o conteúdo final. |
| ***Prompts* principais utilizados** | 1) Solicitamos função para exportar tabelas de resultados em CSV e XLSX. 2) Solicitamos redação de docstrings para as funções de cálculo. 3) Solicitamos revisão do `requirements.txt` e das instruções de execução. |
| **Trechos ou entregas afetadas** | Funções de exportação, docstrings e comentários do código e arquivo `requirements.txt`. |

***Declaramos que o uso acima descrito está em conformidade com o GUIA PARA O USO RESPONSÁVEL DE
INTELIGÊNCIA ARTIFICIAL NA FECAP e que o conteúdo final é de nossa plena responsabilidade
autoral.***
