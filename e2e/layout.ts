// Prova mecânica de layout no celular, lida do DOM renderizado (a conferência visual é do Victor).
// Para a tela atual: sem rolagem horizontal; alvos de toque ≥ 48 px; contraste de texto e de contorno de
// controle calculado das cores computadas (WCAG); elementos pedidos dentro da viewport sem rolar.

import type { Page } from 'playwright-core';

export interface ResultadoLayout {
  erros: string[];
  /** Resumo para o log. */
  medidas: string;
}

export interface OpcoesLayout {
  /** data-testid que precisam estar inteiros dentro da viewport sem rolar. */
  naTela?: string[];
  /** Pula a checagem de alvo nestes data-testid (ex.: link de texto corrido). */
  ignorarAlvo?: string[];
}

export async function checarLayout(page: Page, opcoes: OpcoesLayout = {}): Promise<ResultadoLayout> {
  return page.evaluate(({ naTela, ignorarAlvo }) => {
    const erros: string[] = [];
    const de = document.documentElement;
    const visivel = (e: Element) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    const nome = (e: Element) =>
      (e.getAttribute('data-testid') ?? (e.textContent ?? '').trim().slice(0, 24)) || e.tagName.toLowerCase();

    // 1. Rolagem horizontal.
    if (de.scrollWidth > de.clientWidth) erros.push(`rolagem horizontal: scrollWidth ${de.scrollWidth} > clientWidth ${de.clientWidth}`);
    if (document.body.scrollWidth > de.clientWidth) erros.push(`rolagem horizontal no body: ${document.body.scrollWidth} > ${de.clientWidth}`);

    // 2. Ação dentro da viewport sem rolar.
    for (const id of naTela) {
      const e = document.querySelector(`[data-testid="${id}"]`);
      if (!e || !visivel(e)) {
        erros.push(`${id}: não está visível`);
        continue;
      }
      const r = e.getBoundingClientRect();
      if (r.top < 0 || r.left < 0 || r.bottom > innerHeight + 0.5 || r.right > innerWidth + 0.5) {
        erros.push(`${id}: fora da tela sem rolar (top ${Math.round(r.top)}, bottom ${Math.round(r.bottom)} de ${innerHeight}; right ${Math.round(r.right)} de ${innerWidth})`);
      }
      // Dentro da viewport mas cortado por um ancestral com overflow (ex.: botão dentro da câmera).
      for (let a = e.parentElement; a; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
        const ra = a.getBoundingClientRect();
        if (r.top < ra.top - 0.5 || r.bottom > ra.bottom + 0.5 || r.left < ra.left - 0.5 || r.right > ra.right + 0.5) {
          erros.push(`${id}: cortado por ${a.getAttribute('data-testid') ?? a.className ?? a.tagName} (overflow ${cs.overflowY})`);
          break;
        }
      }
      // Coberto por outro elemento (ex.: barra presa por cima): centro e os quatro cantos internos.
      const m = Math.min(6, r.width / 4, r.height / 4);
      const pontos: Array<[number, number]> = [
        [r.left + r.width / 2, r.top + r.height / 2],
        [r.left + m, r.top + m],
        [r.right - m, r.top + m],
        [r.left + m, r.bottom - m],
        [r.right - m, r.bottom - m],
      ];
      for (const [x, y] of pontos) {
        const no = document.elementFromPoint(x, y);
        if (no && no !== e && !e.contains(no)) {
          erros.push(`${id}: coberto por ${no.getAttribute('data-testid') ?? no.className ?? no.tagName} em (${Math.round(x)}, ${Math.round(y)})`);
          break;
        }
      }
    }

    // 3. Alvos de toque ≥ 48 × 48 (checkbox conta pelo rótulo que o envolve).
    const alvos: Element[] = [];
    for (const e of document.querySelectorAll('button, input, select, textarea')) {
      if (!visivel(e) && !(e instanceof HTMLInputElement && e.type === 'checkbox')) continue;
      if (ignorarAlvo.includes(e.getAttribute('data-testid') ?? '')) continue;
      const rotulo = e.closest('label');
      alvos.push(e instanceof HTMLInputElement && (e.type === 'checkbox' || e.type === 'radio') && rotulo ? rotulo : e);
    }
    let menor = Infinity;
    for (const a of alvos) {
      if (!visivel(a)) continue;
      const r = a.getBoundingClientRect();
      menor = Math.min(menor, r.width, r.height);
      if (r.width < 47.5 || r.height < 47.5) erros.push(`alvo pequeno: ${nome(a)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }

    // 4. Contraste (WCAG 2.x). Fundo efetivo = composição das cores de fundo dos ancestrais. Limite:
    // gradiente e imagem de fundo não entram (o app só tem gradiente no rodapé da conferência, atrás de
    // botões de fundo sólido).
    const rgba = (c: string): [number, number, number, number] => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return [0, 0, 0, 0];
      const p = (m[1] as string).split(/[ ,/]+/).filter(Boolean).map(Number);
      return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 1];
    };
    const sobre = (cima: number[], baixo: number[]) => {
      const a = cima[3] as number;
      return [0, 1, 2].map((i) => (cima[i] as number) * a + (baixo[i] as number) * (1 - a)).concat(1);
    };
    const fundoDe = (e: Element | null): number[] => {
      const pilha: number[][] = [];
      for (let x = e; x; x = x.parentElement) pilha.push(rgba(getComputedStyle(x).backgroundColor));
      let cor = rgba(getComputedStyle(de).backgroundColor);
      if (cor[3] === 0) cor = [255, 255, 255, 1];
      for (const c of pilha.reverse()) if ((c[3] ?? 0) > 0) cor = sobre(c, cor) as [number, number, number, number];
      return cor;
    };
    const lum = (c: number[]) => {
      const l = c.slice(0, 3).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * (l[0] as number) + 0.7152 * (l[1] as number) + 0.0722 * (l[2] as number);
    };
    const razao = (a: number[], b: number[]) => {
      const x = lum(a);
      const y = lum(b);
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    let piorTexto = Infinity;
    let piorTextoOnde = '';
    const textos = [...document.querySelectorAll('body *')].filter(
      (e) => visivel(e) && [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim()),
    );
    for (const e of textos) {
      if ((e as HTMLButtonElement).disabled) continue; // controle desabilitado é exceção da WCAG
      const cs = getComputedStyle(e);
      const fundo = fundoDe(e);
      const cor = sobre(rgba(cs.color), fundo);
      const r = razao(cor, fundo);
      const tamanho = parseFloat(cs.fontSize);
      const grande = tamanho >= 24 || (tamanho >= 18.66 && Number(cs.fontWeight) >= 700);
      const minimo = grande ? 3 : 4.5;
      if (r < piorTexto) {
        piorTexto = r;
        piorTextoOnde = nome(e);
      }
      if (r < minimo) erros.push(`contraste de texto ${r.toFixed(2)} < ${minimo} em "${nome(e)}"`);
    }
    // Contorno de botão secundário e campo contra o fundo em volta (WCAG 1.4.11: 3:1).
    let piorContorno = Infinity;
    for (const e of document.querySelectorAll('button:not(.primario), input[type=text]')) {
      if (!visivel(e) || (e as HTMLButtonElement).disabled) continue;
      const cs = getComputedStyle(e);
      if (parseFloat(cs.borderTopWidth) === 0) continue;
      const fora = fundoDe(e.parentElement);
      const r = razao(sobre(rgba(cs.borderTopColor), fora), fora);
      piorContorno = Math.min(piorContorno, r);
      if (r < 3) erros.push(`contorno de controle ${r.toFixed(2)} < 3 em "${nome(e)}"`);
    }

    // 4b. Palavra quebrada no meio: texto de botão/título não pode ter palavra partida em duas linhas.
    for (const e of document.querySelectorAll('button, h1, h2')) {
      if (!visivel(e) || e.classList.contains('so-leitor-de-tela')) continue;
      const faixa = document.createRange();
      for (const n of e.childNodes) {
        if (n.nodeType !== 3) continue;
        const texto = n.textContent ?? '';
        for (const m of texto.matchAll(/\S+/g)) {
          faixa.setStart(n, m.index as number);
          faixa.setEnd(n, (m.index as number) + m[0].length);
          if (faixa.getClientRects().length > 1) erros.push(`palavra partida: "${m[0]}" em ${nome(e)}`);
        }
      }
    }

    // 5. Puxar para atualizar desligado.
    const overscroll = getComputedStyle(de).overscrollBehaviorY;
    if (overscroll !== 'none') erros.push(`overscroll-behavior-y do html = ${overscroll}`);

    return {
      erros,
      medidas: `largura ${de.scrollWidth}/${de.clientWidth}, alvo menor ${Math.round(menor)} px, pior texto ${piorTexto.toFixed(2)} (${piorTextoOnde}), pior contorno ${piorContorno === Infinity ? '—' : piorContorno.toFixed(2)}`,
    };
  }, { naTela: opcoes.naTela ?? [], ignorarAlvo: opcoes.ignorarAlvo ?? [] });
}

/** Ponto da imagem da câmera (fração 0..1) em coordenadas de página, descontando a faixa do object-fit. */
export async function pontoNaImagem(page: Page, cx: number, cy: number): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ([fx, fy]) => {
      const c = document.querySelector('[data-testid=camera]') as HTMLCanvasElement;
      const caixa = c.getBoundingClientRect();
      const proporcao = c.width / Math.max(1, c.height);
      let w = caixa.width;
      let hh = caixa.height;
      let x = caixa.left;
      let y = caixa.top;
      if (caixa.width / Math.max(1, caixa.height) > proporcao) {
        w = hh * proporcao;
        x += (caixa.width - w) / 2;
      } else {
        hh = w / proporcao;
        y += (caixa.height - hh) / 2;
      }
      return { x: x + (fx as number) * w, y: y + (fy as number) * hh };
    },
    [cx, cy],
  );
}

/**
 * Texto fora do idioma da tela: varre o texto visível e os rótulos (aria-label, placeholder, title),
 * pulando o que declara outro idioma em `lang` (o seletor mostra cada idioma no próprio idioma).
 * en: nenhuma letra fora do ASCII. es: nenhuma marca do português (ã, õ, ç, "não", "você", "é" sozinho).
 */
export async function checarIdioma(page: Page, idioma: string): Promise<string[]> {
  if (idioma === 'pt-BR') return [];
  return page.evaluate((id) => {
    const proibido = id === 'en' ? /(?![A-Za-z])\p{L}/u : /[ãõç]|\bnão\b|\bvocê\b|(^|\s)é(\s|$)/iu;
    const achados: string[] = [];
    const doIdioma = (e: Element | null) => {
      const comLang = e?.closest('[lang]');
      return !comLang || comLang === document.documentElement || comLang.getAttribute('lang') === id;
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const texto = n.textContent ?? '';
      const pai = n.parentElement;
      if (!texto.trim() || !pai || !doIdioma(pai) || pai.closest('[hidden]')) continue;
      if (proibido.test(texto)) achados.push(`"${texto.trim().slice(0, 60)}"`);
    }
    for (const e of document.querySelectorAll('[aria-label], [placeholder], [title]')) {
      if (!doIdioma(e)) continue;
      for (const a of ['aria-label', 'placeholder', 'title']) {
        const v = e.getAttribute(a);
        if (v && proibido.test(v)) achados.push(`${a}="${v.slice(0, 60)}"`);
      }
    }
    if (proibido.test(document.title)) achados.push(`título "${document.title}"`);
    return achados;
  }, idioma);
}
