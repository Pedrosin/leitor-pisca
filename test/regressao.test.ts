// Regressões dos achados da crítica adversarial (Codex, 2026-10-27).

import { describe, test, expect } from 'vitest';
import { Decodificador, DetectorPisca, RefinadorRegiao } from '../src/decodificador';
import { cicloRepetido } from '../src/decodificador/ciclos';
import { LimiarAdaptativo } from '../src/decodificador/limiar';
import { CONFIG_PADRAO } from '../src/decodificador/config';
import { linhaDoTempo, acesoEm } from './sintetico';

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
