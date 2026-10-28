// Encerrar e conferir: o resumo do que foi lido antes da confirmação automática.
// Pedido do Victor (2026-10-28): "quero poder encerrar a sessão sem antes ele ter que confirmar".

import { describe, test, expect } from 'vitest';
import { Decodificador, type ResumoLeitura } from '../src/decodificador';
import { linhaDoTempo, acesoEm, TEMPOS_ECU } from './sintetico';
import { rodarCena } from './rodar';

const T = TEMPOS_ECU;

/** Sinal ideal da ECU até `paraEm` (ms da gravação); devolve o decodificador para conferir. */
function lerAte(codigos: number[], paraEm: number, inicioMs = 0): Decodificador {
  const linha = linhaDoTempo(codigos);
  const dec = new Decodificador();
  for (let t = 0; t < paraEm; t += 1000 / 30) dec.processarAmostra(t, acesoEm(linha, t + inicioMs) ? 400 : 110);
  return dec;
}

const semIncompletos = (r: ResumoLeitura) => r.codigos.filter((c) => c.situacao !== 'incompleto');

describe('resumo ao encerrar', () => {
  // Gravação começa no fim da pausa antes do 12: o primeiro 12 sai limpo.
  const ciclo = linhaDoTempo([12, 41]).cicloMs;
  const inicio = ciclo - 1500;

  test('parar no meio do 41, depois de ler o 12 uma vez: 12 visto 1 vez, 41 incompleto com o mapa', () => {
    // 12 = L c c (~3,7 s a partir de 1,5 s); pausa 2,5 s; 41 começa ~7,7 s. Para depois de 2 longos do 41.
    const inicio41 = 1500 + T.longoMs + T.entreDigitosMs + T.curtoMs + T.entrePiscasMs + T.curtoMs + T.pausaCodigoMs;
    const paraEm = inicio41 + 2 * T.longoMs + T.entrePiscasMs + 200;
    const r = lerAte([12, 41], paraEm, inicio).resumo();
    expect(r.confirmacaoAutomatica).toBeNull();
    expect(semIncompletos(r)).toEqual([{ codigo: 12, situacao: 'visto', vezes: 1, piscas: ['longo', 'curto', 'curto'] }]);
    const incompleto = r.codigos.at(-1);
    expect(incompleto).toMatchObject({ codigo: null, situacao: 'incompleto', motivo: 'em-andamento' });
    // 2 longos já vistos + o pisca que estava aceso quando parou.
    expect(incompleto?.piscas.slice(0, 2)).toEqual(['longo', 'longo']);
  });

  test('código lido 2 vezes ainda é "visto"; 3 vezes com o mesmo intervalo é "confirmado"', () => {
    // Começa limpo antes do 12 e lê 2 ciclos e meio: 12 e 41 aparecem 2 vezes cada, depois o 12 de novo.
    const doisCiclos = lerAte([12, 41], 1500 + ciclo * 2 - 1000, inicio).resumo();
    const c41 = doisCiclos.codigos.find((c) => c.codigo === 41);
    expect(c41).toEqual({ codigo: 41, situacao: 'visto', vezes: 2, piscas: ['longo', 'longo', 'longo', 'longo', 'curto'] });
    const tresDoze = lerAte([12, 41], 1500 + ciclo * 2 + 5000, inicio).resumo();
    expect(tresDoze.codigos.find((c) => c.codigo === 12)).toMatchObject({ situacao: 'confirmado', vezes: 3 });
    expect(tresDoze.codigos.every((c) => c.codigo === null || [12, 41].includes(c.codigo))).toBe(true);
  });

  test('"1" avulso que se repete fora do ritmo não vira confirmado', () => {
    // Três leituras de "1" com intervalos 2,9 s e 1,3 s: não é ciclo da ECU.
    const dec = new Decodificador();
    const curto = (t0: number, t: number) => t >= t0 && t < t0 + 400;
    const momentos = [3000, 5900, 7200];
    for (let t = 0; t < 12000; t += 33) dec.processarAmostra(t, momentos.some((m) => curto(m, t)) ? 400 : 110);
    const um = dec.resumo().codigos.find((c) => c.codigo === 1);
    expect(um?.situacao).toBe('visto');
  });

  test('código cortado no começo aparece como incompleto, nunca como número', () => {
    // Começa no meio do 43 (depois do 2º longo): sobram 2 longos + 3 curtos, que como número seria "23".
    const inicioNo43 = 2 * T.longoMs + 2 * T.entrePiscasMs - 100;
    // Para depois da pausa que fecha o código (o 43 cortado termina ~3,4 s após o início da gravação).
    const r = lerAte([43], 8000, inicioNo43).resumo();
    expect(r.codigos.some((c) => c.codigo !== null)).toBe(false);
    expect(r.codigos).toHaveLength(1);
    expect(r.codigos[0]).toMatchObject({ codigo: null, situacao: 'incompleto', motivo: 'cortado' });
    expect(r.codigos[0]?.piscas.filter((p) => p === 'curto')).toHaveLength(3);
  });

  test('pedir o resumo não muda a leitura: a confirmação automática continua igual', () => {
    const linha = linhaDoTempo([3, 12]);
    const a = new Decodificador();
    const b = new Decodificador();
    for (let t = 0; t < linha.cicloMs * 4.5; t += 33) {
      const v = acesoEm(linha, t) ? 400 : 110;
      a.processarAmostra(t, v);
      b.processarAmostra(t, v);
      b.resumo();
    }
    expect(b.estado().confirmados).toEqual([3, 12]);
    expect(b.resumo()).toEqual(a.resumo());
  });
});

