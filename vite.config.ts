import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

/** Versão do build: commit (no GitHub Actions vem do GITHUB_SHA) + hora, para o celular mostrar qual tem. */
function versao(): string {
  let commit = process.env.GITHUB_SHA?.slice(0, 7);
  if (!commit) {
    try {
      commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      commit = 'local';
    }
  }
  const hora = new Date().toISOString().slice(0, 16).replace('T', ' ');
  return `${commit} ${hora}`;
}

const VERSAO = versao();

/** Gera dist/sw.js a partir de src/sw/sw.js com a versão deste build (cache novo a cada publicação). */
function serviceWorker(): Plugin {
  return {
    name: 'service-worker-versionado',
    apply: 'build',
    generateBundle() {
      const fonte = readFileSync('src/sw/sw.js', 'utf-8').replace('__VERSAO__', VERSAO.replace(/[^\w.-]+/g, '-'));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: fonte });
    },
  };
}

// base relativa: o mesmo build serve em / (preview local) e em /<repo>/ (GitHub Pages).
// --mode https liga certificado autoassinado: celular na rede local só libera câmera em HTTPS.
export default defineConfig(({ mode }) => ({
  base: './',
  define: { __VERSAO__: JSON.stringify(VERSAO) },
  plugins: [serviceWorker(), ...(mode === 'https' ? [basicSsl()] : [])],
  build: { target: 'es2020' },
  preview: { port: 4173, strictPort: true },
  test: { testTimeout: 60000 },
}));
