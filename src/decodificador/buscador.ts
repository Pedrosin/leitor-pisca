// Busca automática sem toque: o detector propõe o ponto que parece piscar; um decodificador roda nesse
// ponto e só quando ele confirma uma leitura (2 ciclos iguais) o ponto vira sugestão para o usuário.
// Mais lento que o toque (precisa da leitura inteira), mas não aponta reflexo.
// O detector sozinho confunde reflexo que passeia com pisca; a estrutura de código (longos antes de
// curtos, pausa entre códigos, repetição) é o que reflexo não imita.

import { DetectorPisca, type Sugestao } from './detector';
import { Decodificador } from './decodificador';
import type { Regiao } from './amostragem';

/** Distância (fração da largura) a partir da qual um candidato novo é outro ponto. */
const MESMO_PONTO = 0.04;
/** Raio mínimo do candidato: o detector é grosso; o refinador do Leitor afina depois. */
const RAIO_MINIMO = 0.06;
const CONSULTA_MS = 1000;

export class BuscadorLuz {
  private readonly detector = new DetectorPisca();
  private candidato: Regiao | null = null;
  private decodificador: Decodificador | null = null;
  private ultimaConsulta = Number.NaN;
  private achada: Sugestao | null = null;
  private lidosNaBusca: number[] | null = null;

  /** Ponto onde uma leitura foi confirmada, ou null. */
  get sugestao(): Sugestao | null {
    return this.achada;
  }

  /** Códigos que a busca confirmou no ponto achado (o Leitor que assume depois recomeça do zero). */
  get confirmados(): number[] | null {
    return this.lidosNaBusca ? [...this.lidosNaBusca] : null;
  }

  /** Candidato do detector ainda não confirmado (para mostrar "procurando aqui"). */
  get emTeste(): Regiao | null {
    return this.candidato;
  }

  processarQuadro(t: number, lum: Uint8Array, largura: number, altura: number): void {
    if (this.achada || !Number.isFinite(t)) return;
    this.detector.adicionar(t, lum, largura, altura);
    if (Number.isNaN(this.ultimaConsulta) || t - this.ultimaConsulta >= CONSULTA_MS) {
      this.ultimaConsulta = t;
      const s = this.detector.sugerir();
      if (s && (!this.candidato || Math.hypot(s.cx - this.candidato.cx, ((s.cy - this.candidato.cy) * altura) / largura) > MESMO_PONTO)) {
        this.candidato = { cx: s.cx, cy: s.cy, raio: Math.max(RAIO_MINIMO, s.raio) };
        this.decodificador = new Decodificador();
      }
    }
    if (!this.candidato || !this.decodificador) return;
    const e = this.decodificador.processarQuadro(t, lum, largura, altura, this.candidato);
    if (e.confirmados) {
      this.achada = { ...this.candidato, confianca: 1 };
      this.lidosNaBusca = e.confirmados;
    }
  }
}
