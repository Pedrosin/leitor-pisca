// Códigos de pisca da luz da injeção, Honda OBD1 1992–1995 (foco: Civic 92–95).
// Aqui fica a estrutura (número, situação, fontes); os textos (nome, causa, o que conferir, onde existe,
// observação e título de cada fonte) ficam no dicionário de cada idioma (src/i18n), chave = número.
// "confirmado" = pelo menos 2 fontes independentes concordam. Sem o manual Helms original em mãos: a
// fonte mais próxima é a P (derivada de Mitchell, por motor).

import { t } from '../i18n';

export type IdFonte = keyof ReturnType<typeof t>['fontes'];

export interface Fonte {
  id: IdFonte;
  titulo: string;
  url: string;
}

const URLS: Record<IdFonte, string> = {
  P1: 'https://portal-diagnostov.com/honda-civic-ex-1992-1992-engine-performance-self-diagnostics',
  P2: 'https://portal-diagnostov.com/honda-civic-dx-1992-1992-engine-performance-self-diagnostics',
  P3: 'https://portal-diagnostov.com/honda-civic-ex-1994-1994-engine-performance-self-diagnostics',
  MW: 'https://www.mechanicwiki.com/2018/06/honda-civic-obd-1-codes-reading-tutorial.html',
  HB: 'https://www.hondabook.ru/en/Civic/5/power/injector-sohc/procedura-samodiagnostiki',
  HBA: 'https://www.hondabook.ru/en/Accord/3/power/program/kody-neispravnostey',
  ETCG: 'https://ericthecarguy.com/honda-obd-i-codes',
  S2K: 'https://www.s2000.club/ecufaultcodes.html',
  DEP: 'https://dannysengineportal.com/honda-obd1-codes/',
  WM: 'https://workshop-manuals.com/honda/civic/l4-1493cc_1.5l_sohc_(16_valve)/powertrain_management/computers_and_control_systems/data_link_connector/component_information/locations/',
  CEG: 'https://forum.civic-eg.com/viewtopic.php?p=256146',
};

/** Fontes com o título no idioma atual. */
export function fontes(): Fonte[] {
  const titulos = t().fontes;
  return (Object.keys(URLS) as IdFonte[]).map((id) => ({ id, titulo: titulos[id], url: URLS[id] }));
}

export type Situacao = 'confirmado' | 'nao-confirmado' | 'outro-modelo';

export type NumeroCodigo = keyof ReturnType<typeof t>['codigos'];

interface Estrutura {
  codigo: NumeroCodigo;
  situacao: Situacao;
  fontes: IdFonte[];
}

const ESTRUTURA: Estrutura[] = [
  { codigo: 1, situacao: 'confirmado', fontes: ['P1', 'P3', 'MW'] },
  { codigo: 3, situacao: 'confirmado', fontes: ['P1', 'P3', 'MW'] },
  { codigo: 4, situacao: 'confirmado', fontes: ['P1', 'P3', 'MW'] },
  { codigo: 5, situacao: 'confirmado', fontes: ['P1', 'P2', 'MW'] },
  { codigo: 6, situacao: 'confirmado', fontes: ['P1', 'P3', 'MW'] },
  { codigo: 7, situacao: 'confirmado', fontes: ['P1', 'P3', 'MW'] },
  { codigo: 8, situacao: 'confirmado', fontes: ['P1', 'P3', 'MW'] },
  { codigo: 9, situacao: 'confirmado', fontes: ['P1', 'P3', 'MW'] },
  { codigo: 10, situacao: 'confirmado', fontes: ['P1', 'P3', 'MW'] },
  { codigo: 11, situacao: 'nao-confirmado', fontes: ['ETCG', 'DEP'] },
  { codigo: 12, situacao: 'confirmado', fontes: ['P1', 'MW'] },
  { codigo: 13, situacao: 'confirmado', fontes: ['P1', 'P3', 'ETCG'] },
  { codigo: 14, situacao: 'confirmado', fontes: ['P1', 'P3', 'MW'] },
  { codigo: 15, situacao: 'confirmado', fontes: ['P1', 'P3', 'MW'] },
  { codigo: 16, situacao: 'confirmado', fontes: ['P1', 'P3', 'MW'] },
  { codigo: 17, situacao: 'confirmado', fontes: ['P1', 'P3', 'MW'] },
  { codigo: 19, situacao: 'confirmado', fontes: ['P1', 'P2', 'P3', 'MW'] },
  { codigo: 20, situacao: 'confirmado', fontes: ['P1', 'P3', 'HB'] },
  { codigo: 21, situacao: 'confirmado', fontes: ['P2', 'P3', 'MW'] },
  { codigo: 22, situacao: 'confirmado', fontes: ['P2', 'MW'] },
  { codigo: 23, situacao: 'nao-confirmado', fontes: ['ETCG', 'S2K', 'DEP', 'MW'] },
  { codigo: 30, situacao: 'outro-modelo', fontes: ['HBA', 'S2K', 'ETCG'] },
  { codigo: 31, situacao: 'outro-modelo', fontes: ['HBA', 'S2K', 'ETCG'] },
  { codigo: 41, situacao: 'confirmado', fontes: ['P1', 'P2', 'P3'] },
  { codigo: 43, situacao: 'confirmado', fontes: ['P1', 'P3', 'MW'] },
  { codigo: 45, situacao: 'nao-confirmado', fontes: ['ETCG', 'S2K'] },
  { codigo: 48, situacao: 'confirmado', fontes: ['P1', 'P2', 'P3'] },
  { codigo: 54, situacao: 'nao-confirmado', fontes: ['S2K', 'MW'] },
  { codigo: 58, situacao: 'nao-confirmado', fontes: ['S2K'] },
  { codigo: 61, situacao: 'outro-modelo', fontes: ['ETCG', 'S2K', 'DEP'] },
  { codigo: 63, situacao: 'outro-modelo', fontes: ['ETCG', 'S2K', 'DEP'] },
  { codigo: 65, situacao: 'outro-modelo', fontes: ['ETCG', 'S2K', 'DEP'] },
  { codigo: 67, situacao: 'outro-modelo', fontes: ['ETCG', 'S2K', 'DEP'] },
];

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
  fontes: IdFonte[];
}

/** Números da tabela, em ordem. */
export const NUMEROS: readonly number[] = ESTRUTURA.map((e) => e.codigo);

function comTexto(e: Estrutura): Codigo {
  const texto: { nome: string; causa: string; conferir: string; aplica?: string; nota?: string } = t().codigos[e.codigo];
  return { ...e, ...texto };
}

/** A tabela inteira no idioma atual. */
export function codigos(): Codigo[] {
  return ESTRUTURA.map(comTexto);
}

/** Código que não está na tabela: a orientação das fontes é repetir e, se voltar, suspeitar da ECU. */
export function desconhecido(codigo: number): Codigo {
  return { codigo, ...t().desconhecido, situacao: 'nao-confirmado', fontes: ['P1', 'P3', 'MW', 'HBA'] };
}

export function buscarCodigo(codigo: number): Codigo {
  const e = ESTRUTURA.find((x) => x.codigo === codigo);
  return e ? comTexto(e) : desconhecido(codigo);
}
