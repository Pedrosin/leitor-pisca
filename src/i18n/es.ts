// Español neutro (Latinoamérica primero, entendible en España). Terminología del dueño: "luz Check
// Engine", "conector de verificación de servicio (SCS)", "puente", fusible con el rótulo impreso en el
// auto. Las claves vienen del pt-BR (el typecheck exige las mismas).

import type { Dicionario } from './tipos';

export const es: Dicionario = {
  app: {
    titulo: 'Lector de Códigos de Parpadeo',
    descricao: 'Lee con la cámara el código que parpadea la luz Check Engine en los Honda OBD1 (92–95) y lo explica.',
  },
  idioma: {
    rotulo: 'Idioma',
  },
  comum: {
    voltar: 'Volver',
    ajuda: 'Ayuda',
    inicio: 'Inicio',
  },
  inicio: {
    subtitulo:
      'Lee con la cámara el código de falla que parpadea la luz Check Engine en los Honda OBD1 (1992–1995) y explica qué revisar.',
    ler: 'Leer los códigos',
    preparar: 'Cómo preparar el auto',
    tabela: 'Tabla de códigos',
    nota: '¿Primera vez? Lea "Cómo preparar el auto": el puente va en un conector específico y hay conectores de la bolsa de aire cerca.',
    versao: 'versión {versao}',
  },
  preparar: {
    titulo: 'Cómo preparar el auto',
    avisoForte: 'NO toque los conectores AMARILLOS.',
    avisoTexto:
      'Los cables y conectores amarillos son de la bolsa de aire (airbag, SRS). Tocarlos puede disparar la bolsa de aire o dejar el sistema con falla.',
    passos: {
      desligar: { forte: 'Encendido apagado.', texto: 'Llave en OFF, motor detenido.' },
      achar: {
        forte: 'Ubique el conector de verificación de servicio (SCS).',
        texto:
          'Es un conector de 2 pines, normalmente azul (en algunos 92–93 puede ser gris), detrás del panel lateral del lado del pasajero, cerca del pilar de la puerta, a la altura de los pies. La computadora del motor (ECU) está cerca.',
      },
      lado: {
        forte: 'Lado del pasajero:',
        texto:
          'es el derecho en autos con volante a la izquierda (América, Europa continental). En autos con volante a la derecha (Reino Unido, Japón, Australia) probablemente es el izquierdo: un manual Honda de exportación también dice "lado del pasajero", pero no está verificado en dos fuentes.',
      },
      naoConfundir: {
        forte: 'No lo confunda con el conector de 3 pines que está al lado.',
        texto: 'Ese es el de diagnóstico (DLC); no le haga puente.',
      },
      ligar: {
        forte: 'Una los 2 pines del SCS',
        texto: 'con un clip abierto o un trozo de cable, todavía con el encendido apagado.',
      },
      chave: { forte: 'Gire la llave a ON', texto: '(segunda posición, tablero encendido).', forte2: 'No arranque el motor.' },
      cinto: {
        forte: 'Abróchese el cinturón',
        texto:
          '(o espere a que su luz deje de parpadear). Una luz fuerte encendida o parpadeando junto a la luz Check Engine retrasa la lectura.',
      },
      olhar: {
        forte: 'Mire la luz Check Engine',
        texto:
          '(CHECK ENGINE / PGM-FI; en España, testigo de avería). Los parpadeos largos son las decenas y los cortos, las unidades: 1 largo y 2 cortos = código 12. La lista se repite.',
      },
      abrir: { forte: 'Abra "Leer los códigos",', texto: 'apunte la cámara al tablero y toque la luz Check Engine.' },
    },
    luzTitulo: 'Qué puede hacer la luz',
    luz: {
      pisca: { forte: 'Parpadea:', texto: 'hay un código guardado. Eso es lo que lee el lector.' },
      acesa: { forte: 'Queda encendida sin parpadear:', texto: 'no hay código guardado.' },
      srs: {
        forte: 'La que parpadea es la luz de la bolsa de aire (SRS):',
        texto: 'el puente está en el conector equivocado. Apague el encendido y quite el puente.',
      },
    },
    depoisTitulo: 'Después de leer',
    depois: {
      tirar: 'Apague el encendido y quite el puente.',
      apagar: {
        forte: 'Para borrar los códigos:',
        texto:
          'con el encendido apagado, saque de la caja de fusibles del motor el fusible BACK UP 7.5 A (en algunos autos dice BACK UP (RADIO); revise la tapa de la caja), espere al menos 10 segundos y vuelva a colocar el fusible.',
      },
      radio: 'Se pierden el reloj y las emisoras de la radio. Una radio con antirrobo pedirá su código al volver la corriente.',
      volta: 'Si la falla sigue, el código vuelve.',
    },
    nota: 'Verificado con fuentes públicas (vea la tabla de códigos). Aún sin verificar: el color del SCS en los 92–93 (una fuente dice gris); qué versiones tienen bolsa de aire en cada mercado; el lado del SCS y el rótulo del fusible en autos con volante a la derecha, en Japón y en América Latina.',
  },
  tabela: {
    titulo: 'Tabla de códigos',
    irPara: 'Ir al código',
    ir: 'Ir',
    fora: '{n} no está en la tabla. {conferir}',
    intro:
      'Honda OBD1 1992–1995, con foco en el Civic. Código que no está aquí: repita la lectura; si vuelve, sospeche de la ECU.',
    fontesTitulo: 'Fuentes',
  },
  cartao: {
    causa: 'Causa probable',
    conferir: 'Qué revisar',
    aplica: 'Aplica a',
    nota: 'Observación',
  },
  selo: {
    confirmado: 'confirmado en 2+ fuentes',
    naoConfirmado: 'no confirmado',
    outroModelo: 'no es de Civic 92–95',
  },
  leitura: {
    titulo: 'Leer los códigos',
    cameraRotulo: 'Imagen de la cámara. Toque la luz Check Engine.',
    abrindo: 'Abriendo la cámara…',
    toque: 'Toque la luz Check Engine en la imagen.',
    dica: 'Toque la luz Check Engine',
    lendo: 'Leyendo… sostenga firme. Tarda de 30 s a 1 min y medio.',
    lendoRefinado: 'Leyendo… esperando que la lista de códigos se repita.',
    confirmada: 'Lectura confirmada. Toque Terminar y revisar.',
    alertas: {
      sinalFraco: 'No veo parpadeo en el punto marcado. Acérquese o vuelva a tocar la luz.',
      luzConstante: 'La luz está encendida sin parpadear: no hay código guardado (o el puente no está en el SCS).',
      semPisca: 'La luz dejó de parpadear. Revise el puente y que el encendido esté en ON.',
    },
    pergunta: {
      forte: 'Encontré una luz parpadeando en el círculo punteado.',
      texto: '¿Es la luz Check Engine?',
      sim: 'Sí, es esa',
      nao: 'No, es otra',
      status: 'Confirme la luz encontrada o toque la correcta.',
      aceita: 'Luz confirmada. Leyendo…',
      recusada: 'Toque la luz Check Engine o espere a que busque de nuevo.',
    },
    zoom: {
      rotulo: { one: 'Zoom {n} vez. Toque para cambiar.', other: 'Zoom {n} veces. Toque para cambiar.' },
      sem: 'Sin zoom. Toque la luz Check Engine.',
      com: 'Zoom {n}×. Toque la luz Check Engine.',
    },
    girou: 'El teléfono giró. Vuelva a tocar la luz Check Engine.',
    sairAviso: 'Lectura en curso. Vuelva atrás otra vez para salir.',
    lidos: 'Leídos: {lista}',
    erros: {
      semPermissao: 'Sin permiso para la cámara. Permita la cámara para este sitio en la configuración del navegador.',
      semCamera: 'No pude abrir la cámara. Este navegador necesita HTTPS para usar la cámara.',
      videoParado: 'La cámara se abrió, pero el video no empezó. Toque Volver e intente de nuevo.',
    },
    encerrar: 'Terminar y revisar',
    marcar: 'Marcar de nuevo',
  },
  conferencia: {
    titulo: 'Revise lo que se leyó',
    instrucao: 'Compare con los parpadeos que vio en el tablero: ▬ es largo (decena), • es corto (unidad).',
    nada: 'Todavía no se leyó nada. Vuelva a leer y deje pasar la lista de códigos al menos una vez.',
    descartadas: {
      one: '{n} lectura descartada en el camino (cortada o fuera del patrón).',
      other: '{n} lecturas descartadas en el camino (cortadas o fuera del patrón).',
    },
    usar: 'usar este código',
    confirmar: 'Confirmar y ver las fallas',
    voltarALer: 'Volver a leer',
    defeitos: 'Fallas',
    situacao: {
      confirmado: { one: 'Confirmado: leído igual {n} vez.', other: 'Confirmado: leído igual {n} veces.' },
      visto: {
        one: 'Visto {n} vez. Verifique contando los parpadeos en el tablero.',
        other: 'Visto {n} veces, sin repetirse al ritmo de la lista. Verifique contando los parpadeos en el tablero.',
      },
      andamento: 'Incompleto: la lectura se detuvo en medio de este código.',
      cortado: 'Incompleto: la lectura empezó en medio de este código.',
      confuso: 'Incompleto: parpadeos fuera del patrón (reflejo o mano en movimiento).',
    },
  },
  piscas: {
    longo: 'largo',
    curto: 'corto',
    aberto: 'encendido al detenerse',
  },
  codigos: {
    1: {
      nome: 'Sensor de oxígeno (O2) primario (sonda lambda)',
      causa: 'Señal del sensor fuera de rango.',
      conferir: 'El sensor, su cableado y conector; presión de combustible; fuga en el escape antes del sensor.',
      nota: 'Calefaccionado en casi todos; en el D15B8 no lo es. En el D15Z1 (VX) es el sensor LAF (ver 48).',
    },
    3: {
      nome: 'Sensor MAP (presión del múltiple de admisión) — eléctrico',
      causa: 'Circuito del MAP abierto o en corto.',
      conferir: 'Conector y cableado del MAP, alimentación de 5 V, el propio sensor.',
    },
    4: {
      nome: 'Sensor de posición del cigüeñal (CKP), en el distribuidor',
      causa: 'Circuito abierto o en corto.',
      conferir: 'Conector y cableado del distribuidor; sensor dentro del distribuidor.',
    },
    5: {
      nome: 'Sensor MAP — mecánico',
      causa: 'El MAP no ve el vacío correcto.',
      conferir: 'Manguera del MAP suelta, rajada u obstruida; fuga de vacío en el múltiple de admisión.',
      nota: 'P1, P2 y MW: falla mecánica (vacío). P3 la describe como eléctrica.',
    },
    6: {
      nome: 'Sensor de temperatura del refrigerante (ECT)',
      causa: 'Circuito abierto o en corto.',
      conferir: 'Sensor en la culata/carcasa del termostato, conector y cableado.',
    },
    7: {
      nome: 'Sensor de posición de la mariposa (TPS)',
      causa: 'Circuito abierto o en corto.',
      conferir: 'Conector y cableado del TPS, su ajuste, el propio sensor.',
    },
    8: {
      nome: 'Sensor de punto muerto superior (TDC), en el distribuidor',
      causa: 'Circuito abierto o en corto.',
      conferir: 'Conector y cableado del distribuidor.',
    },
    9: {
      nome: 'Sensor de posición del cilindro n.º 1 (CYP), en el distribuidor',
      causa: 'Circuito abierto o en corto.',
      conferir: 'Conector y cableado del distribuidor.',
    },
    10: {
      nome: 'Sensor de temperatura del aire de admisión (IAT)',
      causa: 'Circuito abierto o en corto.',
      conferir: 'Sensor en la caja del filtro de aire o en el múltiple, conector y cableado.',
    },
    11: {
      nome: 'ECU (fuentes en desacuerdo)',
      causa: 'Las fuentes no coinciden: ECU o módulo de encendido.',
      conferir: 'Repita la lectura. Si vuelve, revise la alimentación y la tierra de la ECU.',
      nota: 'ETCG y DEP: ECU. Otra fuente: módulo de encendido. No está en las tablas del Civic 92–95.',
    },
    12: {
      nome: 'Sistema EGR (recirculación de gases de escape)',
      causa: 'El EGR no está actuando.',
      conferir: 'Solenoide del EGR, mangueras de vacío, sensor de posición de la válvula.',
      aplica: 'Solo motores con EGR',
      nota: 'P3 lo limita al D15Z1 (VX); P1 y MW no.',
    },
    13: {
      nome: 'Sensor de presión barométrica (BARO), dentro de la ECU',
      causa: 'Falla en el circuito del sensor.',
      conferir: 'El sensor está dentro de la ECU: normalmente es la propia ECU.',
    },
    14: {
      nome: 'Válvula de control de ralentí (IACV/EACV)',
      causa: 'Circuito abierto o en corto.',
      conferir: 'Conector y cableado de la válvula, alimentación, la propia válvula.',
    },
    15: {
      nome: 'Señal de salida del encendido',
      causa: 'La ECU no recibe la señal de retorno del encendido.',
      conferir: 'Ignitor/módulo de encendido en el distribuidor, cableado, alimentación de la bobina.',
    },
    16: {
      nome: 'Inyector',
      causa: 'Circuito de inyector abierto o en corto.',
      conferir: 'Conectores y cableado de los inyectores, alimentación, resistencia de inyectores (si tiene).',
    },
    17: {
      nome: 'Sensor de velocidad del vehículo (VSS)',
      causa: 'Circuito abierto o en corto.',
      conferir: 'Sensor en la transmisión, conector y cableado; ¿funciona el velocímetro?',
    },
    19: {
      nome: 'Solenoide de bloqueo del convertidor (transmisión automática)',
      causa: 'Circuito del solenoide abierto o en corto.',
      conferir: 'Conector y cableado del solenoide en la transmisión automática.',
      aplica: 'Solo transmisión automática',
    },
    20: {
      nome: 'Detector de carga eléctrica (ELD)',
      causa: 'Circuito del ELD (en la caja de fusibles del motor).',
      conferir: 'ELD en la caja de fusibles, conector y cableado.',
      nota: 'Este código no enciende la luz: solo queda guardado y aparece en el parpadeo.',
    },
    21: {
      nome: 'Solenoide del VTEC',
      causa: 'Circuito del solenoide abierto o en corto.',
      conferir: 'Conector y cableado del solenoide del VTEC en la culata.',
      aplica: 'Solo motores VTEC (p. ej., D16Z6, D15Z1, B16)',
    },
    22: {
      nome: 'Interruptor de presión de aceite del VTEC',
      causa: 'Presión de aceite del VTEC fuera de lo esperado o circuito del interruptor.',
      conferir: 'Nivel y presión del aceite, filtro de malla del solenoide del VTEC, conector del interruptor.',
      aplica: 'Solo motores VTEC',
    },
    23: {
      nome: 'Sensor de detonación',
      causa: 'Circuito del sensor de detonación.',
      conferir: 'Sensor en el bloque, conector y cableado.',
      aplica: 'Solo motores con sensor de detonación',
      nota: 'Ninguna tabla del Civic 92–95 trae el 23: probablemente no existe en estos motores.',
    },
    30: {
      nome: 'Señal A/T FI A (ECU ↔ computadora de la transmisión automática)',
      causa: 'Falla en la línea de señal entre la ECU y la computadora de la transmisión.',
      conferir: 'Cableado entre la ECU y la computadora de la transmisión automática.',
      aplica: 'Accord/Prelude con transmisión automática',
      nota: 'Parpadea en la luz Check Engine, no en la luz D4. No está en las tablas del Civic 92–95.',
    },
    31: {
      nome: 'Señal A/T FI B (ECU ↔ computadora de la transmisión automática)',
      causa: 'Falla en la línea de señal entre la ECU y la computadora de la transmisión.',
      conferir: 'Cableado entre la ECU y la computadora de la transmisión automática.',
      aplica: 'Accord/Prelude con transmisión automática',
      nota: 'Parpadea en la luz Check Engine, no en la luz D4. No está en las tablas del Civic 92–95.',
    },
    41: {
      nome: 'Calefactor del sensor de oxígeno',
      causa: 'Circuito del calefactor abierto o en corto.',
      conferir: 'Fusible y alimentación del calefactor, conector del sensor, el propio sensor.',
      aplica: 'Motores con sensor calefaccionado (el D15B8 no lo tiene)',
      nota: 'En el D15Z1 (VX) es el calefactor del sensor LAF.',
    },
    43: {
      nome: 'Sistema de combustible',
      causa: 'Mezcla en el límite de la corrección (demasiado pobre o rica).',
      conferir: 'Presión de combustible, bomba, filtro, inyectores, fuga de vacío, sensor de oxígeno.',
      nota: 'P1: no existe en el D15Z1. P3: excepto el D15B8 de California.',
    },
    45: {
      nome: 'Mezcla rica/pobre',
      causa: 'Corrección de combustible en el límite.',
      conferir: 'Presión de combustible, inyectores, fuga de vacío.',
      aplica: 'Probablemente Integra/Prelude',
      nota: 'Fuera de las tablas del Civic 92–95.',
    },
    48: {
      nome: 'Sensor LAF (sensor de oxígeno de banda ancha)',
      causa: 'Circuito o señal del LAF.',
      conferir: 'Sensor LAF, conector y cableado.',
      aplica: 'Solo D15Z1 (Civic VX)',
    },
    54: {
      nome: 'Fluctuación de la señal del cigüeñal (CKF)',
      causa: 'Señal de revoluciones inestable.',
      conferir: 'Sensor del cigüeñal y cableado.',
      aplica: 'Probablemente 95+ u otro modelo',
      nota: 'Fuera de las tablas del Civic 92–95.',
    },
    58: {
      nome: 'Sensor TDC n.º 2',
      causa: 'Circuito del segundo sensor TDC.',
      conferir: 'Sensor y cableado.',
      nota: 'Una sola fuente.',
    },
    61: {
      nome: 'Sensor de oxígeno delantero (respuesta lenta)',
      causa: 'Sensor lento.',
      conferir: 'Sensor de oxígeno delantero.',
      aplica: 'Autos con sensor después del catalizador (96+ u OBD1 de transición)',
      nota: 'No existe en el Civic 92–95.',
    },
    63: {
      nome: 'Sensor de oxígeno trasero',
      causa: 'Señal del sensor trasero.',
      conferir: 'Sensor de oxígeno después del catalizador.',
      aplica: 'Autos con sensor después del catalizador (96+ u OBD1 de transición)',
      nota: 'No existe en el Civic 92–95.',
    },
    65: {
      nome: 'Calefactor del sensor de oxígeno trasero',
      causa: 'Circuito del calefactor.',
      conferir: 'Sensor de oxígeno después del catalizador.',
      aplica: 'Autos con sensor después del catalizador (96+ u OBD1 de transición)',
      nota: 'No existe en el Civic 92–95.',
    },
    67: {
      nome: 'Eficiencia del catalizador',
      causa: 'Catalizador por debajo de lo esperado.',
      conferir: 'Catalizador y sensores de oxígeno.',
      aplica: 'Autos con sensor después del catalizador (96+ u OBD1 de transición)',
      nota: 'No existe en el Civic 92–95.',
    },
  },
  desconhecido: {
    nome: 'Código fuera de la tabla',
    causa: 'Lectura equivocada o falla de la ECU.',
    conferir: 'Repita la lectura. Si vuelve el mismo código, sospeche de la ECU.',
  },
  fontes: {
    P1: 'Portal Diagnostov — Civic EX 1992, autodiagnóstico',
    P2: 'Portal Diagnostov — Civic DX 1992, autodiagnóstico',
    P3: 'Portal Diagnostov — Civic EX 1994, autodiagnóstico',
    MW: 'MechanicWiki — Honda Civic OBD 1 codes reading tutorial',
    HB: 'HondaBook — Civic de 5.ª generación, procedimiento de autodiagnóstico',
    HBA: 'HondaBook — Accord 3, códigos de falla',
    ETCG: 'EricTheCarGuy — Honda OBD I codes',
    S2K: 's2000.club — ECU fault codes',
    DEP: "Danny's Engine Portal — Honda OBD1 codes",
    WM: 'Workshop-manuals.com — Civic 1.5 SOHC, ubicación del conector de datos',
    CEG: 'Foro civic-eg.com — SCS / conector de 2 pines',
  },
};
