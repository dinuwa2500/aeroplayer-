import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Important for Electron and Tauri relative asset loading
  server: {
    port: 5173,
    host: true
  }
});
