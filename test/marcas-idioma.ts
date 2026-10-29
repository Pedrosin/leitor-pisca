// Marcas de texto que NÃO deveriam aparecer numa tela de cada idioma (sobra de outro idioma). Usadas no
// teste dos dicionários e no E2E (checarIdioma). Palavras em minúscula, sem flag i: siglas e rótulos em
// caixa alta que valem para todos (CHECK ENGINE, BACK UP (RADIO), PGM-FI) não disparam.
// Os títulos das fontes ficam de fora (nome de site/página no idioma original).

/** Palavra inteira com letras Unicode (o \b do JS só entende ASCII: "você" escaparia). */
const palavras = (lista: string) => String.raw`(?<!\p{L})(?:${lista})(?!\p{L})`;

export const MARCAS_ESTRANGEIRAS: Record<string, string> = {
  // Inglês: nenhuma letra fora do ASCII, nem palavra típica de pt/es.
  en: String.raw`(?![A-Za-z])\p{L}|` + palavras('não|você|leitura|ignição|toque|lectura|usted|parpadeo|encendido|luz'),
  // Espanhol: nada típico do português nem do inglês.
  es: String.raw`[ãõç]|` + palavras('não|você|leitura|ignição|é|the|and|reading|tap|light'),
  // Português: nada típico do espanhol nem do inglês.
  'pt-BR': String.raw`ñ|` + palavras('the|and|reading|tap|light|lectura|usted|parpadeo|encendido|cámara|vehículo'),
};

export function marcaEstrangeira(idioma: string, texto: string): string | null {
  const m = new RegExp(MARCAS_ESTRANGEIRAS[idioma] ?? '$^', 'u').exec(texto);
  return m ? m[0] : null;
}
