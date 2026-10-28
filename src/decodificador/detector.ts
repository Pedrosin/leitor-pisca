// Apoio ao toque: acha no quadro o ponto que pisca no ritmo da ECU.
// Divide a imagem em células, guarda alguns segundos do brilho de cada uma (menos a mediana do quadro,
// para a auto-exposição não contar) e pontua quem acende e apaga com duração de pisca.
// Pisca é onda quadrada: quase todo quadro está perto do nível aceso ou do apagado. Tremida e reflexo
// variam de forma contínua e passam boa parte do tempo no meio; a "quadratura" separa os dois.

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
  /** Fração mínima de quadros perto de um dos dois níveis. */
  quadraturaMinima: number;
  /** Piscas plausíveis mínimos na janela. */
  piscasMinimos: number;
}

const PADRAO: ConfigDetector = {
  celulaPx: 8,
  janelaMs: 15000,
  amplitudeMinima: 6,
  piscaMinMs: 150,
  piscaMaxMs: 2500,
  quadraturaMinima: 0.7,
  piscasMinimos: 4,
};

interface QuadroCelulas {
  t: number;
  valores: Float32Array;
}

/**
 * Quantos piscas caem perto da mediana da sua família (curto ou longo, separados pelo maior salto de
 * duração). Pisca da ECU tem duas durações fixas; tremida e reflexo dão durações espalhadas.
 * Se menos de 3/4 forem regulares, a célula não conta. Filtro frouxo de propósito: aqui é candidato;
 * quem confirma que é a luz da injeção é o decodificador (BuscadorLuz).
 */
const TOLERANCIA_REGULAR = 0.3;
const FRACAO_REGULAR = 0.75;

function regulares(duracoes: number[]): number {
  if (duracoes.length === 0) return 0;
  const ordenadas = [...duracoes].sort((a, b) => a - b);
  let corte = ordenadas.length;
  let maiorRazao = 1.6;
  for (let i = 1; i < ordenadas.length; i++) {
    const razao = (ordenadas[i] as number) / (ordenadas[i - 1] as number);
    if (razao > maiorRazao) {
      maiorRazao = razao;
      corte = i;
    }
  }
  let bons = 0;
  for (const familia of [ordenadas.slice(0, corte), ordenadas.slice(corte)]) {
    if (familia.length === 0) continue;
    const mediana = familia[familia.length >> 1] as number;
    bons += familia.filter((d) => Math.abs(d - mediana) <= mediana * TOLERANCIA_REGULAR).length;
  }
  return bons >= duracoes.length * FRACAO_REGULAR ? bons : 0;
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
      // Janela de 2×2 células com passo de 1 célula: maior que a tremida, sem perder resolução.
      this.colunas = Math.floor(largura / c) - 1;
      this.linhas = Math.floor(altura / c) - 1;
      this.quadros = [];
    }
    const colunasSub = this.colunas + 1;
    const sub = new Float32Array(colunasSub * (this.linhas + 1));
    for (let lc = 0; lc <= this.linhas; lc++) {
      for (let cc = 0; cc < colunasSub; cc++) {
        let soma = 0;
        for (let y = lc * c; y < (lc + 1) * c; y++) {
          const base = y * largura + cc * c;
          for (let x = 0; x < c; x++) soma += lum[base + x] as number;
        }
        sub[lc * colunasSub + cc] = soma / (c * c);
      }
    }
    const n = this.colunas * this.linhas;
    const valores = new Float32Array(n);
    for (let lc = 0; lc < this.linhas; lc++) {
      for (let cc = 0; cc < this.colunas; cc++) {
        const i = lc * colunasSub + cc;
        valores[lc * this.colunas + cc] =
          ((sub[i] as number) + (sub[i + 1] as number) + (sub[i + colunasSub] as number) + (sub[i + colunasSub + 1] as number)) / 4;
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
    const faixa = amplitude * 0.25;
    let nosNiveis = 0;
    for (const v of serie) if (v <= p10 + faixa || v >= p90 - faixa) nosNiveis++;
    if (nosNiveis < serie.length * this.cfg.quadraturaMinima) return { pontos: 0, validos: 0 };
    const liga = p10 + amplitude * 0.65;
    const desliga = p10 + amplitude * 0.35;
    let aceso = false;
    let inicio = Number.NaN;
    let fim = Number.NaN;
    const duracoes: number[] = [];
    const intervalos: number[] = [];
    let invalidos = 0;
    for (let i = 0; i < serie.length; i++) {
      const v = serie[i] as number;
      const t = (this.quadros[i] as QuadroCelulas).t;
      if (!aceso && v > liga) {
        aceso = true;
        inicio = t;
        if (!Number.isNaN(fim)) intervalos.push(t - fim);
      } else if (aceso && v < desliga) {
        aceso = false;
        fim = t;
        if (!Number.isNaN(inicio)) {
          const d = t - inicio;
          if (d >= this.cfg.piscaMinMs && d <= this.cfg.piscaMaxMs) duracoes.push(d);
          else invalidos++;
        }
      }
    }
    // Os apagados também têm duas durações (entre piscas e entre códigos).
    const validos = regulares(intervalos) > 0 || intervalos.length < 2 ? regulares(duracoes) : 0;
    if (validos < this.cfg.piscasMinimos || invalidos * 2 > duracoes.length) return { pontos: 0, validos };
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
        const x = (cc + 1) * c;
        const y = (lc + 1) * c;
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
