// Vídeos sintéticos pelo caminho completo (toque → refinamento → decodificação), com as condições
// ruins uma a uma e todas juntas, em 24/30/60 fps. Duas exigências em todo caso:
// nunca confirmar código errado, e confirmar o certo dentro do prazo.

import { describe, test, expect } from 'vitest';
import { rodarCena } from './rodar';
import { linhaDoTempo, type Cena } from './sintetico';

const CONDICOES: Record<string, Partial<Cena>> = {
  limpo: {},
  ruido: { ruido: 10 },
  tremida: { tremorPx: 4 },
  reflexo: { reflexo: true },
  reflexoPeriodico: { reflexo: 'periodico' },
  autoExposicao: { autoExposicao: true },
  outrasLuzes: { luzesConstantes: true },
  quadrosIrregulares: { jitterMs: 8, quedaQuadros: 0.05 },
  tudoJunto: { ruido: 8, tremorPx: 4, reflexo: true, autoExposicao: true, luzesConstantes: true, jitterMs: 6, quedaQuadros: 0.03 },
};

const LISTAS = [[12], [1, 3, 43]];

describe.each([24, 30, 60])('%i fps', (fps) => {
  for (const [nome, condicao] of Object.entries(CONDICOES)) {
    for (const codigos of LISTAS) {
      test(`${nome}: ${codigos.join(', ')}`, () => {
        const ciclo = linhaDoTempo(codigos).cicloMs;
        // Prazo: parcial inicial + 3 ciclos; no "tudo junto", 2 ciclos de folga para leituras perdidas.
        const ciclos = nome === 'tudoJunto' ? 6 : 4;
        const r = rodarCena({ ...condicao, fps, codigos, inicioMs: ciclo * 0.37, duracaoMs: ciclo * ciclos + 2000, semente: fps });
        expect(r.confirmacoes.filter((c) => c !== codigos.join(','))).toEqual([]);
        expect(r.final.confirmados).toEqual(codigos);
      });
    }
  }
});

describe('sementes diferentes no pior caso', () => {
  test.each([11, 12, 13, 14, 15, 16])('semente %i: nunca confirma errado', (semente) => {
    const codigos = [1, 3, 12, 43];
    const ciclo = linhaDoTempo(codigos).cicloMs;
    const r = rodarCena({ ...CONDICOES.tudoJunto, fps: 30, codigos, inicioMs: 5000, duracaoMs: ciclo * 7, semente });
    expect(r.confirmacoes.filter((c) => c !== codigos.join(','))).toEqual([]);
    expect(r.final.confirmados).toEqual(codigos);
  });
});

describe('sem código piscando', () => {
  test('luzes acesas direto, reflexo e tremida, sem pisca: nunca confirma', () => {
    const r = rodarCena({ codigos: [], ruido: 8, tremorPx: 4, reflexo: true, autoExposicao: true, luzesConstantes: true, duracaoMs: 60000 });
    expect(r.confirmacoes).toEqual([]);
  });
});
