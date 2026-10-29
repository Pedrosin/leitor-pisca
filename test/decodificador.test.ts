// Peças do decodificador isoladas e o decodificador alimentado com sinal ideal (sem imagem).

import { describe, test, expect } from 'vitest';
import { LimiarAdaptativo } from '../src/decodificador/limiar';
import { FiltroBordas, classificarGrupo, fronteiraAprendida } from '../src/decodificador/piscas';
import { cicloRepetido } from '../src/decodificador/ciclos';
import { Decodificador, CONFIG_PADRAO } from '../src/decodificador';
import { linhaDoTempo, acesoEm, TEMPOS_ECU, aleatorio, type TemposEcu } from './sintetico';
import { NUMEROS } from '../src/codigos/tabela';

/** Alimenta o decodificador com o sinal ideal da ECU amostrado a `fps`, e devolve o estado final. */
function decodificarSinal(
  codigos: number[],
  opcoes: { fps?: number; duracaoMs?: number; inicioMs?: number; tempos?: TemposEcu; ruido?: number; semente?: number } = {},
) {
  const { fps = 30, inicioMs = 0, tempos = TEMPOS_ECU, ruido = 0, semente = 7 } = opcoes;
  const linha = linhaDoTempo(codigos, tempos);
  // Primeiro código sai descartado (o limiar aprende nele), depois 2 ciclos + 1 código: ~4 ciclos.
  const duracaoMs = opcoes.duracaoMs ?? linha.cicloMs * 4.2 + 3000;
  const rand = aleatorio(semente);
  const dec = new Decodificador();
  let estado = dec.estado();
  let confirmouEm: number | null = null;
  const confirmacoes = new Set<string>();
  for (let t = 0; t < duracaoMs; t += 1000 / fps) {
    const v = (acesoEm(linha, t + inicioMs) ? 400 : 110) + (rand() * 2 - 1) * ruido;
    estado = dec.processarAmostra(t, v);
    if (estado.confirmados) {
      confirmacoes.add(estado.confirmados.join(','));
      confirmouEm ??= t;
    }
  }
  return { estado, confirmouEm, confirmacoes, cicloMs: linha.cicloMs };
}

describe('limiar adaptativo', () => {
  test('segue o pisca com histerese e fica indefinido sem amplitude', () => {
    const l = new LimiarAdaptativo(CONFIG_PADRAO);
    const estados: string[] = [];
    for (let t = 0; t < 4000; t += 33) estados.push(l.atualizar(t, Math.floor(t / 500) % 2 ? 300 : 100));
    expect(estados.slice(0, 3)).toEqual(['indefinido', 'indefinido', 'indefinido']);
    expect(estados.at(-1)).toBe(Math.floor(3993 / 500) % 2 ? 'aceso' : 'apagado');
    const plano = new LimiarAdaptativo(CONFIG_PADRAO);
    for (let t = 0; t < 3000; t += 33) expect(plano.atualizar(t, 100 + (t % 3))).toBe('indefinido');
  });

  test('ruído perto do meio não fica trocando de estado', () => {
    const l = new LimiarAdaptativo(CONFIG_PADRAO);
    for (let t = 0; t < 2000; t += 33) l.atualizar(t, Math.floor(t / 500) % 2 ? 300 : 100);
    const trocas = new Set<string>();
    // 100..300: meio = 200; histerese de 12% = ±24. Oscilar entre 185 e 215 não cruza.
    for (let t = 2000; t < 2500; t += 33) trocas.add(l.atualizar(t, t % 66 ? 185 : 215));
    expect(trocas.size).toBe(1);
  });
});

describe('filtro de bordas', () => {
  test('ignora troca mais curta que o mínimo e data a borda no começo', () => {
    const f = new FiltroBordas(120);
    const bordas = [];
    // aceso 0..1000, apagado 1000..1066 (2 quadros), aceso até 1500, apagado depois
    for (let t = 0; t < 2500; t += 33) {
      const aceso = t < 1000 || (t >= 1066 && t < 1500);
      const b = f.atualizar(t, aceso ? 'aceso' : 'apagado');
      if (b) bordas.push(b);
    }
    expect(bordas).toHaveLength(1);
    expect(bordas[0]?.tipo).toBe('descida');
    expect(Math.abs((bordas[0]?.t ?? 0) - 1500)).toBeLessThan(33);
  });
});

describe('fronteira aprendida', () => {
  test('separa curtos de longos pela média geométrica', () => {
    expect(fronteiraAprendida([400, 410, 1300, 1290, 395], 800)).toBeCloseTo(Math.sqrt(410 * 1290), 0);
  });
  test('uma família só: usa a fixa', () => {
    expect(fronteiraAprendida([400, 410, 395, 420], 800)).toBe(800);
  });
  test('valor absurdo não vira fronteira', () => {
    expect(fronteiraAprendida([400, 420, 410, 20000], 1400, 1.8, 2.5)).toBe(1400);
    expect(fronteiraAprendida([400, 420, 410, 2500, 2480, 20000], 1400, 1.8, 2.5)).toBeCloseTo(Math.sqrt(420 * 2480), 0);
  });
});

