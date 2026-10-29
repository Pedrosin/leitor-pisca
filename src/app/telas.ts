// Telas estáticas: início (com o seletor de idioma), como preparar o carro e tabela de códigos.
// Todo texto vem de t() (src/i18n): aqui só há estrutura.

import { buscarCodigo, codigos, fontes, type Codigo } from '../codigos/tabela';
import { IDIOMAS, fmt, idioma, t, type Idioma } from '../i18n';

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
  /** Direto para o início (botão "Início"). */
  inicio(): void;
  /** Uma tela para trás, igual ao voltar do Android. */
  voltar(): void;
  preparar(): void;
  ler(): void;
  tabela(): void;
  /** Troca o idioma (escolha manual, fica salva) e redesenha a tela atual. */
  idioma(novo: Idioma): void;
}

function topo(titulo: string, nav: Navegar): HTMLElement {
  return h('div', { class: 'topo' }, h('h1', {}, titulo), botao(t().comum.voltar, nav.voltar, 'voltar'));
}

/** Parte em negrito seguida do resto, como nos passos. */
function forteTexto(p: { forte: string; texto: string; forte2?: string }): Filho[] {
  return [h('strong', {}, p.forte), ' ', p.texto, p.forte2 ? ' ' : null, p.forte2 ? h('strong', {}, p.forte2) : null];
}

/**
 * Seletor de idioma: só na tela inicial (D37). Cada idioma aparece no próprio idioma (endônimo), para
 * quem caiu no idioma errado achar o seu.
 */
function seletorIdioma(nav: Navegar): HTMLElement {
  const atual = idioma();
  return h(
    'div',
    { class: 'idiomas', role: 'group', 'aria-label': t().idioma.rotulo },
    ...(Object.keys(IDIOMAS) as Idioma[]).map((id) => {
      const b = botao(IDIOMAS[id].nome, () => nav.idioma(id), id === atual ? 'idioma ativo' : 'idioma');
      b.setAttribute('lang', id);
      b.setAttribute('aria-pressed', String(id === atual));
      b.setAttribute('data-testid', `idioma-${id}`);
      return b;
    }),
  );
}

export function telaInicio(nav: Navegar): HTMLElement {
  const tx = t().inicio;
  const ler = botao(tx.ler, nav.ler, 'primario');
  ler.setAttribute('data-testid', 'ir-ler');
  const preparar = botao(tx.preparar, nav.preparar);
  preparar.setAttribute('data-testid', 'ir-preparar');
  const tabela = botao(tx.tabela, nav.tabela);
  tabela.setAttribute('data-testid', 'ir-tabela');
  return h(
    'section',
    { 'data-tela': 'inicio' },
    h('h1', {}, t().app.titulo),
    h('p', { class: 'sub' }, tx.subtitulo),
    seletorIdioma(nav),
    h('div', { class: 'botoes' }, ler, preparar, tabela),
    h('p', { class: 'nota' }, tx.nota),
    h('p', { class: 'versao', 'data-testid': 'versao' }, fmt(tx.versao, { versao: __VERSAO__ })),
  );
}

export function telaPreparar(nav: Navegar): HTMLElement {
  const tx = t().preparar;
  const p = tx.passos;
  return h(
    'section',
    { 'data-tela': 'preparar' },
    topo(tx.titulo, nav),
    h('div', { class: 'aviso', role: 'alert', 'data-testid': 'aviso-airbag' }, h('strong', {}, tx.avisoForte), ' ', tx.avisoTexto),
    h(
      'ol',
      { class: 'passos' },
      ...[p.desligar, p.achar, p.lado, p.naoConfundir, p.ligar, p.chave, p.cinto, p.olhar, p.abrir].map((passo) =>
        h('li', {}, ...forteTexto(passo)),
      ),
    ),
    h('h2', {}, tx.luzTitulo),
    h('ul', {}, ...[tx.luz.pisca, tx.luz.acesa, tx.luz.srs].map((item) => h('li', {}, ...forteTexto(item)))),
    h('h2', {}, tx.depoisTitulo),
    h(
      'ol',
      { class: 'passos' },
      h('li', {}, tx.depois.tirar),
      h('li', {}, ...forteTexto(tx.depois.apagar)),
      h('li', {}, tx.depois.radio),
      h('li', {}, tx.depois.volta),
    ),
    h('p', { class: 'nota' }, tx.nota),
  );
}

