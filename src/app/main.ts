import './estilo.css';
import { telaInicio, telaPreparar, telaTabela, type Navegar } from './telas';
import { telaLeitura } from './leitura';

const raiz = document.getElementById('app') as HTMLElement;
let pararAtual: (() => void) | null = null;
/** Versão nova já instalada; recarrega na próxima troca de tela, nunca no meio de uma leitura. */
let recarregarAoTrocar = false;

function trocar(el: HTMLElement): void {
  pararAtual?.();
  pararAtual = null;
  if (recarregarAoTrocar) {
    window.location.reload();
    return;
  }
  raiz.replaceChildren(el);
  window.scrollTo(0, 0);
}

const nav: Navegar = {
  inicio: () => trocar(telaInicio(nav)),
  preparar: () => trocar(telaPreparar(nav)),
  tabela: () => trocar(telaTabela(nav)),
  ler: () => {
    const { el, parar } = telaLeitura(nav);
    trocar(el);
    pararAtual = parar;
  },
};

nav.inicio();

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
