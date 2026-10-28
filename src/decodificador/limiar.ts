// Limiar adaptativo com histerese sobre a série de brilho.
// O envelope (alto/baixo) acompanha mudança lenta de exposição e esquece reflexo de poucos quadros.

export type EstadoLuz = 'aceso' | 'apagado' | 'indefinido';

export interface ConfigLimiar {
  tauEnvelopeMs: number;
  tauAtaqueMs: number;
  amplitudeMinima: number;
  histerese: number;
}

export class LimiarAdaptativo {
  private alto = Number.NaN;
  private baixo = Number.NaN;
  private tAnterior = Number.NaN;
  private estado: EstadoLuz = 'indefinido';

  constructor(private readonly cfg: ConfigLimiar) {}

  get amplitude(): number {
    return Number.isNaN(this.alto) ? 0 : this.alto - this.baixo;
  }

  atualizar(t: number, valor: number): EstadoLuz {
    if (!Number.isFinite(t) || !Number.isFinite(valor)) return this.estado;
    if (Number.isNaN(this.alto)) {
      this.alto = valor;
      this.baixo = valor;
      this.tAnterior = t;
      return this.estado;
    }
    // Tempo que volta não recua a referência: o passo seguinte é medido do último tempo válido.
    if (!(t > this.tAnterior)) return this.estado;
    const dt = t - this.tAnterior;
    this.tAnterior = t;
    const ataque = 1 - Math.exp(-dt / this.cfg.tauAtaqueMs);
    const esquece = 1 - Math.exp(-dt / this.cfg.tauEnvelopeMs);

    this.alto += (valor - this.alto) * (valor > this.alto ? ataque : esquece);
    this.baixo += (valor - this.baixo) * (valor < this.baixo ? ataque : esquece);

    const amp = this.alto - this.baixo;
    if (amp < this.cfg.amplitudeMinima) {
      this.estado = 'indefinido';
      return this.estado;
    }
    const posicao = (valor - this.baixo) / amp;
    if (this.estado === 'aceso') {
      if (posicao < 0.5 - this.cfg.histerese) this.estado = 'apagado';
    } else if (this.estado === 'apagado') {
      if (posicao > 0.5 + this.cfg.histerese) this.estado = 'aceso';
    } else {
      this.estado = posicao >= 0.5 ? 'aceso' : 'apagado';
    }
    return this.estado;
  }
}
