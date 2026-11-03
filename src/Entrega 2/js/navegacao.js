let telaAtual = 'tela-inicial';
let telaAnterior = 'tela-inicial';
let telaSobreTimeouts = [];

function limparTelaSobreTimeouts() {
  telaSobreTimeouts.forEach(t => clearTimeout(t));
  telaSobreTimeouts = [];
}

function animarTelaSobre() {
  limparTelaSobreTimeouts();
  const logo = document.querySelector('#tela-sobre .circulo-logo-sobre');
  const texto = document.querySelector('#tela-sobre .texto-tela-sobre');
  const btnGit = document.querySelector('#tela-sobre .btn-github-sobre');
  if (!logo || !texto) return;

  logo.classList.remove('ativo');
  texto.classList.remove('ativo');
  if (btnGit) btnGit.classList.remove('ativo');

  void logo.offsetWidth;
  void texto.offsetWidth;
  if (btnGit) void btnGit.offsetWidth;

  const t1 = setTimeout(() => {
    logo.classList.add('ativo');
  }, 40);

  const t2 = setTimeout(() => {
    texto.classList.add('ativo');
  }, 190);

  const t3 = setTimeout(() => {
    if (btnGit) btnGit.classList.add('ativo');
  }, 320);

  telaSobreTimeouts.push(t1, t2, t3);
}

function navegarPara(idDestino) {
  if (idDestino === 'voltar') {
    idDestino = (telaAnterior && telaAnterior !== 'tela-secundaria') ? telaAnterior : 'tela-inicial';
  }

  const telas = ['tela-inicial', 'tela-analise', 'tela-secundaria', 'tela-sobre'];
  telas.forEach(id => {
    const el = $(id);
    if (!el) return;
    if (id === idDestino) {
      el.classList.remove('oculto');
      el.classList.remove('animar-surgir');
      void el.offsetWidth;
      if (idDestino !== 'tela-sobre') {
        el.classList.add('animar-surgir');
      }
    } else {
      el.classList.add('oculto');
      el.classList.remove('animar-surgir');
    }
  });

  const barraSuperior = $('barra-superior');
  if (idDestino === 'tela-inicial') {
    document.body.classList.remove('com-barra-superior');
    if (barraSuperior) barraSuperior.classList.add('oculto');
    iniciarParticulas();
  } else {
    document.body.classList.add('com-barra-superior');
    if (barraSuperior) barraSuperior.classList.remove('oculto');
    pararParticulas();

    if (idDestino === 'tela-analise') {
      window.scrollTo(0, 0);
      if (typeof reiniciarAnimacoesGraficos === 'function') {
        reiniciarAnimacoesGraficos();
      }
    } else if (idDestino === 'tela-secundaria') {
      window.scrollTo(0, 0);
      const btnVoltarDoc = $('btn-voltar-doc');
      if (btnVoltarDoc) {
        btnVoltarDoc.textContent = (telaAnterior === 'tela-analise') ? '← Voltar ao Painel' : '← Voltar ao Menu';
      }
    } else if (idDestino === 'tela-sobre') {
      animarTelaSobre();
    }
  }

  telaAnterior = telaAtual;
  telaAtual = idDestino;
}

function inicializarNavegacao() {
  const btnAnalise = $('btn-ir-analise');
  if (btnAnalise) {
    btnAnalise.onclick = () => navegarPara('tela-analise');
  }

  const btnSecundaria = $('btn-ir-secundaria');
  if (btnSecundaria) {
    btnSecundaria.onclick = () => navegarPara('tela-secundaria');
  }

  const btnSobre = $('btn-ir-sobre');
  if (btnSobre) {
    btnSobre.onclick = () => navegarPara('tela-sobre');
  }

  const btnDocAtalho = $('btn-atalho-doc');
  if (btnDocAtalho) {
    btnDocAtalho.onclick = () => navegarPara('tela-secundaria');
  }

  document.querySelectorAll('[data-destino]').forEach(btn => {
    btn.onclick = () => {
      const destino = btn.getAttribute('data-destino') || 'tela-inicial';
      navegarPara(destino);
    };
  });

  window.addEventListener('resize', () => {
    const telaInicial = $('tela-inicial');
    if (telaInicial && !telaInicial.classList.contains('oculto')) {
      iniciarParticulas();
    }
  });

  iniciarParticulas();
}