export function cartaoCodigo(c: Codigo, testid = 'codigo'): HTMLElement {
  const tx = t();
  const selo = { confirmado: tx.selo.confirmado, 'nao-confirmado': tx.selo.naoConfirmado, 'outro-modelo': tx.selo.outroModelo }[c.situacao];
  return h(
    'article',
    { class: 'cartao', id: `codigo-${c.codigo}`, 'data-testid': testid, 'data-codigo': String(c.codigo) },
    h('div', { class: 'numero' }, String(c.codigo)),
    h('h3', {}, c.nome),
    h(
      'dl',
      {},
      h('dt', {}, tx.cartao.causa),
      h('dd', {}, c.causa),
      h('dt', {}, tx.cartao.conferir),
      h('dd', {}, c.conferir),
      c.aplica ? h('dt', {}, tx.cartao.aplica) : null,
      c.aplica ? h('dd', {}, c.aplica) : null,
      c.nota ? h('dt', {}, tx.cartao.nota) : null,
      c.nota ? h('dd', {}, c.nota) : null,
    ),
    h('span', { class: `selo ${c.situacao}` }, `${selo} · ${c.fontes.join(', ')}`),
  );
}

/**
 * Tabela: lista longa (33 códigos). Campo fixo no topo para ir direto ao número lido, com teclado
 * numérico; código fora da tabela ganha a orientação geral em vez de "não achei" seco (D31).
 */
export function telaTabela(nav: Navegar): HTMLElement {
  const tx = t().tabela;
  const campo = h('input', {
    type: 'text',
    inputmode: 'numeric',
    pattern: '[0-9]*',
    maxlength: '2',
    autocomplete: 'off',
    enterkeyhint: 'go',
    id: 'ir-codigo',
    'data-testid': 'ir-codigo',
    'aria-describedby': 'ir-codigo-aviso',
  }) as HTMLInputElement;
  const aviso = h('p', { class: 'aviso-busca', id: 'ir-codigo-aviso', 'data-testid': 'ir-codigo-aviso', 'aria-live': 'polite' });
  let destacado: HTMLElement | null = null;
  const irPara = (final: boolean) => {
    const numero = campo.value.replace(/\D/g, '');
    aviso.textContent = '';
    destacado?.classList.remove('destaque');
    destacado = null;
    if (!numero) return;
    const alvo = document.getElementById(`codigo-${Number(numero)}`);
    // Número completo: fecha o teclado numérico, que senão cobre a metade de baixo do cartão.
    if (final || numero.length === 2) campo.blur();
    if (alvo) {
      alvo.classList.add('destaque');
      alvo.scrollIntoView({ block: 'start', behavior: 'smooth' });
      destacado = alvo;
    } else if (final || numero.length === 2) {
      aviso.textContent = fmt(tx.fora, { n: Number(numero), conferir: buscarCodigo(Number(numero)).conferir });
    }
  };
  campo.addEventListener('input', () => irPara(false));
  campo.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') irPara(true);
  });
  const ir = botao(tx.ir, () => irPara(true), 'primario');
  ir.setAttribute('data-testid', 'ir-codigo-botao');
  return h(
    'section',
    { 'data-tela': 'tabela' },
    topo(tx.titulo, nav),
    h(
      'div',
      { class: 'busca-codigo' },
      h('label', { for: 'ir-codigo' }, tx.irPara),
      h('div', { class: 'linha-busca' }, campo, ir),
      aviso,
    ),
    h('p', { class: 'sub' }, tx.intro),
    ...codigos().map((c) => cartaoCodigo(c)),
    h('h2', {}, tx.fontesTitulo),
    h(
      'ul',
      { class: 'fontes' },
      ...fontes().map((f) => h('li', {}, `[${f.id}] `, h('a', { href: f.url, target: '_blank', rel: 'noopener' }, f.titulo))),
    ),
  );
}
