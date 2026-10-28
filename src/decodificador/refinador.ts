// Ajuste fino do toque: o dedo marca "mais ou menos ali"; o refinador olha alguns segundos da janela em
// volta e mede, por pixel, quanto ele clareia quando o decodificador diz "aceso" contra "apagado"
// (valores em fração do painel). Reflexo que passeia não acompanha o pisca e some na média; luz acesa
// direto escurece junto com a auto-exposição e fica negativa. Sobram os pixels da lâmpada.
// Disco justo na lâmpada pega menos reflexo e menos painel que um disco largo.

import type { Regiao } from './amostragem';
import { FUNDO_MINIMO } from './amostragem';

export interface ConfigRefinador {
  /** Janela de busca em múltiplos do raio tocado. */
  alcance: number;
  /** Tempo de observação antes de sugerir. */
  observarMs: number;
  /**
   * Fração do maior contraste que conta como pixel da lâmpada. Baixo de propósito: com a mão tremendo,
   * a lâmpada se espalha e os pixels da borda do movimento têm contraste menor; o disco precisa cobri-los
   * (0,5 perdia a leitura com tremida de 6 px; 0,2 aguenta 8 px — DECISOES.md D11).
   */
  corte: number;
  /** Folga somada ao raio estimado, em px, para a tremida não tirar a lâmpada do disco. */
  folgaPx: number;
}

const PADRAO: ConfigRefinador = { alcance: 2.5, observarMs: 6000, corte: 0.2, folgaPx: 1.5 };

export class RefinadorRegiao {
  private readonly cfg: ConfigRefinador;
  private readonly x0: number;
  private readonly y0: number;
  private readonly ladoX: number;
  private readonly ladoY: number;
  private readonly somaAceso: Float64Array;
  private readonly somaApagado: Float64Array;
  private quadrosAceso = 0;
  private quadrosApagado = 0;
  private tInicio = Number.NaN;
  private ultimoT = Number.NaN;

  constructor(
    private readonly tocada: Regiao,
    private readonly largura: number,
    private readonly altura: number,
    cfg: Partial<ConfigRefinador> = {},
  ) {
    this.cfg = { ...PADRAO, ...cfg };
    const alcancePx = Math.max(4, tocada.raio * largura * this.cfg.alcance);
    this.x0 = Math.max(0, Math.round(tocada.cx * largura - alcancePx));
    this.y0 = Math.max(0, Math.round(tocada.cy * altura - alcancePx));
    const x1 = Math.min(largura, Math.round(tocada.cx * largura + alcancePx));
    const y1 = Math.min(altura, Math.round(tocada.cy * altura + alcancePx));
    // Largura e altura independentes: perto da borda a janela fica retangular, mas centrada no toque.
    this.ladoX = Math.max(1, x1 - this.x0);
    this.ladoY = Math.max(1, y1 - this.y0);
    this.somaAceso = new Float64Array(this.ladoX * this.ladoY);
    this.somaApagado = new Float64Array(this.ladoX * this.ladoY);
  }

  get observadoMs(): number {
    return Number.isNaN(this.tInicio) ? 0 : this.ultimoT - this.tInicio;
  }

  /** `aceso` é o estado que o decodificador viu neste quadro; null = ainda não sabe. */
  adicionar(t: number, lum: Uint8Array, largura: number, altura: number, aceso: boolean | null): void {
    if (largura !== this.largura || altura !== this.altura) return;
    if (!Number.isFinite(t) || t <= this.ultimoT) return;
    if (Number.isNaN(this.tInicio)) this.tInicio = t;
    this.ultimoT = t;
    if (aceso === null) return;
    const n = this.ladoX * this.ladoY;
    const valores = new Uint8Array(n);
    for (let y = 0; y < this.ladoY; y++) {
      const base = (this.y0 + y) * largura + this.x0;
      for (let x = 0; x < this.ladoX; x++) valores[y * this.ladoX + x] = lum[base + x] as number;
    }
    // Normaliza pelo painel da janela (mediana), como a razão do sinal principal.
    const painel = Math.max(Uint8Array.from(valores).sort()[n >> 1] as number, FUNDO_MINIMO);
    const soma = aceso ? this.somaAceso : this.somaApagado;
    for (let i = 0; i < n; i++) soma[i] = (soma[i] as number) + (valores[i] as number) / painel;
    if (aceso) this.quadrosAceso++;
    else this.quadrosApagado++;
  }

