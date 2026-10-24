<h1 align="center">FECAP - Fundação de Comércio Álvares Penteado</h1>

<p align="center">
<a href= "https://www.fecap.br/"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhZPrRa89Kma0ZZogxm0pi-tCn_TLKeHGVxywp-LXAFGR3B1DPouAJYHgKZGV0XTEf4AE&usqp=CAU" alt="FECAP - Fundação de Comércio Álvares Penteado" border="0"></a>
</p>

<h1>DataCore</h1>

## Integrantes: <a href="https://github.com/rodriguesbrun">Bruno Rodrigues Da Costa</a>, <a href="https://www.linkedin.com/in/guilherme-monteiro14/">Guilherme Monteiro Da Silva</a>, <a href="https://github.com/DebatingAlpaca">João Pedro Da Silva</a>, <a href="https://github.com/StefanyO8">Stefany Samira De Oliveira Cubertino</a>

## Professores Orientadores: <a href="LINK_DO_EDUARDO" target="_blank">Eduardo Savino Gomes</a>, <a href="LINK_DO_LUIS" target="_blank">Luis Fernando dos Santos Pires</a>, <a href="LINK_DO_MAURICIO" target="_blank">Mauricio Lopes Da Cunha</a>, <a href="LINK_DO_RDRodnil" target="_blank">Rodnil da Silva Moreira Lisboa</a><br/>

## Descrição

<p align="center">
  <img src="/Imagens/logo-datacore.png" 
       alt="colocar logo depois" 
       border="5" 
       width="300">
</p>

<p align="center">
  <a href="https://drive.google.com/file/d/14UuWQmCJLFeeGj-yEF9QwDimVzR_On6b/view?usp=sharing">Documento PI</a>
</p>

<p>
<b>Visão Geral do Projeto</b><br>
O DataCore é um projeto interdisciplinar do 4º semestre de Ciência da Computação da FECAP, desenvolvido para a CTI Global, empresa especializada em gestão corporativa, planejamento e controle financeiro. A proposta é transformar uma base de dados financeiros simulados em uma solução analítica de apoio à análise e à tomada de decisão, cobrindo todo o ciclo de Ciência de Dados: identificação e preparação dos dados, análise descritiva e inferencial, definição de indicadores financeiros e publicação de um dashboard interativo na nuvem.

A base disponibilizada pela CTI foi gerada por uma simulação de Monte Carlo sobre o modelo financeiro de uma concessão de infraestrutura. Ela contém 12 anos de concessão e 1.200 cenários simulados para cada ano, com 69 contas financeiras (Balanço Patrimonial, DRE e Fluxo de Caixa). Cada cenário representa uma possibilidade de futuro para a mesma empresa, permitindo analisar não apenas valores médios, mas também a variabilidade e os diferentes comportamentos possíveis dentro das simulações.

<b>Problema e abordagem</b><br>
A investigação inicial identificou uma possível divergência entre o crescimento dos indicadores contábeis e a geração de caixa. Enquanto Receita, EBITDA e Resultado Líquido apresentam crescimento ao longo do horizonte, a Geração de Caixa apresenta maior variabilidade e períodos com comportamento negativo, com destaque para o Ano 12.

A partir dessa observação, a equipe definiu indicadores financeiros para acompanhar o desempenho da empresa, incluindo Receita, Margem EBITDA, Resultado Líquido, Geração de Caixa e o Índice de Conversão de Lucro em Caixa (ICC). As análises descritiva e inferencial serão utilizadas como base para a construção do produto final.

<b>Como o projeto foi construído</b><br>
O trabalho segue um processo reprodutível, executado em notebooks Python/Jupyter (Google Colab), e organizado nas etapas abaixo:

