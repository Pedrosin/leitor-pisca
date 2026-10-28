// Tela de leitura: câmera → quadro reduzido em luminância → decodificador (TS puro) → DOM.

import {
  BuscadorLuz,
  Leitor,
  luminanciaDeRgba,
  type CodigoConferido,
  type EstadoLeitor,
  type Regiao,
  type ResumoLeitura,
  type TipoPisca,
} from '../decodificador';
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

const NOME_PISCA: Record<TipoPisca, string> = { longo: 'longa', curto: 'curta', aberto: 'acesa quando parou' };
const SIMBOLO_PISCA: Record<TipoPisca, string> = { longo: '▬', curto: '•', aberto: '?' };

/** Mapa de piscas desenhado igual ao da captura (▬ longa, • curta) e escrito por extenso. */
export function mapaPiscas(piscas: readonly TipoPisca[]): HTMLElement {
  return h(
    'div',
    { class: 'mapa', 'data-testid': 'mapa-piscas' },
    h('span', { class: 'piscas', 'aria-hidden': 'true' }, piscas.map((p) => SIMBOLO_PISCA[p]).join('')),
    h('span', { class: 'mapa-texto' }, piscas.map((p) => NOME_PISCA[p]).join(' - ')),
  );
}

function textoSituacao(c: CodigoConferido): string {
  if (c.situacao === 'confirmado') return `Confirmado: lido igual ${c.vezes} vezes.`;
  if (c.situacao === 'visto') {
    const vezes = c.vezes === 1 ? '1 vez' : `${c.vezes} vezes, sem repetir no ritmo da lista`;
    return `Visto ${vezes}. Confira contando os piscas no painel.`;
  }
  if (c.motivo === 'em-andamento') return 'Incompleto: a leitura parou no meio deste código.';
  if (c.motivo === 'cortado') return 'Incompleto: a leitura começou no meio deste código.';
  return 'Incompleto: piscas fora do padrão (reflexo ou mão mexendo).';
}

