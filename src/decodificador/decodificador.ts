// Fachada: amostra de brilho por quadro entra, estado da leitura sai.
// Sem DOM e sem relógio próprio: o tempo vem do chamador (timestamp do quadro da câmera).

import { CONFIG_PADRAO, type ConfigDecodificador } from './config';
import { LimiarAdaptativo, type EstadoLuz } from './limiar';
import { FiltroBordas, classificarGrupo, fronteiraAprendida } from './piscas';
import { cicloRepetido, mesmaDuracao, type Leitura, type LeituraDatada } from './ciclos';
import { medirRegiao, sinalDaMedida, type Regiao } from './amostragem';

export type Alerta = 'sinal-fraco' | 'luz-constante' | 'sem-pisca';

export interface EstadoLeitura {
  fase: 'aguardando-sinal' | 'lendo' | 'confirmado';
  luz: EstadoLuz;
  alertas: Alerta[];
  /** Piscas do código em andamento, com a classificação provisória. */
  grupoAtual: { longos: number; curtos: number };
  /** Códigos lidos em ordem (null = leitura descartada). */
  lidos: Leitura[];
  /** Códigos confirmados, em ordem crescente, ou null enquanto não confirmou. */
  confirmados: number[] | null;
}

/** Pisca do mapa de conferência. `aberto` = ainda aceso quando a leitura parou (não dá para saber o tipo). */
export type TipoPisca = 'longo' | 'curto' | 'aberto';

/** Um código no resumo que a pessoa confere ao encerrar a leitura. */
export interface CodigoConferido {
  /** null quando incompleto: código cortado nunca vira número. */
  codigo: number | null;
  /**
   * confirmado = está na confirmação automática, ou foi lido 3+ vezes com o mesmo intervalo entre as
   * leituras (2 ciclos iguais da ECU); visto = lido 1 ou 2 vezes sem essa regularidade (leitura avulsa,
   * de reflexo ou de outra luz, cai aqui); incompleto = cortado, confuso ou em andamento ao parar.
   */
  situacao: 'confirmado' | 'visto' | 'incompleto';
  /** Quantas vezes o código foi lido (cada vez = um ciclo da ECU). */
  vezes: number;
  piscas: TipoPisca[];
  motivo?: 'cortado' | 'confuso' | 'em-andamento';
}

export interface ResumoLeitura {
  /** Confirmados e vistos em ordem crescente; incompletos no fim. */
  codigos: CodigoConferido[];
  /** Leituras descartadas no caminho (cortadas, confusas, luz acesa direto). */
  descartadas: number;
  /** O que a confirmação automática (2 ciclos da lista inteira) deu, se deu. */
  confirmacaoAutomatica: number[] | null;
}

interface Registro {
  codigo: Leitura;
  piscas: TipoPisca[];
  motivo?: 'cortado' | 'confuso';
}

const HISTORICO_DURACOES = 40;
/** Antes do primeiro pisca, o sinal pode variar no máximo isso (fração do salto) para o código contar inteiro. */
const VARIACAO_PRE_MAXIMA = 0.35;
const HISTORICO_LEITURAS = 64;

export class Decodificador {
  private readonly cfg: ConfigDecodificador;
  private limiar!: LimiarAdaptativo;
  private bordas!: FiltroBordas;
  private duracoes: number[] = [];
  private intervalos: number[] = [];
  private grupo: number[] = [];
  /** Apagados entre os piscas do código em andamento. */
  private grupoIntervalos: number[] = [];
  /** O primeiro pisca do grupo veio depois de uma pausa vista inteira? Se não, o código pode estar cortado. */
  private grupoLimpo = false;
  private ultimaSubida = Number.NaN;
  /** Desde quando está aceso; vale também quando a leitura começou com a luz acesa. */
  private acesoDesde = Number.NaN;
  private ultimaDescida = Number.NaN;
  private leituras: LeituraDatada[] = [];
  /** Mapa de piscas de cada leitura, para a conferência (mesma ordem de `leituras`). */
  private registros: Registro[] = [];
  /** Início do primeiro pisca do código em andamento. */
  private inicioGrupo = Number.NaN;
  private confirmados: number[] | null = null;
  private luzConstante = false;
  private estadoBruto: EstadoLuz = 'indefinido';
  private tUltimo = Number.NaN;
  /** Antes do primeiro estado conhecido: desde quando observa e quanto o sinal variou. */
  private tPrimeiro = Number.NaN;
  private preMin = Infinity;
  private preMax = -Infinity;

