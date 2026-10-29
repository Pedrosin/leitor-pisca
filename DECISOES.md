# Decisões — leitor-pisca

Formato: o quê · alternativa descartada · motivo. Datas em 2026-10-27, salvo indicação.

## Plataforma

**D1. PWA em TypeScript, câmera via getUserMedia, sem framework.**
Descartado: app nativo, React/Vue.
Motivo: roda em iPhone e Android sem loja (decisão herdada do brief, mantida). Sem framework porque são 3 telas estáticas e 1 de câmera: 34 KB de JS no build. Não há estado complexo que um framework pague.

**D2. Decodificador em `src/decodificador/`: TS puro, sem DOM, sem relógio próprio.**
Descartado: processar direto no canvas/DOM.
Motivo: vai ser portado para Kotlin (Fase 2). O isolamento é verificado pelo compilador: `tsconfig.decodificador.json` compila a pasta com `lib: ["ES2022"]` e sem tipos do DOM, e qualquer uso de `document`/`window` quebra o `npm run build`. A entrada é luminância 8 bits + timestamp em ms, vindos do chamador.

## Sinal

**D3. Quadro reduzido a 160 px de largura, em luminância (BT.601 inteira).**
Descartado: resolução cheia; canal vermelho/âmbar.
Motivo: 160 px bastam para uma lâmpada de painel com o celular perto e custam pouco a 60 fps. A luminância serve porque a luz da injeção acesa satura em qualquer canal. A cor ficou para quando houver vídeo real.

**D4. Sinal = brilho médio do disco ÷ mediana do anel em volta (em %), com piso de 8 no fundo.**
Descartado: diferença lâmpada − fundo; máximo/top-k do disco.
Motivo: a auto-exposição multiplica o quadro todo, e a razão cancela esse ganho. Na matriz de teste, a diferença errou mais (ver commit inicial). O top-k quebra quando outra luz acesa direto (óleo, bateria) cai dentro do disco. A média só soma uma constante nesse caso.

**D5. Limiar adaptativo: envelope máximo/mínimo com ataque de 120 ms e esquecimento de 12 s, e histerese de ±12% em volta do meio.**
Descartado: limiar fixo; média móvel.
Motivo: o nível aceso/apagado muda com a distância, o ângulo e a exposição. O ataque de 120 ms impede que um clarão de 1 quadro estique o envelope. Com amplitude abaixo de 15 pontos o estado é "indefinido", não vira pisca.

**D6. Filtro de bordas: troca de estado só vale se durar ≥ 120 ms, e é datada no meio entre o quadro anterior e o primeiro quadro novo.**
Descartado: contar quadros.
Motivo: com timestamp em vez de contagem de quadros, o filtro funciona igual em 24, 30 e 60 fps e com quadro perdido. 120 ms ficam abaixo de um pisca curto (estimado 300–500 ms) e acima de reflexo/tremida de 1–2 quadros.

## Classificação

**D7. Curto/longo e intervalo/pausa são aprendidos das durações vistas (maior salto entre durações ordenadas, com pelo menos 2 de cada lado), começando de fronteiras fixas: 800 ms para o pisca e 1400 ms para a pausa.**
Descartado: tempos fixos da ECU.
Motivo: **nenhuma fonte dá a duração em segundos do pisca da ECU automotiva.** Os manuais de moto Honda dão 1,3 s para o longo e 0,3–0,5 s para o curto: é estimativa, não medida. A fronteira aprendida só vale dentro de uma faixa (pisca: ½× a 2× da fixa; pausa: 1/2,5× a 2,5×), para um apagão de 20 s não virar "pausa". Os testes cobrem ritmos de 0,7× a 1,4× do estimado, e também uma pausa entre códigos menor que a fronteira fixa (1,2 s).

**D8. Longos antes de curtos. Qualquer outra ordem descarta o código (vira `null`).**
Motivo: é o formato documentado (P3, MW, HBA, DEP, CEG). Códigos de 1 a 9 são só curtos; 10, 20, 30… são só longos.

**D9. O primeiro código da leitura é sempre descartado se a pausa antes dele não foi vista inteira.**
Motivo: a leitura pode começar no meio de um código, e um "43" cortado viraria "3". Custa até 1 código de tempo.

## Confirmação

