// Apoio ao toque: acha no quadro o ponto que pisca no ritmo da ECU.
// Divide a imagem em células, guarda alguns segundos do brilho de cada uma (menos a mediana do quadro,
// para a auto-exposição não contar) e pontua quem acende e apaga com duração de pisca.

export interface Sugestao {
  cx: number;
  cy: number;
  raio: number;
  /** 0..1: quantos piscas plausíveis a célula vencedora teve, sobre 6. */
  confianca: number;
}

export interface ConfigDetector {
  celulaPx: number;
  janelaMs: number;
  amplitudeMinima: number;
  piscaMinMs: number;
  piscaMaxMs: number;
}

const PADRAO: ConfigDetector = {
  celulaPx: 8,
  janelaMs: 10000,
  amplitudeMinima: 6,
  piscaMinMs: 150,
  piscaMaxMs: 2500,
};

interface QuadroCelulas {
  t: number;
  valores: Float32Array;
}

export class DetectorPisca {
  private readonly cfg: ConfigDetector;
  private colunas = 0;
  private linhas = 0;
  private largura = 0;
  private altura = 0;
  private quadros: QuadroCelulas[] = [];

  constructor(cfg: Partial<ConfigDetector> = {}) {
    this.cfg = { ...PADRAO, ...cfg };
  }

  reiniciar(): void {
    this.quadros = [];
  }

  adicionar(t: number, lum: Uint8Array, largura: number, altura: number): void {
    const c = this.cfg.celulaPx;
    if (largura !== this.largura || altura !== this.altura) {
      this.largura = largura;
      this.altura = altura;
      this.colunas = Math.floor(largura / c);
      this.linhas = Math.floor(altura / c);
      this.quadros = [];
    }
    const n = this.colunas * this.linhas;
    const valores = new Float32Array(n);
    for (let lc = 0; lc < this.linhas; lc++) {
      for (let cc = 0; cc < this.colunas; cc++) {
        let soma = 0;
        for (let y = lc * c; y < (lc + 1) * c; y++) {
          const base = y * largura + cc * c;
          for (let x = 0; x < c; x++) soma += lum[base + x] as number;
        }
        valores[lc * this.colunas + cc] = soma / (c * c);
      }
    }
    const ordenados = Float32Array.from(valores).sort();
    const mediana = ordenados[n >> 1] ?? 0;
    for (let i = 0; i < n; i++) valores[i] = (valores[i] as number) - mediana;

    this.quadros.push({ t, valores });
    while (this.quadros.length > 0 && t - (this.quadros[0] as QuadroCelulas).t > this.cfg.janelaMs) {
      this.quadros.shift();
    }
  }

  private pontuar(celula: number): { pontos: number; validos: number } {
    const serie = this.quadros.map((q) => q.valores[celula] as number);
    const ordenada = [...serie].sort((a, b) => a - b);
    const p10 = ordenada[Math.floor(ordenada.length * 0.1)] as number;
    const p90 = ordenada[Math.floor(ordenada.length * 0.9)] as number;
    const amplitude = p90 - p10;
    if (amplitude < this.cfg.amplitudeMinima) return { pontos: 0, validos: 0 };
    const liga = p10 + amplitude * 0.65;
    const desliga = p10 + amplitude * 0.35;
    let aceso = false;
    let inicio = Number.NaN;
    let validos = 0;
    let invalidos = 0;
    for (let i = 0; i < serie.length; i++) {
      const v = serie[i] as number;
      const t = (this.quadros[i] as QuadroCelulas).t;
      if (!aceso && v > liga) {
        aceso = true;
        inicio = t;
      } else if (aceso && v < desliga) {
        aceso = false;
        if (!Number.isNaN(inicio)) {
          const d = t - inicio;
          if (d >= this.cfg.piscaMinMs && d <= this.cfg.piscaMaxMs) validos++;
          else invalidos++;
        }
      }
    }
    if (validos < 2 || invalidos * 2 > validos) return { pontos: 0, validos };
    return { pontos: amplitude * Math.min(validos, 6), validos };
  }

  sugerir(): Sugestao | null {
    if (this.quadros.length < 10) return null;
    const n = this.colunas * this.linhas;
    const pontos = new Float32Array(n);
    let melhor = -1;
    let melhorValidos = 0;
    for (let i = 0; i < n; i++) {
      const r = this.pontuar(i);
      pontos[i] = r.pontos;
      if (r.pontos > 0 && (melhor < 0 || r.pontos > (pontos[melhor] as number))) {
        melhor = i;
        melhorValidos = r.validos;
      }
    }
    if (melhor < 0) return null;

    // Centro = média ponderada das células fortes vizinhas; raio cobre o grupo.
    const c = this.cfg.celulaPx;
    const forte = (pontos[melhor] as number) * 0.4;
    const ml = Math.floor(melhor / this.colunas);
    const mc = melhor % this.colunas;
    let sx = 0;
    let sy = 0;
    let sp = 0;
    const membros: Array<[number, number]> = [];
    for (let lc = Math.max(0, ml - 3); lc <= Math.min(this.linhas - 1, ml + 3); lc++) {
      for (let cc = Math.max(0, mc - 3); cc <= Math.min(this.colunas - 1, mc + 3); cc++) {
        const p = pontos[lc * this.colunas + cc] as number;
        if (p < forte) continue;
        const x = (cc + 0.5) * c;
        const y = (lc + 0.5) * c;
        sx += x * p;
        sy += y * p;
        sp += p;
        membros.push([x, y]);
      }
    }
    const cx = sx / sp;
    const cy = sy / sp;
    let distancia = 0;
    for (const [x, y] of membros) distancia = Math.max(distancia, Math.hypot(x - cx, y - cy));
    const raioPx = distancia + c;
    return {
      cx: cx / this.largura,
      cy: cy / this.altura,
      raio: Math.min(0.15, Math.max(0.03, raioPx / this.largura)),
      confianca: Math.min(1, melhorValidos / 6),
    };
  }
}
