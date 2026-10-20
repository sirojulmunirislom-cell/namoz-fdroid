import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const endpoint = 'https://namoz.namoz-prayer-bcaf08.workers.dev';
export default defineConfig(({ command }) => ({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL ?? (command === 'serve' ? '' : endpoint)),
    'import.meta.env.VITE_BUNDLED_CONTENT': JSON.stringify('1'),
    'import.meta.env.VITE_ADHKAR_PREVIEW': JSON.stringify('0'),
  },
  server: {
    watch: { ignored: ['**/android/**'] },
    proxy: { '/api': { target: endpoint, changeOrigin: true }, '/media': { target: endpoint, changeOrigin: true } },
  },
  build: { target: 'chrome111', chunkSizeWarningLimit: 750 },
}));
