// Tela de leitura: câmera → quadro reduzido em luminância → decodificador (TS puro) → DOM.

import { BuscadorLuz, Leitor, luminanciaDeRgba, type EstadoLeitor, type Regiao } from '../decodificador';
import { buscarCodigo } from '../codigos/tabela';
import { botao, cartaoCodigo, h, type Navegar } from './telas';

/** Largura do quadro processado. 160 px basta para a lâmpada e cabe em qualquer celular a 60 fps. */
const LARGURA_PROCESSO = 160;
/** Raio do toque em fração da largura: folgado, o refinador afina na lâmpada. */
const RAIO_TOQUE = 0.07;

type QuadroVideo = (agora: number, meta: { mediaTime?: number }) => void;
type VideoComQuadro = HTMLVideoElement & { requestVideoFrameCallback?: (cb: QuadroVideo) => number };

const MENSAGEM_ALERTA: Record<string, string> = {
  'sinal-fraco': 'Não vejo pisca no ponto marcado. Chegue mais perto ou toque de novo na luz.',
  'luz-constante': 'A luz está acesa sem piscar: sem código gravado (ou o jumper não está no SCS).',
  'sem-pisca': 'A luz parou de piscar. Confira o jumper e se a ignição está em ON.',
};

export function telaLeitura(nav: Navegar): { el: HTMLElement; parar: () => void } {
  const video = h('video', { playsinline: '', muted: '', autoplay: '' }) as VideoComQuadro;
  video.muted = true;
  const tela = h('canvas', { 'data-testid': 'camera', 'aria-label': 'Imagem da câmera. Toque na luz da injeção.' }) as HTMLCanvasElement;
  const status = h('p', { class: 'status', 'data-testid': 'status', 'aria-live': 'polite' }, 'Abrindo a câmera…');
  const piscas = h('div', { class: 'piscas', 'data-testid': 'piscas', 'aria-hidden': 'true' });
  const lidos = h('p', { class: 'lidos', 'data-testid': 'lidos' });
  const resultado = h('div', { 'data-testid': 'resultado' });

  let leitor: Leitor | null = null;
  let regiaoTocada: Regiao | null = null;
  let buscador: BuscadorLuz | null = new BuscadorLuz();
  let estado: EstadoLeitor | null = null;
  let achadaSozinha = false;
  let stream: MediaStream | null = null;
  let ativo = true;
  let travaTela: { release(): Promise<void> } | null = null;
  let ultimoT = -1;
  let ultimosConfirmados = '';

  const processo = document.createElement('canvas');
  const ctxProcesso = processo.getContext('2d', { willReadFrequently: true });
  const ctxTela = tela.getContext('2d');
  let lum = new Uint8Array(0);

  function reiniciar(): void {
    leitor = null;
    regiaoTocada = null;
    estado = null;
    achadaSozinha = false;
    buscador = new BuscadorLuz();
    ultimosConfirmados = '';
    resultado.replaceChildren();
    status.textContent = 'Toque na luz da injeção na imagem.';
    status.className = 'status';
  }

  tela.addEventListener('pointerdown', (ev) => {
    const caixa = tela.getBoundingClientRect();
    const regiao: Regiao = {
      cx: (ev.clientX - caixa.left) / caixa.width,
      cy: (ev.clientY - caixa.top) / caixa.height,
      raio: RAIO_TOQUE,
    };
    if (processo.width === 0) return;
    regiaoTocada = regiao;
    leitor = new Leitor(regiao, processo.width, processo.height);
    buscador = null;
    achadaSozinha = false;
    estado = null;
    ultimosConfirmados = '';
    resultado.replaceChildren();
    status.textContent = 'Lendo… segure firme. Leva de 30 s a 1 min e meio.';
    status.className = 'status';
  });

  function desenhar(): void {
    if (!ctxTela) return;
    ctxTela.drawImage(video, 0, 0, tela.width, tela.height);
    const regiao = estado?.regiao ?? (achadaSozinha ? null : buscador?.emTeste);
    if (!regiao) return;
    const escala = tela.width;
    ctxTela.lineWidth = Math.max(2, escala / 200);
    ctxTela.strokeStyle = estado?.luz === 'aceso' ? '#ffb020' : '#ffffff';
    ctxTela.setLineDash(leitor ? [] : [8, 6]);
    ctxTela.beginPath();
    ctxTela.arc(regiao.cx * tela.width, regiao.cy * tela.height, Math.max(10, regiao.raio * escala), 0, Math.PI * 2);
    ctxTela.stroke();
  }

  function mostrar(): void {
    if (!estado) return;
    const alerta = estado.alertas[0];
    if (estado.confirmados) {
      status.textContent = achadaSozinha
        ? 'Achei a luz sozinho e li os códigos. Pode continuar lendo para conferir.'
        : 'Leitura confirmada (a lista repetiu igual).';
      status.className = 'status';
    } else if (alerta && leitor) {
      status.textContent = MENSAGEM_ALERTA[alerta] ?? '';
      status.className = 'status alerta';
    } else if (leitor) {
      status.textContent = estado.regiaoRefinada
        ? 'Lendo… esperando a lista de códigos repetir.'
        : 'Lendo… segure firme. Leva de 30 s a 1 min e meio.';
      status.className = 'status';
    }
    const { longos, curtos } = estado.grupoAtual;
    piscas.textContent = '▬'.repeat(longos) + '•'.repeat(curtos);
    const ultimos = estado.lidos.slice(-8).map((c) => (c === null ? '?' : String(c)));
    lidos.textContent = ultimos.length ? `Lidos: ${ultimos.join(' · ')}` : '';

    const chave = estado.confirmados?.join(',') ?? '';
    if (chave !== ultimosConfirmados) {
      ultimosConfirmados = chave;
      resultado.replaceChildren(
        ...(estado.confirmados ?? []).map((c) => cartaoCodigo(buscarCodigo(c), 'codigo-confirmado')),
      );
    }
  }

  function aoQuadro(t: number): void {
    if (!ctxProcesso || video.videoWidth === 0) return;
    if (t <= ultimoT) return;
    ultimoT = t;
    const altura = Math.round((LARGURA_PROCESSO * video.videoHeight) / video.videoWidth);
    if (processo.width !== LARGURA_PROCESSO || processo.height !== altura) {
      processo.width = LARGURA_PROCESSO;
      processo.height = altura;
      tela.width = Math.min(960, video.videoWidth);
      tela.height = Math.round((tela.width * video.videoHeight) / video.videoWidth);
      lum = new Uint8Array(LARGURA_PROCESSO * altura);
      // A câmera pode trocar de resolução no começo: leitura e busca valem para um tamanho de quadro só.
      // A região é normalizada (0..1), então o toque continua valendo no tamanho novo.
      if (leitor) leitor = new Leitor(estado?.regiao ?? regiaoTocada ?? { cx: 0.5, cy: 0.5, raio: RAIO_TOQUE }, LARGURA_PROCESSO, altura);
      else status.textContent = 'Toque na luz da injeção na imagem.';
      if (buscador) buscador = new BuscadorLuz();
      estado = null;
    }
    ctxProcesso.drawImage(video, 0, 0, processo.width, processo.height);
    const rgba = ctxProcesso.getImageData(0, 0, processo.width, processo.height).data;
    luminanciaDeRgba(rgba, processo.width * processo.height, lum);

    if (leitor) {
      estado = leitor.processarQuadro(t, lum);
    } else if (buscador) {
      buscador.processarQuadro(t, lum, processo.width, processo.height);
      const achada = buscador.sugestao;
      if (achada) {
        // A busca já confirmou uma leitura ali: segue lendo nesse ponto.
        leitor = new Leitor(achada, processo.width, processo.height);
        achadaSozinha = true;
        buscador = null;
      }
    }
    if (achadaSozinha && leitor && !estado?.confirmados) {
      // O Leitor novo recomeça do zero; enquanto isso, mantém o resultado da busca na tela.
      estado = leitor.processarQuadro(t, lum);
    }
    desenhar();
    mostrar();
  }

  // Relógio do decodificador: mediaTime (instante do quadro na câmera, mais fiel que o da tela), mas
  // sempre crescente. Se a fonte recomeça (troca de câmera, vídeo em loop), emenda pelo relógio da tela.
  let deslocamento = 0;
  let agoraAnterior = Number.NaN;
  function tempoDoQuadro(agora: number, mediaTime: number | undefined): number {
    const passo = Number.isNaN(agoraAnterior) ? 0 : Math.max(1, agora - agoraAnterior);
    agoraAnterior = agora;
    if (!mediaTime || mediaTime <= 0) return agora;
    let t = mediaTime * 1000 + deslocamento;
    if (ultimoT >= 0 && t <= ultimoT) {
      deslocamento += ultimoT + passo - t;
      t = ultimoT + passo;
    }
    return t;
  }

  function laco(): void {
    if (!ativo) return;
    if (video.requestVideoFrameCallback) {
      video.requestVideoFrameCallback((agora, meta) => {
        aoQuadro(tempoDoQuadro(agora, meta.mediaTime));
        laco();
      });
    } else {
      requestAnimationFrame((agora) => {
        aoQuadro(agora);
        laco();
      });
    }
  }

  async function abrir(): Promise<void> {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
      });
    } catch (erro) {
      const nome = (erro as DOMException)?.name;
      status.textContent =
        nome === 'NotAllowedError'
          ? 'Sem permissão para a câmera. Libere a câmera para este site nas configurações do navegador.'
          : 'Não consegui abrir a câmera. Este navegador precisa de HTTPS para usar a câmera.';
      status.className = 'status erro';
      return;
    }
    if (!ativo) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    video.srcObject = stream;
    await video.play().catch(() => undefined);
    status.textContent = 'Toque na luz da injeção na imagem.';
    try {
      travaTela = await (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock?.request('screen') ?? null;
    } catch {
      travaTela = null;
    }
    laco();
  }

  function parar(): void {
    ativo = false;
    stream?.getTracks().forEach((t) => t.stop());
    void travaTela?.release().catch(() => undefined);
  }

  const el = h(
    'section',
    { 'data-tela': 'leitura' },
    h('div', { class: 'topo' }, h('h1', {}, 'Ler os códigos'), botao('Voltar', nav.inicio, 'voltar')),
    h('p', { class: 'sub' }, 'Jumper no SCS, ignição em ON sem dar partida. Aponte para o painel e toque na luz da injeção.'),
    h('div', { class: 'camera' }, video, tela),
    status,
    piscas,
    lidos,
    resultado,
    h('div', { class: 'botoes' }, botao('Marcar a luz de novo', reiniciar), botao('Como preparar o carro', nav.preparar)),
  );
  void abrir();
  return { el, parar };
}
