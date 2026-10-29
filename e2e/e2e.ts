// E2E: Chrome headless com câmera falsa alimentada por .y4m sintético → app buildado → código no DOM.
// Prova pelo DOM renderizado (data-testid), não por screenshot.
// Uso: npm run e2e   (gera os vídeos em e2e/.saida, sobe o vite preview, roda os cenários)

import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright-core';
import { CINTO, gerarQuadros, linhaDoTempo, type Cena } from '../test/sintetico';
import { gravarY4m } from '../test/y4m';
import { checarLayout, checarIdioma, pontoNaImagem } from './layout';
import { IDIOMAS, fmt, type Dicionario, type Idioma } from '../src/i18n';

const dic = (id: Idioma): Dicionario => IDIOMAS[id].dicionario;

const RAIZ = resolve(import.meta.dirname, '..');
const SAIDA = join(RAIZ, 'e2e', '.saida');
const PORTA = 4173;
const URL_APP = `http://localhost:${PORTA}/`;
const CHROME =
  process.env.CHROME ??
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(
    (c) => existsSync(c),
  );

interface Cenario {
  nome: string;
  cena: Partial<Cena> & { codigos: number[]; lampada: { cx: number; cy: number; raioPx: number } };
  /** Onde tocar (fração da imagem). null = não toca: prova a busca automática. */
  toque: { cx: number; cy: number } | null;
  prazoMs: number;
  /** Aperta "Encerrar e conferir" no meio de um código, confere, vê os defeitos e volta a ler. */
  encerrarNoMeio?: boolean;
  /** Tela do celular (padrão 390×844 em pé). */
  viewport?: { width: number; height: number };
  /** Zoom digital antes de tocar (o toque é na imagem já ampliada). */
  zoom?: 2 | 3;
  /** Idioma do navegador (locale do Chrome). Padrão pt-BR. */
  idioma?: Idioma;
}

/** Ponto de um quadro inteiro visto na imagem com zoom digital do centro. */
function comZoom(p: { cx: number; cy: number }, zoom: number): { cx: number; cy: number } {
  return { cx: (p.cx - 0.5) * zoom + 0.5, cy: (p.cy - 0.5) * zoom + 0.5 };
}

const CENARIOS: Cenario[] = [
  {
    nome: 'toque-12-41-ruido-tremida-autoexposicao',
    cena: { codigos: [12, 41], ruido: 6, tremorPx: 3, autoExposicao: true, luzesConstantes: true, reflexo: true, lampada: { cx: 0.62, cy: 0.45, raioPx: 5 } },
    toque: { cx: 0.64, cy: 0.43 },
    prazoMs: 150000,
    // Menor tela da prova: com os códigos confirmados, a ação principal continua na tela.
    viewport: { width: 360, height: 640 },
  },
  {
    nome: 'busca-automatica-3',
    cena: { codigos: [3], ruido: 6, tremorPx: 2, luzesConstantes: true, lampada: { cx: 0.35, cy: 0.55, raioPx: 5 } },
    toque: null,
    prazoMs: 150000,
  },
  {
    // Relato do Victor (2026-10-28): luz do cinto colada atrapalhando; e encerrar antes de confirmar.
    // Cinto aceso fixo (cinto solto): o vídeo roda em loop, e o roteiro "pisca 6 s depois da ignição"
    // viraria um cinto piscando a cada 30 s, o que não acontece no carro. O pisca do começo está
    // coberto nos testes do decodificador (test/regressao.test.ts, test/robustez.test.ts).
    nome: 'cinto-colado-encerrar-no-meio-12-41',
    cena: {
      codigos: [12, 41],
      ruido: 6,
      tremorPx: 2,
      autoExposicao: true,
      vizinha: { ...CINTO, roteiro: [{ ateMs: Infinity, modo: 'acesa' }] },
      lampada: { cx: 0.5, cy: 0.5, raioPx: 5 },
    },
    toque: { cx: 0.52, cy: 0.49 },
    prazoMs: 180000,
    encerrarNoMeio: true,
    // Celular deitado: câmera de um lado, painel e ações do outro.
    viewport: { width: 844, height: 390 },
  },
  {
    // Zoom digital 2×: o toque cai na imagem ampliada e a leitura sai do recorte do centro.
    nome: 'zoom-2x-toque-3',
    cena: { codigos: [3], ruido: 6, tremorPx: 2, luzesConstantes: true, lampada: { cx: 0.4, cy: 0.45, raioPx: 5 } },
    toque: comZoom({ cx: 0.41, cy: 0.44 }, 2),
    prazoMs: 120000,
    zoom: 2,
  },
  {
    // Leitura completa em inglês: navegador en-US, status e cartões no idioma.
    nome: 'en-toque-12-41',
    cena: { codigos: [12, 41], ruido: 6, tremorPx: 3, autoExposicao: true, luzesConstantes: true, reflexo: true, lampada: { cx: 0.62, cy: 0.45, raioPx: 5 } },
    toque: { cx: 0.64, cy: 0.43 },
    prazoMs: 150000,
    idioma: 'en',
  },
  {
    // Leitura completa em espanhol, pela busca automática (pergunta "¿Es la luz Check Engine?").
    nome: 'es-busca-3',
    cena: { codigos: [3], ruido: 6, tremorPx: 2, luzesConstantes: true, lampada: { cx: 0.35, cy: 0.55, raioPx: 5 } },
    toque: null,
    prazoMs: 150000,
    idioma: 'es',
  },
];

