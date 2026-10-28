// Vídeo YUV4MPEG2 (o formato que o Chrome aceita em --use-file-for-fake-video-capture).
// Só luminância importa aqui: os planos de cor vão neutros (cinza).

import { openSync, writeSync, closeSync, readFileSync } from 'node:fs';
import type { Quadro } from './sintetico';

export function gravarY4m(caminho: string, largura: number, altura: number, fps: number, quadros: Iterable<Quadro>): number {
  const fd = openSync(caminho, 'w');
  const croma = Buffer.alloc(2 * (largura / 2) * (altura / 2), 128);
  let n = 0;
  try {
    writeSync(fd, `YUV4MPEG2 W${largura} H${altura} F${fps}:1 Ip A1:1 C420jpeg\n`);
    for (const q of quadros) {
      writeSync(fd, 'FRAME\n');
      writeSync(fd, q.lum);
      writeSync(fd, croma);
      n++;
    }
  } finally {
    closeSync(fd);
  }
  return n;
}

export function* lerY4m(caminho: string): Generator<Quadro & { largura: number; altura: number }> {
  const dados = readFileSync(caminho);
  const fimCabecalho = dados.indexOf(0x0a);
  const cabecalho = dados.subarray(0, fimCabecalho).toString('ascii');
  const largura = Number(/ W(\d+)/.exec(cabecalho)?.[1]);
  const altura = Number(/ H(\d+)/.exec(cabecalho)?.[1]);
  const [num, den] = (/ F(\d+):(\d+)/.exec(cabecalho)?.slice(1) ?? ['30', '1']).map(Number) as [number, number];
  const tamanhoQuadro = largura * altura * 1.5;
  let pos = fimCabecalho + 1;
  for (let k = 0; pos < dados.length; k++) {
    pos = dados.indexOf(0x0a, pos) + 1; // pula "FRAME...\n"
    const lum = new Uint8Array(dados.subarray(pos, pos + largura * altura));
    pos += tamanhoQuadro;
    yield { t: (k * 1000 * den) / num, lum, largura, altura };
  }
}
