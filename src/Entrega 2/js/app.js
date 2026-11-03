async function iniciar() {
  try {
    carregando(true);
    status('Carregando Python...');
    pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
    await pyodide.loadPackage(['numpy', 'pandas']);
    const codigo = await (await fetch('python/analise.py?v=' + Date.now())).text();
    pyodide.FS.writeFile('/tmp/analise.py', codigo);
    pyodide.runPython("import sys; sys.path.insert(0, '/tmp'); sys.modules.pop('analise', None)");
    analise = pyodide.pyimport('analise');
    const inputArquivo = $('arquivo');
    if (inputArquivo) inputArquivo.disabled = false;
    status('Pronto.', 'ok');
  } catch (e) {
    status('Erro: ' + e.message, 'erro');
  } finally {
    carregando(false);
  }
}

function montarInterface() {
  const anos = resultado.resumo.anos;
  const selAno = $('filtro-ano');
  if (selAno) {
    selAno.innerHTML = '';
    anos.forEach(a => {
      const o = document.createElement('option');
      o.value = a;
      o.textContent = 'Ano ' + a;
      selAno.appendChild(o);
    });
    selAno.value = anos[anos.length - 1];
    selAno.onchange = () => desenharKpis(true);
  }

  const selC = $('filtro-conta');
  if (selC) {
    selC.innerHTML = '';
    const contasGrafico = ['caixa', 'receita', 'ebitda', 'lucro_liquido', 'dist', 'saldo_final']
      .concat((resultado.campos_extras || []).map(c => c.id));
    contasGrafico.forEach(c => {
      const o = document.createElement('option');
      o.value = c;
      o.textContent = ROTULOS[c] || c;
      selC.appendChild(o);
    });
    selC.onchange = desenharDistribuicao;
  }

  const selAH = $('filtro-ano-hist');
  if (selAH) {
    selAH.innerHTML = '';
    anos.forEach(a => {
      const o = document.createElement('option');
      o.value = a;
      o.textContent = 'Ano ' + a;
      selAH.appendChild(o);
    });
    selAH.onchange = desenharDistribuicao;
  }

  desenharKpis(true);
  desenharMapa(true);
  desenharAchados(true);
  desenharEvolucao(true);
  desenharConversao(true);
  desenharDistribuicao();
  desenharRegressoes(true);
  if (typeof desenharIndices === 'function') desenharIndices(true);
  if (typeof configurarWacc === 'function') configurarWacc();
}

document.addEventListener('DOMContentLoaded', () => {
  const inputArquivo = $('arquivo');
  if (inputArquivo) {
    inputArquivo.onchange = async e => {
      const arquivo = e.target.files[0];
      if (!arquivo) return;
      try {
        carregando(true);
        status('Lendo arquivo e mapeando contas automaticamente...');
        const buffer = new Uint8Array(await arquivo.arrayBuffer());
        pyodide.FS.writeFile('/tmp/dados.csv', buffer);
        const pyContas = analise.listar_contas_arquivo('/tmp/dados.csv');
        contasArquivo = pyContas.toJs ? pyContas.toJs() : Array.from(pyContas);
        exibirMapeamento(contasArquivo);
      } catch (err) {
        status('Erro ao ler arquivo: ' + err.message, 'erro');
      } finally {
        carregando(false);
      }
    };
  }

  const btnAddCampo = $('btn-adicionar-campo');
  if (btnAddCampo) {
    btnAddCampo.onclick = () => adicionarCampoExtra('simples');
  }

  const btnAutomapear = $('btn-automapear');
  if (btnAutomapear) {
    btnAutomapear.onclick = () => aplicarAutoMapeamento();
  }

  const btnAnalisar = $('btn-analisar');
  if (btnAnalisar) {
    btnAnalisar.onclick = async () => {
      try {
        carregando(true);
        status('Processando...');
        const extrasValidados = coletarCamposExtrasValidados();
        const mapa = {};
        CONTAS_SISTEMA.forEach(s => {
          const sel = $(`mapa-${s.id}`);
          if (sel && sel.value) mapa[sel.value] = s.id;
        });

        const resJson = analise.processar('/tmp/dados.csv', JSON.stringify(mapa), JSON.stringify(extrasValidados), wacc);
        resultado = JSON.parse(resJson);
        (resultado.campos_extras || []).forEach(c => { ROTULOS[c.id] = c.nome; });

        calcularRiscos();

        $('s-mapeamento').classList.add('oculto');
        $('painel').classList.remove('oculto');
        $('painel').classList.add('animar-surgir');

        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        montarInterface();
        requestAnimationFrame(() => window.scrollTo(0, 0));

        status('Sucesso.', 'ok');
      } catch (e) {
        status(e.message, 'erro');
      } finally {
        carregando(false);
      }
    };
  }

  if (typeof configurarExportacaoPdf === 'function') {
    configurarExportacaoPdf();
  }

  inicializarTema();
  inicializarNavegacao();
  iniciar();
});