**D10. Confirma quando a sequência lida tem período p, com 2 ciclos completos iguais + 1 código a mais (2p+1 leituras), sem código repetido dentro do ciclo e com a duração do ciclo igual nas repetições (±300 ms ou ±6%).**
Descartado: fechar o ciclo quando o código "volta a ser menor" (assume ordem crescente); exigir só 2 leituras iguais.
Motivo: a ordem crescente dos códigos é **hipótese** (só aparece em manual de moto), e a busca do período não depende dela. O código a mais e a duração existem por causa de um caso real da matriz: um "3" que perdeu o pisca do meio virou "1, 1" e, junto com um "1" verdadeiro, formou "1, 1, 1". Esse caso aparece como 3 ciclos iguais, mas os intervalos entre os "1" não são iguais. Teste: `"3" quebrado em "1, 1"…`.
Custo: o tempo para confirmar é ~3 ciclos mais o parcial inicial. Com 1 código, dá ~20–40 s. Com 4 códigos, ~1 min e meio a 2 min.

## Região

**D11. Toque + refinamento automático: o toque marca um disco folgado (7% da largura). Por 6 s, o refinador mede o contraste aceso−apagado de cada pixel (usando o estado que o decodificador viu) e troca para um disco justo na lâmpada. Os quadros guardados são reprocessados, e nada do que já piscou se perde.**
Descartado: só o toque; só a detecção automática.
Motivo: a matriz mostrou que o tamanho do disco decide. Com um disco do tamanho da lâmpada (~1,4× o raio) o leitor acertou tudo; com um disco de 3× o raio ele falhou no "tudo junto". O dedo não acerta o tamanho. Medir o contraste só nos quadros "aceso" contra os "apagado" ignora reflexo que passeia (não acompanha o pisca) e luzes acesas direto (escurecem com a auto-exposição).

**D11b. Disco folgado para tremida e rastreio contínuo.** O refinador conta como lâmpada todo pixel com contraste ≥ 20% do maior. Com 50%, o disco ficava do tamanho da lâmpada parada: com tremida de 6 px acertou 1 de 4 e, no "tudo junto", confirmou 1 código errado. Com 20%, acertou 4 de 4 nos dois casos. Depois do primeiro ajuste, um rastreador repete a medida a cada 4 s e move o disco. O raio pode crescer depressa, só encolhe devagar e tem teto de 10% da largura. Sem rastreio, uma deriva de 0,25 px/s (o braço que cede) derrubava a leitura (0 de 4). Com rastreio, 0,5 px/s dá 4 de 4.

**D11c. Apagado irregular dentro do código descarta o código.** Entre dois longos, ou entre dois curtos, o apagado é sempre o mesmo. Um apagado 1,8× maior que os outros do mesmo tipo é pisca perdido no meio, e o código sai `null` (descartado) em vez de errado. Pisca perdido no **fim** do código não deixa rastro: "12" vira "11". Se isso se repetir igual em 2 ciclos, o leitor confirma errado. Só vi acontecer com deriva de 1 px/s (a lâmpada atravessa 1/3 da imagem por minuto). Ali, uma semente confirmou "11, 41" e trocou para "12, 41" no ciclo seguinte. É o risco residual conhecido.

**D12. Busca sem toque (BuscadorLuz): o detector por células propõe um ponto, mas o ponto só é sugerido depois que um decodificador nele confirma uma leitura.**
Descartado: mostrar a sugestão do detector direto.
Motivo: o detector sozinho apontou reflexo em 12 de 20 cenas sem pisca (exploração com sementes 10–29). Com a confirmação pelo decodificador, foram 0 de 40, contando reflexo aleatório e reflexo periódico, e ele achou a luz em 39 de 40 cenas com pisca em até 90 s. A busca é mais lenta que o toque, e o toque continua sendo o caminho principal.

**D13. Relógio do app: `mediaTime` do requestVideoFrameCallback, sempre crescente (se voltar, emenda pelo relógio da tela). Fallback: requestAnimationFrame.**
Motivo: o `mediaTime` é o instante do quadro na câmera, mais fiel que o da tela. A emenda veio do E2E: o vídeo falso do Chrome roda em loop.

**D14. Se a resolução da câmera muda no meio, Leitor e busca são recriados com a mesma região normalizada.**
Motivo: no E2E, o toque logo depois da câmera abrir não lia nada; tocar 3 s depois lia. A causa provável é uma troca de resolução nos primeiros quadros (Leitor criado para um tamanho, quadros chegando em outro). **Não medi a troca em si**: corrigi pelo sintoma, e o E2E passou depois.

## Prova