describe('voltar a ler depois de encerrar', () => {
  test('o código interrompido é descartado e a leitura continua até confirmar certo', () => {
    const codigos = [12, 41];
    const linha = linhaDoTempo(codigos);
    const dec = new Decodificador();
    let t = 0;
    // Lê 1 ciclo e meio código (para no 2º longo do 41), fica 8 s "conferindo" sem quadros, volta a ler.
    for (; t < linha.cicloMs + 7500; t += 33) dec.processarAmostra(t, acesoEm(linha, t) ? 400 : 110);
    const antes = dec.resumo();
    expect(antes.codigos.at(-1)?.situacao).toBe('incompleto');
    dec.interromper();
    t += 8000;
    let confirmados: number[] | null = null;
    const vistos = new Set<string>();
    for (const fim = t + linha.cicloMs * 4; t < fim; t += 33) {
      confirmados = dec.processarAmostra(t, acesoEm(linha, t) ? 400 : 110).confirmados;
      if (confirmados) vistos.add(confirmados.join(','));
    }
    expect(confirmados).toEqual(codigos);
    expect([...vistos]).toEqual(['12,41']);
    expect(dec.resumo().codigos.filter((c) => c.codigo !== null && !codigos.includes(c.codigo))).toEqual([]);
  });
});

describe('voltar a ler com a luz acesa no meio de um código (achado do Codex, 2026-10-28)', () => {
  test('o resto do código cortado nunca vira número', () => {
    const codigos = [43];
    const linha = linhaDoTempo(codigos);
    const dec = new Decodificador();
    // Lê um ciclo inteiro e para logo no começo do 3º longo do 43 seguinte (luz acesa), volta na hora.
    // O resto (2 longos + 3 curtos) seria um "23" válido se fosse aceito como código inteiro.
    const para = linha.cicloMs + 2 * (T.longoMs + T.entrePiscasMs) + 150;
    let t = 0;
    for (; t < para; t += 33) dec.processarAmostra(t, acesoEm(linha, t) ? 400 : 110);
    expect(acesoEm(linha, t)).toBe(true);
    dec.interromper();
    // Continua até antes do 43 seguinte começar: só o resto cortado (2 longos + 3 curtos) passa.
    for (const fim = 2 * linha.cicloMs - 200; t < fim; t += 33) dec.processarAmostra(t, acesoEm(linha, t) ? 400 : 110);
    const numeros = dec.resumo().codigos.filter((c) => c.codigo !== null).map((c) => c.codigo);
    expect(numeros.every((c) => c === 43)).toBe(true);
  });
});

describe('encerrar pelo caminho completo (vídeo sintético + toque)', () => {
  test.each([0.35, 0.6, 0.85])('encerrar a %f de um ciclo nunca mostra código errado como número', (fracao) => {
    const codigos = [12, 41];
    const ciclo = linhaDoTempo(codigos).cicloMs;
    const r = rodarCena({ codigos, fps: 30, inicioMs: 2000, duracaoMs: ciclo * (1 + fracao) + 6000, ruido: 6, tremorPx: 2, autoExposicao: true });
    const resumo = r.leitor.resumo();
    for (const c of resumo.codigos) {
      if (c.codigo !== null) expect(codigos).toContain(c.codigo);
    }
  });
});
