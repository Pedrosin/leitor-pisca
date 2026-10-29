// Tela de leitura: câmera → quadro reduzido em luminância → decodificador (TS puro) → DOM.
// Layout de captura numa tela só (DECISOES.md D25): a pessoa está com uma mão apontando o celular para o
// painel e não rola a página; a ação principal fica fixa embaixo, na zona do polegar.

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
/** Zoom digital: recorte do centro do vídeo. Mais pixels na lâmpada para ver, tocar e ler (D28). */
const ZOOMS = [1, 2, 3] as const;
/** Aviso "volte de novo para sair" vale por este tempo. */
const JANELA_SAIR_MS = 4000;

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

/**
 * Onde a imagem está dentro do canvas na tela. O canvas usa `object-fit: contain`: sobra faixa preta em
 * cima/embaixo ou nos lados conforme a tela e a orientação, e o toque precisa descontar essa faixa.
 */
export function retanguloImagem(canvas: HTMLCanvasElement): { x: number; y: number; w: number; h: number } {
  const caixa = canvas.getBoundingClientRect();
  const proporcao = canvas.width / Math.max(1, canvas.height);
  let w = caixa.width;
  let altura = caixa.height;
  let x = caixa.left;
  let y = caixa.top;
  if (caixa.width / Math.max(1, caixa.height) > proporcao) {
    w = altura * proporcao;
    x += (caixa.width - w) / 2;
  } else {
    altura = w / proporcao;
    y += (caixa.height - altura) / 2;
  }
  return { x, y, w, h: altura };
}

export interface TelaLeitura {
  el: HTMLElement;
  parar: () => void;
  /** Voltar do sistema (Android) chegou: devolve true se a tela tratou e deve ficar. */
  aoVoltar: () => boolean;
}

