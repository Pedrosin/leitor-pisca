import { Decodificador, type EstadoLeitura } from '../src/decodificador';
import { gerarQuadros, type Cena } from './sintetico';

export interface Resultado {
  final: EstadoLeitura;
  /** Instante (ms) em que confirmou pela primeira vez. */
  confirmouEm: number | null;
  /** Todos os conjuntos que chegaram a ser confirmados, na ordem. */
  historico: number[][];
}

export function rodarCena(cena: Partial<Cena>, raioRegiao = 0.07): Resultado {
  const dec = new Decodificador();
  const w = cena.largura ?? 160;
  const h = cena.altura ?? 120;
  const regiao = { cx: cena.lampada?.cx ?? 0.5, cy: cena.lampada?.cy ?? 0.5, raio: raioRegiao };
  let final = dec.estado();
  let confirmouEm: number | null = null;
  const historico: number[][] = [];
  for (const q of gerarQuadros(cena)) {
    final = dec.processarQuadro(q.t, q.lum, w, h, regiao);
    if (final.confirmados) {
      const ultimo = historico[historico.length - 1];
      if (!ultimo || ultimo.join(',') !== final.confirmados.join(',')) historico.push(final.confirmados);
      if (confirmouEm === null) confirmouEm = q.t;
    }
  }
  return { final, confirmouEm, historico };
}