describe('classificar grupo', () => {
  test('longos são dezena, curtos unidade', () => {
    expect(classificarGrupo([1300, 400, 400], 800)).toEqual({ dezenas: 1, unidades: 2 });
    expect(classificarGrupo([1300, 1300, 1300, 1300, 400, 400, 400], 800)).toEqual({ dezenas: 4, unidades: 3 });
    expect(classificarGrupo([1300], 800)).toEqual({ dezenas: 1, unidades: 0 });
    expect(classificarGrupo(Array(9).fill(400), 800)).toEqual({ dezenas: 0, unidades: 9 });
  });
  test('pisca perdido no meio (apagado 3× maior que os outros do mesmo tipo) descarta o código', () => {
    // 4 curtos com o 3º perdido: sobram 3 curtos e os apagados ficam 400, 1200.
    expect(classificarGrupo([400, 400, 400], 800, [400, 1200])).toBeNull();
    expect(classificarGrupo([400, 400, 400], 800, [400, 420])).toEqual({ dezenas: 0, unidades: 3 });
    // O apagado entre o último longo e o primeiro curto pode ser diferente: não conta.
    expect(classificarGrupo([1300, 1300, 400, 400], 800, [400, 900, 400])).toEqual({ dezenas: 2, unidades: 2 });
  });

  test('curto antes de longo é leitura inválida', () => {
    expect(classificarGrupo([400, 1300], 800)).toBeNull();
    expect(classificarGrupo(Array(10).fill(400), 800)).toBeNull();
  });
});

describe('confirmação por ciclo', () => {
  const datar = (codigos: Array<number | null>, passo: number[]) => {
    let t = 0;
    return codigos.map((codigo, i) => {
      const l = { codigo, t };
      t += passo[i % passo.length] as number;
      return l;
    });
  };
  test('um código: confirma com 2 ciclos + 1', () => {
    expect(cicloRepetido(datar([12, 12], [6000]), 1)).toBeNull();
    expect(cicloRepetido(datar([12, 12, 12], [6000]), 1)).toEqual([12]);
  });
  test('vários códigos, começando no meio do ciclo, devolve em ordem crescente', () => {
    const leituras = datar([43, 3, 12, 43, 3, 12, 43], [5000, 4000, 9000]);
    expect(cicloRepetido(leituras, 1)).toEqual([3, 12, 43]);
  });
  test('leitura descartada quebra a repetição', () => {
    expect(cicloRepetido(datar([3, 12, null, 12, 3], [4000, 5000]), 1)).toBeNull();
  });
  test('"3" quebrado em "1, 1" junto de um "1" real não confirma: o ciclo não dura igual', () => {
    expect(cicloRepetido(datar([1, 1, 1], [2900, 1300]), 1)).toBeNull();
  });
});

describe('decodificador com sinal ideal', () => {
  test.each(NUMEROS.filter((c) => c > 0))('código %i', (codigo) => {
    const r = decodificarSinal([codigo]);
    expect(r.estado.confirmados).toEqual([codigo]);
    expect([...r.confirmacoes]).toEqual([String(codigo)]);
  });

  test('vários códigos em sequência, começando no meio', () => {
    const codigos = [1, 4, 9, 10, 43, 67];
    const linha = linhaDoTempo(codigos);
    const r = decodificarSinal(codigos, { inicioMs: linha.cicloMs * 0.4, fps: 24 });
    expect(r.estado.confirmados).toEqual(codigos);
    expect(r.confirmacoes.size).toBe(1);
  });

  test.each([24, 30, 60])('%i fps: confirma em até 3 ciclos e meio', (fps) => {
    const r = decodificarSinal([12, 41], { fps, inicioMs: 3000 });
    expect(r.estado.confirmados).toEqual([12, 41]);
    expect(r.confirmouEm).toBeLessThanOrEqual(r.cicloMs * 3.5);
  });

  // A duração real dos piscas no carro não tem fonte com número (DECISOES.md): testa uma faixa larga.
  const ritmos: Record<string, TemposEcu> = {
    rapido: { longoMs: 900, curtoMs: 300, entrePiscasMs: 300, entreDigitosMs: 300, pausaCodigoMs: 1100, pausaCicloMs: 1100 },
    estimado: TEMPOS_ECU,
    lento: { longoMs: 1800, curtoMs: 550, entrePiscasMs: 550, entreDigitosMs: 900, pausaCodigoMs: 3500, pausaCicloMs: 5000 },
    pausaCurta: { longoMs: 1300, curtoMs: 400, entrePiscasMs: 400, entreDigitosMs: 400, pausaCodigoMs: 1200, pausaCicloMs: 1200 },
  };
  test.each(Object.keys(ritmos))('ritmo %s da ECU', (nome) => {
    const tempos = ritmos[nome] as TemposEcu;
    const codigos = [3, 10, 16, 43];
    const r = decodificarSinal(codigos, { tempos, inicioMs: 2500, duracaoMs: linhaDoTempo(codigos, tempos).cicloMs * 4.5 });
    expect(r.estado.confirmados).toEqual(codigos);
    expect(r.confirmacoes.size).toBe(1);
  });

  test('luz acesa direto: alerta e nunca confirma', () => {
    const dec = new Decodificador();
    let e = dec.estado();
    // Pisca um pouco (para ter amplitude), depois fica acesa.
    for (let t = 0; t < 30000; t += 33) e = dec.processarAmostra(t, t < 3000 ? (Math.floor(t / 400) % 2 ? 400 : 110) : 400);
    expect(e.alertas).toContain('luz-constante');
    expect(e.confirmados).toBeNull();
  });

  test('apagada por muito tempo: alerta sem pisca', () => {
    const dec = new Decodificador();
    let e = dec.estado();
    for (let t = 0; t < 20000; t += 33) e = dec.processarAmostra(t, t < 2000 ? (Math.floor(t / 400) % 2 ? 400 : 110) : 110);
    expect(e.alertas).toContain('sem-pisca');
  });

  test('ruído sem pisca nunca confirma nada', () => {
    const dec = new Decodificador();
    const rand = aleatorio(3);
    let e = dec.estado();
    for (let t = 0; t < 120000; t += 33) e = dec.processarAmostra(t, 150 + rand() * 40);
    expect(e.confirmados).toBeNull();
  });
});