function gerarVideo(c: Cenario): string {
  mkdirSync(SAIDA, { recursive: true });
  const arquivo = join(SAIDA, `${c.nome}.y4m`);
  const fps = 30;
  // O Chrome repete o arquivo em loop: duração = número inteiro de ciclos da ECU, para a emenda não cortar código.
  const ciclo = linhaDoTempo(c.cena.codigos).cicloMs;
  const ciclos = Math.ceil(30000 / ciclo);
  const n = gravarY4m(arquivo, 160, 120, fps, gerarQuadros({ ...c.cena, fps, inicioMs: 0, duracaoMs: ciclo * ciclos, semente: 5 }));
  console.log(`  vídeo ${c.nome}: ${n} quadros, ${(statSync(arquivo).size / 1e6).toFixed(1)} MB, ciclo ${ciclo} ms × ${ciclos}`);
  return arquivo;
}

async function esperarServidor(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(URL_APP)).ok) return;
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('vite preview não respondeu');
}

interface Lido {
  status: string;
  confirmados: string[];
  lidos: string;
}

async function lerDom(page: Page): Promise<Lido> {
  return page.evaluate(() => ({
    status: document.querySelector('[data-testid=status]')?.textContent ?? '',
    confirmados: [...document.querySelectorAll('[data-testid=codigo-confirmado]')].map((e) => e.getAttribute('data-codigo') ?? ''),
    lidos: document.querySelector('[data-testid=lidos]')?.textContent ?? '',
  }));
}