1. <b>Identificação e coleta das fontes:</b> a fonte principal é o arquivo <code>Demonstrativo_Fecap_v3.csv</code> (1.002.000 linhas em formato longo, sem cabeçalho, separador <code>;</code> e números no padrão brasileiro).
2. <b>Exploração e qualidade dos dados:</b> verificação de tipos, volume, valores ausentes, duplicidades e padrões estruturais. Foram identificadas 3 linhas de parâmetros auxiliares por cenário/ano (sem conta associada) e 27 contas de Balanço ausentes no Ano 12, que correspondem ao evento de liquidação do fim da concessão.
3. <b>Limpeza e uniformização:</b> conversão de valores do formato PT-BR para numérico, extração do número do ano, padronização do sinal das contas de Passivo e Patrimônio Líquido e confirmação de que contas com nomes semelhantes são, de fato, contas distintas.
4. <b>Derivação e integração:</b> recálculo do EBITDA a partir do Resultado Operacional e da Depreciação e Amortização (a coluna original divergia entre 1,6% e 15,6% conforme o ano) e transformação da tabela longa em uma base analítica no formato largo, com 14.400 linhas (1.200 cenários × 12 anos) e uma coluna por conta.
5. <b>Formatação:</b> as contas inexistentes no Ano 12 recebem o valor <code>N/D</code>, e não zero, para não serem confundidas com saldo zerado. Os parâmetros auxiliares são mantidos em uma tabela separada.
6. <b>Análise descritiva:</b> medidas de posição (média, mediana e moda aproximada) e de dispersão (variância, desvio padrão e coeficiente de variação), histogramas, boxplots por ano e identificação de valores atípicos pela regra do IQR, aplicadas às seis contas-chave: Receita, EBITDA, Resultado Líquido, Geração de Caixa, Distribuição para Acionistas e Saldo Final.
7. <b>Próximas etapas:</b> análise de regressão, indicadores financeiros com planilha de validação, análise de sensibilidade e construção do dashboard.

<b>Produto</b><br>
O objetivo final é desenvolver uma plataforma interativa que permita visualizar os principais indicadores, comparar os diferentes anos e cenários e apoiar a interpretação dos riscos e oportunidades presentes nas simulações financeiras. O dashboard deverá apresentar no mínimo cinco indicadores, filtros e comparações, notas metodológicas e análises de sensibilidade simples, além de ser publicado em ambiente de nuvem.

Nesta etapa inicial do projeto, já foram realizadas as análises e validações referentes às primeiras entregas de Contabilidade e Finanças e de Análise Inferencial. O desenvolvimento da plataforma e das demais funcionalidades ocorrerá nas próximas etapas do projeto.

<b>Tecnologias utilizadas</b><br>
Python, Pandas e NumPy para preparação e análise dos dados; Matplotlib e Seaborn para visualizações; Statsmodels para modelagem estatística e regressão; Jupyter e Google Colab para a execução reprodutível das análises; Streamlit para o dashboard; Git e GitHub para versionamento e gestão do projeto.

</p>

## 🛠 Estrutura de pastas

<pre>
├── Raiz
│
├── Imagens
│
├── src
│   ├── Entrega 1
│   │   ├── Backend
│   │   └── Frontend
│   └── Entrega 2
│       ├── Backend
│       └── Frontend
│
├── Documentos
│   ├── Entrega 1
│   │   ├── Entrega Análise Inferencial de Dados
│   │   ├── Entrega Contabilidade e Finanças
│   │   ├── Entrega Engenharia de Software e Arquitetura de Sistemas
│   │   └── Entrega Projeto Interdisciplinar Ciência de Dados
│   └── Entrega 2
│       ├── Entrega Análise Inferencial de Dados
│       ├── Entrega Contabilidade e Finanças
│       ├── Entrega Engenharia de Software e Arquitetura de Sistemas
│       └── Entrega Projeto Interdisciplinar Ciência de Dados
│
└── README.md
</pre>

<b>README.MD</b>: Arquivo que serve como guia e explicação geral sobre seu projeto. O mesmo que você está lendo agora.

Há também 3 pastas que seguem da seguinte forma:

<b>Imagens</b>: Pasta com as imagens utilizadas na documentação, como o logo do projeto.

<b>src</b>: Pasta que contém o código fonte, como os notebooks de preparação e análise dos dados e, futuramente, o dashboard.