**D15. Vídeo sintético gerado em TS (test/sintetico.ts), não gravado.**
Simula painel com gradiente, ícone apagado visível, lâmpada incandescente (~40 ms de subida), outras 3 luzes acesas perto, ruído gaussiano, tremida (senoide + passeio aleatório), reflexo (mancha que passeia ao acaso ou em ciclo, e clarões de 1–2 quadros), auto-exposição (o ganho cai 38% com a luz acesa e oscila ±15%), jitter de timestamp e quadro perdido.
Limites medidos (test/limites.explorar.ts, códigos 12+41, 30 fps, 4 sementes): tremida de até 8 px com lâmpada de raio 5 px dá 4/4, e 12 px dá 3/4. Lâmpada com raio de 2 px, ruído σ=25, 10 fps e deriva de 0,5 px/s também dão 4/4. Deriva de 1 px/s dá 2/4, com 1 confirmação errada que se corrigiu depois (D11c).
Limite: **é modelo, não câmera.** Não há rolling shutter, compressão, foco nem tremida real de mão, e o tamanho da lâmpada é de 5 px de raio num quadro de 160 px. A validação no carro é do Victor.

**D16. E2E com Chrome headless, `--use-fake-device-for-media-stream` + `--use-file-for-fake-video-capture=<.y4m>`, Playwright só como driver (playwright-core + Chrome instalado), com a prova lida no DOM (`data-testid`).**
O .y4m tem número inteiro de ciclos da ECU, porque o Chrome repete o arquivo e a emenda não pode cortar um código.

## Conteúdo

**D17. Tabela de códigos marca a situação (confirmado em 2+ fontes / não confirmado / não é de Civic 92–95) e as fontes por código.**
Sem o manual Helms original. A fonte mais próxima é a P (portal-diagnostov, derivado de Mitchell, por motor). O código 0 ficou fora: zero piscas não dá para ler.

**D18. Instruções usam só o que tem fonte; o que não tem é dito como não conferido.**
Conferido: SCS de 2 pinos no lado do passageiro (direito), atrás do painel lateral; ignição ON sem partida; DLC de 3 pinos ao lado sem jumper; chicote SRS amarelo; fusível BACK UP (RADIO) 7,5 A por 10 s para apagar.
Não conferido: cor cinza do SCS em 92–93 (fonte única); airbag no Civic vendido no Brasil; o "não mexer em amarelo" literal (o manual proíbe mexer em fio do SRS, e o SRS é amarelo).

## Git

**D19. Autor dos commits: `Victor-Pedroso <70385631+Pedrosin@users.noreply.github.com>`** (pedido da sessão coordenadora, para poder ir ao GitHub). O commit inicial foi reescrito. O histórico antigo está em `Documents/_backup-git/leitor-pisca-antes-email-2026-10-27.bundle`.

## Crítica adversarial (Codex, 2026-10-27)

Nenhum caminho de confirmação errada foi achado. Corrigidos 15 achados (P2/P3), cada um com teste de regressão em `test/regressao.test.ts` quando é do núcleo:
- Tempo não finito ou fora de ordem: descartado no decodificador, limiar, refinador, detector e busca. `Infinity` congelava a leitura. Ciclo com duração ≤ 0 não confirma.
- Refinador perto da borda: a janela usava a menor dimensão como quadrado e cortava a lâmpada. Agora largura e altura são independentes.
- Replay: o prazo do refinamento (20 s) era maior que os quadros guardados (15 s). Ficaram iguais em 15 s.
- `celulaPx` inválido falha na criação do detector.
- App: o relógio do quadro é uma linha do tempo própria que anda por passo (câmera ou tela), sem misturar escalas absolutas. "Marcar de novo" limpa piscas e lidos. Wake lock pedido depois da tela fechar é liberado. Falha em `video.play()` agora é erro, e a câmera é fechada.
- Gerador sintético: o quadro perdido não congela mais a física. Começar no meio do ciclo parte do regime. Clarão conta quadros entregues.
- Achado meu na mesma rodada: quando a busca automática achava a luz, o mesmo quadro era processado duas vezes e os códigos já confirmados não iam para a tela.

## Pedido do Victor depois de usar no celular (2026-10-28)

> "as vezes temos outras luzes acesas no painel como a de cinto de segurança, o que atrapalha algumas leituras" · "quero poder encerrar a sessão sem antes ele ter que confirmar" · "não consegui até agora terminar uma leitura"