async function rodar(c: Cenario, video: string): Promise<boolean> {
  const navegador = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${video}`],
  });
  try {
    const idioma = c.idioma ?? 'pt-BR';
    const page = await navegador.newPage({ viewport: c.viewport ?? { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: idioma });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(e.message));
    await page.goto(URL_APP);
    await page.getByTestId('ir-ler').click();
    const camera = page.getByTestId('camera');
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid=camera]') as HTMLCanvasElement | null;
      return !!el && el.width > 0 && el.getBoundingClientRect().height > 0;
    });
    if (c.zoom) {
      for (let z = 1; z < c.zoom; z++) await page.getByTestId('zoom').click();
      const rotulo = await page.getByTestId('zoom').textContent();
      if (rotulo !== `${c.zoom}×`) throw new Error(`zoom não mudou: ${rotulo}`);
    }
    if (c.toque) {
      if (!(await camera.boundingBox())) throw new Error('canvas sem caixa');
      // O canvas usa object-fit: contain; o ponto na imagem desconta a faixa preta em volta.
      const ponto = await pontoNaImagem(page, c.toque.cx, c.toque.cy);
      await page.mouse.click(ponto.x, ponto.y);
    } else {
      // Busca automática: o app aponta a luz e pergunta; nenhum código aparece antes do "sim".
      await page.getByTestId('usar-luz-achada').waitFor({ state: 'visible', timeout: c.prazoMs });
      const antes = await page.$$eval('[data-testid=codigo-confirmado]', (els) => els.length);
      console.log(`  pergunta "é a luz da injeção?" apareceu; códigos na tela antes do sim: ${antes}`);
      if (antes > 0) return false;
      await page.getByTestId('usar-luz-achada').click();
    }
    const esperado = [...c.cena.codigos].sort((a, b) => a - b).map(String);
    if (c.encerrarNoMeio && !(await encerrarConferirEVoltar(page, esperado))) return false;
    const vistos = new Set<string>();
    const inicio = Date.now();
    let ultimo: Lido = { status: '', confirmados: [], lidos: '' };
    while (Date.now() - inicio < c.prazoMs) {
      ultimo = await lerDom(page);
      if (ultimo.confirmados.length) vistos.add(ultimo.confirmados.join(','));
      if (ultimo.confirmados.join(',') === esperado.join(',')) break;
      await page.waitForTimeout(500);
    }
    const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
    const errados = [...vistos].filter((v) => v !== esperado.join(','));
    // O status confirmado sai no idioma do navegador (texto exato do dicionário).
    const statusNoIdioma = ultimo.status === dic(idioma).leitura.confirmada;
    const ok = ultimo.confirmados.join(',') === esperado.join(',') && errados.length === 0 && erros.length === 0 && statusNoIdioma;
    console.log(`  ${ok ? 'PASSOU' : 'FALHOU'} ${c.nome} em ${segundos} s`);
    console.log(`    esperado: [${esperado.join(', ')}]  no DOM: [${ultimo.confirmados.join(', ')}]  confirmações erradas: ${errados.length ? errados.join(' | ') : 'nenhuma'}`);
    console.log(`    status (${idioma}): "${ultimo.status}" ${statusNoIdioma ? '= dicionário' : `≠ dicionário ("${dic(idioma).leitura.confirmada}")`}`);
    console.log(`    ${ultimo.lidos}`);
    const titulos = await page.locator('[data-testid=codigo-confirmado] .nome').allTextContents();
    console.log(`    confirmados: ${titulos.map((t, i) => `${ultimo.confirmados[i]} = ${t}`).join(' | ')}`);
    if (erros.length) console.log(`    erros na página: ${erros.join(' | ')}`);
    // Com os códigos confirmados na tela, a ação principal continua dentro da viewport sem rolar.
    const vp = page.viewportSize();
    const layout = await checarLayout(page, { naTela: ['camera', 'painel', 'encerrar', 'marcar-de-novo'] });
    console.log(`    layout ${vp?.width}×${vp?.height} com resultado: ${layout.erros.length ? 'FALHOU' : 'ok'} (${layout.medidas})`);
    for (const e of layout.erros) console.log(`      - ${e}`);
    return ok && layout.erros.length === 0;
  } finally {
    await navegador.close();
  }
}

/**
 * Espera ler pelo menos um código, espera um código começar a piscar (meio de ciclo) e aperta
 * "Encerrar e conferir". Confere pelo DOM: todo número mostrado é um dos esperados, código cortado
 * aparece sem número, cada linha tem o mapa de piscas. Confirma, vê os defeitos, volta a ler.
 */
async function encerrarConferirEVoltar(page: Page, esperado: string[]): Promise<boolean> {
  const inicio = Date.now();
  await page.waitForFunction(
    (codigos) => {
      const t = document.querySelector('[data-testid=lidos]')?.textContent ?? '';
      // "Lidos: 12 · 41" em qualquer idioma: o que vem depois dos dois-pontos.
      const lidos = t.slice(t.indexOf(':') + 1).split('·').map((x) => x.trim());
      return codigos.some((c) => lidos.includes(c));
    },
    esperado,
    { timeout: 120000, polling: 250 },
  );
  // Meio de ciclo: um código está piscando agora (o desenho ao vivo tem pisca).
  await page.waitForFunction(() => (document.querySelector('[data-testid=piscas]')?.textContent ?? '').length > 0, null, {
    timeout: 30000,
    polling: 50,
  });
  await page.getByTestId('encerrar').click();
  const linhas = await page.$$eval('[data-testid=codigo-conferido]', (els) =>
    els.map((e) => ({
      codigo: e.getAttribute('data-codigo') ?? '',
      situacao: e.getAttribute('data-situacao') ?? '',
      numero: e.querySelector('.numero')?.textContent ?? '',
      mapa: e.querySelector('.mapa-texto')?.textContent ?? '',
      desenho: e.querySelector('.mapa .piscas')?.textContent ?? '',
    })),
  );
  const confirmados = linhas.filter((l) => l.situacao === 'confirmado');
  const vistos = linhas.filter((l) => l.situacao === 'visto');
  const incompletos = linhas.filter((l) => l.situacao === 'incompleto');
  const erros: string[] = [];
  if (confirmados.length + vistos.length === 0) erros.push('nenhum código com número na conferência');
  for (const l of confirmados) if (!esperado.includes(l.codigo)) erros.push(`código errado CONFIRMADO: ${l.codigo}`);
  // "Visto 1 vez" é o aviso de conferir contando; a pessoa desmarca o que não bate com o painel.
  const vistosErrados = vistos.filter((l) => !esperado.includes(l.codigo)).map((l) => l.codigo);
  for (const codigo of vistosErrados) {
    await page.locator(`[data-testid=codigo-conferido][data-codigo="${codigo}"] [data-testid=usar-codigo]`).uncheck();
  }
  for (const l of incompletos) if (l.codigo !== '' || /\d/.test(l.numero)) erros.push(`incompleto com número: ${l.numero}`);
  for (const l of linhas) if (!l.mapa || !l.desenho) erros.push(`linha sem mapa de piscas: ${l.numero}`);
  await page.getByTestId('confirmar-conferencia').click();
  const defeitos = await page.$$eval('[data-testid=codigo-defeito]', (els) => els.map((e) => e.getAttribute('data-codigo') ?? ''));
  const marcados = [...confirmados, ...vistos].map((l) => l.codigo).filter((c) => !vistosErrados.includes(c));
  if (defeitos.join(',') !== marcados.join(',')) erros.push(`defeitos [${defeitos.join(', ')}] ≠ marcados [${marcados.join(', ')}]`);
  await page.getByTestId('voltar-a-ler').click();
  const capturaVisivel = await page.getByTestId('captura').isVisible();
  if (!capturaVisivel) erros.push('captura não voltou');
  console.log(`  ${erros.length ? 'FALHOU' : 'ok'} encerrar no meio após ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
  for (const l of linhas) console.log(`    conferência: ${l.numero.padEnd(3)} ${l.situacao.padEnd(11)} ${l.desenho}  (${l.mapa})`);
  if (vistosErrados.length) console.log(`    desmarcados (vistos 1 vez que não são da ECU): [${vistosErrados.join(', ')}]`);
  console.log(`    defeitos mostrados: [${defeitos.join(', ')}]`);
  for (const e of erros) console.log(`    ERRO: ${e}`);
  return erros.length === 0;
}

