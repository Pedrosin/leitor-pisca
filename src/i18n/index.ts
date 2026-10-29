// Idioma da interface. Um idioma novo custa um arquivo: o dicionário (tipado a partir do pt-BR) e uma
// linha em IDIOMAS. As telas só leem t() e não sabem quantos idiomas existem.

import { ptBR } from './pt-BR';
import { en } from './en';
import { es } from './es';
import type { Dicionario, Plural } from './tipos';

export type { Dicionario, Plural } from './tipos';

export const IDIOMAS = {
  'pt-BR': { nome: 'Português', dicionario: ptBR },
  en: { nome: 'English', dicionario: en },
  es: { nome: 'Español', dicionario: es },
} satisfies Record<string, { nome: string; dicionario: Dicionario }>;

export type Idioma = keyof typeof IDIOMAS;

/** Fora dos idiomas que existem, o resto do mundo lê em inglês. */
export const IDIOMA_PADRAO: Idioma = 'en';
const CHAVE_SALVA = 'leitor-pisca.idioma';

let atual: Idioma = IDIOMA_PADRAO;

export function ehIdioma(x: unknown): x is Idioma {
  return typeof x === 'string' && Object.prototype.hasOwnProperty.call(IDIOMAS, x);
}

/** Primeiro idioma da lista do navegador que o app tem (pt-* → pt-BR, es-* → es, en-* → en). */
export function detectar(preferidos: readonly string[]): Idioma {
  for (const p of preferidos) {
    const base = p.toLowerCase().split('-')[0];
    if (base === 'pt') return 'pt-BR';
    if (base && base !== 'pt' && ehIdioma(base)) return base;
  }
  return IDIOMA_PADRAO;
}

/** Escolha salva (vale sobre o navegador) ou detecção. localStorage pode faltar (aba privada, bloqueio). */
export function idiomaInicial(preferidos: readonly string[]): Idioma {
  try {
    const salvo = localStorage.getItem(CHAVE_SALVA);
    if (ehIdioma(salvo)) return salvo;
  } catch {
    // sem armazenamento: segue pela detecção
  }
  return detectar(preferidos);
}

export function idioma(): Idioma {
  return atual;
}

/** Troca o idioma; `salvar` guarda a escolha manual para os próximos acessos. */
export function definirIdioma(novo: Idioma, salvar = false): void {
  atual = novo;
  if (!salvar) return;
  try {
    localStorage.setItem(CHAVE_SALVA, novo);
  } catch {
    // sem armazenamento: vale só nesta visita
  }
}

export function t(): Dicionario {
  return IDIOMAS[atual].dicionario;
}

/** Troca {nome} pelo valor. Marcador sem valor fica como está (o teste pega antes). */
export function fmt(modelo: string, valores: Record<string, string | number> = {}): string {
  return modelo.replace(/\{(\w+)\}/g, (inteiro, chave: string) =>
    Object.prototype.hasOwnProperty.call(valores, chave) ? String(valores[chave]) : inteiro,
  );
}

/** Plural pela regra do idioma atual (Intl.PluralRules), com {n} e outros marcadores. */
export function plural(p: Plural, n: number, valores: Record<string, string | number> = {}): string {
  const categoria = new Intl.PluralRules(atual).select(n) as keyof Plural;
  // n por último: um `n` em `valores` não pode trocar o número que escolheu a forma do plural.
  return fmt(p[categoria] ?? p.other, { ...valores, n });
}
