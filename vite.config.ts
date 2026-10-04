import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// URL publique du site (même variable que le sitemap). Vide = QR code désactivé : on n'invente jamais de domaine.
const siteUrl = (process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? '').replace(/\/$/, '');

export default defineConfig({
  plugins: [react()],
  define: { __SITE_URL__: JSON.stringify(siteUrl) },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // 1 300 : react-pdf (≈1,2 Mo) est volontairement isolé et chargé uniquement au clic sur « Télécharger le CV ».
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'data-vendor': ['@supabase/supabase-js', '@tanstack/react-query'],
          'form-vendor': ['react-hook-form', 'zod', '@hookform/resolvers'],
          'i18n-vendor': ['i18next', 'react-i18next'],
        },
      },
    },
  },
});
