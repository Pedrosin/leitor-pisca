// Fachada: amostra de brilho por quadro entra, estado da leitura sai.
// Sem DOM e sem relógio próprio: o tempo vem do chamador (timestamp do quadro da câmera).

import { CONFIG_PADRAO, type ConfigDecodificador } from './config';
import { LimiarAdaptativo, type EstadoLuz } from './limiar';
import { FiltroBordas, classificarGrupo, fronteiraAprendida } from './piscas';
import { cicloRepetido, type Leitura, type LeituraDatada } from './ciclos';
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

const HISTORICO_DURACOES = 40;
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
  /** Início do primeiro pisca do código em andamento. */
  private inicioGrupo = Number.NaN;
  private confirmados: number[] | null = null;
  private luzConstante = false;
  private estadoBruto: EstadoLuz = 'indefinido';
  private tUltimo = Number.NaN;

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
    this.inicioGrupo = Number.NaN;
    this.confirmados = null;
    this.luzConstante = false;
    this.estadoBruto = 'indefinido';
    this.tUltimo = Number.NaN;
  }

  /** Quadro de luminância + região. */
  processarQuadro(t: number, lum: Uint8Array, largura: number, altura: number, regiao: Regiao): EstadoLeitura {
    return this.processarAmostra(t, sinalDaMedida(medirRegiao(lum, largura, altura, regiao)));
  }

  /** Um valor de brilho (lâmpada menos fundo) no instante t, em ms. */
  processarAmostra(t: number, valor: number): EstadoLeitura {
    if (!Number.isNaN(this.tUltimo) && t <= this.tUltimo) return this.estado();
    this.tUltimo = t;
    this.estadoBruto = this.limiar.atualizar(t, valor);
    const anterior = this.bordas.estado;
    const borda = this.bordas.atualizar(t, this.estadoBruto);

    if (anterior === null && this.bordas.estado === 'apagado') {
      // Primeiro estado conhecido é apagado: a pausa começou no máximo agora (limite inferior).
      this.ultimaDescida = t;
    }
    if (anterior === null && this.bordas.estado === 'aceso') this.acesoDesde = t;
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
      this.registrar(null, t);
    }
  }

  private fecharGrupo(): void {
    const digitos = this.grupoLimpo ? classificarGrupo(this.grupo, this.fronteira(), this.grupoIntervalos) : null;
    this.grupo = [];
    this.grupoIntervalos = [];
    this.registrar(digitos ? digitos.dezenas * 10 + digitos.unidades : null, this.inicioGrupo);
  }

  private registrar(codigo: Leitura, t: number): void {
    this.leituras.push({ codigo, t });
    if (this.leituras.length > HISTORICO_LEITURAS) this.leituras.shift();
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