**D20. Luz vizinha forte (cinto).** O gerador sintético ganhou uma luz vizinha com roteiro (pisca 6 s depois da ignição e fica acesa; fixa; acende no meio; apaga no meio), borra de brilho em volta e efeito na auto-exposição. Também ganhou a conversão de faixa que o Chrome faz no vídeo (16–235 → 0–255).
O que causava a interferência, cada um com prova:
1. **Busca automática não fechava.** Com a auto-exposição caindo quando a injeção acende, o cinto aceso "piscava ao contrário", porque o detector subtraía a mediana do quadro. O candidato pulava entre células e cada pulo recomeçava a leitura: 0 de 3 leituras no ponto certo. Correção: célula em % da mediana (razão), candidato fixo que só troca se outro ponto vencer 3 consultas seguidas, e a busca usando o mesmo Leitor do toque. Ficou em 3 de 3 (teste `regressao.test.ts`, que falha no código antigo).
2. **Disco do toque pegava borda e borra do cinto.** Com cinto grande e colado, o disco escorregava para ele: 1 de 3. Correção: máscara da lâmpada (os pixels que acendem junto com a injeção, só a mancha conectada ao pixel mais forte, com 1 px de folga e peso uniforme). Ficou em 3 de 3.
   - Com peso proporcional ao contraste, a tremida de 6 px parou de ler (o miolo anda).
   - Sem restringir à mancha conectada, a máscara chegou a 518 px para uma lâmpada de ~80, e "tudo junto" parou de ler.
3. **Painel quase preto no navegador.** A conversão de faixa do Chrome derruba painel escuro para perto de zero, e com piso 8 na razão lâmpada/fundo o sinal virou ruído. O E2E com o cinto aceso só leu códigos errados (vistos): 2, 10, 11, 21, e um "1" chegou a ser confirmado. Correção: piso 12, medido em 7 cenários × 4 sementes (ver o comentário de `FUNDO_MINIMO`; o efeito é sensível e não monotônico).
- Dica no app: afivelar o cinto apaga a luz dele. Está em "Como preparar o carro" e embaixo da câmera.
- Também ajuda: "Luz errada? Toque na luz certa", que vale a qualquer momento.

**D21. Busca automática pergunta antes de mostrar código.** Reflexo que vai e volta em ritmo fixo imita código. Nenhum ajuste separou os dois com folga:
- forma da borda do pisca: a lâmpada real também fica 130–600 ms "no meio do caminho" com ruído e tremida;
- contraste no refinador: reflexo até 2,9, lâmpada a partir de 1,2;
- percentil do fundo: 0,3/0,4 abrem 1–2 falsos em 40.

Agora a busca só aponta: "Achei uma luz piscando no círculo tracejado. É a luz da injeção?". Nenhum código aparece antes do "Sim". "Não" descarta o ponto, que não volta. Com reflexo aleatório: 0 sugestões em 40 cenas sem pisca. Com reflexo periódico: até 1 sugestão por cena, sempre recusável (teste em `video.test.ts`). Acerto da busca em cenas com pisca: 15 de 20 em até 90 s (sementes 40–59). Antes desta rodada era 19–20 de 20 em outras sementes.

**D22. Encerrar e conferir (TS puro, sem DOM).**
- `Decodificador.resumo()` devolve, por código: número, mapa de piscas (longo/curto, mais `aberto` para o pisca aceso quando parou) e situação.
  - **confirmado**: está na confirmação automática, ou foi lido 3+ vezes com o mesmo intervalo (2 ciclos da ECU). Com 2 vezes bastando, um "1" avulso do cinto se repetiu e foi confirmado errado no E2E.
  - **visto**: 1–2 leituras sem esse ritmo, com o aviso "confira contando".
  - **incompleto**: cortado no começo, confuso, ou em andamento ao parar. Nunca tem número.
- `interromper()` é para quando a pessoa volta a ler: o código cortado pela pausa é descartado; o que já foi lido e o que foi aprendido ficam.
- O app mostra o mapa em desenho (▬ •) e em texto ("longa - curta - curta"), com uma caixa "usar este código" por linha. "Confirmar e ver os defeitos" abre os cartões da tabela, e "Voltar a ler" continua a mesma leitura.
- A confirmação automática continua.

**D23. Primeiro código aproveitado.** Antes, o primeiro código era sempre descartado (o limiar aprende o nível no primeiro pisca). Agora ele conta se o sinal ficou escuro e parado, com variação ≤ 35% do salto, por uma pausa inteira antes do primeiro pisca. Assim nenhum pisca fraco passou despercebido. Quem quer ler 1 código ganha um ciclo.

