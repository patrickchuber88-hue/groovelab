import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

function swCacheBusterPlugin() {
  return {
    name: 'sw-cache-buster',
    closeBundle() {
      const distSwPath = path.resolve(__dirname, './dist/sw.js');
      if (fs.existsSync(distSwPath)) {
        let content = fs.readFileSync(distSwPath, 'utf-8');
        const newVersion = `groovelab-static-v${Date.now()}`;
        content = content.replace(/const CACHE_NAME = ['"][^'"]+['"];/, `const CACHE_NAME = '${newVersion}';`);
        fs.writeFileSync(distSwPath, content, 'utf-8');
        console.log(`\n[SW Cache Buster] Automatically injected dynamic cache version: ${newVersion} into dist/sw.js\n`);
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), swCacheBusterPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@groovelab/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    host: true, // Listen on all network addresses (0.0.0.0, 127.0.0.1, localhost)
    port: 5173,
    strictPort: true,
    cors: true,
    // Alle URL-Pfade (wie /qr/:token) auf index.html fallbacken — SPA-Routing
    historyApiFallback: true,
    watch: {
      // Ignoriere Build-Output und temporäre Verzeichnisse, damit Dev-Server bei Hintergrund-Builds nicht einfriert
      ignored: ['**/dist/**', '**/.git/**', '**/coverage/**', '**/*.log', '**/.system_generated/**']
    }
  },
  build: {
    sourcemap: false, // Strict block on production source maps
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/') || id.includes('react-use')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('html2canvas') || id.includes('jspdf') || id.includes('purify') || id.includes('html-to-image')) return 'vendor-pdf';
            if (id.includes('jsqr') || id.includes('jsQR') || id.includes('qrcode') || id.includes('react-qr-scanner')) return 'vendor-qr';
          }
          if (id.includes('ScheduleBoard') || id.includes('ScheduleCalendarView')) {
            return 'schedule-designer-suite';
          }
          if (id.includes('MasterAdminDashboard') || id.includes('masterAdmin/') || id.includes('AdminDashboard') || id.includes('BillingDashboard')) {
            return 'admin-master-suite';
          }
          if (id.includes('SecretaryDashboard')) {
            return 'secretary-suite';
          }
          if (id.includes('TeacherDashboard') || id.includes('CampusTeacherDashboard')) {
            return 'teacher-suite';
          }
          if (id.includes('MeisterwerkDocumentationModal')) {
            return 'meisterwerk-suite';
          }
        }
      }
    }
  },
  esbuild: {
    drop: ['console', 'debugger'], // Remove console logs and debugger statements in production to prevent info leak
  }
})