<b>Documentos</b>: Pasta com todos os documentos importantes do projeto, separados por entrega e por disciplina.

<b>Entregas 1</b>: Todas as entregas para o dia 25 de Setembro, de todas as materias, estará nesta pasta.

<b>Entregas 2</b>: Todas as entregas para o dia 06 de Novembro, de todas as materias, estará nesta pasta.

### 🛠 Instalação

O projeto encontra-se em desenvolvimento. As análises realizadas até o momento são executadas principalmente por meio de notebooks Python/Jupyter.

Para obter o projeto:

```bash
git clone https://github.com/2026-2-NCC4/Projeto5
cd Projeto5
```

As instruções de execução da plataforma serão atualizadas nesta seção conforme o dashboard for implementado e publicado.

<b>Como utilizar</b><br>
Os notebooks da Entrega 1 podem ser executados no Google Colab ou em um ambiente Jupyter local, seguindo a ordem abaixo:

1. Preparação dos dados (<code>Entrega_1_Projeto_Interdisciplinar_Ciência_de_Dados.ipynb</code>): carrega o arquivo bruto, descreve e explora os dados, executa a limpeza, a derivação e a integração, e gera os arquivos <code>base_analitica_cti.csv</code> e <code>parametros_auxiliares.csv</code>.
2. Análise descritiva (<code>entrega1_analise_descritiva.ipynb</code>): calcula as medidas de posição e dispersão, gera histogramas e boxplots, identifica valores atípicos e exporta os resultados em um arquivo <code>.zip</code>.

O arquivo bruto <code>Demonstrativo Fecap v3.csv</code> é fornecido pela CTI e, por conter dados da parceira, deve ser colocado localmente (ou enviado ao Colab) e não deve ser publicado em repositório aberto.

### 💻 Configuração para Desenvolvimento

1. Clonar o repositório

```bash
git clone https://github.com/2026-2-NCC4/Projeto5
cd Projeto5
```

2. Criar o ambiente Python

Recomenda-se utilizar um ambiente virtual para instalar as dependências do projeto:

```bash
python -m venv .venv
```

No Windows:

```
.venv\Scripts\activate
```

No Linux/macOS:

```
source .venv/bin/activate
```

3. Instalar as dependências

```bash
pip install pandas numpy matplotlib seaborn statsmodels streamlit jupyter
```

4. Executar os notebooks

```bash
jupyter notebook
```

5. Executar o dashboard (disponível quando a Entrega 2 for concluída)

```bash
streamlit run app.py
```

## 📋 Licença/License

<a href="https://github.com/2026-2-NCC4/Projeto5">DataCore</a> © 2026 by <a href="https://github.com/2026-1-NCC3">FECAP, Bruno Rodrigues Da Costa, Guilherme Monteiro Da Silva, João Pedro Da Silva, Stefany Samira De Oliveira Cubertino</a> is licensed under <a href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International</a>

<p align="center"><br/><img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"></p>

## 🎓 Referências

Aqui estão as principais referências e ferramentas utilizadas no desenvolvimento do projeto.

1. <a href="https://www.python.org/">Python</a>: linguagem principal de todo o pipeline de dados.
2. <a href="https://pandas.pydata.org/">Pandas</a>: leitura, limpeza, integração e transformação das bases.
3. <a href="https://numpy.org/">NumPy</a>: cálculos numéricos e estatísticos.
4. <a href="https://matplotlib.org/">Matplotlib</a>: histogramas, boxplots e demais gráficos.
5. <a href="https://seaborn.pydata.org/">Seaborn</a>: visualizações estatísticas.
6. <a href="https://www.statsmodels.org/">Statsmodels</a>: análise inferencial e modelos de regressão.
7. <a href="https://streamlit.io/">Streamlit</a>: construção e publicação do dashboard interativo.
8. <a href="https://jupyter.org/">Jupyter</a>: notebooks de análise documentada.
9. <a href="https://colab.research.google.com/">Google Colab</a>: ambiente de execução em nuvem dos notebooks.