**D24. Versão nova chega sem limpar cache.**
- `sw.js` é gerado no build com a versão (commit + hora) no nome do cache, e o cache antigo é apagado.
- A página vem da rede primeiro (antes saía do cache, e a versão nova só aparecia na abertura seguinte). Os assets com hash continuam vindo do cache primeiro.
- O registro usa `updateViaCache: 'none'` e procura atualização ao voltar o app para a frente. Com versão nova instalada, recarrega na próxima troca de tela, nunca no meio de uma leitura.
- A versão aparece no rodapé da tela inicial.
- Exceção única: o celular que tem a versão anterior (service worker antigo, cache primeiro) ainda abre a velha uma vez. Fechar e abrir de novo resolve, e daí em diante é automático.

**Limites medidos nesta rodada** (`test/limites.explorar.ts`, piso 12, 8 sementes, prazo de 8 ciclos):
- cinto aceso fixo colado com a faixa do Chrome: [12] 8/8 e [1, 3, 43] 3/8;
- "tudo junto" + tremida 6 px: 3/4 (era 4/4);
- deriva de 1 px/s: 0/4, com 1 confirmação errada (era 2/4 com 1 errada);
- o resto ficou igual ao da entrega anterior;
- nenhuma confirmação errada em nenhum cenário fora a deriva extrema.
Onde não fecha no prazo, o botão "Encerrar e conferir" mostra o que foi visto, marcado como visto ou confirmado. A suíte (`robustez.test.ts`) usa outras sementes e passa 97/97.

## Crítica adversarial da rodada 2 (Codex, 2026-10-28)

Os 6 achados procediam e foram corrigidos:
- "Voltar a ler" com a pergunta da busca aberta: o "sim" usava o buscador antigo. Agora a pergunta é fechada sempre que o buscador é trocado.
- `interromper()` não zerava a observação de antes do primeiro pisca. Voltando com a luz acesa no começo de um longo, o resto de um 43 saía como "23". Corrigido. O teste em `conferencia.test.ts` falha sem a correção (conferido).
- Ponto recusado na busca bloqueava os outros. O detector agora pula regiões excluídas. E, achado ao testar: o refinador podia puxar um candidato vizinho de volta para a lâmpada recusada, então a posição final também é conferida.
- O service worker apagava caches de outros apps da mesma origem (pedrosin.github.io). Agora só apaga os `leitor-pisca-*`.
- A gravação no cache não segurava o evento (`waitUntil`).
- O teste de recusa podia passar sem recusar nada. Agora exige que a recusa aconteça.

## Layout para o celular (2026-10-29)

Régua: a pessoa está dentro do carro parado, com uma mão no celular apontando para o painel, às vezes de noite. A leitura leva de 30 s a 2 min e ninguém rola a página nesse tempo.
Medição antes da mudança (Chrome em modo celular, câmera falsa, com a pergunta da busca aberta): a base do "Encerrar e conferir" ficava em 873 px numa tela de 640, 895/844, 887/915 e 1006/390 deitado. Sem a pergunta, deitado já ficava em 599/390. O "Voltar" tinha 44 px.

**D25. Captura em tela única, com a ação presa embaixo.**
A tela de leitura vira uma grade de `100dvh` (fallback `100vh`):
- barra no topo (Voltar · Ajuda; o título fica só para leitor de tela);
- a câmera com o que sobra;
- o painel (status, piscas, lidos, confirmados em chips de uma linha);
- o rodapé preso, com `safe-area-inset-bottom`.

A pergunta da busca ("é a luz da injeção?") mora no rodapé, junto das ações, e enquanto ela está aberta o "Marcar de novo" some, porque o "Não, é outra" faz o mesmo papel. Se não couber (texto do aparelho muito ampliado), a captura rola por dentro e o rodapé continua na tela.
Descartado:
- página que rola, como era;
- botão flutuante sobre a câmera, que cobre a imagem onde se toca;
- pergunta por cima da câmera: com texto em 200% os botões ficavam cortados;
- pergunta numa linha própria: em 320 px a barra presa a cobria.
O que provou os três últimos: a checagem de "cortado por ancestral" e de "coberto por outro elemento" em `e2e/layout.ts`.

