// Regressões dos achados da crítica adversarial (Codex, 2026-10-27).

import { describe, test, expect } from 'vitest';
import { Decodificador, DetectorPisca, RefinadorRegiao } from '../src/decodificador';
import { cicloRepetido } from '../src/decodificador/ciclos';
import { LimiarAdaptativo } from '../src/decodificador/limiar';
import { CONFIG_PADRAO } from '../src/decodificador/config';
import { CINTO, gerarQuadros, linhaDoTempo, acesoEm } from './sintetico';
import { BuscadorLuz } from '../src/decodificador';
import { rodarCena } from './rodar';

describe('tempo inválido', () => {
  test('Infinity e NaN não congelam o decodificador', () => {
    const linha = linhaDoTempo([12]);
    const dec = new Decodificador();
    let e = dec.estado();
    for (let t = 0; t < linha.cicloMs * 4.5; t += 33) {
      if (Math.abs(t - 5000) < 20) dec.processarAmostra(Infinity, 400);
      if (Math.abs(t - 6000) < 20) dec.processarAmostra(Number.NaN, 400);
      e = dec.processarAmostra(t, acesoEm(linha, t) ? 400 : 110);
    }
    expect(e.confirmados).toEqual([12]);
  });

  test('tempo que volta não recua a referência do limiar', () => {
    const l = new LimiarAdaptativo(CONFIG_PADRAO);
    for (let t = 0; t < 2000; t += 33) l.atualizar(t, Math.floor(t / 500) % 2 ? 300 : 100);
    const antes = l.amplitude;
    l.atualizar(100, 200); // fora de ordem: ignorado
    expect(l.amplitude).toBe(antes);
  });

  test('ciclo com duração zero ou negativa não confirma', () => {
    const leituras = [1, 2, 1, 2, 1].map((codigo, i) => ({ codigo, t: 1000 - i * 100 }));
    expect(cicloRepetido(leituras, 1)).toBeNull();
  });

  test('detector: NaN não entra e relógio que volta limpa a série', () => {
    const d = new DetectorPisca();
    const lum = new Uint8Array(160 * 120);
    for (let t = 0; t < 5000; t += 33) d.adicionar(t, lum, 160, 120);
    d.adicionar(Number.NaN, lum, 160, 120);
    d.adicionar(10, lum, 160, 120);
    expect((d as unknown as { quadros: unknown[] }).quadros).toHaveLength(1);
  });

  test('refinador: NaN não encurta a observação mínima', () => {
    const r = new RefinadorRegiao({ cx: 0.5, cy: 0.5, raio: 0.07 }, 160, 120);
    const lum = new Uint8Array(160 * 120);
    for (let i = 0; i < 30; i++) r.adicionar(i, lum, 160, 120, i % 2 === 0);
    r.adicionar(Number.NaN, lum, 160, 120, true);
    expect(r.observadoMs).toBeLessThan(100);
    expect(r.sugerir()).toBeNull();
  });
});

describe('refinador na borda da imagem', () => {
  test('toque perto da borda direita acha a lâmpada inteira', () => {
    const w = 160;
    const h = 120;
    const cx = 152;
    const cy = 60;
    const r = new RefinadorRegiao({ cx: cx / w, cy: cy / h, raio: 0.07 }, w, h);
    for (let k = 0; k < 400; k++) {
      const aceso = Math.floor(k / 12) % 2 === 0;
      const lum = new Uint8Array(w * h).fill(30);
      if (aceso) for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) lum[y * w + x] = 230;
      r.adicionar(k * 33, lum, w, h, aceso);
    }
    const s = r.sugerir();
    expect(s).not.toBeNull();
    expect(Math.abs(s!.cx * w - (cx + 0.5))).toBeLessThan(1.5);
    expect(Math.abs(s!.cy * h - (cy + 0.5))).toBeLessThan(1.5);
  });
});

describe('configuração', () => {
  test('celulaPx inválido falha na criação, não no meio da leitura', () => {
    expect(() => new DetectorPisca({ celulaPx: 0 })).toThrow(RangeError);
  });
});

describe('luz vizinha forte (cinto) colada na da injeção — relato de 2026-10-28', () => {
  const codigos = [12, 41];
  const ciclo = linhaDoTempo(codigos).cicloMs;
  const cena = { codigos, fps: 30, inicioMs: 3000, duracaoMs: ciclo * 6, ruido: 6, tremorPx: 2, autoExposicao: true };

  // Antes: o detector subtraía a mediana do quadro; com a exposição caindo quando a injeção acende, o cinto
  // aceso "piscava ao contrário", o candidato pulava entre células e cada pulo recomeçava a leitura.
  // Resultado medido: 0 de 3 leituras no ponto certo. Depois: razão pela mediana + candidato que só anda.
  test.each([1, 2, 3])('busca automática lê no ponto certo (semente %i)', (semente) => {
    const b = new BuscadorLuz();
    for (const q of gerarQuadros({ ...cena, semente, vizinha: { ...CINTO, roteiro: [{ ateMs: Infinity, modo: 'acesa' as const }] } })) {
      b.processarQuadro(q.t, q.lum, 160, 120);
    }
    expect(b.confirmados).toEqual(codigos);
    expect(Math.hypot(((b.sugestao?.cx ?? 0) - 0.5) * 160, ((b.sugestao?.cy ?? 0) - 0.5) * 120)).toBeLessThan(5);
  });

  // Antes: disco inteiro pegava a borda e a borra do cinto; com cinto grande o disco escorregava para ele
  // (1 de 3). Depois: média ponderada só dos pixels que acendem com a injeção + fundo pelo percentil 30.
  // Exigência: nunca confirmar errado, e ao encerrar os dois códigos da ECU aparecem com número.
  // (Na semente 2 o 41 sai descartado em ciclos alternados: não chega a 3 leituras no mesmo ritmo e fica
  // "visto", que é o aviso de conferir contando. A confirmação automática da lista inteira não fecha.)
  test.each([1, 2, 3])('toque desviado para o lado do cinto ainda lê (semente %i)', (semente) => {
    const r = rodarCena({ ...cena, semente, vizinha: { ...CINTO, dx: 3.2, tamanho: 2 } }, { dx: 0.03, dy: 0, raio: 0.07 });
    expect(r.confirmacoes.filter((c) => c !== codigos.join(','))).toEqual([]);
    const resumo = r.leitor.resumo().codigos;
    const confirmados = resumo.filter((c) => c.situacao === 'confirmado').map((c) => c.codigo);
    expect(confirmados.every((c) => c !== null && codigos.includes(c))).toBe(true);
    for (const c of codigos) expect(resumo.some((x) => x.codigo === c)).toBe(true);
  });
});
