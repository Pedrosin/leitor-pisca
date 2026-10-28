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
