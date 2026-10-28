// Busca automática sem toque: o detector propõe o ponto que parece piscar; um Leitor (o mesmo do toque,
// com refinador e máscara) roda nesse ponto, e só quando ele confirma uma leitura (2 ciclos iguais) o
// ponto vira sugestão. A sugestão é uma pergunta: o app mostra o ponto e a pessoa diz se é a luz da
// injeção antes de qualquer código aparecer. Reflexo que vai e volta em ritmo fixo chegou a imitar um
// código em 1–2 de 40 cenas sintéticas sem pisca; nenhum ajuste de limiar separou os dois com folga.

import { DetectorPisca, type Sugestao } from './detector';
import { Leitor } from './leitor';
import type { Regiao } from './amostragem';

/** Distância (fração da largura) a partir da qual uma sugestão nova é outro ponto. */
const MESMO_PONTO = 0.04;
/**
 * Consultas seguidas (1 por segundo) em que outro ponto precisa vencer para trocar o candidato.
 * O candidato fica parado enquanto isso: trocar ou mover a cada consulta recomeçava ou embaralhava a
 * leitura, e com luz forte por perto o detector alterna entre dois pontos (a leitura nunca fechava).
 */
const CONSULTAS_PARA_TROCAR = 3;
/** Raio mínimo do candidato: o detector é grosso; o refinador do Leitor afina depois. */
const RAIO_MINIMO = 0.06;
const CONSULTA_MS = 1000;

export class BuscadorLuz {
  private readonly detector = new DetectorPisca();
  private candidato: Regiao | null = null;
  private leitor: Leitor | null = null;
  private largura = 0;
  private altura = 0;
  private ultimaConsulta = Number.NaN;
  private desafiante: Regiao | null = null;
  /** Pontos que a pessoa disse que não são a luz da injeção. */
  private recusados: Regiao[] = [];
  private vitoriasDesafiante = 0;
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

  /**
   * A pessoa disse que o ponto achado não é a luz da injeção: esquece a leitura e não volta a esse ponto.
   * A busca só sugere; quem confirma a lâmpada é a pessoa (reflexo que vai e volta em ritmo fixo pode
   * imitar um código, e só quem vê o painel distingue).
   */
  recusar(): void {
    const ponto = this.achada ?? this.candidato;
    if (ponto) this.recusados.push(ponto);
    this.achada = null;
    this.lidosNaBusca = null;
    this.candidato = null;
    this.leitor = null;
    this.desafiante = null;
    this.vitoriasDesafiante = 0;
  }

  private considerar(nova: Regiao, largura: number, altura: number): void {
    const longe = (a: Regiao | null) => !a || Math.hypot(nova.cx - a.cx, ((nova.cy - a.cy) * altura) / largura) > MESMO_PONTO;
    if (this.recusados.some((r) => Math.hypot(nova.cx - r.cx, ((nova.cy - r.cy) * altura) / largura) <= MESMO_PONTO * 2)) return;
    if (!this.candidato) {
      this.trocar(nova);
      return;
    }
    if (!longe(this.candidato)) {
      this.desafiante = null;
      this.vitoriasDesafiante = 0;
      return;
    }
    this.vitoriasDesafiante = longe(this.desafiante) ? 1 : this.vitoriasDesafiante + 1;
    this.desafiante = nova;
    if (this.vitoriasDesafiante >= CONSULTAS_PARA_TROCAR) this.trocar(nova);
  }

  private trocar(nova: Regiao): void {
    this.candidato = nova;
    this.leitor = new Leitor(nova, this.largura, this.altura);
    this.desafiante = null;
    this.vitoriasDesafiante = 0;
  }

  processarQuadro(t: number, lum: Uint8Array, largura: number, altura: number): void {
    if (this.achada || !Number.isFinite(t)) return;
    this.largura = largura;
    this.altura = altura;
    this.detector.adicionar(t, lum, largura, altura);
    if (Number.isNaN(this.ultimaConsulta) || t - this.ultimaConsulta >= CONSULTA_MS) {
      this.ultimaConsulta = t;
      const s = this.detector.sugerir(this.recusados, MESMO_PONTO * 2);
      if (s) this.considerar({ cx: s.cx, cy: s.cy, raio: Math.max(RAIO_MINIMO, s.raio) }, largura, altura);
    }
    if (!this.candidato || !this.leitor) return;
    const e = this.leitor.processarQuadro(t, lum);
    if (e.confirmados) {
      // O refinador pode puxar um candidato vizinho de volta para a lâmpada recusada: confere a posição
      // final, não só o palpite do detector. Caiu num recusado = descarta em silêncio e segue procurando.
      const perto = (r: Regiao) => Math.hypot(e.regiao.cx - r.cx, ((e.regiao.cy - r.cy) * altura) / largura) <= MESMO_PONTO * 2;
      if (this.recusados.some(perto)) {
        if (this.candidato) this.recusados.push(this.candidato);
        this.candidato = null;
        this.leitor = null;
        return;
      }
      // Ponto achado = a região refinada pelo Leitor (centrada na lâmpada), não o palpite do detector.
      this.achada = { cx: e.regiao.cx, cy: e.regiao.cy, raio: e.regiao.raio, confianca: 1 };
      this.lidosNaBusca = e.confirmados;
    }
  }
}
