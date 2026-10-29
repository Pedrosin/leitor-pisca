import './estilo.css';
import { telaInicio, telaPreparar, telaTabela, type Navegar } from './telas';
import { telaLeitura } from './leitura';
import { definirIdioma, idiomaInicial, t, type Idioma } from '../i18n';

type NomeTela = 'inicio' | 'preparar' | 'tabela' | 'leitura';
interface EstadoHistorico {
  tela: NomeTela;
  /** Quantas telas acima do início (para o "Início" voltar direto). */
  prof: number;
}

const raiz = document.getElementById('app') as HTMLElement;
let pararAtual: (() => void) | null = null;
/** Voltar do sistema chegou na tela atual: true = a tela tratou e fica. */
let aoVoltarAtual: (() => boolean) | null = null;
let estadoAtual: EstadoHistorico = { tela: 'inicio', prof: 0 };
/** O próximo popstate veio de um botão do app (Voltar, Início): não passa pela tela. */
let saidaPeloApp = false;
/** Versão nova já instalada; recarrega na próxima troca de tela, nunca no meio de uma leitura. */
let recarregarAoTrocar = false;

/** Idioma do documento: <html lang> (leitor de tela, hifenização), título da aba e descrição. */
function aplicarIdioma(id: Idioma): void {
  document.documentElement.lang = id;
  document.title = t().app.titulo;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t().app.descricao);
}

function mostrar(nome: NomeTela): void {
  pararAtual?.();
  pararAtual = null;
  aoVoltarAtual = null;
  if (recarregarAoTrocar) {
    window.location.reload();
    return;
  }
  // Leitura ocupa a tela inteira (sem margem do main); as outras são páginas que rolam.
  raiz.classList.toggle('cheia', nome === 'leitura');
  if (nome === 'leitura') {
    const t = telaLeitura(nav);
    raiz.replaceChildren(t.el);
    pararAtual = t.parar;
    aoVoltarAtual = t.aoVoltar;
  } else {
    raiz.replaceChildren(nome === 'preparar' ? telaPreparar(nav) : nome === 'tabela' ? telaTabela(nav) : telaInicio(nav));
  }
  window.scrollTo(0, 0);
}

/** Cada tela entra no histórico: o voltar do Android (gesto ou botão) volta uma tela em vez de fechar o app. */
function ir(nome: NomeTela): void {
  estadoAtual = { tela: nome, prof: estadoAtual.prof + 1 };
  history.pushState(estadoAtual, '');
  mostrar(nome);
}

const nav: Navegar = {
  inicio: () => {
    if (estadoAtual.prof > 0) {
      saidaPeloApp = true;
      history.go(-estadoAtual.prof);
    } else {
      mostrar('inicio');
    }
  },
  voltar: () => {
    if (estadoAtual.prof > 0) {
      saidaPeloApp = true;
      history.back();
    } else {
      mostrar('inicio');
    }
  },
  idioma: (novo) => {
    definirIdioma(novo, true);
    aplicarIdioma(novo);
    mostrar(estadoAtual.tela);
  },
  preparar: () => ir('preparar'),
  tabela: () => ir('tabela'),
  ler: () => ir('leitura'),
};

window.addEventListener('popstate', (ev) => {
  const destino = (ev.state as EstadoHistorico | null) ?? { tela: 'inicio', prof: 0 };
  if (!saidaPeloApp && aoVoltarAtual?.()) {
    // A tela tratou (ex.: aviso "volte de novo para sair"): repõe a entrada e fica.
    history.pushState(estadoAtual, '');
    return;
  }
  saidaPeloApp = false;
  estadoAtual = destino;
  mostrar(destino.tela);
});

// Reload: o navegador devolve o estado da entrada atual; reaproveita (sobrescrever com "início" deixava
// duas entradas de início na pilha e o voltar parecia não fazer nada).
const idiomaDoAcesso = idiomaInicial(navigator.languages?.length ? navigator.languages : [navigator.language]);
definirIdioma(idiomaDoAcesso);
aplicarIdioma(idiomaDoAcesso);

const restaurado = history.state as EstadoHistorico | null;
if (restaurado && typeof restaurado.prof === 'number' && ['inicio', 'preparar', 'tabela', 'leitura'].includes(restaurado.tela)) {
  estadoAtual = restaurado;
} else {
  history.replaceState(estadoAtual, '');
}
mostrar(estadoAtual.tela);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const jaControlada = !!navigator.serviceWorker.controller;
  navigator.serviceWorker
    .register('./sw.js', { updateViaCache: 'none' })
    .then((registro) => {
      // App instalado fica aberto por dias: procura versão nova toda vez que volta para a frente.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registro.update().catch(() => undefined);
      });
    })
    .catch(() => undefined);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!jaControlada) return;
    if (pararAtual) recarregarAoTrocar = true;
    else window.location.reload();
  });
}
