function obterCoresTema() {
  const ehEscuro = (typeof temaForcado !== 'undefined' && temaForcado)
    ? temaForcado === 'escuro'
    : document.documentElement.getAttribute('data-tema') === 'escuro';
  if (ehEscuro) {
    return {
      azul: '#5267C5',
      laranja: '#E07346',
      verde: '#9FC152',
      amarelo: '#E3B25D',
      vermelho: '#C6524E',
      teal: '#70BE96',
      roxo: '#6B57B4',
      rosa: '#DD85CD',
      texto: '#E9E3F3',
      grade: 'rgba(131, 123, 150, 0.25)',
      linhaZero: '#544F5E',
      fundo: 'rgba(0,0,0,0)'
    };
  }
  return {
    azul: '#5267C5',
    laranja: '#E07346',
    verde: '#9FC152',
    amarelo: '#E3B25D',
    vermelho: '#C6524E',
    teal: '#70BE96',
    roxo: '#6B57B4',
    rosa: '#DD85CD',
    texto: '#2A2534',
    grade: 'rgba(168, 163, 179, 0.25)',
    linhaZero: '#C4BABD',
    fundo: 'rgba(0,0,0,0)'
  };
}

const ASSETS_TEMA = {
  claro: {
    padrao: 'Assets/Sun n pressed.svg',
    pressionado: 'Assets/Sun pressed.svg'
  },
  escuro: {
    padrao: 'Assets/Moon n pressed.svg',
    pressionado: 'Assets/Moon pressed.svg'
  }
};

function atualizarIconeTema(pressionado = false) {
  const img = $('img-btn-tema');
  if (!img) return;
  const ehEscuro = document.documentElement.getAttribute('data-tema') === 'escuro';
  const config = ehEscuro ? ASSETS_TEMA.escuro : ASSETS_TEMA.claro;
  img.src = pressionado ? config.pressionado : config.padrao;
}

function aplicarTema(tema, atualizarGraficos = true) {
  document.documentElement.setAttribute('data-tema', tema);
  localStorage.setItem('datacore_tema', tema);
  atualizarIconeTema(false);
  if (atualizarGraficos && typeof resultado !== 'undefined' && resultado) {
    if (typeof desenharEvolucao === 'function') desenharEvolucao(false);
    if (typeof desenharConversao === 'function') desenharConversao(false);
    if (typeof desenharDistribuicao === 'function') desenharDistribuicao();
    if (typeof desenharIndices === 'function') desenharIndices(false);
    if (typeof desenharRegressoes === 'function') desenharRegressoes(false);
  }
}

function executarFallbackRadial(novo, x, y, raioFinal) {
  let overlay = $('overlay-radial-tema');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'overlay-radial-tema';
    document.body.appendChild(overlay);
  }

  const corFundo = novo === 'escuro' ? '#2A2534' : '#F0EEF5';
  overlay.style.backgroundColor = corFundo;
  overlay.style.clipPath = `circle(0px at ${x}px ${y}px)`;
  overlay.style.opacity = '1';
  overlay.classList.add('ativo');

  if (typeof overlay.animate === 'function') {
    const anim = overlay.animate(
      [
        { clipPath: `circle(0px at ${x}px ${y}px)` },
        { clipPath: `circle(${raioFinal}px at ${x}px ${y}px)` }
      ],
      {
        duration: 600,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'forwards'
      }
    );

    anim.onfinish = () => {
      aplicarTema(novo, true);
      overlay.style.transition = 'opacity 0.25s ease';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.classList.remove('ativo');
        overlay.style.transition = '';
      }, 250);
    };
  } else {
    aplicarTema(novo, true);
    overlay.classList.remove('ativo');
  }
}

function alternarTemaComRadial(evento) {
  const atual = document.documentElement.getAttribute('data-tema') === 'escuro' ? 'escuro' : 'claro';
  const novo = atual === 'escuro' ? 'claro' : 'escuro';

  const btn = $('btn-tema');
  const rect = (btn && typeof btn.getBoundingClientRect === 'function')
    ? btn.getBoundingClientRect()
    : { left: (typeof window !== 'undefined' ? window.innerWidth : 1200) - 60, top: 40, width: 60, height: 60 };
  const larguraJanela = (typeof window !== 'undefined' ? window.innerWidth : 1200);
  const alturaJanela = (typeof window !== 'undefined' ? window.innerHeight : 800);

  const x = (evento && typeof evento.clientX === 'number' && evento.clientX > 0)
    ? evento.clientX
    : (rect.left + rect.width / 2);
  const y = (evento && typeof evento.clientY === 'number' && evento.clientY > 0)
    ? evento.clientY
    : (rect.top + rect.height / 2);

  const raioFinal = Math.hypot(
    Math.max(x, larguraJanela - x),
    Math.max(y, alturaJanela - y)
  );

  if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function' &&
      !(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    const transicao = document.startViewTransition(() => {
      aplicarTema(novo, true);
    });

    transicao.ready.then(() => {
      if (typeof document.documentElement.animate === 'function') {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${raioFinal}px at ${x}px ${y}px)`
            ]
          },
          {
            duration: 650,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            pseudoElement: '::view-transition-new(root)'
          }
        );
      }
    }).catch(() => {
      aplicarTema(novo, true);
    });
    return;
  }

  executarFallbackRadial(novo, x, y, raioFinal);
}

function inicializarTema() {
  try {
    if (typeof Image !== 'undefined') {
      [
        ASSETS_TEMA.claro.padrao,
        ASSETS_TEMA.claro.pressionado,
        ASSETS_TEMA.escuro.padrao,
        ASSETS_TEMA.escuro.pressionado
      ].forEach(src => {
        const i = new Image();
        i.src = src;
      });
    }
  } catch (e) {}

  const salvo = localStorage.getItem('datacore_tema');
  const prefereEscuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const tema = salvo || (prefereEscuro ? 'escuro' : 'claro');
  aplicarTema(tema, false);

  const btn = $('btn-tema');
  if (btn) {
    btn.onmousedown = () => atualizarIconeTema(true);
    btn.onmouseup = () => atualizarIconeTema(false);
    btn.onmouseleave = () => atualizarIconeTema(false);
    btn.ontouchstart = () => atualizarIconeTema(true);
    btn.ontouchend = () => atualizarIconeTema(false);
    btn.onclick = (e) => alternarTemaComRadial(e);
  }
}
