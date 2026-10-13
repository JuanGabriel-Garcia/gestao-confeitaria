import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Encaminha as chamadas /api para o backend (Express)
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:3001',
    },
  },
});
