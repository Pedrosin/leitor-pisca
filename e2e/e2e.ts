// E2E: Chrome headless com câmera falsa alimentada por .y4m sintético → app buildado → código no DOM.
// Prova pelo DOM renderizado (data-testid), não por screenshot.
// Uso: npm run e2e   (gera os vídeos em e2e/.saida, sobe o vite preview, roda os cenários)

import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright-core';
import { CINTO, gerarQuadros, linhaDoTempo, type Cena } from '../test/sintetico';
import { gravarY4m } from '../test/y4m';

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
}

const CENARIOS: Cenario[] = [
  {
    nome: 'toque-12-41-ruido-tremida-autoexposicao',
    cena: { codigos: [12, 41], ruido: 6, tremorPx: 3, autoExposicao: true, luzesConstantes: true, reflexo: true, lampada: { cx: 0.62, cy: 0.45, raioPx: 5 } },
    toque: { cx: 0.64, cy: 0.43 },
    prazoMs: 150000,
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
    const page = await navegador.newPage({ viewport: { width: 390, height: 844 } });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(e.message));
    await page.goto(URL_APP);
    await page.getByRole('button', { name: 'Ler os códigos' }).click();
    const camera = page.getByTestId('camera');
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid=camera]') as HTMLCanvasElement | null;
      return !!el && el.width > 0 && el.getBoundingClientRect().height > 0;
    });
    if (c.toque) {
      const caixa = await camera.boundingBox();
      if (!caixa) throw new Error('canvas sem caixa');
      await page.mouse.click(caixa.x + c.toque.cx * caixa.width, caixa.y + c.toque.cy * caixa.height);
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
    const ok = ultimo.confirmados.join(',') === esperado.join(',') && errados.length === 0 && erros.length === 0;
    console.log(`  ${ok ? 'PASSOU' : 'FALHOU'} ${c.nome} em ${segundos} s`);
    console.log(`    esperado: [${esperado.join(', ')}]  no DOM: [${ultimo.confirmados.join(', ')}]  confirmações erradas: ${errados.length ? errados.join(' | ') : 'nenhuma'}`);
    console.log(`    status: "${ultimo.status}"`);
    console.log(`    ${ultimo.lidos}`);
    const titulos = await page.locator('[data-testid=codigo-confirmado] h3').allTextContents();
    console.log(`    cartões: ${titulos.map((t, i) => `${ultimo.confirmados[i]} = ${t}`).join(' | ')}`);
    if (erros.length) console.log(`    erros na página: ${erros.join(' | ')}`);
    return ok;
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
      const lidos = t.replace('Lidos:', '').split('·').map((x) => x.trim());
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
    for (const [i, c] of CENARIOS.entries()) if (!(await rodar(c, videos[i] as string))) falhas++;
  } finally {
    servidor.kill();
  }
  console.log(falhas ? `E2E: ${falhas} de ${CENARIOS.length} falharam` : `E2E: ${CENARIOS.length} de ${CENARIOS.length} passaram`);
  process.exit(falhas ? 1 : 0);
}

void main();
