// Do quadro de imagem para um número de brilho por quadro.
// Recebe luminância 8 bits (largura × altura) e uma região normalizada; não depende de DOM.

/** Região da luz. cx/cy em fração da largura/altura (0..1), raio em fração da largura. */
export interface Regiao {
  cx: number;
  cy: number;
  raio: number;
}

export interface Medida {
  /** Média do disco da região. */
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

/** Piso do fundo na razão lâmpada/fundo: painel quase preto não explode o sinal. */
export const FUNDO_MINIMO = 8;

const histograma = new Uint32Array(256);

function mediana(contagem: Uint32Array, total: number): number {
  let acumulado = 0;
  const meio = total / 2;
  for (let v = 0; v < 256; v++) {
    acumulado += contagem[v] as number;
    if (acumulado >= meio) return v;
  }
  return 255;
}

/**
 * Disco = raio R: média, para que outra luz acesa direto dentro dele só some uma constante.
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
  return {
    lampada: n > 0 ? soma / n : 0,
    fundo: nAnel > 0 ? mediana(histograma, nAnel) : 0,
  };
}

/**
 * Valor que alimenta o limiar: brilho da lâmpada em % do painel em volta.
 * A auto-exposição multiplica o quadro todo; a razão cancela esse ganho (a diferença não cancela,
 * e erra quando outra luz acesa direto cai dentro do disco). O piso evita dividir por painel preto.
 */
export function sinalDaMedida(m: Medida): number {
  return (100 * m.lampada) / Math.max(m.fundo, FUNDO_MINIMO);
}

