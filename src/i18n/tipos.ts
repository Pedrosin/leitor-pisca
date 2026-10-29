// Tipos do dicionário. O pt-BR é a fonte: os outros idiomas têm exatamente as mesmas chaves (faltando ou
// sobrando quebra o typecheck) e os mesmos {marcadores} (conferido no teste).

import type { ptBR } from './pt-BR';

/** Texto com plural por categoria do Intl.PluralRules (pt/en/es usam one/other; outros idiomas, mais). */
export interface Plural {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/** Marca um texto com plural no pt-BR, para o tipo aceitar as categorias de qualquer idioma. */
export function plural(p: Plural): Plural {
  return p;
}

type Folhas<T> = T extends string ? string : T extends Plural ? Plural : { [K in keyof T]: Folhas<T[K]> };

export type Dicionario = Folhas<typeof ptBR>;
