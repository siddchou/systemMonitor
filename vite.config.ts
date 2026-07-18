import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    origin: 'http://localhost:5173',
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      input: {
        main: 'src/index.html',
      },
    },
  },
});