**D26. Orientação: o PWA instalado continua travado em pé, e o navegador ganhou layout deitado.**
Deitado, a câmera fica de um lado e o painel com as ações do outro, com `safe-area` nos quatro lados.
Descartado: liberar `any` no manifest. O motivo:
- a leitura é de uma lâmpada só, e não do painel inteiro;
- em pé se segura com uma mão;
- girar no meio da leitura muda o enquadramento.
Na aba do navegador o manifest não vale e o celular gira de qualquer jeito, por isso o layout deitado existe e é provado (844×390). Se o vídeo da câmera vira de deitado para em pé no meio da leitura, a leitura recomeça com o aviso "Celular girou. Toque na luz de novo". Antes, o toque normalizado era reaproveitado e passava a apontar para outro lugar da imagem.

**D27. Puxar para atualizar desligado (`overscroll-behavior-y: none` no html).**
O Chrome Android, fora do PWA, recarregava a página no meio da leitura.
Descartado: `beforeunload`, que o celular ignora ou mostra fora de hora.

**D28. Zoom digital 1× → 2× → 3× (recorte do centro do vídeo) em vez de lupa ou zoom da câmera.**
- O que dificulta é enxergar uma luz pequena numa imagem pequena, e não acertar o ponto: o refinador já acha a lâmpada a até ~17% da largura do toque.
- O recorte também entrega mais pixels da lâmpada ao decodificador (que não mudou), e funciona igual em qualquer navegador.
- Trocar o zoom recomeça a leitura, porque o enquadramento mudou.
- O toque desconta a faixa preta do `object-fit: contain`.
- Prova: E2E `zoom-2x-toque-3` (toque na imagem ampliada lê o [3]).
Descartado:
- `applyConstraints({ zoom })`: só existe em parte dos Android e não no iPhone;
- lupa ao tocar: mais complexa e resolve o problema errado.

**D29. Toque.**
- Todo alvo tem ≥ 48 px: "Voltar" e "Ajuda" tinham 44 px; o rótulo "usar este código" ganhou caixa de 24 px.
- `touch-action: manipulation` em botões e rótulos, sem o realce azul do toque.
- `:active` visível (o celular não tem hover).

**D30. Contraste calculado, não no olho.**
- O texto já passava. Os piores casos são o aviso vermelho (5,27:1) e o `--texto-2` (7,31:1 sobre a superfície, 8,11:1 sobre o fundo); o âmbar dá 9,2–10,3:1.
- O que falhava era o contorno de botão secundário e de campo: 1,26–1,40:1, contra o mínimo de 3:1 (WCAG 1.4.11), o que pesa sob o sol. Agora `--borda-controle #6c727d` dá 3,49–3,87:1.
- O E2E calcula o contraste a partir das cores computadas de cada texto visível e de cada contorno, em todas as telas.
Fora: modo claro para sol forte, porque a tela escura serve à noite e o texto já passa do AAA.

**D31. Tabela com "Ir para o código".**
- Campo preso no topo, com teclado numérico. Ao digitar o número, a tela rola até o cartão e o destaca.
- Código fora da tabela recebe a orientação geral: repetir a leitura; se voltar, suspeitar da ECU.
Descartado: uma grade de números clicáveis, que repete a lista e, com 33 códigos, ocupa uma tela inteira.

**D32. Voltar do Android.**
- Cada tela entra no histórico.
- Na conferência, voltar retorna à captura.
- Com leitura começada (luz marcada ou aceita), o primeiro voltar avisa ("Leitura em andamento. Volte de novo para sair.") e o segundo, em até 4 s, sai. Sem luz marcada, sai direto.
- O "Voltar" do app sai sem aviso: é um gesto deliberado.
Descartado: `confirm()`, que bloqueia, tem visual do sistema e no PWA às vezes nem aparece.

**D33. Vibração quando a leitura confirma.** Só funciona no Android; o iPhone ignora. Quem está olhando o painel sente.

**D34. Texto em `rem`, que segue o tamanho de texto do aparelho.** Os botões empilham quando o texto é grande e não partem palavra (`overflow-wrap: break-word` no lugar de `anywhere`; o E2E confere "palavra partida").

Fora desta rodada, e por quê:
- Lupa: ver D28.
- Zoom da câmera: ver D28. Pode entrar depois como melhoria de nitidez no Android.
- Modo claro: ver D30.
- Travar a orientação pela Screen Orientation API: exige tela cheia e não funciona no iPhone.
- Botão de instalar o PWA: o navegador já oferece.
