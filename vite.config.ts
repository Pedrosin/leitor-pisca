import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// base relativa: o mesmo build serve em / (preview local) e em /<repo>/ (GitHub Pages).
// --mode https liga certificado autoassinado: celular na rede local só libera câmera em HTTPS.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'https' ? [basicSsl()] : [],
  build: { target: 'es2020' },
  preview: { port: 4173, strictPort: true },
  test: { testTimeout: 60000 },
}));