export function telaLeitura(nav: Navegar): TelaLeitura {
  const video = h('video', { playsinline: '', muted: '', autoplay: '' }) as VideoComQuadro;
  video.muted = true;
  const tela = h('canvas', { 'data-testid': 'camera', 'aria-label': 'Imagem da câmera. Toque na luz da injeção.' }) as HTMLCanvasElement;
  const status = h('p', { class: 'status', 'data-testid': 'status', 'aria-live': 'polite' }, 'Abrindo a câmera…');
  const piscas = h('div', { class: 'piscas', 'data-testid': 'piscas', 'aria-hidden': 'true' });
  const lidos = h('p', { class: 'lidos', 'data-testid': 'lidos' });
  const resultado = h('div', { class: 'confirmados', 'data-testid': 'resultado' });
  const dica = h('p', { class: 'dica-camera', 'aria-hidden': 'true' }, 'Toque na luz da injeção');
  const captura = h('div', { class: 'captura', 'data-testid': 'captura' });
  const conferencia = h('div', { class: 'conferencia', 'data-testid': 'conferencia', hidden: '' });
  /** Encerrou para conferir: os quadros param de entrar na leitura (a câmera segue aberta para voltar). */
  let pausado = false;
  /**
   * A busca automática achou um ponto que pisca: pergunta se é a luz da injeção antes de mostrar código.
   * Reflexo em ritmo fixo pode imitar código; quem vê o painel decide. Fica no rodapé preso, junto das
   * ações: é respondida com o polegar e nunca sai da tela (por cima da câmera, com texto grande, os botões
   * ficavam cortados; numa linha própria, a barra presa cobria a pergunta em 320 px).
   */
  const pergunta = h('div', { class: 'pergunta', 'data-testid': 'pergunta-luz', hidden: '' });

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
  let zoom: (typeof ZOOMS)[number] = 1;
  /** Mensagem de status que o laço da câmera não sobrescreve até este instante (ex.: aviso de sair). */
  let statusFixoAte = 0;
  let avisoSairEm = -Infinity;

  const processo = document.createElement('canvas');
  const ctxProcesso = processo.getContext('2d', { willReadFrequently: true });
  const ctxTela = tela.getContext('2d');
  let lum = new Uint8Array(0);

  function definirStatus(texto: string, classe = '', fixarMs = 0): void {
    status.textContent = texto;
    status.className = `status ${classe}`.trim();
    if (fixarMs > 0) statusFixoAte = performance.now() + fixarMs;
  }

  function esconderPergunta(): void {
    pergunta.hidden = true;
    pergunta.replaceChildren();
    botaoMarcar.hidden = false;
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
      definirStatus('Luz confirmada. Lendo…');
    }, 'primario');
    sim.setAttribute('data-testid', 'usar-luz-achada');
    const nao = botao('Não, é outra', () => {
      b.recusar();
      esconderPergunta();
      definirStatus('Toque na luz da injeção, ou espere eu procurar de novo.');
    });
    nao.setAttribute('data-testid', 'recusar-luz-achada');
    pergunta.replaceChildren(h('p', {}, h('strong', {}, 'Achei uma luz piscando no círculo tracejado.'), ' É a luz da injeção?'), h('div', { class: 'duas' }, nao, sim));
    pergunta.hidden = false;
    // Com a pergunta aberta, "Não, é outra" faz o papel de marcar de novo; sobra espaço no rodapé.
    botaoMarcar.hidden = true;
    definirStatus('Confirme a luz achada, ou toque na luz certa.', 'alerta');
  }

  function limparLeitura(): void {
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
  }

  function reiniciar(): void {
    limparLeitura();
    definirStatus('Toque na luz da injeção na imagem.');
  }

  tela.addEventListener('pointerdown', (ev) => {
    if (processo.width === 0) return;
    const img = retanguloImagem(tela);
    const cx = (ev.clientX - img.x) / img.w;
    const cy = (ev.clientY - img.y) / img.h;
    // Toque na faixa preta em volta da imagem não marca nada.
    if (cx < 0 || cx > 1 || cy < 0 || cy > 1) return;
    const regiao: Regiao = { cx, cy, raio: RAIO_TOQUE };
    esconderPergunta();
    regiaoTocada = regiao;
    leitor = new Leitor(regiao, processo.width, processo.height);
    buscador = null;
    achadaSozinha = false;
    confirmadosBusca = null;
    estado = null;
    ultimosConfirmados = '';
    resultado.replaceChildren();
    definirStatus('Lendo… segure firme. Leva de 30 s a 1 min e meio.');
  });

  const botaoZoom = botao('1×', () => {
    zoom = ZOOMS[(ZOOMS.indexOf(zoom) + 1) % ZOOMS.length] as (typeof ZOOMS)[number];
    botaoZoom.textContent = `${zoom}×`;
    botaoZoom.setAttribute('aria-label', `Zoom ${zoom} vezes. Toque para trocar.`);
    // Zoom muda o enquadramento: o ponto marcado não vale mais.
    limparLeitura();
    definirStatus(zoom === 1 ? 'Sem zoom. Toque na luz da injeção.' : `Zoom ${zoom}×. Toque na luz da injeção.`);
  }, 'zoom');
  botaoZoom.setAttribute('data-testid', 'zoom');
  botaoZoom.setAttribute('aria-label', 'Zoom 1 vez. Toque para trocar.');

  /** Recorte do vídeo para o zoom digital: centro, 1/zoom do tamanho. */
  function recorte(): { sx: number; sy: number; sw: number; sh: number } {
    const sw = video.videoWidth / zoom;
    const sh = video.videoHeight / zoom;
    return { sx: (video.videoWidth - sw) / 2, sy: (video.videoHeight - sh) / 2, sw, sh };
  }

  function desenhar(): void {
    if (!ctxTela) return;
    const { sx, sy, sw, sh } = recorte();
    ctxTela.drawImage(video, sx, sy, sw, sh, 0, 0, tela.width, tela.height);
    const regiao = estado?.regiao ?? (achadaSozinha ? null : (buscador?.sugestao ?? buscador?.emTeste));
    dica.hidden = !!leitor || !pergunta.hidden;
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
    if (performance.now() >= statusFixoAte) {
      if (confirmados) {
        definirStatus('Leitura confirmada. Toque em Encerrar e conferir.');
      } else if (alerta && leitor) {
        definirStatus(MENSAGEM_ALERTA[alerta] ?? '', 'alerta');
      } else if (leitor) {
        definirStatus(
          estado.regiaoRefinada ? 'Lendo… esperando a lista de códigos repetir.' : 'Lendo… segure firme. Leva de 30 s a 1 min e meio.',
        );
      }
    }
    const { longos, curtos } = estado.grupoAtual;
    piscas.textContent = SIMBOLO_PISCA.longo.repeat(longos) + SIMBOLO_PISCA.curto.repeat(curtos);
    const ultimos = estado.lidos.slice(-8).map((c) => (c === null ? '?' : String(c)));
    lidos.textContent = ultimos.length ? `Lidos: ${ultimos.join(' · ')}` : '';

    const chave = confirmados?.join(',') ?? '';
    if (chave !== ultimosConfirmados) {
      // Vibra quando a leitura confirma (só Android; iPhone ignora). Quem está olhando o painel sente.
      if (chave && !ultimosConfirmados) navigator.vibrate?.([80, 60, 80]);
      ultimosConfirmados = chave;
      resultado.replaceChildren(
        ...(confirmados ?? []).map((c) =>
          h(
            'p',
            { class: 'chip', 'data-testid': 'codigo-confirmado', 'data-codigo': String(c) },
            h('strong', {}, String(c)),
            ' ',
            h('span', { class: 'nome' }, buscarCodigo(c).nome),
          ),
        ),
      );
    }
  }

  function aoQuadro(t: number): void {
    if (pausado || !ctxProcesso || video.videoWidth === 0) return;
    if (t <= ultimoT) return;
    ultimoT = t;
    const altura = Math.round((LARGURA_PROCESSO * video.videoHeight) / video.videoWidth);
    if (processo.width !== LARGURA_PROCESSO || processo.height !== altura) {
      const tinhaQuadro = processo.width > 0 && processo.height > 0;
      const eraDeitado = processo.width > processo.height;
      processo.width = LARGURA_PROCESSO;
      processo.height = altura;
      tela.width = Math.min(960, video.videoWidth);
      tela.height = Math.round((tela.width * video.videoHeight) / video.videoWidth);
      lum = new Uint8Array(LARGURA_PROCESSO * altura);
      if (tinhaQuadro && eraDeitado !== processo.width > processo.height) {
        // Girou o celular: a imagem da câmera girou junto e o ponto marcado aponta para outro lugar.
        limparLeitura();
        definirStatus('Celular girou. Toque na luz da injeção de novo.', 'alerta', 3000);
      } else {
        // A câmera pode trocar de resolução no começo: leitura e busca valem para um tamanho de quadro só.
        // A região é normalizada (0..1), então o toque continua valendo no tamanho novo.
        if (leitor) leitor = new Leitor(estado?.regiao ?? regiaoTocada ?? { cx: 0.5, cy: 0.5, raio: RAIO_TOQUE }, LARGURA_PROCESSO, altura);
        else definirStatus('Toque na luz da injeção na imagem.');
        if (buscador) {
          // Pergunta aberta é do buscador antigo; o "sim" leria o ponto dele, não o desenhado.
          esconderPergunta();
          buscador = new BuscadorLuz();
        }
      }
      estado = null;
    }
    const { sx, sy, sw, sh } = recorte();
    ctxProcesso.drawImage(video, sx, sy, sw, sh, 0, 0, processo.width, processo.height);
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
      definirStatus(
        nome === 'NotAllowedError'
          ? 'Sem permissão para a câmera. Libere a câmera para este site nas configurações do navegador.'
          : 'Não consegui abrir a câmera. Este navegador precisa de HTTPS para usar a câmera.',
        'erro',
      );
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
      definirStatus('A câmera abriu, mas o vídeo não começou. Toque em Voltar e tente de novo.', 'erro');
      return;
    }
    if (!ativo) return;
    definirStatus('Toque na luz da injeção na imagem.');
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

  /** Captura (tela fixa, sem rolar) ou conferência (página que rola, com a ação presa embaixo). */
  function modo(m: 'captura' | 'conferencia'): void {
    el.classList.toggle('modo-captura', m === 'captura');
    captura.hidden = m !== 'captura';
    conferencia.hidden = m !== 'conferencia';
    window.scrollTo(0, 0);
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
        c.codigo !== null ? h('label', { class: 'usar' }, marcar, 'usar este código') : null,
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
      h('div', { class: 'acoes acoes-fixas' }, botaoVoltarALer(), confirmar),
    );
    modo('conferencia');
  }

  function botaoVoltarALer(): HTMLButtonElement {
    const b = botao('Voltar a ler', voltarALer);
    b.setAttribute('data-testid', 'voltar-a-ler');
    return b;
  }

  function mostrarDefeitos(codigos: number[]): void {
    const inicio = botao('Início', nav.inicio);
    inicio.setAttribute('data-testid', 'ir-inicio');
    conferencia.replaceChildren(
      h('h2', {}, 'Defeitos'),
      ...codigos.map((c) => cartaoCodigo(buscarCodigo(c), 'codigo-defeito')),
      h('div', { class: 'acoes acoes-fixas' }, inicio, botaoVoltarALer()),
    );
    window.scrollTo(0, 0);
  }

  function voltarALer(): void {
    // O código que estava piscando quando encerrou fica cortado: descarta e segue com o resto.
    leitor?.interromper();
    if (buscador) {
      esconderPergunta();
      buscador = new BuscadorLuz();
    }
    conferencia.replaceChildren();
    modo('captura');
    pausado = false;
  }

  /**
   * Voltar do sistema (gesto ou botão do Android). Na conferência: volta para a leitura. Com leitura
   * começada: o primeiro avisa, o segundo (em até 4 s) sai. Sem luz marcada ainda: sai.
   */
  function aoVoltar(): boolean {
    if (!conferencia.hidden) {
      voltarALer();
      return true;
    }
    // Leitura começada (luz marcada ou aceita), confirmada ou não: sair perde o que está na tela.
    const lendo = leitor !== null;
    const agora = performance.now();
    if (lendo && agora - avisoSairEm > JANELA_SAIR_MS) {
      avisoSairEm = agora;
      definirStatus('Leitura em andamento. Volte de novo para sair.', 'alerta', JANELA_SAIR_MS);
      return true;
    }
    return false;
  }

  const botaoEncerrar = botao('Encerrar e conferir', encerrar, 'primario');
  botaoEncerrar.setAttribute('data-testid', 'encerrar');
  const botaoMarcar = botao('Marcar de novo', reiniciar);
  botaoMarcar.setAttribute('data-testid', 'marcar-de-novo');

  captura.append(
    h('div', { class: 'camera' }, video, tela, dica, botaoZoom),
    h('div', { class: 'painel', 'data-testid': 'painel' }, status, piscas, lidos, resultado),
    h('div', { class: 'rodape' }, pergunta, h('div', { class: 'acoes' }, botaoMarcar, botaoEncerrar)),
  );

  const sair = botao('Voltar', nav.voltar, 'voltar');
  sair.setAttribute('data-testid', 'sair');
  const ajuda = botao('Ajuda', nav.preparar, 'voltar');
  ajuda.setAttribute('data-testid', 'ajuda');
  const el = h(
    'section',
    { class: 'leitura modo-captura', 'data-tela': 'leitura' },
    // Título só para leitor de tela na captura: a tela fala por si e o espaço vai para a câmera.
    h('div', { class: 'barra' }, sair, h('h1', { class: 'so-leitor-de-tela' }, 'Ler os códigos'), ajuda),
    captura,
    conferencia,
  );
  void abrir();
  return { el, parar, aoVoltar };
}
