// Parâmetros do decodificador. Tempos em milissegundos, brilho em níveis de 0 a 255.
// Os tempos da ECU estão em DECISOES.md (fonte + o que é medido e o que é estimado).

export interface ConfigDecodificador {
  /** Fronteira entre pisca curto e longo quando ainda não há piscas suficientes para separar sozinho. */
  fronteiraLongoMs: number;
  /**
   * Tempo apagado que encerra um código, enquanto não há pausas suficientes para separar sozinho.
   * Maior que o intervalo entre piscas, menor que a pausa entre códigos.
   */
  pausaCodigoMs: number;
  /** Aceso ou apagado mais curto que isso é tratado como ruído (reflexo, tremida). */
  pulsoMinimoMs: number;
  /** Aceso por mais que isso não é pisca: luz constante. */
  luzConstanteMs: number;
  /** Apagado por mais que isso: sem pisca (sem código, jumper fora ou ponto errado). */
  semPiscaMs: number;
  /** Quanto tempo o envelope de máximo/mínimo leva para esquecer um nível antigo. */
  tauEnvelopeMs: number;
  /** Quanto tempo o envelope leva para subir até um nível novo (filtra brilho de 1 quadro). */
  tauAtaqueMs: number;
  /** Diferença mínima entre aceso e apagado (em pontos de % do fundo) para considerar que há sinal. */
  amplitudeMinima: number;
  /** Histerese do limiar, em fração da amplitude (0.12 = liga a 62%, desliga a 38%). */
  histerese: number;
  /** Códigos a mais, além de 2 ciclos completos, que precisam bater antes de confirmar. */
  codigosExtras: number;
}

export const CONFIG_PADRAO: ConfigDecodificador = {
  fronteiraLongoMs: 800,
  pausaCodigoMs: 1400,
  pulsoMinimoMs: 120,
  luzConstanteMs: 4000,
  semPiscaMs: 12000,
  tauEnvelopeMs: 12000,
  tauAtaqueMs: 120,
  amplitudeMinima: 15,
  histerese: 0.12,
  codigosExtras: 1,
};