  constructor(cfg: Partial<ConfigDecodificador> = {}) {
    this.cfg = { ...CONFIG_PADRAO, ...cfg };
    this.reiniciar();
  }

  reiniciar(): void {
    this.limiar = new LimiarAdaptativo(this.cfg);
    this.bordas = new FiltroBordas(this.cfg.pulsoMinimoMs);
    this.duracoes = [];
    this.intervalos = [];
    this.grupo = [];
    this.grupoIntervalos = [];
    this.grupoLimpo = false;
    this.ultimaSubida = Number.NaN;
    this.acesoDesde = Number.NaN;
    this.ultimaDescida = Number.NaN;
    this.leituras = [];
    this.registros = [];
    this.inicioGrupo = Number.NaN;
    this.confirmados = null;
    this.luzConstante = false;
    this.estadoBruto = 'indefinido';
    this.tUltimo = Number.NaN;
    this.tPrimeiro = Number.NaN;
    this.preMin = Infinity;
    this.preMax = -Infinity;
  }

  /** Quadro de luminância + região. */
  processarQuadro(t: number, lum: Uint8Array, largura: number, altura: number, regiao: Regiao): EstadoLeitura {
    return this.processarAmostra(t, sinalDaMedida(medirRegiao(lum, largura, altura, regiao)));
  }

  /** Um valor de brilho (lâmpada menos fundo) no instante t, em ms. */
  processarAmostra(t: number, valor: number): EstadoLeitura {
    // Só tempo finito e crescente: quadro repetido, fora de ordem, NaN ou Infinity é descartado
    // (Infinity gravado em tUltimo congelaria a leitura para sempre).
    if (!Number.isFinite(t) || !Number.isFinite(valor)) return this.estado();
    if (!Number.isNaN(this.tUltimo) && t <= this.tUltimo) return this.estado();
    this.tUltimo = t;
    if (Number.isNaN(this.tPrimeiro)) this.tPrimeiro = t;
    this.estadoBruto = this.limiar.atualizar(t, valor);
    const anterior = this.bordas.estado;
    const borda = this.bordas.atualizar(t, this.estadoBruto);

    if (anterior === null && this.bordas.estado === null) {
      this.preMin = Math.min(this.preMin, valor);
      this.preMax = Math.max(this.preMax, valor);
    }
    if (anterior === null && this.bordas.estado === 'apagado') {
      // Primeiro estado conhecido é apagado: a pausa começou no máximo agora (limite inferior).
      this.ultimaDescida = t;
    }
    if (anterior === null && this.bordas.estado === 'aceso') {
      this.acesoDesde = t;
      // Primeiro estado conhecido é aceso: é a subida do primeiro pisca visto. Se antes dele o sinal ficou
      // escuro e parado (variou pouco perto do salto) por uma pausa inteira, nenhum pisca fraco passou
      // despercebido e o código está inteiro: conta, em vez de descartar sempre a primeira leitura.
      const salto = valor - this.preMin;
      const parado = Number.isFinite(this.preMin) && this.preMax - this.preMin <= salto * VARIACAO_PRE_MAXIMA;
      if (parado) {
        this.ultimaDescida = this.tPrimeiro;
        this.aoSubir(t);
      }
    }
    if (borda?.tipo === 'subida') this.aoSubir(borda.t);
    if (borda?.tipo === 'descida') this.aoDescer(borda.t);
    this.verificarTempo(t);
    return this.estado();
  }

