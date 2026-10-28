// Roda uma cena sintética pelo mesmo caminho do app: toque perto da luz → Leitor → estado.

import { Leitor, type EstadoLeitor } from '../src/decodificador';
import { CENA_PADRAO, gerarQuadros, type Cena } from './sintetico';

export interface Resultado {
  final: EstadoLeitor;
  /** Instante (ms) em que confirmou pela primeira vez. */
  confirmouEm: number | null;
  /** Todos os conjuntos que chegaram a ser confirmados, na ordem. */
  confirmacoes: string[];
}

/** `toque` = deslocamento do dedo em relação ao centro da luz, em fração da largura. */
export function rodarCena(cena: Partial<Cena>, toque = { dx: 0.02, dy: -0.015, raio: 0.07 }): Resultado {
  const c = { ...CENA_PADRAO, ...cena };
  const leitor = new Leitor(
    { cx: c.lampada.cx + toque.dx, cy: c.lampada.cy + (toque.dy * c.largura) / c.altura, raio: toque.raio },
    c.largura,
    c.altura,
  );
  let final: EstadoLeitor | null = null;
  let confirmouEm: number | null = null;
  const confirmacoes: string[] = [];
  for (const q of gerarQuadros(c)) {
    final = leitor.processarQuadro(q.t, q.lum);
    if (final.confirmados) {
      const chave = final.confirmados.join(',');
      if (confirmacoes.at(-1) !== chave) confirmacoes.push(chave);
      confirmouEm ??= q.t;
    }
  }
  if (!final) throw new Error('cena sem quadros');
  return { final, confirmouEm, confirmacoes };
}
