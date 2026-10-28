import './estilo.css';
import { telaInicio, telaPreparar, telaTabela, type Navegar } from './telas';
import { telaLeitura } from './leitura';

const raiz = document.getElementById('app') as HTMLElement;
let pararAtual: (() => void) | null = null;

function trocar(el: HTMLElement): void {
  pararAtual?.();
  pararAtual = null;
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
  navigator.serviceWorker.register('./sw.js').catch(() => undefined);
}