  private aoSubir(t: number): void {
    const pausa = t - this.ultimaDescida;
    if (this.grupo.length > 0 && !Number.isNaN(pausa)) this.grupoIntervalos.push(pausa);
    if (this.grupo.length === 0) {
      this.inicioGrupo = t;
      this.grupoLimpo = !Number.isNaN(pausa) && pausa >= this.pausaCodigo() && !this.luzConstante;
    }
    if (!Number.isNaN(pausa) && !this.luzConstante && !Number.isNaN(this.ultimaSubida)) {
      this.intervalos.push(pausa);
      if (this.intervalos.length > HISTORICO_DURACOES) this.intervalos.shift();
    }
    this.luzConstante = false;
    this.ultimaSubida = t;
    this.acesoDesde = t;
  }

  private aoDescer(t: number): void {
    this.ultimaDescida = t;
    if (Number.isNaN(this.ultimaSubida) || this.luzConstante) {
      // Descida sem subida vista (começou aceso) ou fim de luz constante: não é pisca medível.
      this.luzConstante = false;
      this.grupoLimpo = false;
      return;
    }
    const duracao = t - this.ultimaSubida;
    this.grupo.push(duracao);
    this.duracoes.push(duracao);
    if (this.duracoes.length > HISTORICO_DURACOES) this.duracoes.shift();
  }

  private verificarTempo(t: number): void {
    const estado = this.bordas.estado;
    if (estado === 'apagado' && this.grupo.length > 0 && t - this.ultimaDescida >= this.pausaCodigo()) {
      this.fecharGrupo();
    }
    if (estado === 'aceso' && !this.luzConstante && t - this.acesoDesde >= this.cfg.luzConstanteMs) {
      this.luzConstante = true;
      this.grupo = [];
      this.grupoIntervalos = [];
      this.registrar(null, t, []);
    }
  }

  private fecharGrupo(): void {
    const digitos = this.grupoLimpo ? classificarGrupo(this.grupo, this.fronteira(), this.grupoIntervalos) : null;
    const piscas = this.mapear(this.grupo);
    const motivo = digitos ? undefined : this.grupoLimpo ? 'confuso' : 'cortado';
    this.grupo = [];
    this.grupoIntervalos = [];
    this.registrar(digitos ? digitos.dezenas * 10 + digitos.unidades : null, this.inicioGrupo, piscas, motivo);
  }

  private mapear(duracoes: readonly number[]): TipoPisca[] {
    const fronteira = this.fronteira();
    return duracoes.map((d) => (d >= fronteira ? 'longo' : 'curto'));
  }

  private registrar(codigo: Leitura, t: number, piscas: TipoPisca[], motivo?: Registro['motivo']): void {
    this.leituras.push({ codigo, t });
    this.registros.push({ codigo, piscas, motivo });
    if (this.leituras.length > HISTORICO_LEITURAS) {
      this.leituras.shift();
      this.registros.shift();
    }
    const ciclo = cicloRepetido(this.leituras, this.cfg.codigosExtras);
    if (ciclo) this.confirmados = ciclo;
  }

  private fronteira(): number {
    return fronteiraAprendida(this.duracoes, this.cfg.fronteiraLongoMs);
  }

  private pausaCodigo(): number {
    // Folga maior que a do pisca: a pausa entre códigos da ECU é a medida menos certa (DECISOES.md).
    return fronteiraAprendida(this.intervalos, this.cfg.pausaCodigoMs, 1.8, 2.5);
  }

