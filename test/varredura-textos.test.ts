// Varredura mecânica: nenhum texto de interface escrito direto no código das telas. Lê a AST do
// TypeScript de src/app e src/codigos e acusa todo literal de string que parece texto para pessoa
// (tem letra acentuada, ou duas palavras com espaço, ou é uma palavra com maiúscula inicial), fora dos
// contextos técnicos (nome de atributo, classe, testid, tag, tipo, comparação de estado) e de uma lista
// curta de exceções com motivo. Os dicionários (src/i18n/<idioma>.ts) são o único lugar de texto.

import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const RAIZ = join(import.meta.dirname, '..');
/** Todo .ts/.tsx de uma pasta, com subpastas. */
function codigoDe(pasta: string): string[] {
  return readdirSync(join(RAIZ, pasta), { recursive: true, encoding: 'utf-8' })
    .map((f) => f.replace(/\\/g, '/'))
    .filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.d.ts'))
    .map((f) => `${pasta}/${f}`);
}

const ARQUIVOS = [...codigoDe('src/app'), ...codigoDe('src/codigos'), 'src/i18n/index.ts'];

/** Exceções que são texto mas não se traduzem, cada uma com o motivo. */
const EXCECOES: Record<string, string> = {
  Português: 'nome do idioma no próprio idioma (endônimo), para quem caiu no idioma errado achar o seu',
  English: 'endônimo',
  Español: 'endônimo',
  Enter: 'nome de tecla (KeyboardEvent.key)',
  NotAllowedError: 'nome de erro do navegador',
};

/** Atributos cujo valor é técnico (não é lido pela pessoa). */
const ATRIBUTOS_TECNICOS = new Set([
  'class',
  'data-testid',
  'data-codigo',
  'data-situacao',
  'data-tela',
  'type',
  'inputmode',
  'pattern',
  'maxlength',
  'autocomplete',
  'enterkeyhint',
  'id',
  'for',
  'role',
  'rel',
  'target',
  'href',
  'lang',
  'hidden',
  'aria-hidden',
  'aria-live',
  'aria-describedby',
  'aria-pressed',
  'playsinline',
  'muted',
  'autoplay',
]);

/** Chamadas cujo argumento de texto é técnico. */
const CHAMADAS_TECNICAS = new Set([
  'createElement',
  'querySelector',
  'querySelectorAll',
  'getElementById',
  'getContext',
  'addEventListener',
  'removeEventListener',
  'matchMedia',
  'toggle',
  'add',
  'remove',
  'contains',
  'getItem',
  'setItem',
  'register',
  'request',
  'startsWith',
  'split',
  'replace',
  'join',
]);

// Letra fora do ASCII (acento, ç, ñ…); símbolo como × ou ▬ não conta.
const pareceTexto = (s: string) =>
  /(?![A-Za-z])\p{L}/u.test(s) || /\p{L}{2,}\s+\p{L}{2,}/u.test(s) || /^\p{Lu}\p{Ll}{2,}[.!?…]?$/u.test(s.trim());

