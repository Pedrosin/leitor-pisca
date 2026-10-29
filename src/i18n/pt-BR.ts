// Dicionário pt-BR: a fonte das chaves. Todo texto que a pessoa lê no app mora aqui (ou no en/es).
// Marcadores {assim} são trocados por fmt()/plural(); o teste confere que todo idioma usa os mesmos.

import { plural } from './tipos';

export const ptBR = {
  app: {
    titulo: 'Leitor de Pisca',
    descricao: 'Lê pela câmera o código que a luz da injeção pisca nos Honda OBD1 (92–95) e explica em português.',
  },
  idioma: {
    rotulo: 'Idioma',
  },
  comum: {
    voltar: 'Voltar',
    ajuda: 'Ajuda',
    inicio: 'Início',
  },
  inicio: {
    subtitulo:
      'Lê pela câmera o código de defeito que a luz da injeção pisca nos Honda OBD1 (1992–1995) e explica o que conferir.',
    ler: 'Ler os códigos',
    preparar: 'Como preparar o carro',
    tabela: 'Tabela de códigos',
    nota: 'Primeira vez? Leia "Como preparar o carro": o jumper vai num conector específico e há conectores do airbag por perto.',
    versao: 'versão {versao}',
  },
  preparar: {
    titulo: 'Como preparar o carro',
    avisoForte: 'NÃO mexa nos conectores AMARELOS.',
    avisoTexto:
      'Fios e conectores amarelos são do airbag (SRS). Mexer neles pode disparar o airbag ou deixar o sistema com defeito.',
    passos: {
      desligar: { forte: 'Ignição desligada.', texto: 'Chave em OFF, motor parado.' },
      achar: {
        forte: 'Ache o conector de serviço (SCS).',
        texto:
          'É um conector de 2 pinos, normalmente azul (em alguns 92–93 pode ser cinza), atrás do painel lateral do lado do passageiro, perto da coluna da porta, na altura do pé. A central da injeção (ECU) fica ali perto.',
      },
      lado: {
        forte: 'Lado do passageiro:',
        texto:
          'é o direito em carro com volante à esquerda (Brasil, Américas, Europa continental). Em carro com volante à direita (Reino Unido, Japão, Austrália), provavelmente é o esquerdo: um manual Honda de exportação também diz "lado do passageiro", mas isso não foi conferido em duas fontes.',
      },
      naoConfundir: {
        forte: 'Não confunda com o conector de 3 pinos ao lado.',
        texto: 'Esse é o de diagnóstico (DLC); não faça jumper nele.',
      },
      ligar: {
        forte: 'Ligue os 2 pinos do SCS',
        texto: 'com um clipe de papel aberto ou um pedaço de fio, ainda com a ignição desligada.',
      },
      chave: { forte: 'Gire a chave para ON', texto: '(segunda posição, painel aceso).', forte2: 'Não dê partida.' },
      cinto: {
        forte: 'Afivele o cinto',
        texto: '(ou espere a luz dele parar de piscar). Luz forte acesa ou piscando colada na da injeção atrasa a leitura.',
      },
      olhar: {
        forte: 'Olhe a luz da injeção',
        texto:
          '(CHECK ENGINE / PGM-FI). Piscas longos são a dezena e curtos são a unidade: 1 longo e 2 curtos = código 12. A lista se repete.',
      },
      abrir: { forte: 'Abra "Ler os códigos",', texto: 'aponte a câmera para o painel e toque na luz da injeção.' },
    },
    luzTitulo: 'O que a luz pode fazer',
    luz: {
      pisca: { forte: 'Pisca:', texto: 'há código gravado. É isso que o leitor lê.' },
      acesa: { forte: 'Fica acesa sem piscar:', texto: 'nenhum código gravado.' },
      srs: {
        forte: 'Quem pisca é a luz do airbag (SRS):',
        texto: 'o jumper está no conector errado. Desligue a ignição e tire o jumper.',
      },
    },
    depoisTitulo: 'Depois de ler',
    depois: {
      tirar: 'Desligue a ignição e tire o jumper.',
      apagar: {
        forte: 'Para apagar os códigos:',
        texto:
          'com a ignição desligada, tire da caixa de fusíveis do motor o fusível BACK UP 7.5 A (em alguns carros o rótulo é BACK UP (RADIO); confira na tampa da caixa), espere pelo menos 10 segundos e coloque o fusível de volta.',
      },
      radio: 'O relógio e as estações do rádio se perdem. Rádio com antifurto pede o código dele ao religar.',
      volta: 'Se o defeito continuar, o código volta.',
    },
    nota: 'Conferido em fontes públicas (veja a tabela de códigos). Ainda não conferido: a cor do SCS nos 92–93 (uma fonte diz cinza); quais versões têm airbag em cada mercado, inclusive no Brasil; o lado do SCS e o rótulo do fusível em carro com volante à direita, no Japão e na América Latina.',
  },
  tabela: {
    titulo: 'Tabela de códigos',
    irPara: 'Ir para o código',
    ir: 'Ir',
    fora: '{n} não está na tabela. {conferir}',
    intro:
      'Honda OBD1 1992–1995, com foco no Civic. Código que não está aqui: repita a leitura; se ele voltar, a suspeita é a ECU.',
    fontesTitulo: 'Fontes',
  },
  cartao: {
    causa: 'Causa provável',
    conferir: 'O que conferir',
    aplica: 'Onde existe',
    nota: 'Observação',
  },
  selo: {
    confirmado: 'confirmado em 2+ fontes',
    naoConfirmado: 'não confirmado',
    outroModelo: 'não é de Civic 92–95',
  },
  leitura: {
    titulo: 'Ler os códigos',
    cameraRotulo: 'Imagem da câmera. Toque na luz da injeção.',
    abrindo: 'Abrindo a câmera…',
    toque: 'Toque na luz da injeção na imagem.',
    dica: 'Toque na luz da injeção',
    lendo: 'Lendo… segure firme. Leva de 30 s a 1 min e meio.',
    lendoRefinado: 'Lendo… esperando a lista de códigos repetir.',
    confirmada: 'Leitura confirmada. Toque em Encerrar e conferir.',
    alertas: {
      sinalFraco: 'Não vejo pisca no ponto marcado. Chegue mais perto ou toque de novo na luz.',
      luzConstante: 'A luz está acesa sem piscar: sem código gravado (ou o jumper não está no SCS).',
      semPisca: 'A luz parou de piscar. Confira o jumper e se a ignição está em ON.',
    },
    pergunta: {
      forte: 'Achei uma luz piscando no círculo tracejado.',
      texto: 'É a luz da injeção?',
      sim: 'Sim, é essa',
      nao: 'Não, é outra',
      status: 'Confirme a luz achada, ou toque na luz certa.',
      aceita: 'Luz confirmada. Lendo…',
      recusada: 'Toque na luz da injeção, ou espere eu procurar de novo.',
    },
    zoom: {
      rotulo: plural({ one: 'Zoom {n} vez. Toque para trocar.', other: 'Zoom {n} vezes. Toque para trocar.' }),
      sem: 'Sem zoom. Toque na luz da injeção.',
      com: 'Zoom {n}×. Toque na luz da injeção.',
    },
    girou: 'Celular girou. Toque na luz da injeção de novo.',
    sairAviso: 'Leitura em andamento. Volte de novo para sair.',
    lidos: 'Lidos: {lista}',
    erros: {
      semPermissao: 'Sem permissão para a câmera. Libere a câmera para este site nas configurações do navegador.',
      semCamera: 'Não consegui abrir a câmera. Este navegador precisa de HTTPS para usar a câmera.',
      videoParado: 'A câmera abriu, mas o vídeo não começou. Toque em Voltar e tente de novo.',
    },
    encerrar: 'Encerrar e conferir',
    marcar: 'Marcar de novo',
  },
  conferencia: {
    titulo: 'Confira o que foi lido',
    instrucao: 'Compare com os piscas que você viu no painel: ▬ é longa (dezena), • é curta (unidade).',
    nada: 'Nada lido ainda. Volte a ler e deixe a lista de códigos passar pelo menos uma vez.',
    descartadas: plural({
      one: '{n} leitura descartada no caminho (cortada ou fora do padrão).',
      other: '{n} leituras descartadas no caminho (cortadas ou fora do padrão).',
    }),
    usar: 'usar este código',
    confirmar: 'Confirmar e ver os defeitos',
    voltarALer: 'Voltar a ler',
    defeitos: 'Defeitos',
    situacao: {
      confirmado: plural({ one: 'Confirmado: lido igual {n} vez.', other: 'Confirmado: lido igual {n} vezes.' }),
      visto: plural({
        one: 'Visto {n} vez. Confira contando os piscas no painel.',
        other: 'Visto {n} vezes, sem repetir no ritmo da lista. Confira contando os piscas no painel.',
      }),
      andamento: 'Incompleto: a leitura parou no meio deste código.',
      cortado: 'Incompleto: a leitura começou no meio deste código.',
      confuso: 'Incompleto: piscas fora do padrão (reflexo ou mão mexendo).',
    },
  },
  piscas: {
    longo: 'longa',
    curto: 'curta',
    aberto: 'acesa quando parou',
  },
  codigos: {
    1: {
      nome: 'Sonda lambda (O2) primária',
      causa: 'Sinal da sonda fora da faixa.',
      conferir: 'Sonda, chicote e conector dela; pressão de combustível; vazamento no escapamento antes da sonda.',
      nota: 'Aquecida em quase todos; no D15B8 não é aquecida. No D15Z1 (VX) é sensor LAF (ver 48).',
    },
    3: {
      nome: 'Sensor MAP (pressão do coletor) — elétrico',
      causa: 'Circuito do MAP aberto ou em curto.',
      conferir: 'Conector e chicote do MAP, alimentação de 5 V, o próprio sensor.',
    },
    4: {
      nome: 'Sensor de posição do virabrequim (CKP), no distribuidor',
      causa: 'Circuito aberto ou em curto.',
      conferir: 'Conector do distribuidor e chicote; sensor dentro do distribuidor.',
    },
    5: {
      nome: 'Sensor MAP — mecânico',
      causa: 'O MAP não vê o vácuo certo.',
      conferir: 'Mangueira do MAP solta, rachada ou entupida; vazamento de vácuo no coletor.',
      nota: 'P1, P2 e MW: falha mecânica (vácuo). P3 descreve como elétrica.',
    },
    6: {
      nome: 'Sensor de temperatura do líquido de arrefecimento (ECT)',
      causa: 'Circuito aberto ou em curto.',
      conferir: 'Sensor no cabeçote/carcaça da válvula termostática, conector e chicote.',
    },
    7: {
      nome: 'Sensor de posição da borboleta (TPS)',
      causa: 'Circuito aberto ou em curto.',
      conferir: 'Conector e chicote do TPS, ajuste dele, o próprio sensor.',
    },
    8: {
      nome: 'Sensor de ponto morto superior (TDC), no distribuidor',
      causa: 'Circuito aberto ou em curto.',
      conferir: 'Conector do distribuidor e chicote.',
    },
    9: {
      nome: 'Sensor de posição do cilindro nº 1 (CYP), no distribuidor',
      causa: 'Circuito aberto ou em curto.',
      conferir: 'Conector do distribuidor e chicote.',
    },
    10: {
      nome: 'Sensor de temperatura do ar de admissão (IAT)',
      causa: 'Circuito aberto ou em curto.',
      conferir: 'Sensor na caixa do filtro ou no coletor, conector e chicote.',
    },
    11: {
      nome: 'ECU (divergente)',
      causa: 'As fontes discordam: ECU ou módulo de ignição.',
      conferir: 'Repita a leitura. Se voltar, confira alimentação e terra da ECU.',
      nota: 'ETCG e DEP: ECU. Outra fonte: módulo de ignição. Não está nas tabelas de Civic 92–95.',
    },
    12: {
      nome: 'Sistema EGR (recirculação dos gases de escape)',
      causa: 'O EGR não está agindo.',
      conferir: 'Solenoide do EGR, mangueiras de vácuo, sensor de posição da válvula.',
      aplica: 'Só motor com EGR',
      nota: 'P3 restringe ao D15Z1 (VX); P1 e MW não restringem.',
    },
    13: {
      nome: 'Sensor de pressão atmosférica (BARO), dentro da ECU',
      causa: 'Falha no circuito do sensor.',
      conferir: 'O sensor fica dentro da ECU: normalmente é a própria ECU.',
    },
    14: {
      nome: 'Válvula de marcha lenta (IACV/EACV)',
      causa: 'Circuito aberto ou em curto.',
      conferir: 'Conector e chicote da válvula, alimentação, a própria válvula.',
    },
    15: {
      nome: 'Sinal de saída da ignição',
      causa: 'A ECU não vê o retorno da ignição.',
      conferir: 'Ignitor/módulo de ignição no distribuidor, chicote, alimentação da bobina.',
    },
    16: {
      nome: 'Injetor',
      causa: 'Circuito de injetor aberto ou em curto.',
      conferir: 'Conectores e chicote dos injetores, alimentação, resistor de injetor (se houver).',
    },
    17: {
      nome: 'Sensor de velocidade (VSS)',
      causa: 'Circuito aberto ou em curto.',
      conferir: 'Sensor no câmbio, conector e chicote; velocímetro funciona?',
    },
    19: {
      nome: 'Solenoide de lock-up (câmbio automático)',
      causa: 'Circuito do solenoide aberto ou em curto.',
      conferir: 'Conector e chicote do solenoide no câmbio automático.',
      aplica: 'Só câmbio automático',
    },
    20: {
      nome: 'Detector de carga elétrica (ELD)',
      causa: 'Circuito do ELD (na caixa de fusíveis do motor).',
      conferir: 'ELD na caixa de fusíveis, conector e chicote.',
      nota: 'Este código não acende a luz: só fica gravado e aparece no pisca.',
    },
    21: {
      nome: 'Solenoide do VTEC',
      causa: 'Circuito do solenoide aberto ou em curto.',
      conferir: 'Conector e chicote do solenoide do VTEC no cabeçote.',
      aplica: 'Só motor VTEC (ex.: D16Z6, D15Z1, B16)',
    },
    22: {
      nome: 'Pressostato de óleo do VTEC',
      causa: 'Pressão de óleo do VTEC fora do esperado ou circuito do pressostato.',
      conferir: 'Nível e pressão do óleo, filtro de tela do solenoide do VTEC, conector do pressostato.',
      aplica: 'Só motor VTEC',
    },
    23: {
      nome: 'Sensor de detonação',
      causa: 'Circuito do sensor de detonação.',
      conferir: 'Sensor no bloco, conector e chicote.',
      aplica: 'Só motor com sensor de detonação',
      nota: 'Nenhuma tabela de Civic 92–95 traz o 23: provavelmente não existe nesses motores.',
    },
    30: {
      nome: 'Sinal A/T FI A (ECU ↔ central do câmbio automático)',
      causa: 'Falha na linha de sinal entre a ECU e a central do câmbio.',
      conferir: 'Chicote entre a ECU e a central do câmbio automático.',
      aplica: 'Accord/Prelude com câmbio automático',
      nota: 'Pisca na luz da injeção, não na luz D4. Não aparece nas tabelas de Civic 92–95.',
    },
    31: {
      nome: 'Sinal A/T FI B (ECU ↔ central do câmbio automático)',
      causa: 'Falha na linha de sinal entre a ECU e a central do câmbio.',
      conferir: 'Chicote entre a ECU e a central do câmbio automático.',
      aplica: 'Accord/Prelude com câmbio automático',
      nota: 'Pisca na luz da injeção, não na luz D4. Não aparece nas tabelas de Civic 92–95.',
    },
    41: {
      nome: 'Aquecedor da sonda',
      causa: 'Circuito do aquecedor aberto ou em curto.',
      conferir: 'Fusível e alimentação do aquecedor, conector da sonda, a própria sonda.',
      aplica: 'Motores com sonda aquecida (o D15B8 não tem)',
      nota: 'No D15Z1 (VX) é o aquecedor do sensor LAF.',
    },
    43: {
      nome: 'Sistema de combustível',
      causa: 'Mistura no limite da correção (pobre ou rica demais).',
      conferir: 'Pressão de combustível, bomba, filtro, injetores, vazamento de vácuo, sonda.',
      nota: 'P1: não existe no D15Z1. P3: exceto D15B8 da Califórnia.',
    },
    45: {
      nome: 'Mistura rica/pobre',
      causa: 'Correção de combustível no limite.',
      conferir: 'Pressão de combustível, injetores, vazamento de vácuo.',
      aplica: 'Provavelmente Integra/Prelude',
      nota: 'Fora das tabelas de Civic 92–95.',
    },
    48: {
      nome: 'Sensor LAF (sonda de banda larga)',
      causa: 'Circuito ou sinal do LAF.',
      conferir: 'Sensor LAF, conector e chicote.',
      aplica: 'Só D15Z1 (Civic VX)',
    },
    54: {
      nome: 'Flutuação da rotação do virabrequim (CKF)',
      causa: 'Sinal de rotação instável.',
      conferir: 'Sensor de rotação e chicote.',
      aplica: 'Provavelmente 95+ ou outro modelo',
      nota: 'Fora das tabelas de Civic 92–95.',
    },
    58: {
      nome: 'Sensor TDC nº 2',
      causa: 'Circuito do segundo sensor TDC.',
      conferir: 'Sensor e chicote.',
      nota: 'Uma fonte só.',
    },
    61: {
      nome: 'Sonda O2 dianteira (resposta lenta)',
      causa: 'Sonda lenta.',
      conferir: 'Sonda dianteira.',
      aplica: 'Carros com sonda pós-catalisador (96+ ou OBD1 de transição)',
      nota: 'Não existe no Civic 92–95.',
    },
    63: {
      nome: 'Sonda O2 traseira',
      causa: 'Sinal da sonda traseira.',
      conferir: 'Sonda pós-catalisador.',
      aplica: 'Carros com sonda pós-catalisador (96+ ou OBD1 de transição)',
      nota: 'Não existe no Civic 92–95.',
    },
    65: {
      nome: 'Aquecedor da sonda O2 traseira',
      causa: 'Circuito do aquecedor.',
      conferir: 'Sonda pós-catalisador.',
      aplica: 'Carros com sonda pós-catalisador (96+ ou OBD1 de transição)',
      nota: 'Não existe no Civic 92–95.',
    },
    67: {
      nome: 'Eficiência do catalisador',
      causa: 'Eficiência do catalisador abaixo do esperado.',
      conferir: 'Catalisador e sondas.',
      aplica: 'Carros com sonda pós-catalisador (96+ ou OBD1 de transição)',
      nota: 'Não existe no Civic 92–95.',
    },
  },
  desconhecido: {
    nome: 'Código fora da tabela',
    causa: 'Leitura errada ou falha da ECU.',
    conferir: 'Repita a leitura. Se o mesmo código voltar, a suspeita é a ECU.',
  },
  fontes: {
    P1: 'Portal Diagnostov — Civic EX 1992, autodiagnóstico',
    P2: 'Portal Diagnostov — Civic DX 1992, autodiagnóstico',
    P3: 'Portal Diagnostov — Civic EX 1994, autodiagnóstico',
    MW: 'MechanicWiki — Honda Civic OBD 1 codes reading tutorial',
    HB: 'HondaBook — Civic 5ª geração, procedimento de autodiagnóstico',
    HBA: 'HondaBook — Accord 3, códigos de falha',
    ETCG: 'EricTheCarGuy — Honda OBD I codes',
    S2K: 's2000.club — ECU fault codes',
    DEP: "Danny's Engine Portal — Honda OBD1 codes",
    WM: 'Workshop-manuals.com — Civic 1.5 SOHC, localização do conector de dados',
    CEG: 'Fórum civic-eg.com — SCS / conector de 2 pinos',
  },
};