  /** Região ajustada, ou null se ainda observando ou se nada pisca na janela. */
  sugerir(): Regiao | null {
    if (this.observadoMs < this.cfg.observarMs || this.quadrosAceso < 10 || this.quadrosApagado < 10) return null;
    const n = this.ladoX * this.ladoY;
    const contraste = new Float64Array(n);
    let maior = 0;
    for (let i = 0; i < n; i++) {
      const c = (this.somaAceso[i] as number) / this.quadrosAceso - (this.somaApagado[i] as number) / this.quadrosApagado;
      contraste[i] = c;
      if (c > maior) maior = c;
    }
    // Contraste mínimo: a lâmpada acesa tem que somar 30% do painel. Abaixo disso não confia.
    if (maior < 0.3) return null;
    // A lâmpada é a mancha conectada (8 vizinhos) que contém o pixel mais forte. Pixel solto que passou
    // do corte (reflexo, ruído com auto-exposição) fica de fora: sem isso a máscara chegou a 518 px
    // para uma lâmpada de ~80, e a leitura não fechava.
    let semente = 0;
    for (let i = 1; i < n; i++) if ((contraste[i] as number) > (contraste[semente] as number)) semente = i;
    const limite = maior * this.cfg.corte;
    const naMancha = new Uint8Array(n);
    const fila = [semente];
    naMancha[semente] = 1;
    while (fila.length > 0) {
      const i = fila.pop() as number;
      const x = i % this.ladoX;
      const y = Math.floor(i / this.ladoX);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || xx >= this.ladoX || yy < 0 || yy >= this.ladoY) continue;
          const j = yy * this.ladoX + xx;
          if (naMancha[j] || (contraste[j] as number) < limite) continue;
          naMancha[j] = 1;
          fila.push(j);
        }
      }
    }
    let sx = 0;
    let sy = 0;
    let sp = 0;
    let contagem = 0;
    for (let i = 0; i < n; i++) {
      if (!naMancha[i]) continue;
      const a = contraste[i] as number;
      sx += ((i % this.ladoX) + 0.5) * a;
      sy += (Math.floor(i / this.ladoX) + 0.5) * a;
      sp += a;
      contagem++;
    }
    if (contagem < 3) return null;
    const cx = this.x0 + sx / sp;
    const cy = this.y0 + sy / sp;
    const raioPx = Math.sqrt(contagem / Math.PI) + this.cfg.folgaPx;
    const tocadaPx = this.tocada.raio * this.largura;
    // Máscara: peso 1 em toda a mancha, mais 1 px de folga em volta; o resto (luz vizinha, painel,
    // reflexo) fica zero. Peso uniforme, e não proporcional ao contraste: com a mão tremendo o miolo da
    // lâmpada anda, e uma média puxada para o miolo perdia pisca (tremida de 6 px: 0 de 6).
    const valores = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      if (!naMancha[i]) continue;
      const x = i % this.ladoX;
      const y = Math.floor(i / this.ladoX);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && xx < this.ladoX && yy >= 0 && yy < this.ladoY) valores[yy * this.ladoX + xx] = 1;
        }
      }
    }
    return {
      cx: cx / this.largura,
      cy: cy / this.altura,
      raio: Math.min(tocadaPx * 1.5, Math.max(2.5, raioPx)) / this.largura,
      pesos: {
        x0: this.x0,
        y0: this.y0,
        largura: this.ladoX,
        altura: this.ladoY,
        quadroLargura: this.largura,
        quadroAltura: this.altura,
        valores,
      },
    };
  }
}
