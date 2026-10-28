// Gerador de "vídeo" sintético: painel escuro com a luz da injeção piscando um ou mais códigos,
// com ruído, tremida, reflexo, auto-exposição, outras luzes acesas e fps variados.
// Usado nos testes do decodificador e para gravar .y4m do E2E (câmera falsa do Chrome).

export interface TemposEcu {
  longoMs: number;
  curtoMs: number;
  /** Apagado entre dois piscas do mesmo dígito. */
  entrePiscasMs: number;
  /** Apagado entre o último longo e o primeiro curto do mesmo código. */
  entreDigitosMs: number;
  /** Apagado entre dois códigos. */
  pausaCodigoMs: number;
  /** Apagado depois do último código, antes de repetir a lista. */
  pausaCicloMs: number;
}

// Tempos provisórios; ver DECISOES.md para fonte e incerteza.
export const TEMPOS_ECU: TemposEcu = {
  longoMs: 1300,
  curtoMs: 400,
  entrePiscasMs: 400,
  entreDigitosMs: 400,
  pausaCodigoMs: 2500,
  pausaCicloMs: 2500,
};

export interface LinhaDoTempo {
  acesos: Array<[number, number]>;
  cicloMs: number;
}

export function linhaDoTempo(codigos: readonly number[], tempos: TemposEcu = TEMPOS_ECU): LinhaDoTempo {
  const acesos: Array<[number, number]> = [];
  let t = 0;
  codigos.forEach((codigo, i) => {
    const dezenas = Math.floor(codigo / 10);
    const unidades = codigo % 10;
    for (let d = 0; d < dezenas; d++) {
      acesos.push([t, t + tempos.longoMs]);
      t += tempos.longoMs + (d < dezenas - 1 ? tempos.entrePiscasMs : unidades > 0 ? tempos.entreDigitosMs : 0);
    }
    for (let u = 0; u < unidades; u++) {
      acesos.push([t, t + tempos.curtoMs]);
      t += tempos.curtoMs + (u < unidades - 1 ? tempos.entrePiscasMs : 0);
    }
    t += i < codigos.length - 1 ? tempos.pausaCodigoMs : tempos.pausaCicloMs;
  });
  // Sem código: luz apagada o tempo todo.
  return { acesos, cicloMs: Math.max(t, 1) };
}

export function acesoEm(linha: LinhaDoTempo, t: number): boolean {
  const local = ((t % linha.cicloMs) + linha.cicloMs) % linha.cicloMs;
  return linha.acesos.some(([a, b]) => local >= a && local < b);
}

