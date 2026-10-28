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
  /** O que a busca automática confirmou, mostrado até o Leitor novo confirmar por conta própria. */
  let confirmadosBusca: number[] | null = null;
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
    confirmadosBusca = null;
    buscador = new BuscadorLuz();
    ultimosConfirmados = '';
    resultado.replaceChildren();
    piscas.textContent = '';
    lidos.textContent = '';
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
    confirmadosBusca = null;
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
    const confirmados = estado.confirmados ?? confirmadosBusca;
    if (confirmados) {
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

    const chave = confirmados?.join(',') ?? '';
    if (chave !== ultimosConfirmados) {
      ultimosConfirmados = chave;
      resultado.replaceChildren(
        ...(confirmados ?? []).map((c) => cartaoCodigo(buscarCodigo(c), 'codigo-confirmado')),
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
        confirmadosBusca = buscador.confirmados;
        buscador = null;
        estado = leitor.processarQuadro(t, lum);
      }
    }
    desenhar();
    mostrar();
  }

  // Relógio do decodificador: uma linha do tempo própria, sempre crescente, que anda pelo passo entre
  // quadros. O passo vem do mediaTime (instante do quadro na câmera, mais fiel que o da tela) quando ele
  // anda para frente e é plausível; senão (fonte recomeçou, vídeo em loop, mediaTime ausente) vem do
  // relógio da tela. Nunca mistura as duas escalas de tempo absolutas.
  let relogio = Number.NaN;
  let mediaAnterior = Number.NaN;
  let agoraAnterior = Number.NaN;
  function tempoDoQuadro(agora: number, mediaTime: number | undefined): number {
    const passoTela = Number.isNaN(agoraAnterior) ? 0 : agora - agoraAnterior;
    const temMedia = typeof mediaTime === 'number' && Number.isFinite(mediaTime) && mediaTime > 0;
    const passoCamera = temMedia && !Number.isNaN(mediaAnterior) ? ((mediaTime as number) - mediaAnterior) * 1000 : Number.NaN;
    agoraAnterior = agora;
    if (temMedia) mediaAnterior = mediaTime as number;
    const passo = passoCamera > 0 && passoCamera < 1000 ? passoCamera : Math.max(1, passoTela);
    relogio = Number.isNaN(relogio) ? 0 : relogio + passo;
    return relogio;
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
        aoQuadro(tempoDoQuadro(agora, undefined));
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
    try {
      await video.play();
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
      status.textContent = 'A câmera abriu, mas o vídeo não começou. Toque em Voltar e tente de novo.';
      status.className = 'status erro';
      return;
    }
    if (!ativo) return;
    status.textContent = 'Toque na luz da injeção na imagem.';
    laco();
    try {
      const trava = (await (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock?.request('screen')) ?? null;
      // A tela pode ter sido fechada enquanto o pedido estava pendente.
      if (ativo) travaTela = trava;
      else void trava?.release().catch(() => undefined);
    } catch {
      travaTela = null;
    }
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
