// Orquestra uma leitura a partir do toque: decodifica na região tocada e, quando o refinador acha a
// lâmpada, troca para a região justa e reprocessa os quadros guardados (não perde o que já piscou).
// Depois disso segue rastreando: a cada poucos segundos mede de novo onde a lâmpada está e move o disco,
// porque o celular na mão deriva devagar (braço cede) e um disco parado perde a lâmpada em ~1 min.

import { Decodificador, type EstadoLeitura } from './decodificador';
import type { ConfigDecodificador } from './config';
import { RefinadorRegiao } from './refinador';
import type { Regiao } from './amostragem';

interface QuadroGuardado {
  t: number;
  lum: Uint8Array;
}

/** Quadros guardados para reprocessar depois do ajuste. */
const GUARDAR_MS = 15000;
/** Sem ajuste até aqui, segue com o toque. */
const DESISTIR_MS = 20000;
/** Janela de cada nova medida de posição durante a leitura. */
const RASTREIO_MS = 4000;
/** Rastreio sem resposta por mais que isso (pausa longa, luz apagada) recomeça a medida. */
const RASTREIO_DESISTIR_MS = 12000;
/** Alcance mínimo do rastreio, em fração da largura: cobre a deriva entre duas medidas. */
const RASTREIO_RAIO_MINIMO = 0.05;
/** Teto do raio do disco durante o rastreio: disco largo demais volta a pegar reflexo e painel. */
const RAIO_MAXIMO = 0.1;

export interface EstadoLeitor extends EstadoLeitura {
  regiao: Regiao;
  regiaoRefinada: boolean;
}

export class Leitor {
  private decodificador: Decodificador;
  private refinador: RefinadorRegiao | null;
  private rastreador: RefinadorRegiao | null = null;
  private regiao: Regiao;
  private refinada = false;
  private guardados: QuadroGuardado[] = [];

  constructor(
    tocada: Regiao,
    private readonly largura: number,
    private readonly altura: number,
    private readonly cfg: Partial<ConfigDecodificador> = {},
  ) {
    this.regiao = tocada;
    this.decodificador = new Decodificador(cfg);
    this.refinador = new RefinadorRegiao(tocada, largura, altura);
  }

  processarQuadro(t: number, lum: Uint8Array): EstadoLeitor {
    const estado = this.decodificador.processarQuadro(t, lum, this.largura, this.altura, this.regiao);
    if (this.refinador) {
      // Copia: quem chama costuma reaproveitar o mesmo buffer a cada quadro.
      this.guardados.push({ t, lum: lum.slice(0, this.largura * this.altura) });
      while (t - (this.guardados[0] as QuadroGuardado).t > GUARDAR_MS) this.guardados.shift();
      this.refinador.adicionar(t, lum, this.largura, this.altura, estado.luz === 'indefinido' ? null : estado.luz === 'aceso');
      const ajustada = this.refinador.sugerir();
      if (ajustada) return this.trocarRegiao(ajustada);
      if (this.refinador.observadoMs >= DESISTIR_MS) {
        // Observou e não achou a lâmpada: segue na região tocada e para de guardar.
        this.refinador = null;
        this.guardados = [];
      }
    }
    if (this.rastreador) this.rastrear(t, lum, estado.luz);
    return { ...estado, regiao: this.regiao, regiaoRefinada: this.refinada };
  }

  private novoRastreador(): RefinadorRegiao {
    const r = this.regiao;
    return new RefinadorRegiao({ ...r, raio: Math.max(r.raio, RASTREIO_RAIO_MINIMO) }, this.largura, this.altura, {
      observarMs: RASTREIO_MS,
    });
  }

  private rastrear(t: number, lum: Uint8Array, luz: EstadoLeitura['luz']): void {
    const rastreador = this.rastreador as RefinadorRegiao;
    rastreador.adicionar(t, lum, this.largura, this.altura, luz === 'indefinido' ? null : luz === 'aceso');
    const nova = rastreador.sugerir();
    if (nova) {
      // Move o centro; o raio só cresce rápido e encolhe devagar, para uma medida ruim não estreitar o disco.
      this.regiao = { cx: nova.cx, cy: nova.cy, raio: Math.min(RAIO_MAXIMO, Math.max(nova.raio, this.regiao.raio * 0.9)) };
      this.rastreador = this.novoRastreador();
    } else if (rastreador.observadoMs >= RASTREIO_DESISTIR_MS) {
      this.rastreador = this.novoRastreador();
    }
  }

  private trocarRegiao(ajustada: Regiao): EstadoLeitor {
    this.regiao = ajustada;
    this.refinada = true;
    this.refinador = null;
    this.decodificador = new Decodificador(this.cfg);
    let estado = this.decodificador.estado();
    for (const q of this.guardados) {
      estado = this.decodificador.processarQuadro(q.t, q.lum, this.largura, this.altura, ajustada);
    }
    this.guardados = [];
    this.rastreador = this.novoRastreador();
    return { ...estado, regiao: this.regiao, regiaoRefinada: true };
  }
}