/** PRNG determinístico (mulberry32) para o teste repetir igual. */
export function aleatorio(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Cena {
  largura: number;
  altura: number;
  fps: number;
  duracaoMs: number;
  codigos: number[];
  tempos: TemposEcu;
  /** Onde começa a gravação dentro do ciclo da ECU. */
  inicioMs: number;
  lampada: { cx: number; cy: number; raioPx: number };
  ruido: number;
  tremorPx: number;
  /** Deriva lenta do celular (braço cansando), em px por segundo, na diagonal. */
  derivaPxPorS: number;
  /**
   * Mancha de reflexo perto da luz. true = passeia ao acaso (mão que mexe);
   * 'periodico' = vai e volta em ciclo fixo (caso adversário: imita repetição).
   */
  reflexo: boolean | 'periodico';
  autoExposicao: boolean;
  luzesConstantes: boolean;
  /**
   * Uma luz vizinha grande e forte (ex.: cinto de segurança), com borra de brilho em volta (a câmera
   * "estoura" luz forte no escuro) e roteiro no tempo: cada trecho vale até `ateMs` (tempo da gravação).
   * Posição em raios da lâmpada da injeção, a partir do centro dela.
   */
  vizinha: Vizinha | null;
  jitterMs: number;
  /**
   * Converte a saída como o Chrome faz com o vídeo da câmera: luminância de 16–235 esticada para 0–255.
   * Painel escuro vai para perto de zero (foi o que derrubou a leitura no E2E com o cinto aceso).
   */
  faixaVideo: boolean;
  /** Probabilidade de a câmera perder um quadro. */
  quedaQuadros: number;
  semente: number;
}

export const CENA_PADRAO: Cena = {
  largura: 160,
  altura: 120,
  fps: 30,
  duracaoMs: 40000,
  codigos: [12],
  tempos: TEMPOS_ECU,
  inicioMs: 0,
  lampada: { cx: 0.5, cy: 0.5, raioPx: 5 },
  ruido: 0,
  tremorPx: 0,
  derivaPxPorS: 0,
  reflexo: false,
  autoExposicao: false,
  luzesConstantes: false,
  vizinha: null,
  jitterMs: 0,
  quedaQuadros: 0,
  faixaVideo: false,
  semente: 1,
};

export interface Vizinha {
  dx: number;
  dy: number;
  /** Raio em múltiplos do raio da lâmpada da injeção. */
  tamanho: number;
  nivel: number;
  roteiro: Array<{ ateMs: number; modo: 'acesa' | 'apagada' | 'pisca'; periodoMs?: number }>;
}

/** Cinto: pisca ~6 s depois da ignição e fica aceso (cinto solto). Ícone maior e mais forte que o da injeção. */
export const CINTO: Vizinha = {
  dx: 2.6,
  dy: 0,
  tamanho: 1.4,
  nivel: 250,
  roteiro: [
    { ateMs: 6000, modo: 'pisca', periodoMs: 1000 },
    { ateMs: Infinity, modo: 'acesa' },
  ],
};

export function vizinhaAcesa(v: Vizinha, t: number): boolean {
  const trecho = v.roteiro.find((r) => t < r.ateMs) ?? v.roteiro[v.roteiro.length - 1];
  if (!trecho || trecho.modo === 'apagada') return false;
  if (trecho.modo === 'acesa') return true;
  const p = trecho.periodoMs ?? 1000;
  return t % p < p / 2;
}

export interface Quadro {
  t: number;
  lum: Uint8Array;
}

function gaussiano(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Disco com borda suave de 1 px; devolve 0..1. */
function cobertura(dx: number, dy: number, r: number): number {
  const d = Math.sqrt(dx * dx + dy * dy);
  return Math.min(1, Math.max(0, r + 0.5 - d));
}

export function* gerarQuadros(parcial: Partial<Cena>): Generator<Quadro> {
  const cena: Cena = { ...CENA_PADRAO, ...parcial };
  const { largura: w, altura: h } = cena;
  const rand = aleatorio(cena.semente);
  const linha = linhaDoTempo(cena.codigos, cena.tempos);
  const periodo = 1000 / cena.fps;
  const total = Math.floor(cena.duracaoMs / periodo);

  const lx = cena.lampada.cx * w;
  const ly = cena.lampada.cy * h;
  const r = cena.lampada.raioPx;
  // Outras luzes do painel acesas direto com ignição ligada (óleo, bateria, freio), perto da injeção.
  const constantes: Array<[number, number, number]> = cena.luzesConstantes
    ? [
        [lx - r * 3.2, ly, 210],
        [lx + r * 3.4, ly + 1, 190],
        [lx + r * 0.5, ly - r * 3.3, 170],
      ]
    : [];

  // Começa em regime: se a gravação abre no meio de um pisca, a lâmpada já está acesa e a exposição já
  // se adaptou (não "acende" no primeiro quadro).
  const acesoNoInicio = acesoEm(linha, cena.inicioMs);
  let nivelLampada = acesoNoInicio ? 1 : 0;
  let ganho = cena.autoExposicao ? (acesoNoInicio ? 0.62 : 1.0) : 1;
  let nivelVizinha = cena.vizinha && vizinhaAcesa(cena.vizinha, 0) ? 1 : 0;
  let tAnterior = 0;
  let passeioX = 0;
  let passeioY = 0;
  let proximoBrilho = 1500 + rand() * 3000;
  /** Quadros entregues que ainda vão sair com clarão (conta quadro, não milissegundo). */
  let brilhoRestante = 0;
  let posRefX = 0;
  let posRefY = 0;
  let velRefX = 0;
  let velRefY = 0;

  for (let k = 0; k < total; k++) {
    let t = k * periodo;
    if (cena.jitterMs > 0) t += (rand() * 2 - 1) * cena.jitterMs;
    t = Math.max(t, tAnterior + 1);
    const dt = k === 0 ? periodo : t - tAnterior;
    tAnterior = t;
    // A física (lâmpada, exposição, tremida, reflexo) anda em todo passo; o quadro perdido só não é entregue.
    const perdido = cena.quedaQuadros > 0 && rand() < cena.quedaQuadros;

    const aceso = acesoEm(linha, t + cena.inicioMs);
    // Lâmpada incandescente: sobe e desce em ~40 ms.
    nivelLampada += ((aceso ? 1 : 0) - nivelLampada) * (1 - Math.exp(-dt / 40));

    const vizAcesa = cena.vizinha ? vizinhaAcesa(cena.vizinha, t) : false;
    nivelVizinha += ((vizAcesa ? 1 : 0) - nivelVizinha) * (1 - Math.exp(-dt / 40));
    if (cena.autoExposicao) {
      // A vizinha forte também puxa a exposição para baixo quando acende.
      const alvo = (aceso ? 0.62 : 1.0) * (vizAcesa ? 0.75 : 1) * (1 + 0.15 * Math.sin((2 * Math.PI * t) / 7000));
      ganho += (alvo - ganho) * (1 - Math.exp(-dt / 350));
    }

    let ox = 0;
    let oy = 0;
    if (cena.tremorPx > 0) {
      passeioX = passeioX * 0.95 + gaussiano(rand) * 0.3;
      passeioY = passeioY * 0.95 + gaussiano(rand) * 0.3;
      ox = cena.tremorPx * (0.6 * Math.sin((2 * Math.PI * t) / 230) + 0.4 * Math.tanh(passeioX));
      oy = cena.tremorPx * (0.6 * Math.cos((2 * Math.PI * t) / 310) + 0.4 * Math.tanh(passeioY));
    }

    // Reflexo: mancha clara que passeia perto da luz + clarões de 1 a 2 quadros no painel todo.
    let refX = 0;
    let refY = 0;
    let brilhoGlobal = 0;
    if (cena.reflexo === 'periodico') {
      refX = lx + r * 4 * Math.cos((2 * Math.PI * t) / 9000);
      refY = ly + r * 3 * Math.sin((2 * Math.PI * t) / 6000);
    } else if (cena.reflexo) {
      // Passeio aleatório suave, preso a uns 5 raios da luz.
      velRefX = velRefX * 0.97 + gaussiano(rand) * 0.02 - (posRefX / (r * 5)) * 0.01;
      velRefY = velRefY * 0.97 + gaussiano(rand) * 0.02 - (posRefY / (r * 4)) * 0.01;
      posRefX += velRefX * r * 0.3;
      posRefY += velRefY * r * 0.3;
      refX = lx + posRefX;
      refY = ly + r * 2.5 + posRefY;
    }
    if (cena.reflexo) {
      if (t >= proximoBrilho) {
        brilhoRestante = 1 + Math.floor(rand() * 2);
        proximoBrilho = t + 2000 + rand() * 3000;
      }
    }

    if (cena.derivaPxPorS > 0) {
      // Vai e volta devagar (±12 px), como braço que cede e corrige.
      const d = (cena.derivaPxPorS * t) / 1000;
      const ida = d % 48;
      const pos = ida < 24 ? ida - 12 : 36 - ida;
      ox += pos;
      oy += pos * 0.6;
    }
    if (perdido) continue;
    if (brilhoRestante > 0) {
      brilhoGlobal = 90;
      brilhoRestante--;
    }
    const lum = new Uint8Array(w * h);
    const lxt = lx + ox;
    const lyt = ly + oy;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        let v = 22 + (x / w) * 14 + (y / h) * 6;
        // Ícone apagado ainda aparece um pouco; aceso satura perto de 240.
        const c = cobertura(px - lxt, py - lyt, r);
        if (c > 0) v = v * (1 - c) + c * (48 + 192 * nivelLampada);
        for (const [cx, cy, nivel] of constantes) {
          const cc = cobertura(px - (cx + ox), py - (cy + oy), r * 0.9);
          if (cc > 0) v = v * (1 - cc) + cc * nivel;
        }
        if (cena.vizinha && nivelVizinha > 0.01) {
          const vz = cena.vizinha;
          const rv = r * vz.tamanho;
          const dxv = px - (lx + vz.dx * r + ox);
          const dyv = py - (ly + vz.dy * r + oy);
          const cv = cobertura(dxv, dyv, rv);
          if (cv > 0) v = v * (1 - cv * nivelVizinha) + cv * nivelVizinha * vz.nivel;
          // Borra: brilho espalhado em volta, como a câmera estoura luz forte no escuro.
          v += 45 * nivelVizinha * Math.exp(-(dxv * dxv + dyv * dyv) / (2 * (rv * 1.3) ** 2));
        }
        if (cena.reflexo) {
          const dx = (px - (refX + ox)) / (r * 1.6);
          const dy = (py - (refY + oy)) / (r * 1.0);
          v += 70 * Math.exp(-(dx * dx + dy * dy));
          v += brilhoGlobal;
        }
        v *= ganho;
        if (cena.ruido > 0) v += gaussiano(rand) * cena.ruido;
        if (cena.faixaVideo) v = ((v - 16) * 255) / 219;
        lum[y * w + x] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
    yield { t, lum };
  }
}
