// Exploração de limites (fora da suíte): até onde o leitor aguenta. Rodar: npx vite-node test/limites.explorar.ts
import { rodarCena } from './rodar';
import { linhaDoTempo } from './sintetico';
const codigos = [12, 41];
const ciclo = linhaDoTempo(codigos).cicloMs;
function caso(nome: string, extra: object) {
  let certos = 0, errados = 0;
  for (const semente of [1, 2, 3, 4]) {
    const r = rodarCena({ codigos, fps: 30, inicioMs: 3000, duracaoMs: ciclo * 6, semente, ...extra });
    if (r.final.confirmados?.join(',') === codigos.join(',')) certos++;
    errados += r.confirmacoes.filter((c) => c !== codigos.join(',')).length;
  }
  console.log(`${nome.padEnd(34)} certos ${certos}/4  confirmações erradas ${errados}`);
}
for (const t of [4, 6, 8, 12]) caso(`tremida ${t}px (lâmpada raio 5)`, { tremorPx: t });
for (const r of [2, 3]) caso(`lâmpada raio ${r}px`, { lampada: { cx: 0.5, cy: 0.5, raioPx: r } });
for (const n of [15, 25]) caso(`ruído σ=${n}`, { ruido: n });
caso('tudo junto + tremida 6px', { ruido: 8, tremorPx: 6, reflexo: true, autoExposicao: true, luzesConstantes: true, jitterMs: 6, quedaQuadros: 0.03 });
for (const d of [0.5, 1]) caso(`deriva ${d} px/s + tremida 2px`, { derivaPxPorS: d, tremorPx: 2, ruido: 6 });
caso('15 fps', { fps: 15 });
caso('10 fps', { fps: 10 });
