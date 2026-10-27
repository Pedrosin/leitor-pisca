// Códigos de pisca da luz da injeção, Honda OBD1 1992–1995 (foco: Civic 92–95).
// Fontes em FONTES (ids entre colchetes). "confirmado" = pelo menos 2 fontes independentes concordam.
// Sem o manual Helms original em mãos: a fonte mais próxima é a P (derivada de Mitchell, por motor).

export interface Fonte {
  id: string;
  titulo: string;
  url: string;
}

export const FONTES: Fonte[] = [
  { id: 'P1', titulo: 'Portal Diagnostov — Civic EX 1992, autodiagnóstico', url: 'https://portal-diagnostov.com/honda-civic-ex-1992-1992-engine-performance-self-diagnostics' },
  { id: 'P2', titulo: 'Portal Diagnostov — Civic DX 1992, autodiagnóstico', url: 'https://portal-diagnostov.com/honda-civic-dx-1992-1992-engine-performance-self-diagnostics' },
  { id: 'P3', titulo: 'Portal Diagnostov — Civic EX 1994, autodiagnóstico', url: 'https://portal-diagnostov.com/honda-civic-ex-1994-1994-engine-performance-self-diagnostics' },
  { id: 'MW', titulo: 'MechanicWiki — Honda Civic OBD 1 codes reading tutorial', url: 'https://www.mechanicwiki.com/2018/06/honda-civic-obd-1-codes-reading-tutorial.html' },
  { id: 'HB', titulo: 'HondaBook — Civic 5ª geração, procedimento de autodiagnóstico', url: 'https://www.hondabook.ru/en/Civic/5/power/injector-sohc/procedura-samodiagnostiki' },
  { id: 'HBA', titulo: 'HondaBook — Accord 3, códigos de falha', url: 'https://www.hondabook.ru/en/Accord/3/power/program/kody-neispravnostey' },
  { id: 'ETCG', titulo: 'EricTheCarGuy — Honda OBD I codes', url: 'https://ericthecarguy.com/honda-obd-i-codes' },
  { id: 'S2K', titulo: 's2000.club — ECU fault codes', url: 'https://www.s2000.club/ecufaultcodes.html' },
  { id: 'DEP', titulo: "Danny's Engine Portal — Honda OBD1 codes", url: 'https://dannysengineportal.com/honda-obd1-codes/' },
  { id: 'WM', titulo: 'Workshop-manuals.com — Civic 1.5 SOHC, localização do conector de dados', url: 'https://workshop-manuals.com/honda/civic/l4-1493cc_1.5l_sohc_(16_valve)/powertrain_management/computers_and_control_systems/data_link_connector/component_information/locations/' },
  { id: 'CEG', titulo: 'Fórum civic-eg.com — SCS / conector de 2 pinos', url: 'https://forum.civic-eg.com/viewtopic.php?p=256146' },
];

export type Situacao = 'confirmado' | 'nao-confirmado' | 'outro-modelo';

export interface Codigo {
  codigo: number;
  nome: string;
  causa: string;
  conferir: string;
  /** Em que motor/versão existe. Vazio = todos os 92–95. */
  aplica?: string;
  situacao: Situacao;
  /** Diferença entre fontes ou ressalva. */
  nota?: string;
  fontes: string[];
}

