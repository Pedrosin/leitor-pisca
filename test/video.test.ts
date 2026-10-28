// Detecção automática do ponto que pisca, busca sem toque, e leitura a partir de arquivo .y4m de verdade
// (o mesmo formato que o E2E injeta como câmera falsa no Chrome).

import { describe, test, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BuscadorLuz, DetectorPisca, Leitor } from '../src/decodificador';
import { gerarQuadros, linhaDoTempo, type Cena } from './sintetico';
import { gravarY4m, lerY4m } from './y4m';

const RUIM: Partial<Cena> = { ruido: 8, tremorPx: 3, reflexo: true, autoExposicao: true, luzesConstantes: true };

describe('detector automático', () => {
  test.each([
    [0.3, 0.4, 1],
    [0.62, 0.55, 2],
    [0.8, 0.25, 3],
    [0.45, 0.6, 4],
    [0.55, 0.35, 5],
  ])('acha a luz em (%f, %f) no meio de outras luzes e reflexo (semente %i)', (cx, cy, semente) => {
    const detector = new DetectorPisca();
    for (const q of gerarQuadros({ ...RUIM, codigos: [12], lampada: { cx, cy, raioPx: 5 }, duracaoMs: 16000, semente })) {
      detector.adicionar(q.t, q.lum, 160, 120);
    }
    const s = detector.sugerir();
    expect(s).not.toBeNull();
    expect(Math.hypot((s!.cx - cx) * 160, (s!.cy - cy) * 120)).toBeLessThan(6);
  });
});

describe('busca automática (detector + confirmação pelo decodificador)', () => {
  // O detector sozinho é frouxo de propósito (aponta reflexo em cena sem pisca); a busca só sugere
  // depois que um Leitor confirma uma leitura no ponto. Reflexo aleatório: nunca sugere.
  test.each([21, 22, 23])('sem nada piscando, reflexo aleatório: nunca sugere (semente %i)', (semente) => {
    const b = new BuscadorLuz();
    for (const q of gerarQuadros({ ...RUIM, reflexo: true, codigos: [], duracaoMs: 90000, semente })) b.processarQuadro(q.t, q.lum, 160, 120);
    expect(b.sugestao).toBeNull();
  });

  // Reflexo que vai e volta em ritmo fixo pode imitar um código (1–2 em 40 cenas). Por isso a sugestão é
  // uma pergunta no app; aqui a prova é que "não é essa" tira o ponto e ele não volta.
  test.each([24, 25, 26])('reflexo periódico: ponto recusado não volta a ser sugerido (semente %i)', (semente) => {
    const b = new BuscadorLuz();
    const recusados: Array<{ cx: number; cy: number }> = [];
    for (const q of gerarQuadros({ ...RUIM, reflexo: 'periodico', codigos: [], duracaoMs: 120000, semente })) {
      b.processarQuadro(q.t, q.lum, 160, 120);
      const s = b.sugestao;
      if (s) {
        for (const r of recusados) expect(Math.hypot((s.cx - r.cx) * 160, (s.cy - r.cy) * 120)).toBeGreaterThan(160 * 0.08);
        recusados.push({ cx: s.cx, cy: s.cy });
        b.recusar();
      }
    }
    expect(recusados.length).toBeLessThanOrEqual(1);
  });

  test.each([
    [[1], 0.3, 0.3, 24, 31],
    [[12], 0.6, 0.5, 30, 32],
    [[3, 43], 0.75, 0.7, 60, 33],
    [[7], 0.45, 0.45, 30, 34],
  ])('acha %j em (%f, %f) a %i fps (semente %i)', (codigos, cx, cy, fps, semente) => {
    const b = new BuscadorLuz();
    for (const q of gerarQuadros({ ...RUIM, codigos, fps, jitterMs: 6, lampada: { cx, cy, raioPx: 5 }, duracaoMs: 90000, semente })) {
      b.processarQuadro(q.t, q.lum, 160, 120);
    }
    const s = b.sugestao;
    expect(s).not.toBeNull();
    expect(Math.hypot((s!.cx - cx) * 160, (s!.cy - cy) * 120)).toBeLessThan(6);
  });
});

describe('arquivo .y4m', () => {
  test('grava, relê e decodifica', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'leitor-pisca-'));
    try {
      const codigos = [3, 41];
      const ciclo = linhaDoTempo(codigos).cicloMs;
      const arquivo = join(pasta, 'teste.y4m');
      const n = gravarY4m(arquivo, 160, 120, 30, gerarQuadros({ ...RUIM, codigos, fps: 30, inicioMs: 1500, duracaoMs: ciclo * 4 + 2000 }));
      expect(n).toBeGreaterThan(30 * 20);
      const leitor = new Leitor({ cx: 0.51, cy: 0.49, raio: 0.07 }, 160, 120);
      let confirmados: number[] | null = null;
      for (const q of lerY4m(arquivo)) confirmados = leitor.processarQuadro(q.t, q.lum).confirmados;
      expect(confirmados).toEqual(codigos);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });
});

describe('detector com o código mais lento de achar', () => {
  // Código 1 = um pisca curto por ciclo: o que menos pisca na janela.
  test('código 1 sozinho', () => {
    const detector = new DetectorPisca();
    for (const q of gerarQuadros({ ...RUIM, codigos: [1], lampada: { cx: 0.4, cy: 0.5, raioPx: 5 }, duracaoMs: 16000 })) {
      detector.adicionar(q.t, q.lum, 160, 120);
    }
    const s = detector.sugerir();
    expect(s).not.toBeNull();
    expect(Math.hypot((s!.cx - 0.4) * 160, (s!.cy - 0.5) * 120)).toBeLessThan(6);
  });
});
