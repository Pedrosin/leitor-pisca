# Leitor de Pisca

PWA que lê pela câmera o código de defeito piscado pela luz da injeção nos Honda OBD1 (1992–1995) e mostra a causa provável e o que conferir, em PT-BR. É a porta de entrada gratuita do Hondash-BR: não precisa de adaptador. Projeto pessoal do Victor.

## Como usar
1. Prepare o carro: jumper no SCS e ignição em ON sem dar partida. Os passos e avisos estão no próprio app, em "Como preparar o carro".
2. Abra "Ler os códigos", aponte para o painel e toque na luz da injeção.
3. O app confirma quando a lista de códigos se repete igual. Leva de 30 s a 2 min, dependendo de quantos códigos houver.

Se você não tocar, o app tenta achar a luz sozinho. Ele só aponta o lugar depois de já ter lido os códigos ali.

## Rodar
```bash
npm install
npm run dev        # desenvolvimento, http://localhost:5173
npm test           # unitários + robustez + vídeo (~3 min)
npm run e2e        # build + Chrome headless com câmera falsa (~2 min)
npm run build      # dist/ estático
```

### No celular (mesma rede Wi-Fi do PC)
```bash
npm run celular
```
Abra no celular o endereço `https://<ip-do-pc>:4173/` que aparece em "Network". O certificado é autoassinado, então o navegador avisa: aceite e continue. Sem HTTPS, o celular não libera a câmera. Para instalar: Android → menu → "Instalar app"; iPhone (Safari) → Compartilhar → "Adicionar à Tela de Início".

Publicar (GitHub Pages ou outro lugar) depende do ok do Victor. O build já sai com caminhos relativos e funciona em subpasta.

## Estrutura
- `src/decodificador/`: TS puro, sem DOM (vai virar Kotlin). Peças: `amostragem` (quadro → número), `limiar`, `piscas` (bordas, curto/longo), `ciclos` (confirmação), `refinador` (ajuste do toque), `detector` + `buscador` (achar sem toque), `leitor` (orquestra). O `tsconfig.decodificador.json` impede o uso de DOM aqui.
- `src/codigos/tabela.ts`: códigos, fontes e o que está confirmado e o que não está.
- `src/app/`: telas e câmera.
- `test/`: gerador de vídeo sintético, `.y4m`, testes.
- `e2e/e2e.ts`: fluxo completo no Chrome com câmera falsa.
- `DECISOES.md`: o quê, a alternativa descartada e o motivo, além do que é hipótese.
