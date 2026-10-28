// Telas estáticas: início, como preparar o carro e tabela de códigos.

import { CODIGOS, FONTES, type Codigo } from '../codigos/tabela';

type Filho = Node | string | null | undefined | false;

/** Cria elemento com atributos e filhos. Texto entra sempre como textContent. */
export function h(tag: string, atributos: Record<string, string> = {}, ...filhos: Filho[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
  for (const f of filhos) if (f) el.append(f);
  return el;
}

export function botao(texto: string, acao: () => void, classe = ''): HTMLButtonElement {
  const b = h('button', { type: 'button', class: classe }, texto) as HTMLButtonElement;
  b.addEventListener('click', acao);
  return b;
}

export interface Navegar {
  inicio(): void;
  preparar(): void;
  ler(): void;
  tabela(): void;
}

function topo(titulo: string, nav: Navegar): HTMLElement {
  return h('div', { class: 'topo' }, h('h1', {}, titulo), botao('Voltar', nav.inicio, 'voltar'));
}

export function telaInicio(nav: Navegar): HTMLElement {
  return h(
    'section',
    { 'data-tela': 'inicio' },
    h('h1', {}, 'Leitor de Pisca'),
    h('p', { class: 'sub' }, 'Lê pela câmera o código de defeito que a luz da injeção pisca nos Honda OBD1 (1992–1995) e explica o que conferir.'),
    h(
      'div',
      { class: 'botoes' },
      botao('Ler os códigos', nav.ler, 'primario'),
      botao('Como preparar o carro', nav.preparar),
      botao('Tabela de códigos', nav.tabela),
    ),
    h('p', { class: 'nota' }, 'Primeira vez? Leia "Como preparar o carro": o jumper vai num conector específico e há conectores do airbag por perto.'),
  );
}

export function telaPreparar(nav: Navegar): HTMLElement {
  return h(
    'section',
    { 'data-tela': 'preparar' },
    topo('Como preparar o carro', nav),
    h(
      'div',
      { class: 'aviso', role: 'alert' },
      h('strong', {}, 'NÃO mexa nos conectores AMARELOS. '),
      'Fios e conectores amarelos são do airbag (SRS). Mexer neles pode disparar o airbag ou deixar o sistema com defeito.',
    ),
    h(
      'ol',
      { class: 'passos' },
      h('li', {}, h('strong', {}, 'Ignição desligada. '), 'Chave em OFF, motor parado.'),
      h(
        'li',
        {},
        h('strong', {}, 'Ache o conector de serviço (SCS). '),
        'É um conector de 2 pinos, normalmente azul, atrás do painel lateral do lado do passageiro (lado direito), perto da coluna da porta, na altura do pé. A central da injeção (ECU) fica ali perto.',
      ),
      h(
        'li',
        {},
        h('strong', {}, 'Não confunda com o conector de 3 pinos ao lado. '),
        'Esse é o de diagnóstico (DLC); não faça jumper nele.',
      ),
      h('li', {}, h('strong', {}, 'Ligue os 2 pinos do SCS '), 'com um clipe de papel aberto ou um pedaço de fio, ainda com a ignição desligada.'),
      h('li', {}, h('strong', {}, 'Gire a chave para ON '), '(segunda posição, painel aceso). ', h('strong', {}, 'Não dê partida.')),
      h(
        'li',
        {},
        h('strong', {}, 'Olhe a luz da injeção '),
        '(CHECK ENGINE / PGM-FI). Piscas longos são a dezena e curtos são a unidade: 1 longo e 2 curtos = código 12. A lista se repete.',
      ),
      h('li', {}, h('strong', {}, 'Abra "Ler os códigos", '), 'aponte a câmera para o painel e toque na luz da injeção.'),
    ),
    h('h2', {}, 'O que a luz pode fazer'),
    h(
      'ul',
      {},
      h('li', {}, h('strong', {}, 'Pisca: '), 'há código gravado. É isso que o leitor lê.'),
      h('li', {}, h('strong', {}, 'Fica acesa sem piscar: '), 'nenhum código gravado.'),
      h(
        'li',
        {},
        h('strong', {}, 'Quem pisca é a luz do airbag (SRS): '),
        'o jumper está no conector errado. Desligue a ignição e tire o jumper.',
      ),
    ),
    h('h2', {}, 'Depois de ler'),
    h(
      'ol',
      { class: 'passos' },
      h('li', {}, 'Desligue a ignição e tire o jumper.'),
      h(
        'li',
        {},
        h('strong', {}, 'Para apagar os códigos: '),
        'com a ignição desligada, tire o fusível BACK UP (RADIO) de 7,5 A da caixa de fusíveis do motor por pelo menos 10 segundos.',
      ),
      h('li', {}, 'O relógio e as estações do rádio se perdem. Rádio com antifurto pede o código dele ao religar.'),
      h('li', {}, 'Se o defeito continuar, o código volta.'),
    ),
    h(
      'p',
      { class: 'nota' },
      'Conferido em fontes públicas (veja a tabela de códigos). Ainda não conferido: a cor do SCS nos 92–93 (uma fonte diz cinza) e se o Civic vendido no Brasil tem airbag em todas as versões.',
    ),
  );
}

const ROTULO_SITUACAO: Record<Codigo['situacao'], string> = {
  confirmado: 'confirmado em 2+ fontes',
  'nao-confirmado': 'não confirmado',
  'outro-modelo': 'não é de Civic 92–95',
};

export function cartaoCodigo(c: Codigo, testid = 'codigo'): HTMLElement {
  return h(
    'article',
    { class: 'cartao', 'data-testid': testid, 'data-codigo': String(c.codigo) },
    h('div', { class: 'numero' }, String(c.codigo)),
    h('h3', {}, c.nome),
    h(
      'dl',
      {},
      h('dt', {}, 'Causa provável'),
      h('dd', {}, c.causa),
      h('dt', {}, 'O que conferir'),
      h('dd', {}, c.conferir),
      c.aplica ? h('dt', {}, 'Onde existe') : null,
      c.aplica ? h('dd', {}, c.aplica) : null,
      c.nota ? h('dt', {}, 'Observação') : null,
      c.nota ? h('dd', {}, c.nota) : null,
    ),
    h('span', { class: `selo ${c.situacao}` }, `${ROTULO_SITUACAO[c.situacao]} · ${c.fontes.join(', ')}`),
  );
}

export function telaTabela(nav: Navegar): HTMLElement {
  return h(
    'section',
    { 'data-tela': 'tabela' },
    topo('Tabela de códigos', nav),
    h(
      'p',
      { class: 'sub' },
      'Honda OBD1 1992–1995, com foco no Civic. Código que não está aqui: repita a leitura; se ele voltar, a suspeita é a ECU.',
    ),
    ...CODIGOS.map((c) => cartaoCodigo(c)),
    h('h2', {}, 'Fontes'),
    h(
      'ul',
      { class: 'fontes' },
      ...FONTES.map((f) => h('li', {}, `[${f.id}] `, h('a', { href: f.url, target: '_blank', rel: 'noopener' }, f.titulo))),
    ),
  );
}