export const CODIGOS: Codigo[] = [
  {
    codigo: 1,
    nome: 'Sonda lambda (O2) primária',
    causa: 'Sinal da sonda fora da faixa.',
    conferir: 'Sonda, chicote e conector dela; pressão de combustível; vazamento no escapamento antes da sonda.',
    nota: 'Aquecida em quase todos; no D15B8 não é aquecida. No D15Z1 (VX) é sensor LAF (ver 48).',
    situacao: 'confirmado',
    fontes: ['P1', 'P3', 'MW'],
  },
  {
    codigo: 3,
    nome: 'Sensor MAP (pressão do coletor) — elétrico',
    causa: 'Circuito do MAP aberto ou em curto.',
    conferir: 'Conector e chicote do MAP, alimentação de 5 V, o próprio sensor.',
    situacao: 'confirmado',
    fontes: ['P1', 'P3', 'MW'],
  },
  {
    codigo: 4,
    nome: 'Sensor de rotação (CKP), no distribuidor',
    causa: 'Circuito aberto ou em curto.',
    conferir: 'Conector do distribuidor e chicote; sensor dentro do distribuidor.',
    situacao: 'confirmado',
    fontes: ['P1', 'P3', 'MW'],
  },
  {
    codigo: 5,
    nome: 'Sensor MAP — mecânico',
    causa: 'O MAP não vê o vácuo certo.',
    conferir: 'Mangueira do MAP solta, rachada ou entupida; vazamento de vácuo no coletor.',
    nota: 'P1, P2 e MW: falha mecânica (vácuo). P3 descreve como elétrica.',
    situacao: 'confirmado',
    fontes: ['P1', 'P2', 'MW'],
  },
  {
    codigo: 6,
    nome: 'Sensor de temperatura do motor (ECT)',
    causa: 'Circuito aberto ou em curto.',
    conferir: 'Sensor no cabeçote/carcaça da válvula termostática, conector e chicote.',
    situacao: 'confirmado',
    fontes: ['P1', 'P3', 'MW'],
  },
  {
    codigo: 7,
    nome: 'Sensor de posição da borboleta (TPS)',
    causa: 'Circuito aberto ou em curto.',
    conferir: 'Conector e chicote do TPS, ajuste dele, o próprio sensor.',
    situacao: 'confirmado',
    fontes: ['P1', 'P3', 'MW'],
  },
  {
    codigo: 8,
    nome: 'Sensor de ponto morto superior (TDC), no distribuidor',
    causa: 'Circuito aberto ou em curto.',
    conferir: 'Conector do distribuidor e chicote.',
    situacao: 'confirmado',
    fontes: ['P1', 'P3', 'MW'],
  },
  {
    codigo: 9,
    nome: 'Sensor de cilindro nº 1 (CYP), no distribuidor',
    causa: 'Circuito aberto ou em curto.',
    conferir: 'Conector do distribuidor e chicote.',
    situacao: 'confirmado',
    fontes: ['P1', 'P3', 'MW'],
  },
  {
    codigo: 10,
    nome: 'Sensor de temperatura do ar (IAT)',
    causa: 'Circuito aberto ou em curto.',
    conferir: 'Sensor na caixa do filtro ou no coletor, conector e chicote.',
    situacao: 'confirmado',
    fontes: ['P1', 'P3', 'MW'],
  },
  {
    codigo: 11,
    nome: 'ECU (divergente)',
    causa: 'As fontes discordam: ECU ou módulo de ignição.',
    conferir: 'Repita a leitura. Se voltar, confira alimentação e terra da ECU.',
    situacao: 'nao-confirmado',
    nota: 'ETCG e DEP: ECU. Outra fonte: módulo de ignição. Não está nas tabelas de Civic 92–95.',
    fontes: ['ETCG', 'DEP'],
  },
  {
    codigo: 12,
    nome: 'Sistema EGR (recirculação de gases)',
    causa: 'O EGR não está agindo.',
    conferir: 'Solenoide do EGR, mangueiras de vácuo, sensor de posição da válvula.',
    aplica: 'Só motor com EGR',
    nota: 'P3 restringe ao D15Z1 (VX); P1 e MW não restringem.',
    situacao: 'confirmado',
    fontes: ['P1', 'MW'],
  },
  {
    codigo: 13,
    nome: 'Sensor de pressão atmosférica (BARO), dentro da ECU',
    causa: 'Falha no circuito do sensor.',
    conferir: 'O sensor fica dentro da ECU: normalmente é a própria ECU.',
    situacao: 'confirmado',
    fontes: ['P1', 'P3', 'ETCG'],
  },
  {
    codigo: 14,
    nome: 'Válvula de marcha lenta (IACV/EACV)',
    causa: 'Circuito aberto ou em curto.',
    conferir: 'Conector e chicote da válvula, alimentação, a própria válvula.',
    situacao: 'confirmado',
    fontes: ['P1', 'P3', 'MW'],
  },
  {
    codigo: 15,
    nome: 'Sinal de saída da ignição',
    causa: 'A ECU não vê o retorno da ignição.',
    conferir: 'Ignitor/módulo de ignição no distribuidor, chicote, alimentação da bobina.',
    situacao: 'confirmado',
    fontes: ['P1', 'P3', 'MW'],
  },
  {
    codigo: 16,
    nome: 'Injetor',
    causa: 'Circuito de injetor aberto ou em curto.',
    conferir: 'Conectores e chicote dos injetores, alimentação, resistor de injetor (se houver).',
    situacao: 'confirmado',
    fontes: ['P1', 'P3', 'MW'],
  },
  {
    codigo: 17,
    nome: 'Sensor de velocidade (VSS)',
    causa: 'Circuito aberto ou em curto.',
    conferir: 'Sensor no câmbio, conector e chicote; velocímetro funciona?',
    situacao: 'confirmado',
    fontes: ['P1', 'P3', 'MW'],
  },
  {
    codigo: 19,
    nome: 'Solenoide de lock-up (câmbio automático)',
    causa: 'Circuito do solenoide aberto ou em curto.',
    conferir: 'Conector e chicote do solenoide no câmbio automático.',
    aplica: 'Só câmbio automático',
    situacao: 'confirmado',
    fontes: ['P1', 'P2', 'P3', 'MW'],
  },
  {
    codigo: 20,
    nome: 'Detector de carga elétrica (ELD)',
    causa: 'Circuito do ELD (na caixa de fusíveis do motor).',
    conferir: 'ELD na caixa de fusíveis, conector e chicote.',
    nota: 'Este código não acende a luz com o motor rodando: só fica gravado e aparece no pisca.',
    situacao: 'confirmado',
    fontes: ['P1', 'P3', 'HB'],
  },
  {
    codigo: 21,
    nome: 'Solenoide do VTEC',
    causa: 'Circuito do solenoide aberto ou em curto.',
    conferir: 'Conector e chicote do solenoide do VTEC no cabeçote.',
    aplica: 'Só motor VTEC (ex.: D16Z6, D15Z1, B16)',
    situacao: 'confirmado',
    fontes: ['P2', 'P3', 'MW'],
  },
  {
    codigo: 22,
    nome: 'Pressostato de óleo do VTEC',
    causa: 'Pressão de óleo do VTEC fora do esperado ou circuito do pressostato.',
    conferir: 'Nível e pressão do óleo, filtro de tela do solenoide do VTEC, conector do pressostato.',
    aplica: 'Só motor VTEC',
    situacao: 'confirmado',
    fontes: ['P2', 'MW'],
  },
  {
    codigo: 23,
    nome: 'Sensor de detonação',
    causa: 'Circuito do sensor de detonação.',
    conferir: 'Sensor no bloco, conector e chicote.',
    aplica: 'Só motor com sensor de detonação',
    nota: 'Nenhuma tabela de Civic 92–95 traz o 23: provavelmente não existe nesses motores.',
    situacao: 'nao-confirmado',
    fontes: ['ETCG', 'S2K', 'DEP', 'MW'],
  },
  {
    codigo: 30,
    nome: 'Sinal A/T FI A (ECU ↔ central do câmbio automático)',
    causa: 'Falha na linha de sinal entre a ECU e a central do câmbio.',
    conferir: 'Chicote entre a ECU e a central do câmbio automático.',
    aplica: 'Accord/Prelude com câmbio automático',
    nota: 'Pisca na luz da injeção, não na luz D4. Não aparece nas tabelas de Civic 92–95.',
    situacao: 'outro-modelo',
    fontes: ['HBA', 'S2K', 'ETCG'],
  },
  {
    codigo: 31,
    nome: 'Sinal A/T FI B (ECU ↔ central do câmbio automático)',
    causa: 'Falha na linha de sinal entre a ECU e a central do câmbio.',
    conferir: 'Chicote entre a ECU e a central do câmbio automático.',
    aplica: 'Accord/Prelude com câmbio automático',
    nota: 'Pisca na luz da injeção, não na luz D4. Não aparece nas tabelas de Civic 92–95.',
    situacao: 'outro-modelo',
    fontes: ['HBA', 'S2K', 'ETCG'],
  },
  {
    codigo: 41,
    nome: 'Aquecedor da sonda',
    causa: 'Circuito do aquecedor aberto ou em curto.',
    conferir: 'Fusível e alimentação do aquecedor, conector da sonda, a própria sonda.',
    aplica: 'Motores com sonda aquecida (não existe no D15B8)',
    nota: 'No D15Z1 (VX) é o aquecedor do sensor LAF.',
    situacao: 'confirmado',
    fontes: ['P1', 'P2', 'P3'],
  },
  {
    codigo: 43,
    nome: 'Sistema de combustível',
    causa: 'Mistura no limite da correção (pobre ou rica demais).',
    conferir: 'Pressão de combustível, bomba, filtro, injetores, vazamento de vácuo, sonda.',
    nota: 'P1: não existe no D15Z1. P3: exceto D15B8 da Califórnia.',
    situacao: 'confirmado',
    fontes: ['P1', 'P3', 'MW'],
  },
  {
    codigo: 45,
    nome: 'Mistura rica/pobre',
    causa: 'Correção de combustível no limite.',
    conferir: 'Pressão de combustível, injetores, vazamento de vácuo.',
    aplica: 'Provavelmente Integra/Prelude',
    nota: 'Fora das tabelas de Civic 92–95.',
    situacao: 'nao-confirmado',
    fontes: ['ETCG', 'S2K'],
  },
  {
    codigo: 48,
    nome: 'Sensor LAF (sonda de banda larga)',
    causa: 'Circuito ou sinal do LAF.',
    conferir: 'Sensor LAF, conector e chicote.',
    aplica: 'Só D15Z1 (Civic VX)',
    situacao: 'confirmado',
    fontes: ['P1', 'P2', 'P3'],
  },
  {
    codigo: 54,
    nome: 'Flutuação do sinal de rotação (CKF)',
    causa: 'Sinal de rotação instável.',
    conferir: 'Sensor de rotação e chicote.',
    aplica: 'Provavelmente 95+ ou outro modelo',
    nota: 'Fora das tabelas de Civic 92–95.',
    situacao: 'nao-confirmado',
    fontes: ['S2K', 'MW'],
  },
  {
    codigo: 58,
    nome: 'Sensor TDC nº 2',
    causa: 'Circuito do segundo sensor TDC.',
    conferir: 'Sensor e chicote.',
    nota: 'Uma fonte só.',
    situacao: 'nao-confirmado',
    fontes: ['S2K'],
  },
  {
    codigo: 61,
    nome: 'Sonda O2 dianteira (resposta lenta)',
    causa: 'Sonda lenta.',
    conferir: 'Sonda dianteira.',
    aplica: 'Carros com sonda pós-catalisador (96+ ou OBD1 de transição)',
    nota: 'Não existe no Civic 92–95.',
    situacao: 'outro-modelo',
    fontes: ['ETCG', 'S2K', 'DEP'],
  },
  {
    codigo: 63,
    nome: 'Sonda O2 traseira',
    causa: 'Sinal da sonda traseira.',
    conferir: 'Sonda pós-catalisador.',
    aplica: 'Carros com sonda pós-catalisador (96+ ou OBD1 de transição)',
    nota: 'Não existe no Civic 92–95.',
    situacao: 'outro-modelo',
    fontes: ['ETCG', 'S2K', 'DEP'],
  },
  {
    codigo: 65,
    nome: 'Aquecedor da sonda O2 traseira',
    causa: 'Circuito do aquecedor.',
    conferir: 'Sonda pós-catalisador.',
    aplica: 'Carros com sonda pós-catalisador (96+ ou OBD1 de transição)',
    nota: 'Não existe no Civic 92–95.',
    situacao: 'outro-modelo',
    fontes: ['ETCG', 'S2K', 'DEP'],
  },
  {
    codigo: 67,
    nome: 'Eficiência do catalisador',
    causa: 'Catalisador abaixo do esperado.',
    conferir: 'Catalisador e sondas.',
    aplica: 'Carros com sonda pós-catalisador (96+ ou OBD1 de transição)',
    nota: 'Não existe no Civic 92–95.',
    situacao: 'outro-modelo',
    fontes: ['ETCG', 'S2K', 'DEP'],
  },
];

/** Código que não está na tabela: a orientação das fontes é repetir e, se voltar, suspeitar da ECU. */
export const DESCONHECIDO: Omit<Codigo, 'codigo'> = {
  nome: 'Código fora da tabela',
  causa: 'Leitura errada ou falha da ECU.',
  conferir: 'Repita a leitura. Se o mesmo código voltar, a suspeita é a ECU.',
  situacao: 'nao-confirmado',
  fontes: ['P1', 'P3', 'MW', 'HBA'],
};

export function buscarCodigo(codigo: number): Codigo {
  return CODIGOS.find((c) => c.codigo === codigo) ?? { codigo, ...DESCONHECIDO };
}
