// E2E: Chrome headless com câmera falsa alimentada por .y4m sintético → app buildado → código no DOM.
// Prova pelo DOM renderizado (data-testid), não por screenshot.
// Uso: npm run e2e   (gera os vídeos em e2e/.saida, sobe o vite preview, roda os cenários)

import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright-core';
import { gerarQuadros, linhaDoTempo, type Cena } from '../test/sintetico';
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
    }
    const esperado = [...c.cena.codigos].sort((a, b) => a - b).map(String);
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
