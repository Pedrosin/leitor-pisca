// Do estado aceso/apagado por quadro para piscas com duração, e de piscas para códigos.

import type { EstadoLuz } from './limiar';

export interface Pisca {
  inicio: number;
  fim: number;
}

export type Borda = { tipo: 'subida' | 'descida'; t: number };

/**
 * Filtra trocas de estado mais curtas que `pulsoMinimoMs`.
 * A troca só vale se o novo estado durar o mínimo; aí a borda é datada no instante em que começou,
 * no meio entre o quadro anterior e o primeiro quadro no estado novo.
 */
export class FiltroBordas {
  private confirmado: 'aceso' | 'apagado' | null = null;
  private candidato: 'aceso' | 'apagado' | null = null;
  private tCandidato = 0;
  private tAnterior = Number.NaN;

  constructor(private readonly pulsoMinimoMs: number) {}

  get estado(): 'aceso' | 'apagado' | null {
    return this.confirmado;
  }

  /** Devolve a borda confirmada neste quadro, se houver. */
  atualizar(t: number, bruto: EstadoLuz): Borda | null {
    const tMeio = Number.isNaN(this.tAnterior) ? t : (this.tAnterior + t) / 2;
    this.tAnterior = t;
    if (bruto === 'indefinido') {
      this.candidato = null;
      return null;
    }
    if (this.confirmado === null) {
      this.confirmado = bruto;
      return null;
    }
    if (bruto === this.confirmado) {
      this.candidato = null;
      return null;
    }
    if (this.candidato !== bruto) {
      this.candidato = bruto;
      this.tCandidato = tMeio;
    }
    if (t - this.tCandidato >= this.pulsoMinimoMs) {
      this.confirmado = bruto;
      this.candidato = null;
      return { tipo: bruto === 'aceso' ? 'subida' : 'descida', t: this.tCandidato };
    }
    return null;
  }

  esquecer(): void {
    this.confirmado = null;
    this.candidato = null;
  }
}

export interface Digitos {
  dezenas: number;
  unidades: number;
}

/**
 * Fronteira entre duas famílias de duração (pisca curto/longo, ou intervalo/pausa). Com durações bem
 * separadas no histórico, usa a média geométrica entre os dois grupos; senão (só uma família vista até
 * agora) usa a fronteira fixa. A aprendida só vale entre fixa/folga e fixa×folga, e com pelo menos
 * 2 durações de cada lado (um apagão isolado de 20 s não cria uma família).
 */
export function fronteiraAprendida(
  duracoes: readonly number[],
  fixa: number,
  razaoMinima = 1.6,
  folga = 2,
): number {
  if (duracoes.length < 2) return fixa;
  const ordenadas = [...duracoes].sort((a, b) => a - b);
  let melhorRazao = 1;
  let melhor = fixa;
  for (let i = 2; i < ordenadas.length - 1; i++) {
    const a = ordenadas[i - 1] as number;
    const b = ordenadas[i] as number;
    const razao = b / Math.max(a, 1);
    const meio = Math.sqrt(a * b);
    // Só concorre fronteira que não foge do esperado: um apagão de 20 s não pode virar a "pausa".
    if (razao > melhorRazao && meio >= fixa / folga && meio <= fixa * folga) {
      melhorRazao = razao;
      melhor = meio;
    }
  }
  return melhorRazao >= razaoMinima ? melhor : fixa;
}

/** Longos vêm antes dos curtos. Qualquer outra ordem é leitura inválida. */
export function classificarGrupo(duracoes: readonly number[], fronteira: number): Digitos | null {
  let dezenas = 0;
  let unidades = 0;
  for (const d of duracoes) {
    if (d >= fronteira) {
      if (unidades > 0) return null;
      dezenas++;
    } else {
      unidades++;
    }
  }
  if (dezenas > 9 || unidades > 9 || dezenas + unidades === 0) return null;
  return { dezenas, unidades };
}
