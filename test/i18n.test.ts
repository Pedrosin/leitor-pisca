// Dicionários: todo idioma tem as mesmas chaves do pt-BR, os 33 códigos, nenhum texto vazio e os mesmos
// {marcadores}; detecção de idioma e plural pelo Intl.PluralRules.

import { describe, test, expect, beforeEach } from 'vitest';
import { afterEach, vi } from 'vitest';
import { IDIOMAS, detectar, definirIdioma, fmt, idiomaInicial, plural, t, type Dicionario, type Idioma } from '../src/i18n';
import { marcaEstrangeira } from './marcas-idioma';
import { NUMEROS, buscarCodigo, codigos, fontes } from '../src/codigos/tabela';

type No = string | { [k: string]: No };

/** Caminho → texto (plural vira caminho.categoria). */
function folhas(d: No, prefixo = ''): Map<string, string> {
  const m = new Map<string, string>();
  if (typeof d === 'string') {
    m.set(prefixo, d);
    return m;
  }
  for (const [k, v] of Object.entries(d)) for (const [c, s] of folhas(v as No, prefixo ? `${prefixo}.${k}` : k)) m.set(c, s);
  return m;
}

const marcadores = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
/** Caminho sem a categoria de plural (one/other/...), para comparar marcadores entre idiomas. */
const semCategoria = (c: string) => c.replace(/\.(zero|one|two|few|many|other)$/, '');

const ids = Object.keys(IDIOMAS) as Idioma[];
const base = folhas(IDIOMAS['pt-BR'].dicionario as unknown as No);

describe.each(ids)('dicionário %s', (id) => {
  const dic = IDIOMAS[id].dicionario as unknown as No;
  const f = folhas(dic);
  const chavesBase = new Set([...base.keys()].map(semCategoria));
  const chaves = new Set([...f.keys()].map(semCategoria));

  test('mesmas chaves do pt-BR (fora categorias de plural)', () => {
    expect([...chaves].filter((c) => !chavesBase.has(c))).toEqual([]);
    expect([...chavesBase].filter((c) => !chaves.has(c))).toEqual([]);
  });

  test('nenhum texto vazio', () => {
    expect([...f.entries()].filter(([, s]) => !s.trim()).map(([c]) => c)).toEqual([]);
  });

  test('mesmos {marcadores} do pt-BR em cada texto', () => {
    const porChaveBase = new Map<string, string>();
    for (const [c, s] of base) porChaveBase.set(semCategoria(c), marcadores(s));
    const errados = [...f.entries()].filter(([c, s]) => marcadores(s) !== porChaveBase.get(semCategoria(c)));
    expect(errados.map(([c, s]) => `${c}: "${s}"`)).toEqual([]);
  });

  test('os 33 códigos da tabela, com nome, causa e o que conferir', () => {
    const d = IDIOMAS[id].dicionario as Dicionario;
    expect(NUMEROS).toHaveLength(33);
    for (const n of NUMEROS) {
      const c = d.codigos[n as keyof Dicionario['codigos']] as { nome: string; causa: string; conferir: string };
      expect(c, `código ${n}`).toBeDefined();
      expect(c.nome.trim() && c.causa.trim() && c.conferir.trim(), `código ${n}`).toBeTruthy();
    }
  });

  test('cada texto está no próprio idioma (sem marca de outro; títulos de fontes ficam de fora)', () => {
    const fora = [...f.entries()]
      .filter(([c]) => !c.startsWith('fontes.'))
      .map(([c, s]) => [c, marcaEstrangeira(id, s)] as const)
      .filter(([, m]) => m);
    expect(fora.map(([c, m]) => `${c}: "${m}"`)).toEqual([]);
  });

  test('tabela, fontes e código desconhecido saem no idioma', () => {
    definirIdioma(id);
    expect(codigos()).toHaveLength(33);
    expect(fontes().every((x) => x.titulo.length > 0 && x.url.startsWith('https://'))).toBe(true);
    expect(buscarCodigo(99).nome).toBe((IDIOMAS[id].dicionario as Dicionario).desconhecido.nome);
  });
});

describe('aviso do airbag', () => {
  // Segurança: os três idiomas falam dos conectores AMARELOS e do airbag/SRS, em caixa alta onde importa.
  test.each([
    ['pt-BR', /AMARELOS/, /airbag \(SRS\)/],
    ['en', /YELLOW/, /airbag system \(SRS\)/],
    ['es', /AMARILLOS/, /airbag, SRS/],
  ] as const)('%s', (id, cor, sistema) => {
    const p = (IDIOMAS[id].dicionario as Dicionario).preparar;
    expect(p.avisoForte).toMatch(cor);
    expect(p.avisoTexto).toMatch(sistema);
  });
});

describe('detecção do idioma', () => {
  test.each([
    [['pt-BR'], 'pt-BR'],
    [['pt-PT', 'en'], 'pt-BR'],
    [['es-MX'], 'es'],
    [['es-ES', 'pt-BR'], 'es'],
    [['en-GB'], 'en'],
    [['en-AU'], 'en'],
    [['fr-FR'], 'en'],
    [['ja-JP', 'th-TH'], 'en'],
    [['fr-FR', 'es-AR'], 'es'],
    [['es-419'], 'es'],
    [['zh-CN', 'pt-BR'], 'pt-BR'],
    [['zh-CN'], 'en'],
    [[], 'en'],
  ] as const)('%j → %s', (prefs, esperado) => {
    expect(detectar(prefs)).toBe(esperado);
  });
});

describe('escolha salva', () => {
  afterEach(() => vi.unstubAllGlobals());
  test('escolha salva vale sobre o navegador', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'es', setItem: () => undefined });
    expect(idiomaInicial(['en-US'])).toBe('es');
  });
  test('valor salvo inválido cai na detecção', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'klingon', setItem: () => undefined });
    expect(idiomaInicial(['pt-BR'])).toBe('pt-BR');
  });
  test('localStorage que lança erro (aba privada, bloqueio) cai na detecção e salvar não quebra', () => {
    const erro = () => {
      throw new Error('SecurityError');
    };
    vi.stubGlobal('localStorage', { getItem: erro, setItem: erro });
    expect(idiomaInicial(['es-MX'])).toBe('es');
    expect(() => definirIdioma('en', true)).not.toThrow();
  });
});

describe('plural e marcadores', () => {
  beforeEach(() => definirIdioma('pt-BR'));
  test('pt-BR: 1 leitura descartada / 2 leituras descartadas', () => {
    expect(plural(t().conferencia.descartadas, 1)).toBe('1 leitura descartada no caminho (cortada ou fora do padrão).');
    expect(plural(t().conferencia.descartadas, 2)).toBe('2 leituras descartadas no caminho (cortadas ou fora do padrão).');
  });
  test('en e es seguem a regra do próprio idioma', () => {
    definirIdioma('en');
    expect(plural(t().conferencia.descartadas, 1)).toMatch(/^1 reading discarded/);
    expect(plural(t().conferencia.descartadas, 3)).toMatch(/^3 readings discarded/);
    definirIdioma('es');
    expect(plural(t().conferencia.descartadas, 1)).toMatch(/^1 lectura descartada/);
    expect(plural(t().conferencia.descartadas, 3)).toMatch(/^3 lecturas descartadas/);
  });
  test('o n de valores não troca o número que escolheu a forma do plural', () => {
    expect(plural({ one: '{n} item', other: '{n} itens' }, 1, { n: 5 })).toBe('1 item');
  });
  test('fmt troca marcador e deixa o que falta', () => {
    expect(fmt('{a} e {b}', { a: 1 })).toBe('1 e {b}');
  });
});
