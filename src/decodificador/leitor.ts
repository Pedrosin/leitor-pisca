// Orquestra uma leitura a partir do toque: decodifica na região tocada e, quando o refinador acha a
// lâmpada, troca para a região justa e reprocessa os quadros guardados (não perde o que já piscou).

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

export interface EstadoLeitor extends EstadoLeitura {
  regiao: Regiao;
  regiaoRefinada: boolean;
}

export class Leitor {
  private decodificador: Decodificador;
  private refinador: RefinadorRegiao | null;
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
    return { ...estado, regiao: this.regiao, regiaoRefinada: this.refinada };
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
    return { ...estado, regiao: this.regiao, regiaoRefinada: true };
  }
}
