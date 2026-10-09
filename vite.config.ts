import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: false,
  // Backend .env sets NODE_ENV=development; it must not affect production JSX.
  envDir: false,
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'public/auth',
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('./frontend/main.tsx', import.meta.url)),
      formats: ['es'],
      fileName: () => 'auth.js',
      cssFileName: 'auth',
    },
  },
});
