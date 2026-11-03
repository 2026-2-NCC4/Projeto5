let animacaoParticulasId = null;

function pararParticulas() {
  if (animacaoParticulasId && typeof window !== 'undefined' && window.cancelAnimationFrame) {
    window.cancelAnimationFrame(animacaoParticulasId);
    animacaoParticulasId = null;
  }
}

const SIMBOLOS_SVG = ['times', 'minus', 'plus', 'divide'];
const imagensSimbolos = {};
if (typeof Image !== 'undefined') {
  SIMBOLOS_SVG.forEach(nome => {
    const img = new Image();
    img.src = `Assets/${nome}.svg`;
    imagensSimbolos[nome] = img;
  });
}

function iniciarParticulas() {
  pararParticulas();
  const canvas = $('canvas-particulas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  function redimensionar() {
    const parent = canvas.parentElement;
    canvas.width = (parent && parent.clientWidth) || window.innerWidth || 1200;
    canvas.height = (parent && (parent.clientHeight || parent.offsetHeight)) || window.innerHeight || 700;
  }
  redimensionar();

  const TOTAL = 48;
  const particulas = [];
  for (let i = 0; i < TOTAL; i++) {
    const ehCirculo = Math.random() > 0.55;
    const tipo = ehCirculo
      ? 'circulo'
      : SIMBOLOS_SVG[Math.floor(Math.random() * SIMBOLOS_SVG.length)];

    const tamanhoBase = 7 + Math.random() * 6;
    let larg = tamanhoBase;
    let alt = tamanhoBase;

    if (tipo === 'divide') {
      larg = tamanhoBase * (548 / 573);
      alt = tamanhoBase;
    } else if (tipo === 'minus') {
      larg = tamanhoBase;
      alt = tamanhoBase * (164 / 548);
    }

    particulas.push({
      x: Math.random() * (canvas.width || 360),
      y: Math.random() * (canvas.height || 220),
      raio: 1.0 + Math.random() * 1.8,
      largura: larg,
      altura: alt,
      tipo,
      velocidade: 0.4 + Math.random() * 0.9,
      rotacao: Math.random() * Math.PI * 2,
      velRotacao: (Math.random() - 0.5) * 0.02,
      opacidadeBase: 0.35 + Math.random() * 0.45
    });
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const canvasLargura = canvas.width;
    const canvasAltura = canvas.height;

    particulas.forEach(p => {
      p.x -= p.velocidade;
      p.rotacao += p.velRotacao;

      if (p.x < -20) {
        p.x = canvasLargura + 15;
        p.y = Math.random() * canvasAltura;
      }

      const progressoX = Math.max(0, Math.min(1, p.x / (canvasLargura || 1)));
      const alfa = Math.max(0, Math.min(1, p.opacidadeBase * Math.pow(progressoX, 0.85)));

      ctx.save();
      ctx.globalAlpha = alfa;

      if (p.tipo === 'circulo') {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.raio, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const img = imagensSimbolos[p.tipo];
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotacao);
          ctx.drawImage(img, -p.largura / 2, -p.altura / 2, p.largura, p.altura);
        }
      }
      ctx.restore();
    });

    animacaoParticulasId = (typeof window !== 'undefined' && window.requestAnimationFrame)
      ? window.requestAnimationFrame(loop)
      : null;
  }

  loop();
}