  /**
   * O que foi lido até agora, para a pessoa conferir ao encerrar sem esperar a confirmação automática.
   * Não muda o estado: dá para pedir o resumo e continuar lendo.
   */
  resumo(): ResumoLeitura {
    const porCodigo = new Map<number, { tempos: number[]; piscas: TipoPisca[] }>();
    this.registros.forEach((r, i) => {
      if (r.codigo === null) return;
      const atual = porCodigo.get(r.codigo) ?? { tempos: [], piscas: r.piscas };
      atual.tempos.push((this.leituras[i] as LeituraDatada).t);
      atual.piscas = r.piscas;
      porCodigo.set(r.codigo, atual);
    });
    const automatica = this.confirmados;
    // Repetição regular: três leituras seguidas do código com o mesmo intervalo (o ciclo da ECU).
    // Duas leituras não bastam: um "1" avulso de reflexo ou de outra luz chegou a se repetir.
    const regular = (tempos: number[]) =>
      tempos.some((_, i) => i >= 2 && mesmaDuracao((tempos[i] as number) - (tempos[i - 1] as number), (tempos[i - 1] as number) - (tempos[i - 2] as number)));
    const codigos: CodigoConferido[] = [...porCodigo.entries()]
      .sort(([a], [b]) => a - b)
      .map(([codigo, { tempos, piscas }]) => ({
        codigo,
        situacao: automatica?.includes(codigo) || regular(tempos) ? 'confirmado' : 'visto',
        vezes: tempos.length,
        piscas,
      }));
    // A última coisa vista foi um código cortado ou confuso: aparece como incompleto, com o mapa.
    const ultimo = this.registros[this.registros.length - 1];
    if (ultimo && ultimo.codigo === null && ultimo.piscas.length > 0) {
      codigos.push({ codigo: null, situacao: 'incompleto', vezes: 0, piscas: ultimo.piscas, motivo: ultimo.motivo });
    }
    // Código em andamento quando a leitura parou.
    const andamento = this.mapear(this.grupo);
    if (this.bordas.estado === 'aceso' && !this.luzConstante && !Number.isNaN(this.ultimaSubida)) andamento.push('aberto');
    if (andamento.length > 0) {
      codigos.push({ codigo: null, situacao: 'incompleto', vezes: 0, piscas: andamento, motivo: 'em-andamento' });
    }
    return {
      codigos,
      descartadas: this.registros.filter((r) => r.codigo === null).length,
      confirmacaoAutomatica: automatica ? [...automatica] : null,
    };
  }

  /**
   * Pausa na leitura (a pessoa encerrou para conferir e voltou a ler): o código em andamento é descartado
   * e o próximo só conta depois de uma pausa vista inteira. O que já foi lido e o que foi aprendido
   * (durações, limiar) ficam.
   */
  interromper(): void {
    if (this.grupo.length > 0) this.registrar(null, this.inicioGrupo, this.mapear(this.grupo), 'cortado');
    this.grupo = [];
    this.grupoIntervalos = [];
    this.grupoLimpo = false;
    this.bordas.esquecer();
    this.ultimaSubida = Number.NaN;
    this.acesoDesde = Number.NaN;
    this.ultimaDescida = Number.NaN;
    this.luzConstante = false;
  }

  estado(): EstadoLeitura {
    const alertas: Alerta[] = [];
    if (this.estadoBruto === 'indefinido') alertas.push('sinal-fraco');
    if (this.luzConstante) alertas.push('luz-constante');
    if (
      this.bordas.estado === 'apagado' &&
      !Number.isNaN(this.ultimaDescida) &&
      this.tUltimo - this.ultimaDescida >= this.cfg.semPiscaMs
    ) {
      alertas.push('sem-pisca');
    }
    const fronteira = this.fronteira();
    const emAndamento = [...this.grupo];
    if (this.bordas.estado === 'aceso' && !this.luzConstante && !Number.isNaN(this.ultimaSubida)) {
      emAndamento.push(this.tUltimo - this.ultimaSubida);
    }
    const longos = emAndamento.filter((d) => d >= fronteira).length;
    return {
      fase: this.confirmados ? 'confirmado' : this.bordas.estado === null ? 'aguardando-sinal' : 'lendo',
      luz: this.bordas.estado ?? 'indefinido',
      alertas,
      grupoAtual: { longos, curtos: emAndamento.length - longos },
      lidos: this.leituras.map((l) => l.codigo),
      confirmados: this.confirmados ? [...this.confirmados] : null,
    };
  }
}