export function telaLeitura(nav: Navegar): { el: HTMLElement; parar: () => void } {
  const video = h('video', { playsinline: '', muted: '', autoplay: '' }) as VideoComQuadro;
  video.muted = true;
  const tela = h('canvas', { 'data-testid': 'camera', 'aria-label': 'Imagem da câmera. Toque na luz da injeção.' }) as HTMLCanvasElement;
  const status = h('p', { class: 'status', 'data-testid': 'status', 'aria-live': 'polite' }, 'Abrindo a câmera…');
  const piscas = h('div', { class: 'piscas', 'data-testid': 'piscas', 'aria-hidden': 'true' });
  const lidos = h('p', { class: 'lidos', 'data-testid': 'lidos' });
  const resultado = h('div', { 'data-testid': 'resultado' });
  const captura = h('div', { 'data-testid': 'captura' });
  const conferencia = h('div', { 'data-testid': 'conferencia', hidden: '' });
  /** Encerrou para conferir: os quadros param de entrar na leitura (a câmera segue aberta para voltar). */
  let pausado = false;
  /**
   * A busca automática achou um ponto que pisca: pergunta se é a luz da injeção antes de mostrar código.
   * Reflexo em ritmo fixo pode imitar código; quem vê o painel decide.
   */
  const pergunta = h('div', { class: 'cartao pergunta', 'data-testid': 'pergunta-luz', hidden: '' });

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

  function esconderPergunta(): void {
    pergunta.hidden = true;
    pergunta.replaceChildren();
  }

  function perguntarLuz(b: BuscadorLuz): void {
    const sim = botao('Sim, é essa', () => {
      const achada = b.sugestao;
      esconderPergunta();
      if (!achada || processo.width === 0) return;
      leitor = new Leitor(achada, processo.width, processo.height);
      achadaSozinha = true;
      confirmadosBusca = b.confirmados;
      buscador = null;
      estado = null;
      status.textContent = 'Luz confirmada. Lendo…';
    }, 'primario');
    sim.setAttribute('data-testid', 'usar-luz-achada');
    const nao = botao('Não, é outra', () => {
      b.recusar();
      esconderPergunta();
      status.textContent = 'Toque na luz da injeção na imagem (ou espere eu procurar de novo).';
      status.className = 'status';
    });
    nao.setAttribute('data-testid', 'recusar-luz-achada');
    pergunta.replaceChildren(
      h('p', {}, h('strong', {}, 'Achei uma luz piscando no círculo tracejado. '), 'É a luz da injeção (CHECK ENGINE)?'),
      h('div', { class: 'botoes' }, sim, nao),
    );
    pergunta.hidden = false;
    status.textContent = 'Confirme a luz achada, ou toque na luz certa.';
    status.className = 'status alerta';
  }

  function reiniciar(): void {
    esconderPergunta();
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
    esconderPergunta();
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
    const regiao = estado?.regiao ?? (achadaSozinha ? null : (buscador?.sugestao ?? buscador?.emTeste));
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
        ? 'Li os códigos na luz que você confirmou. Luz errada? Toque na luz certa na imagem.'
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
    piscas.textContent = SIMBOLO_PISCA.longo.repeat(longos) + SIMBOLO_PISCA.curto.repeat(curtos);
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
    if (pausado || !ctxProcesso || video.videoWidth === 0) return;
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
      if (buscador.sugestao && pergunta.hidden) perguntarLuz(buscador);
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

  function resumoAtual(): ResumoLeitura {
    // Só o que foi lido numa luz confirmada (tocada, ou achada e aceita): leitura de um ponto que a
    // pessoa ainda não confirmou pode ser reflexo.
    return leitor?.resumo() ?? { codigos: [], descartadas: 0, confirmacaoAutomatica: null };
  }

  function encerrar(): void {
    pausado = true;
    const resumo = resumoAtual();
    const escolhidos = new Set<number>();
    const confirmar = botao('Confirmar e ver os defeitos', () => mostrarDefeitos([...escolhidos].sort((a, b) => a - b)), 'primario');
    confirmar.setAttribute('data-testid', 'confirmar-conferencia');
    const atualizar = () => {
      confirmar.disabled = escolhidos.size === 0;
    };
    const linhas = resumo.codigos.map((c) => {
      const marcar = h('input', { type: 'checkbox', 'data-testid': 'usar-codigo' }) as HTMLInputElement;
      if (c.codigo !== null) {
        const codigo = c.codigo;
        marcar.checked = true;
        escolhidos.add(codigo);
        marcar.addEventListener('change', () => {
          if (marcar.checked) escolhidos.add(codigo);
          else escolhidos.delete(codigo);
          atualizar();
        });
      }
      return h(
        'article',
        {
          class: `cartao conferido ${c.situacao}`,
          'data-testid': 'codigo-conferido',
          'data-codigo': c.codigo === null ? '' : String(c.codigo),
          'data-situacao': c.situacao,
        },
        h('div', { class: 'numero' }, c.codigo === null ? '—' : String(c.codigo)),
        mapaPiscas(c.piscas),
        h('p', { class: 'situacao' }, textoSituacao(c)),
        c.codigo !== null ? h('label', { class: 'usar' }, marcar, ' usar este código') : null,
      );
    });
    atualizar();
    conferencia.replaceChildren(
      h('h2', {}, 'Confira o que foi lido'),
      h('p', { class: 'sub' }, 'Compare com os piscas que você viu no painel: ▬ é longa (dezena), • é curta (unidade).'),
      ...(linhas.length
        ? linhas
        : [h('p', { 'data-testid': 'nada-lido' }, 'Nada lido ainda. Volte a ler e deixe a lista de códigos passar pelo menos uma vez.')]),
      ...(resumo.descartadas > 0
        ? [h('p', { class: 'sub' }, `${resumo.descartadas} leitura(s) descartada(s) no caminho (cortadas ou fora do padrão).`)]
        : []),
      h('div', { class: 'botoes' }, confirmar, botaoVoltarALer()),
    );
    captura.hidden = true;
    conferencia.hidden = false;
    window.scrollTo(0, 0);
  }

  function botaoVoltarALer(): HTMLButtonElement {
    const b = botao('Voltar a ler', voltarALer);
    b.setAttribute('data-testid', 'voltar-a-ler');
    return b;
  }

  function mostrarDefeitos(codigos: number[]): void {
    conferencia.replaceChildren(
      h('h2', {}, 'Defeitos'),
      ...codigos.map((c) => cartaoCodigo(buscarCodigo(c), 'codigo-defeito')),
      h('div', { class: 'botoes' }, botaoVoltarALer(), botao('Início', nav.inicio)),
    );
    window.scrollTo(0, 0);
  }

  function voltarALer(): void {
    // O código que estava piscando quando encerrou fica cortado: descarta e segue com o resto.
    leitor?.interromper();
    if (buscador) buscador = new BuscadorLuz();
    conferencia.hidden = true;
    conferencia.replaceChildren();
    captura.hidden = false;
    pausado = false;
  }

  const botaoEncerrar = botao('Encerrar e conferir', encerrar, 'primario');
  botaoEncerrar.setAttribute('data-testid', 'encerrar');

  captura.append(
    h('div', { class: 'camera' }, video, tela),
    pergunta,
    status,
    piscas,
    lidos,
    resultado,
    h(
      'div',
      { class: 'botoes' },
      botaoEncerrar,
      botao('Marcar a luz de novo', reiniciar),
      botao('Como preparar o carro', nav.preparar),
    ),
    h(
      'p',
      { class: 'nota' },
      'Luz errada? Toque na luz da injeção na imagem a qualquer momento. Luz do cinto acesa ao lado atrapalha: afivele o cinto.',
    ),
  );

  const el = h(
    'section',
    { 'data-tela': 'leitura' },
    h('div', { class: 'topo' }, h('h1', {}, 'Ler os códigos'), botao('Voltar', nav.inicio, 'voltar')),
    h('p', { class: 'sub' }, 'Jumper no SCS, ignição em ON sem dar partida. Aponte para o painel e toque na luz da injeção.'),
    captura,
    conferencia,
  );
  void abrir();
  return { el, parar };
}
