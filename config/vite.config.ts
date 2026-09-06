import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const variablesPath = path.resolve(import.meta.dirname, '../src/styles/variables').replace(/\\/g, '/');

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "${variablesPath}" as v;\n`,
      },
    },
  },
});