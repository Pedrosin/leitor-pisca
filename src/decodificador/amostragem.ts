// Do quadro de imagem para um número de brilho por quadro.
// Recebe luminância 8 bits (largura × altura) e uma região normalizada; não depende de DOM.

/** Região da luz. cx/cy em fração da largura/altura (0..1), raio em fração da largura. */
export interface Regiao {
  cx: number;
  cy: number;
  raio: number;
  /**
   * Máscara da lâmpada, medida pelo refinador (pixels que clareiam quando a luz acende, com folga).
   * Com pesos, o brilho da lâmpada é a média só desses pixels: luz vizinha encostada (cinto), que não
   * acende junto, fica de fora. Sem pesos, vale o disco inteiro.
   */
  pesos?: Pesos;
}

/** Janela retangular em pixels do quadro processado (largura × altura do quadro em que foi medida). */
export interface Pesos {
  x0: number;
  y0: number;
  largura: number;
  altura: number;
  /** Tamanho do quadro em que os pesos valem; noutro tamanho são ignorados. */
  quadroLargura: number;
  quadroAltura: number;
  valores: Float32Array;
}

export interface Medida {
  /** Média do disco da região (ou média ponderada pelos pesos). */
  lampada: number;
  /** Mediana do anel em volta do disco (painel apagado). */
  fundo: number;
}

/** RGBA (canvas) para luminância BT.601 em inteiro. */
export function luminanciaDeRgba(rgba: ArrayLike<number>, pixels: number, saida?: Uint8Array): Uint8Array {
  const lum = saida && saida.length >= pixels ? saida : new Uint8Array(pixels);
  for (let i = 0, j = 0; i < pixels; i++, j += 4) {
    lum[i] = (77 * (rgba[j] as number) + 150 * (rgba[j + 1] as number) + 29 * (rgba[j + 2] as number)) >> 8;
  }
  return lum;
}

/**
 * Piso do fundo na razão lâmpada/fundo: painel quase preto não explode o sinal. Era 8; o Chrome expande
 * o vídeo de 16–235 para 0–255 e painel escuro (noite) cai perto de zero. Medido em 7 cenários × 4
 * sementes (cinto fixo com essa faixa, cinto piscando, cinto grande, "tudo junto", faixa sozinha):
 * 8 → cinto fixo com a faixa 0/8; 12 → 28/28; 16 e 20 → 26/28; 24 → perde o cinto sem a faixa (a razão
 * para de compensar a auto-exposição com painel abaixo do piso). Sensível: não é monotônico.
 */
export const FUNDO_MINIMO = 12;

const histograma = new Uint32Array(256);

function percentil(contagem: Uint32Array, total: number, fracao: number): number {
  let acumulado = 0;
  const alvo = total * fracao;
  for (let v = 0; v < 256; v++) {
    acumulado += contagem[v] as number;
    if (acumulado >= alvo) return v;
  }
  return 255;
}

/**
 * Fração do anel usada como fundo (0,5 = mediana). Testado 0,3 e 0,4 para descontar luz vizinha forte:
 * não ajudou no cinto (quem resolveu foi a máscara da lâmpada) e abriu confirmação errada (reflexo
 * periódico sem pisca: 1–2 em 40; "tudo junto": 1 código errado). Com a mediana, 0.
 */
const PERCENTIL_FUNDO = 0.5;

/**
 * Disco = raio R: média, para que outra luz acesa direto dentro dele só some uma constante.
 * Com `regiao.pesos`, média ponderada só dos pixels da lâmpada.
 * Anel = de 1,5R a 2,5R: mediana do painel em volta, fora da lâmpada tocada.
 */
export function medirRegiao(lum: Uint8Array, largura: number, altura: number, regiao: Regiao): Medida {
  const cx = regiao.cx * largura;
  const cy = regiao.cy * altura;
  const r = Math.max(2, regiao.raio * largura);
  const rAnelIn = r * 1.5;
  const rAnelOut = r * 2.5;
  const r2 = r * r;
  const in2 = rAnelIn * rAnelIn;
  const out2 = rAnelOut * rAnelOut;

  const x0 = Math.max(0, Math.floor(cx - rAnelOut));
  const x1 = Math.min(largura - 1, Math.ceil(cx + rAnelOut));
  const y0 = Math.max(0, Math.floor(cy - rAnelOut));
  const y1 = Math.min(altura - 1, Math.ceil(cy + rAnelOut));

  histograma.fill(0);
  let soma = 0;
  let n = 0;
  let nAnel = 0;
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy;
    const linha = y * largura;
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const d2 = dx * dx + dy * dy;
      const v = lum[linha + x] as number;
      if (d2 <= r2) {
        soma += v;
        n++;
      } else if (d2 >= in2 && d2 <= out2) {
        histograma[v] = (histograma[v] as number) + 1;
        nAnel++;
      }
    }
  }
  const fundo = nAnel > 0 ? percentil(histograma, nAnel, PERCENTIL_FUNDO) : 0;
  const p = regiao.pesos;
  if (p && p.quadroLargura === largura && p.quadroAltura === altura) {
    let somaP = 0;
    let somaW = 0;
    for (let y = 0; y < p.altura; y++) {
      const base = (p.y0 + y) * largura + p.x0;
      for (let x = 0; x < p.largura; x++) {
        const w = p.valores[y * p.largura + x] as number;
        if (w <= 0) continue;
        somaP += w * (lum[base + x] as number);
        somaW += w;
      }
    }
    if (somaW > 0) return { lampada: somaP / somaW, fundo };
  }
  return { lampada: n > 0 ? soma / n : 0, fundo };
}

/**
 * Valor que alimenta o limiar: brilho da lâmpada em % do painel em volta.
 * A auto-exposição multiplica o quadro todo; a razão cancela esse ganho (a diferença não cancela,
 * e erra quando outra luz acesa direto cai dentro do disco). O piso evita dividir por painel preto.
 */
export function sinalDaMedida(m: Medida): number {
  return (100 * m.lampada) / Math.max(m.fundo, FUNDO_MINIMO);
}

