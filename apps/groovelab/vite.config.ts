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
    chunkSizeWarningLimit: 800,
    modulePreload: {
      resolveDependencies: (_filename, deps) => {
        // High-performance filter: Do not eagerly preload heavy dashboards on initial boot
        return deps.filter(dep => {
          const isHeavyChunk = 
            dep.includes('master-') ||
            dep.includes('teacher') ||
            dep.includes('admin-') ||
            dep.includes('secretary') ||
            dep.includes('meisterwerk') ||
            dep.includes('schedule-designer') ||
            dep.includes('campus-events') ||
            dep.includes('audio-loopstation') ||
            dep.includes('vendor-charts') ||
            dep.includes('vendor-jspdf') ||
            dep.includes('vendor-canvas') ||
            dep.includes('vendor-qr') ||
            dep.includes('StudentAvatarDashboard') ||
            dep.includes('student-') ||
            dep.includes('Startseite2') ||
            dep.includes('Startseite');
          return !isHeavyChunk;
        });
      }
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/') || id.includes('react-use')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'vendor-charts';
            if (id.includes('jspdf')) return 'vendor-jspdf';
            if (id.includes('html2canvas') || id.includes('html-to-image')) return 'vendor-canvas';
            if (id.includes('purify') || id.includes('dompurify')) return 'vendor-sanitizer';
            if (id.includes('confetti') || id.includes('canvas-confetti')) return 'vendor-confetti';
            if (id.includes('jsqr') || id.includes('jsQR') || id.includes('qrcode') || id.includes('react-qr-scanner') || id.includes('react-qr-code')) return 'vendor-qr';
          }
          if (id.includes('CampusEventsBoard')) {
            return 'campus-events-suite';
          }
          if (id.includes('ScheduleBoard') || id.includes('ScheduleCalendarView')) {
            return 'schedule-designer-suite';
          }
          if (id.includes('BillingDashboard')) {
            return 'billing-dashboard-suite';
          }
          if (id.includes('SchoolDetailDrawer') || id.includes('MasterAdminDashboard') || id.includes('masterAdmin/')) {
            return 'master-admin-core';
          }
          if (id.includes('components/admin/')) {
            return 'admin-subviews';
          }
          if (id.includes('AdminDashboard')) {
            return 'admin-core-suite';
          }
          if (id.includes('secretary/Secretary') || id.includes('SecretaryDutiesView') || id.includes('SecretaryCrisisView') || id.includes('SecretaryAuditView') || id.includes('SecretaryEquipmentView') || id.includes('SecretaryRoomsView') || id.includes('SecretaryLicensesView') || id.includes('SecretarySetupView')) {
            return 'secretary-subviews';
          }
          if (id.includes('SecretaryDashboard')) {
            return 'secretary-suite';
          }
          if (id.includes('CampusTeacherDashboard')) {
            return 'teacher-campus-suite';
          }
          if (id.includes('components/teacher/')) {
            return 'teacher-subviews';
          }
          if (id.includes('TeacherDashboard')) {
            return 'teacher-suite';
          }
          if (id.includes('StudentBriefingTab')) {
            return 'student-briefing-tab';
          }
          if (id.includes('StudentSettingsTab')) {
            return 'student-settings-tab';
          }
          if (id.includes('StudentPracticeTab')) {
            return 'student-practice-tab';
          }
          if (id.includes('StudentCampusCupTab') || id.includes('StudentSongsTab') || id.includes('StudentProfileTab')) {
            return 'student-secondary-tabs';
          }
          if (id.includes('MeisterwerkStickerAlbumTab') || id.includes('MeisterwerkSkillRadarTab') || id.includes('MeisterwerkAudioPlayers')) {
            return 'meisterwerk-subviews';
          }
          if (id.includes('MeisterwerkDocumentationModal')) {
            return 'meisterwerk-suite';
          }
          if (id.includes('GrooveLoopstation')) {
            return 'audio-loopstation';
          }
        }
      }
    }
  },
  esbuild: {
    drop: ['console', 'debugger'], // Remove console logs and debugger statements in production to prevent info leak
  }
})


