// English. Owner terminology: "Check Engine light" (what US/UK owners call the MIL), "service check
// connector (SCS)", fuse label as printed on the car. Keys come from pt-BR (typecheck enforces parity).

import type { Dicionario } from './tipos';

export const en: Dicionario = {
  app: {
    titulo: 'Blink Code Reader',
    descricao: 'Reads, through the camera, the code the Check Engine light blinks on OBD1 Hondas (92–95) and explains it.',
  },
  idioma: {
    rotulo: 'Language',
  },
  comum: {
    voltar: 'Back',
    ajuda: 'Help',
    inicio: 'Home',
  },
  inicio: {
    subtitulo:
      'Reads, through the camera, the trouble code blinked by the Check Engine light on 1992–1995 OBD1 Hondas and explains what to check.',
    ler: 'Read the codes',
    preparar: 'How to prepare the car',
    tabela: 'Code table',
    nota: 'First time? Read "How to prepare the car": the jumper goes on one specific connector, and there are airbag connectors nearby.',
    versao: 'version {versao}',
  },
  preparar: {
    titulo: 'How to prepare the car',
    avisoForte: 'Do NOT touch the YELLOW connectors.',
    avisoTexto:
      'Yellow wires and connectors belong to the airbag system (SRS). Touching them can set off the airbag or leave the system faulty.',
    passos: {
      desligar: { forte: 'Ignition off.', texto: 'Key at OFF, engine stopped.' },
      achar: {
        forte: 'Find the service check connector (SCS).',
        texto:
          'It is a 2-pin connector, usually blue, behind the kick panel on the passenger side, near the door pillar, at foot level. The engine computer (ECU) is close by.',
      },
      lado: {
        forte: 'Passenger side:',
        texto:
          'the right side on left-hand-drive cars (US, Canada, Latin America, continental Europe). On right-hand-drive cars (UK, Japan, Australia) it should be the left side: a Honda export manual also says "passenger side", but this is not confirmed by two sources.',
      },
      naoConfundir: {
        forte: 'Do not confuse it with the 3-pin connector next to it.',
        texto: 'That one is the data link connector (DLC); do not jumper it.',
      },
      ligar: {
        forte: 'Connect the 2 SCS pins',
        texto: 'with an opened paper clip or a piece of wire, with the ignition still off.',
      },
      chave: { forte: 'Turn the key to ON', texto: '(second position, dash lights on).', forte2: 'Do not start the engine.' },
      cinto: {
        forte: 'Fasten the seat belt',
        texto: '(or wait for its light to stop blinking). A bright light on or blinking right next to the Check Engine light slows down the reading.',
      },
      olhar: {
        forte: 'Watch the Check Engine light',
        texto:
          '(CHECK ENGINE / PGM-FI; Honda manuals call it the MIL). Long blinks are the tens and short blinks are the ones: 1 long and 2 short = code 12. The list repeats.',
      },
      abrir: { forte: 'Open "Read the codes",', texto: 'point the camera at the dash and tap the Check Engine light.' },
    },
    luzTitulo: 'What the light can do',
    luz: {
      pisca: { forte: 'Blinks:', texto: 'there is a stored code. This is what the reader reads.' },
      acesa: { forte: 'Stays on without blinking:', texto: 'no stored code.' },
      srs: {
        forte: 'The airbag (SRS) light is the one blinking:',
        texto: 'the jumper is on the wrong connector. Turn the ignition off and remove the jumper.',
      },
    },
    depoisTitulo: 'After reading',
    depois: {
      tirar: 'Turn the ignition off and remove the jumper.',
      apagar: {
        forte: 'To clear the codes:',
        texto:
          'with the ignition off, pull the BACK UP 7.5 A fuse (labeled BACK UP (RADIO) on some cars) from the under-hood fuse box for at least 10 seconds.',
      },
      radio: 'The clock and radio presets are lost. An anti-theft radio will ask for its code when power comes back.',
      volta: 'If the fault is still there, the code comes back.',
    },
    nota: 'Checked against public sources (see the code table). Not checked yet: the SCS color on 92–93 cars (one source says gray); which versions have an airbag in each market; the SCS side and the fuse label on right-hand-drive cars, in Japan and in Latin America.',
  },
  tabela: {
    titulo: 'Code table',
    irPara: 'Go to code',
    ir: 'Go',
    fora: '{n} is not in the table. {conferir}',
    intro:
      'OBD1 Hondas, 1992–1995, focused on the Civic. A code not listed here: repeat the reading; if it comes back, suspect the ECU.',
    fontesTitulo: 'Sources',
  },
  cartao: {
    causa: 'Likely cause',
    conferir: 'What to check',
    aplica: 'Applies to',
    nota: 'Note',
  },
  selo: {
    confirmado: 'confirmed by 2+ sources',
    naoConfirmado: 'not confirmed',
    outroModelo: 'not a 92–95 Civic code',
  },
  leitura: {
    titulo: 'Read the codes',
    cameraRotulo: 'Camera image. Tap the Check Engine light.',
    abrindo: 'Opening the camera…',
    toque: 'Tap the Check Engine light in the image.',
    dica: 'Tap the Check Engine light',
    lendo: 'Reading… hold steady. Takes 30 s to 1.5 min.',
    lendoRefinado: 'Reading… waiting for the code list to repeat.',
    confirmada: 'Reading confirmed. Tap Finish and review.',
    alertas: {
      sinalFraco: 'No blinking at the marked spot. Move closer or tap the light again.',
      luzConstante: 'The light is on without blinking: no stored code (or the jumper is not on the SCS).',
      semPisca: 'The light stopped blinking. Check the jumper and that the ignition is ON.',
    },
    pergunta: {
      forte: 'Found a blinking light in the dashed circle.',
      texto: 'Is it the Check Engine light?',
      sim: 'Yes, that one',
      nao: 'No, another one',
      status: 'Confirm the light found, or tap the right one.',
      aceita: 'Light confirmed. Reading…',
      recusada: 'Tap the Check Engine light, or wait while I search again.',
    },
    zoom: {
      rotulo: { one: 'Zoom {n}×. Tap to change.', other: 'Zoom {n}×. Tap to change.' },
      sem: 'No zoom. Tap the Check Engine light.',
      com: 'Zoom {n}×. Tap the Check Engine light.',
    },
    girou: 'Phone rotated. Tap the Check Engine light again.',
    sairAviso: 'Reading in progress. Go back again to exit.',
    lidos: 'Read: {lista}',
    erros: {
      semPermissao: 'No camera permission. Allow the camera for this site in your browser settings.',
      semCamera: 'Could not open the camera. This browser needs HTTPS to use the camera.',
      videoParado: 'The camera opened, but the video did not start. Tap Back and try again.',
    },
    encerrar: 'Finish and review',
    marcar: 'Mark again',
  },
  conferencia: {
    titulo: 'Review what was read',
    instrucao: 'Compare with the blinks you saw on the dash: ▬ is long (tens), • is short (ones).',
    nada: 'Nothing read yet. Go back to reading and let the code list go by at least once.',
    descartadas: {
      one: '{n} reading discarded along the way (cut off or off-pattern).',
      other: '{n} readings discarded along the way (cut off or off-pattern).',
    },
    usar: 'use this code',
    confirmar: 'Confirm and see the faults',
    voltarALer: 'Back to reading',
    defeitos: 'Faults',
    situacao: {
      confirmado: { one: 'Confirmed: read the same {n} time.', other: 'Confirmed: read the same {n} times.' },
      visto: {
        one: 'Seen {n} time. Count the blinks on the dash to check.',
        other: 'Seen {n} times, not repeating in step with the list. Count the blinks on the dash to check.',
      },
      andamento: 'Incomplete: the reading stopped in the middle of this code.',
      cortado: 'Incomplete: the reading started in the middle of this code.',
      confuso: 'Incomplete: off-pattern blinks (reflection or moving hand).',
    },
  },
  piscas: {
    longo: 'long',
    curto: 'short',
    aberto: 'on when stopped',
  },
  codigos: {
    1: {
      nome: 'Primary oxygen (O2) sensor',
      causa: 'Sensor signal out of range.',
      conferir: 'The sensor, its wiring harness and connector; fuel pressure; exhaust leak ahead of the sensor.',
      nota: 'Heated on almost all engines; not heated on the D15B8. On the D15Z1 (VX) it is the LAF sensor (see 48).',
    },
    3: {
      nome: 'MAP sensor (manifold absolute pressure) — electrical',
      causa: 'MAP circuit open or shorted.',
      conferir: 'MAP connector and wiring, 5 V supply, the sensor itself.',
    },
    4: {
      nome: 'Crankshaft position sensor (CKP), in the distributor',
      causa: 'Circuit open or shorted.',
      conferir: 'Distributor connector and wiring; sensor inside the distributor.',
    },
    5: {
      nome: 'MAP sensor — mechanical',
      causa: 'The MAP sensor is not seeing the right vacuum.',
      conferir: 'MAP hose loose, cracked or clogged; vacuum leak at the intake manifold.',
      nota: 'P1, P2 and MW: mechanical fault (vacuum). P3 describes it as electrical.',
    },
    6: {
      nome: 'Engine coolant temperature sensor (ECT)',
      causa: 'Circuit open or shorted.',
      conferir: 'Sensor on the cylinder head/thermostat housing, connector and wiring.',
    },
    7: {
      nome: 'Throttle position sensor (TPS)',
      causa: 'Circuit open or shorted.',
      conferir: 'TPS connector and wiring, its adjustment, the sensor itself.',
    },
    8: {
      nome: 'Top dead center sensor (TDC), in the distributor',
      causa: 'Circuit open or shorted.',
      conferir: 'Distributor connector and wiring.',
    },
    9: {
      nome: 'No. 1 cylinder position sensor (CYP), in the distributor',
      causa: 'Circuit open or shorted.',
      conferir: 'Distributor connector and wiring.',
    },
    10: {
      nome: 'Intake air temperature sensor (IAT)',
      causa: 'Circuit open or shorted.',
      conferir: 'Sensor in the air filter box or intake manifold, connector and wiring.',
    },
    11: {
      nome: 'ECU (sources disagree)',
      causa: 'Sources disagree: ECU or ignition module.',
      conferir: 'Repeat the reading. If it comes back, check the ECU power and ground.',
      nota: 'ETCG and DEP: ECU. Another source: ignition module. Not in the 92–95 Civic tables.',
    },
    12: {
      nome: 'EGR system (exhaust gas recirculation)',
      causa: 'The EGR is not working.',
      conferir: 'EGR solenoid, vacuum hoses, valve position sensor.',
      aplica: 'Engines with EGR only',
      nota: 'P3 limits it to the D15Z1 (VX); P1 and MW do not.',
    },
    13: {
      nome: 'Barometric pressure sensor (BARO), inside the ECU',
      causa: 'Sensor circuit fault.',
      conferir: 'The sensor is inside the ECU: usually it is the ECU itself.',
    },
    14: {
      nome: 'Idle air control valve (IACV/EACV)',
      causa: 'Circuit open or shorted.',
      conferir: 'Valve connector and wiring, power supply, the valve itself.',
    },
    15: {
      nome: 'Ignition output signal',
      causa: 'The ECU does not see the ignition feedback.',
      conferir: 'Igniter/ignition module in the distributor, wiring, coil power supply.',
    },
    16: {
      nome: 'Fuel injector',
      causa: 'Injector circuit open or shorted.',
      conferir: 'Injector connectors and wiring, power supply, injector resistor (if fitted).',
    },
    17: {
      nome: 'Vehicle speed sensor (VSS)',
      causa: 'Circuit open or shorted.',
      conferir: 'Sensor on the transmission, connector and wiring; does the speedometer work?',
    },
    19: {
      nome: 'Lock-up solenoid (automatic transmission)',
      causa: 'Solenoid circuit open or shorted.',
      conferir: 'Solenoid connector and wiring on the automatic transmission.',
      aplica: 'Automatic transmission only',
    },
    20: {
      nome: 'Electrical load detector (ELD)',
      causa: 'ELD circuit (in the under-hood fuse box).',
      conferir: 'ELD in the fuse box, connector and wiring.',
      nota: 'This code does not turn the light on while driving: it is only stored and shows up in the blink code.',
    },
    21: {
      nome: 'VTEC solenoid',
      causa: 'Solenoid circuit open or shorted.',
      conferir: 'VTEC solenoid connector and wiring on the cylinder head.',
      aplica: 'VTEC engines only (e.g. D16Z6, D15Z1, B16)',
    },
    22: {
      nome: 'VTEC oil pressure switch',
      causa: 'VTEC oil pressure not as expected, or pressure switch circuit.',
      conferir: 'Oil level and pressure, VTEC solenoid screen filter, pressure switch connector.',
      aplica: 'VTEC engines only',
    },
    23: {
      nome: 'Knock sensor',
      causa: 'Knock sensor circuit.',
      conferir: 'Sensor on the block, connector and wiring.',
      aplica: 'Engines with a knock sensor only',
      nota: 'No 92–95 Civic table lists 23: it probably does not exist on these engines.',
    },
    30: {
      nome: 'A/T FI signal A (ECU ↔ automatic transmission control unit)',
      causa: 'Fault on the signal line between the ECU and the transmission control unit.',
      conferir: 'Wiring between the ECU and the automatic transmission control unit.',
      aplica: 'Accord/Prelude with automatic transmission',
      nota: 'Blinks on the Check Engine light, not on the D4 light. Not in the 92–95 Civic tables.',
    },
    31: {
      nome: 'A/T FI signal B (ECU ↔ automatic transmission control unit)',
      causa: 'Fault on the signal line between the ECU and the transmission control unit.',
      conferir: 'Wiring between the ECU and the automatic transmission control unit.',
      aplica: 'Accord/Prelude with automatic transmission',
      nota: 'Blinks on the Check Engine light, not on the D4 light. Not in the 92–95 Civic tables.',
    },
    41: {
      nome: 'Oxygen sensor heater',
      causa: 'Heater circuit open or shorted.',
      conferir: 'Heater fuse and power supply, sensor connector, the sensor itself.',
      aplica: 'Engines with a heated sensor (not on the D15B8)',
      nota: 'On the D15Z1 (VX) it is the LAF sensor heater.',
    },
    43: {
      nome: 'Fuel system',
      causa: 'Mixture at the limit of correction (too lean or too rich).',
      conferir: 'Fuel pressure, pump, filter, injectors, vacuum leak, oxygen sensor.',
      nota: 'P1: does not exist on the D15Z1. P3: except the California D15B8.',
    },
    45: {
      nome: 'Rich/lean mixture',
      causa: 'Fuel correction at its limit.',
      conferir: 'Fuel pressure, injectors, vacuum leak.',
      aplica: 'Probably Integra/Prelude',
      nota: 'Not in the 92–95 Civic tables.',
    },
    48: {
      nome: 'LAF sensor (wideband oxygen sensor)',
      causa: 'LAF circuit or signal.',
      conferir: 'LAF sensor, connector and wiring.',
      aplica: 'D15Z1 only (Civic VX)',
    },
    54: {
      nome: 'Crankshaft speed fluctuation (CKF)',
      causa: 'Unstable engine speed signal.',
      conferir: 'Crankshaft sensor and wiring.',
      aplica: 'Probably 95+ or another model',
      nota: 'Not in the 92–95 Civic tables.',
    },
    58: {
      nome: 'TDC sensor No. 2',
      causa: 'Second TDC sensor circuit.',
      conferir: 'Sensor and wiring.',
      nota: 'Single source.',
    },
    61: {
      nome: 'Front oxygen sensor (slow response)',
      causa: 'Slow sensor.',
      conferir: 'Front oxygen sensor.',
      aplica: 'Cars with a post-catalyst sensor (96+ or transitional OBD1)',
      nota: 'Does not exist on the 92–95 Civic.',
    },
    63: {
      nome: 'Rear oxygen sensor',
      causa: 'Rear sensor signal.',
      conferir: 'Post-catalyst oxygen sensor.',
      aplica: 'Cars with a post-catalyst sensor (96+ or transitional OBD1)',
      nota: 'Does not exist on the 92–95 Civic.',
    },
    65: {
      nome: 'Rear oxygen sensor heater',
      causa: 'Heater circuit.',
      conferir: 'Post-catalyst oxygen sensor.',
      aplica: 'Cars with a post-catalyst sensor (96+ or transitional OBD1)',
      nota: 'Does not exist on the 92–95 Civic.',
    },
    67: {
      nome: 'Catalytic converter efficiency',
      causa: 'Converter below expected efficiency.',
      conferir: 'Catalytic converter and oxygen sensors.',
      aplica: 'Cars with a post-catalyst sensor (96+ or transitional OBD1)',
      nota: 'Does not exist on the 92–95 Civic.',
    },
  },
  desconhecido: {
    nome: 'Code not in the table',
    causa: 'Misread code or ECU fault.',
    conferir: 'Repeat the reading. If the same code comes back, suspect the ECU.',
  },
  fontes: {
    P1: 'Portal Diagnostov — 1992 Civic EX, self-diagnostics',
    P2: 'Portal Diagnostov — 1992 Civic DX, self-diagnostics',
    P3: 'Portal Diagnostov — 1994 Civic EX, self-diagnostics',
    MW: 'MechanicWiki — Honda Civic OBD 1 codes reading tutorial',
    HB: 'HondaBook — 5th generation Civic, self-diagnosis procedure',
    HBA: 'HondaBook — Accord 3, fault codes',
    ETCG: 'EricTheCarGuy — Honda OBD I codes',
    S2K: 's2000.club — ECU fault codes',
    DEP: "Danny's Engine Portal — Honda OBD1 codes",
    WM: 'Workshop-manuals.com — Civic 1.5 SOHC, data link connector location',
    CEG: 'civic-eg.com forum — SCS / 2-pin connector',
  },
};
