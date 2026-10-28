// Gera os ícones PNG do PWA sem dependência: fundo escuro, anel âmbar com ponto (a luz piscando).
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const crcTabela = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTabela[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function bloco(tipo, dados) {
  const tam = Buffer.alloc(4);
  tam.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(corpo));
  return Buffer.concat([tam, corpo, c]);
}
function png(lado) {
  const linhas = [];
  const meio = lado / 2;
  for (let y = 0; y < lado; y++) {
    const linha = Buffer.alloc(1 + lado * 3);
    for (let x = 0; x < lado; x++) {
      const d = Math.hypot(x + 0.5 - meio, y + 0.5 - meio) / lado;
      const anel = Math.abs(d - 0.3) < 0.045;
      const ponto = d < 0.13;
      const [r, g, b] = anel || ponto ? [255, 176, 32] : [17, 18, 20];
      linha.set([r, g, b], 1 + x * 3);
    }
    linhas.push(linha);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(Buffer.concat(linhas))),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}
writeFileSync('public/icone-192.png', png(192));
writeFileSync('public/icone-512.png', png(512));
writeFileSync('public/apple-touch-icon.png', png(180));
