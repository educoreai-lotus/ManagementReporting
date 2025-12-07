import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Force rebuild: 2025-01-13 02:16:00
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setupTests.js',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.config.js',
        '**/dist/**'
      ],
    },
  },
  build: { 
    outDir: 'dist',
    // Force new build hash
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  base: '/'
});