function contextoTecnico(no: ts.Node): boolean {
  const pai = no.parent;
  if (!pai) return false;
  // Ramo de ternário: vale o contexto do ternário inteiro (ex.: classe escolhida por condição).
  if (ts.isConditionalExpression(pai) && pai.condition !== no) return contextoTecnico(pai);
  if (ts.isImportDeclaration(pai) || ts.isExportDeclaration(pai) || ts.isLiteralTypeNode(pai)) return true;
  // Chave de objeto ou valor de atributo técnico: { class: '...', 'data-testid': '...' }.
  if (ts.isPropertyAssignment(pai)) {
    if (pai.name === no) return true;
    const nome = pai.name.getText().replace(/^['"]|['"]$/g, '');
    if (ATRIBUTOS_TECNICOS.has(nome)) return true;
  }
  // Comparação de estado: x === 'aceso'.
  if (ts.isBinaryExpression(pai) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(pai.operatorToken.kind)) {
    return true;
  }
  if (ts.isCaseClause(pai)) return true;
  if (ts.isCallExpression(pai)) {
    const alvo = pai.expression;
    const nome = ts.isPropertyAccessExpression(alvo) ? alvo.name.text : ts.isIdentifier(alvo) ? alvo.text : '';
    if (CHAMADAS_TECNICAS.has(nome)) return true;
    // h('tag', ...): o primeiro argumento é a tag; setAttribute('nome', valor): o nome é técnico, e o
    // valor também quando o atributo é técnico.
    if (nome === 'h' && pai.arguments[0] === no) return true;
    if (nome === 'setAttribute') {
      const atributo = pai.arguments[0];
      if (atributo === no) return true;
      if (atributo && ts.isStringLiteral(atributo) && ATRIBUTOS_TECNICOS.has(atributo.text)) return true;
    }
    // botao(texto, ação, classe): a classe é técnica.
    if (nome === 'botao' && pai.arguments[2] === no) return true;
  }
  return false;
}

describe('varredura de textos fixos', () => {
  test.each(ARQUIVOS)('%s não tem texto de interface fora do dicionário', (arquivo) => {
    const fonte = ts.createSourceFile(arquivo, readFileSync(join(RAIZ, arquivo), 'utf-8'), ts.ScriptTarget.ES2022, true);
    const achados: string[] = [];
    const visitar = (no: ts.Node) => {
      const textos: string[] = [];
      if (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no)) textos.push(no.text);
      if (ts.isJsxText(no)) textos.push(no.text);
      if (ts.isTemplateExpression(no)) {
        textos.push(no.head.text, ...no.templateSpans.map((s) => s.literal.text));
      }
      for (const texto of textos) {
        if (!texto.trim() || !pareceTexto(texto) || EXCECOES[texto.trim()] || contextoTecnico(no)) continue;
        const { line } = fonte.getLineAndCharacterOfPosition(no.getStart());
        achados.push(`${arquivo}:${line + 1} "${texto}"`);
      }
      ts.forEachChild(no, visitar);
    };
    visitar(fonte);
    expect(achados).toEqual([]);
  });

  // O index.html aparece antes do JS rodar: título e descrição neutros (nome do app instalado e inglês,
  // o idioma do resto do mundo), trocados no início por main.ts. Nada mais de texto pode morar lá.
  test('index.html só tem o título e a descrição neutros', () => {
    const html = readFileSync(join(RAIZ, 'index.html'), 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
    const permitidos = ['OBD1 Blink', 'Reads the Check Engine light blink codes of 1992–1995 OBD1 Hondas through the camera.'];
    const textos = [
      ...[...html.matchAll(/>([^<>]+)</g)].map((m) => (m[1] as string).trim()),
      ...[...html.matchAll(/\b(?:content|alt|title|aria-label|placeholder)="([^"]*)"/g)].map((m) => m[1] as string),
    ].filter((x) => pareceTexto(x));
    expect(textos.filter((x) => !permitidos.includes(x))).toEqual([]);
  });

  test('a varredura pega texto fixo (controle: ela não é cega)', () => {
    const fonte = ts.createSourceFile('x.ts', "botao('Ler os códigos', ir, 'primario'); definirStatus(`Zoom ${n}×. Toque na luz.`);", ts.ScriptTarget.ES2022, true);
    const pegos: string[] = [];
    const visitar = (no: ts.Node) => {
      const textos: string[] = [];
      if (ts.isStringLiteral(no)) textos.push(no.text);
      if (ts.isTemplateExpression(no)) textos.push(no.head.text, ...no.templateSpans.map((s) => s.literal.text));
      for (const t of textos) if (pareceTexto(t) && !contextoTecnico(no)) pegos.push(t);
      ts.forEachChild(no, visitar);
    };
    visitar(fonte);
    // O texto do botão e as duas partes do template; a classe 'primario' não.
    expect(pegos).toEqual(['Ler os códigos', 'Zoom ', '×. Toque na luz.']);
  });
});
