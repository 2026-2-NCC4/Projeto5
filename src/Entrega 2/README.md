# DataCore (PoC)

Site estático que roda Python no navegador (Pyodide). O usuário carrega o `Demonstrativo_Fecap_v3.csv` e o site calcula KPIs, estatística descritiva e regressões, e mostra os gráficos. Nenhum dado é enviado a servidor.

## Estrutura

- `index.html`: interface, gráficos (Plotly) e carregamento do Pyodide
- `python/analise.py`: leitura do CSV, EBITDA recalculado, KPIs, descritivas e regressões (pandas + numpy)
- `ferramentas/gerar_csv_teste.py`: gera um CSV sintético no mesmo formato para testes

## Rodar localmente

```
python -m http.server 8000
```

Abra http://localhost:8000 (não abra o index.html com duplo clique, o navegador bloqueia o fetch do .py).

## Publicar no GitHub Pages

1. Suba esta pasta para o repositório
2. Settings > Pages > Source: Deploy from a branch > `main` / `(root)`
3. O site fica em `https://<usuario>.github.io/<repositorio>/`

## Testar sem os dados reais

```
python ferramentas/gerar_csv_teste.py 200 latin-1 demonstrativo_teste.csv
```

Não suba o CSV real da CTI para o repositório.
