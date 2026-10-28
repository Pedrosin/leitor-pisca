// Confirmação por repetição. A ECU repete a lista de códigos guardados em ciclo; um código só é
// confirmado quando a sequência lida tem período p com 2 ciclos completos iguais (mais `extras` códigos),
// sem código repetido dentro do ciclo, e com o ciclo durando o mesmo tempo nas repetições.
// Leitura ruim entra como null e nunca bate com nada.
//
// A duração é o que separa repetição de coincidência: um "3" que perde o pisca do meio vira "1, 1";
// junto com um "1" de verdade, a sequência fica "1, 1, 1", mas os intervalos entre eles não são iguais.

export type Leitura = number | null;

export interface LeituraDatada {
  codigo: Leitura;
  /** Início do primeiro pisca do código, em ms. */
  t: number;
}

/** Diferença tolerada entre as durações de um mesmo ciclo nas repetições. */
const TOLERANCIA_MS = 300;
const TOLERANCIA_FRACAO = 0.06;

/** Duas durações de ciclo batem? (mesma tolerância da confirmação) */
export function mesmaDuracao(a: number, b: number): boolean {
  return a > 0 && b > 0 && Math.abs(a - b) <= Math.max(TOLERANCIA_MS, TOLERANCIA_FRACAO * Math.max(a, b));
}

/** Menor período p tal que os últimos 2p+extras itens se repetem a cada p. Devolve o ciclo ou null. */
export function cicloRepetido(leituras: readonly LeituraDatada[], extras: number): number[] | null {
  const n = leituras.length;
  for (let p = 1; 2 * p + extras <= n; p++) {
    const janela = leituras.slice(n - 2 * p - extras);
    let ok = true;
    let menor = Infinity;
    let maior = -Infinity;
    for (let i = 0; i + p < janela.length; i++) {
      const a = janela[i] as LeituraDatada;
      const b = janela[i + p] as LeituraDatada;
      if (a.codigo === null || a.codigo !== b.codigo) {
        ok = false;
        break;
      }
      const duracao = b.t - a.t;
      // Ciclo tem que andar para frente no tempo; duração zero, negativa ou NaN não é repetição.
      if (!(duracao > 0)) {
        ok = false;
        break;
      }
      menor = Math.min(menor, duracao);
      maior = Math.max(maior, duracao);
    }
    if (!ok) continue;
    if (maior - menor > Math.max(TOLERANCIA_MS, TOLERANCIA_FRACAO * maior)) continue;
    const ciclo = janela.slice(janela.length - p).map((l) => l.codigo as number);
    if (new Set(ciclo).size !== ciclo.length) continue;
    return [...ciclo].sort((a, b) => a - b);
  }
  return null;
}