/** Telas da prova de layout: em pé (3 tamanhos e o menor 320), deitado, e texto do aparelho em 200% (360 e 320). */
const TELAS: Array<{ nome: string; width: number; height: number; texto200?: boolean }> = [
  { nome: '360x640', width: 360, height: 640 },
  { nome: '390x844', width: 390, height: 844 },
  { nome: '412x915', width: 412, height: 915 },
  { nome: '844x390-deitado', width: 844, height: 390 },
  { nome: '320x568', width: 320, height: 568 },
  { nome: '360x640-texto200', width: 360, height: 640, texto200: true },
  // A pior combinação: tela mais estreita com texto em 200% (pegou o "Voltar" vazando ao lado do título).
  { nome: '320x568-texto200', width: 320, height: 568, texto200: true },
];

/**
 * Prova mecânica de layout por tela, com a câmera falsa da busca automática: início, tabela (ir direto
 * ao código), preparar, captura, pergunta da busca, voltar do sistema, conferência. Em cada uma:
 * sem rolagem horizontal, alvos ≥ 48 px, contraste calculado, e a ação daquele estado dentro da tela.
 * Capturas em e2e/.saida/layout/ (fora do git) para a conferência visual do Victor; não contam como prova.
 */
async function provaLayout(video: string, idioma: Idioma): Promise<boolean> {
  const tx = dic(idioma);
  const navegador = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${video}`],
  });
  const pasta = join(SAIDA, 'layout');
  mkdirSync(pasta, { recursive: true });
  let falhas = 0;
  try {
    for (const t of TELAS) {
      const page = await navegador.newPage({
        viewport: { width: t.width, height: t.height },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
        locale: idioma,
      });
      const erros: string[] = [];
      const linhas: string[] = [];
      page.on('pageerror', (e) => erros.push(`erro na página: ${e.message}`));
      const passo = async (nome: string, naTela: string[] = []) => {
        const r = await checarLayout(page, { naTela });
        // Nenhum texto de outro idioma na tela (sobra de texto fixo ou chave esquecida).
        const misturado = await checarIdioma(page, idioma);
        linhas.push(`${nome}: ${r.erros.length || misturado.length ? 'FALHOU' : 'ok'} (${r.medidas})`);
        for (const e of r.erros) erros.push(`${nome}: ${e}`);
        for (const e of misturado) erros.push(`${nome}: texto fora do idioma ${idioma}: ${e}`);
        await page.screenshot({ path: join(pasta, `${idioma}-${t.nome}-${nome}.png`) });
      };
      try {
        await page.goto(URL_APP);
        if (t.texto200) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
        await passo('inicio');

        // Tabela: digitar o número leva ao cartão, logo abaixo do campo fixo.
        await page.getByTestId('ir-tabela').click();
        await passo('tabela', ['ir-codigo']);
        await page.getByTestId('ir-codigo').fill('41');
        await page.waitForFunction(() => {
          const c = document.getElementById('codigo-41')?.getBoundingClientRect();
          const campo = document.querySelector('.busca-codigo')?.getBoundingClientRect();
          return !!c && !!campo && c.top >= campo.bottom - 1 && c.top < innerHeight / 2 + 60;
        }, null, { timeout: 5000 });
        if (!(await page.locator('#codigo-41.destaque').count())) erros.push('tabela: cartão 41 sem destaque');
        await passo('tabela-41', ['ir-codigo']);
        await page.getByTestId('ir-codigo').fill('99');
        await page.getByTestId('ir-codigo-botao').click();
        const aviso = (await page.getByTestId('ir-codigo-aviso').textContent()) ?? '';
        const avisoEsperado = fmt(tx.tabela.fora, { n: 99, conferir: tx.desconhecido.conferir });
        if (aviso !== avisoEsperado) erros.push(`tabela: aviso de código fora = "${aviso}"`);
        // Voltar do sistema (gesto do Android) sai da tabela para o início.
        await page.goBack();
        if (!(await page.locator('[data-tela=inicio]').count())) erros.push('voltar do sistema na tabela não foi ao início');

        await page.getByTestId('ir-preparar').click();
        await passo('preparar');
        await page.goBack();

        // Captura.
        await page.getByTestId('ir-ler').click();
        await page.waitForFunction(() => ((document.querySelector('[data-testid=camera]') as HTMLCanvasElement | null)?.width ?? 0) > 0);
        await passo('captura', ['camera', 'painel', 'encerrar', 'marcar-de-novo', 'zoom', 'sair', 'ajuda']);
        await page.getByTestId('usar-luz-achada').waitFor({ state: 'visible', timeout: 120000 });
        await passo('pergunta', ['usar-luz-achada', 'recusar-luz-achada']);
        // Com a pergunta aberta o rodapé é só ela (D43); o "Encerrar" volta depois da resposta.
        if (await page.getByTestId('encerrar').isVisible()) erros.push('pergunta: "Encerrar" visível junto da pergunta');
        await page.getByTestId('usar-luz-achada').click();
        await page.waitForTimeout(1500);
        await passo('lendo', ['camera', 'painel', 'encerrar', 'marcar-de-novo']);

        if (t.nome === '390x844') {
          // Girar o celular no meio da leitura recomeça (o enquadramento mudou) e avisa.
          await page.setViewportSize({ width: 844, height: 390 });
          await page.waitForTimeout(400);
          const girou = (await page.getByTestId('status').textContent()) ?? '';
          if (girou !== tx.leitura.girou) erros.push(`girar no meio da leitura: status "${girou}"`);
          await page.setViewportSize({ width: t.width, height: t.height });
          await page.waitForTimeout(400);
          const ponto = await pontoNaImagem(page, 0.5, 0.5);
          await page.mouse.click(ponto.x, ponto.y);
          linhas.push(`girar no meio da leitura: ${girou === tx.leitura.girou ? 'recomeçou e avisou' : 'FALHOU'}`);
        }

        // Voltar do sistema no meio da leitura: o primeiro avisa e fica; o segundo sai.
        await page.goBack();
        await page.waitForTimeout(300);
        const aviso1 = (await page.getByTestId('status').textContent()) ?? '';
        if (!(await page.locator('[data-tela=leitura]').count()) || aviso1 !== tx.leitura.sairAviso) {
          erros.push(`1º voltar no meio da leitura: tela ${await page.locator('[data-tela]').getAttribute('data-tela')}, status "${aviso1}"`);
        }

        // Conferência: a página rola, a ação fica presa embaixo; voltar do sistema volta para a captura.
        await page.getByTestId('encerrar').click();
        await passo('conferencia', ['confirmar-conferencia', 'voltar-a-ler']);
        await page.goBack();
        await page.waitForTimeout(300);
        if (!(await page.getByTestId('captura').isVisible())) erros.push('voltar do sistema na conferência não voltou à captura');

        // Depois da janela do aviso (4 s): voltar avisa de novo; o segundo, em seguida, sai.
        await page.waitForTimeout(4300);
        await page.goBack();
        await page.waitForTimeout(300);
        if (!(await page.locator('[data-tela=leitura]').count())) erros.push('voltar depois de 4 s saiu sem avisar');
        await page.goBack();
        await page.waitForTimeout(300);
        if (!(await page.locator('[data-tela=inicio]').count())) erros.push('2º voltar no meio da leitura não saiu para o início');
      } catch (e) {
        erros.push(`exceção: ${(e as Error).message.split('\n')[0]}`);
      }
      console.log(`  ${erros.length ? 'FALHOU' : 'PASSOU'} layout ${idioma} ${t.nome}`);
      for (const l of linhas) console.log(`    ${l}`);
      for (const e of erros) console.log(`    ERRO: ${e}`);
      if (erros.length) falhas++;
      await page.close();
    }
  } finally {
    await navegador.close();
  }
  return falhas === 0;
}

/**
 * Idioma pelo navegador e pela escolha manual, sem câmera: locale do Chrome en/es/pt-BR/fr → app em
 * en/es/pt-BR/en (resto do mundo em inglês), com <html lang> e título da aba; o seletor da tela inicial
 * troca o idioma e a escolha sobrevive ao reload (vale sobre o navegador).
 */
async function provaIdioma(): Promise<boolean> {
  const navegador = await chromium.launch({ executablePath: CHROME, headless: true });
  const erros: string[] = [];
  const linhas: string[] = [];
  try {
    for (const [locale, esperado] of [
      ['en-US', 'en'],
      ['es-MX', 'es'],
      ['pt-BR', 'pt-BR'],
      ['fr-FR', 'en'],
    ] as const) {
      const ctx = await navegador.newContext({ locale, viewport: { width: 390, height: 844 }, isMobile: true });
      const page = await ctx.newPage();
      await page.goto(URL_APP);
      const r = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        titulo: document.title,
        ler: document.querySelector('[data-testid=ir-ler]')?.textContent ?? '',
        navegador: navigator.language,
      }));
      const tx = dic(esperado);
      const ok = r.lang === esperado && r.titulo === tx.app.titulo && r.ler === tx.inicio.ler;
      linhas.push(`navegador ${r.navegador} → app ${r.lang} ("${r.ler}", título "${r.titulo}") ${ok ? 'ok' : 'FALHOU'}`);
      if (!ok) erros.push(`locale ${locale}: esperado ${esperado}, veio ${JSON.stringify(r)}`);
      await ctx.close();
    }
    // Seletor: navegador em inglês, escolhe espanhol; a escolha vale no reload e sobre o navegador.
    const ctx = await navegador.newContext({ locale: 'en-US', viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(URL_APP);
    const alvo = await page.getByTestId('idioma-es').boundingBox();
    if (!alvo || alvo.height < 47.5 || alvo.width < 47.5) erros.push(`seletor: alvo ${alvo?.width}×${alvo?.height}`);
    await page.getByTestId('idioma-es').click();
    const depois = await page.evaluate(() => [document.documentElement.lang, document.querySelector('[data-testid=ir-ler]')?.textContent]);
    await page.reload();
    const noReload = await page.evaluate(() => [
      document.documentElement.lang,
      document.querySelector('[data-testid=ir-ler]')?.textContent,
      document.querySelector('[data-testid=idioma-es]')?.getAttribute('aria-pressed'),
    ]);
    const okSeletor = depois[0] === 'es' && depois[1] === dic('es').inicio.ler;
    const okReload = noReload[0] === 'es' && noReload[1] === dic('es').inicio.ler && noReload[2] === 'true';
    linhas.push(`seletor en → es: ${okSeletor ? 'ok' : 'FALHOU'} ("${depois[1]}"); depois do reload: ${okReload ? 'ok' : 'FALHOU'} ("${noReload[1]}")`);
    if (!okSeletor) erros.push(`seletor: ${JSON.stringify(depois)}`);
    if (!okReload) erros.push(`reload: ${JSON.stringify(noReload)}`);
    await ctx.close();
  } finally {
    await navegador.close();
  }
  console.log(`  ${erros.length ? 'FALHOU' : 'PASSOU'} idioma pelo navegador e pelo seletor`);
  for (const l of linhas) console.log(`    ${l}`);
  for (const e of erros) console.log(`    ERRO: ${e}`);
  return erros.length === 0;
}

/** Idiomas da prova de layout: espanhol (textos mais longos) primeiro. */
const IDIOMAS_LAYOUT: Idioma[] = ['es', 'en', 'pt-BR'];

async function main(): Promise<void> {
  if (!CHROME) throw new Error('Chrome não encontrado; defina CHROME=<caminho>');
  if (!existsSync(join(RAIZ, 'dist', 'index.html'))) throw new Error('rode "vite build" antes');
  console.log('Gerando vídeos sintéticos (.y4m)…');
  const videos = CENARIOS.map(gerarVideo);
  const servidor: ChildProcess = spawn(process.execPath, [join(RAIZ, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(PORTA), '--strictPort'], {
    cwd: RAIZ,
    stdio: 'ignore',
  });
  let falhas = 0;
  try {
    await esperarServidor();
    console.log(`App em ${URL_APP}; Chrome: ${CHROME}`);
    console.log('Idioma:');
    if (!(await provaIdioma())) falhas++;
    // E2E_SO=idioma|layout roda só uma parte (iteração rápida); a entrega roda tudo.
    const so = process.env.E2E_SO;
    if (so !== 'idioma') {
      console.log('Prova de layout por tela e idioma (câmera falsa da busca automática):');
      for (const id of IDIOMAS_LAYOUT) if (!(await provaLayout(videos[1] as string, id))) falhas++;
    }
    if (!so) for (const [i, c] of CENARIOS.entries()) if (!(await rodar(c, videos[i] as string))) falhas++;
  } finally {
    servidor.kill();
  }
  const so = process.env.E2E_SO;
  const total = 1 + (so === 'idioma' ? 0 : IDIOMAS_LAYOUT.length) + (so ? 0 : CENARIOS.length);
  console.log(
    falhas
      ? `E2E: ${falhas} de ${total} falharam`
      : `E2E: ${total} de ${total} passaram (idioma: 1; layout: ${TELAS.length} telas × ${so === 'idioma' ? 0 : IDIOMAS_LAYOUT.length} idiomas; leitura: ${so ? 0 : CENARIOS.length} cenários)`,
  );
  process.exit(falhas ? 1 : 0);
}

void main();
