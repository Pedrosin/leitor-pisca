import './estilo.css';
import { telaInicio, telaPreparar, telaTabela, type Navegar } from './telas';
import { telaLeitura } from './leitura';

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

history.replaceState(estadoAtual, '');
mostrar('inicio');

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
