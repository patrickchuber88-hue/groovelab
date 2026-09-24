import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

function swCacheBusterPlugin() {
  return {
    name: 'sw-cache-buster',
    closeBundle() {
      const distSwPath = path.resolve(__dirname, './dist/sw.js');
      const publicSwPath = path.resolve(__dirname, './public/sw.js');
      const now = Date.now();
      const newVersion = `groovelab-static-v${now}`;
      const newDynamicVersion = `groovelab-dynamic-v${now}`;

      if (fs.existsSync(distSwPath)) {
        let content = fs.readFileSync(distSwPath, 'utf-8');
        content = content.replace(/const CACHE_NAME = ['"][^'"]+['"];/, `const CACHE_NAME = '${newVersion}';`);
        content = content.replace(/const DYNAMIC_CACHE = ['"][^'"]+['"];/, `const DYNAMIC_CACHE = '${newDynamicVersion}';`);
        fs.writeFileSync(distSwPath, content, 'utf-8');
        console.log(`\n[SW Cache Buster] Automatically injected dynamic cache version: ${newVersion} into dist/sw.js\n`);
      }

      if (fs.existsSync(publicSwPath)) {
        let pContent = fs.readFileSync(publicSwPath, 'utf-8');
        pContent = pContent.replace(/const CACHE_NAME = ['"][^'"]+['"];/, `const CACHE_NAME = '${newVersion}';`);
        pContent = pContent.replace(/const DYNAMIC_CACHE = ['"][^'"]+['"];/, `const DYNAMIC_CACHE = '${newDynamicVersion}';`);
        fs.writeFileSync(publicSwPath, pContent, 'utf-8');
        console.log(`[SW Cache Buster] Synchronized cache version into public/sw.js\n`);
      }

      const distVersionPath = path.resolve(__dirname, './dist/version.json');
      try {
        fs.writeFileSync(distVersionPath, JSON.stringify({ version: newVersion, timestamp: now }), 'utf-8');
        console.log(`[SW Cache Buster] Generated dist/version.json with version ${newVersion}\n`);
      } catch (err) {
        console.warn('[SW Cache Buster] Could not write dist/version.json:', err);
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
    watch: {
      // Ignoriere Build-Output und temporäre Verzeichnisse, damit Dev-Server bei Hintergrund-Builds nicht einfriert
      ignored: ['**/dist/**', '**/.git/**', '**/coverage/**', '**/*.log', '**/.system_generated/**']
    }
  },
  build: {
    sourcemap: false, // Strict block on production source maps
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
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
            dep.includes('schedule-') ||
            dep.includes('campus-events') ||
            dep.includes('audio-loopstation') ||
            dep.includes('billing-dashboard') ||
            dep.includes('vendor-confetti') ||
            dep.includes('vendor-charts') ||
            dep.includes('vendor-jspdf') ||
            dep.includes('vendor-canvas') ||
            dep.includes('vendor-qr') ||
            dep.includes('StudentAvatarDashboard') ||
            dep.includes('student-') ||
            dep.includes('campus-app-modals') ||
            dep.includes('student-groovelab-tabs') ||
            dep.includes('campus-profile-views') ||
            dep.includes('campus-messages-suite') ||
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
          // Shared domain and calculation utilities (prevents cycles between master-admin, billing, and secretary)
          if (id.includes('domain/pricingEngine') || id.includes('domain/schoolMetricsAggregator') || id.includes('domain/schoolDunningEngine') || id.includes('domain/billingCalculator') || id.includes('context/MasterPricingContext')) {
            return 'domain-pricing-suite';
          }
          // Shared identity, user name formatting and badge helpers (prevents cycles between admin, secretary, and master-admin)
          if (id.includes('utils/userDisplayName') || id.includes('utils/nameHelper') || id.includes('utils/adminColorHelpers') || id.includes('utils/instruments') || id.includes('constants/instruments')) {
            return 'shared-identity-utils';
          }
          // Shared avatar, musician and instrument resolution engine (prevents pulling heavy teacher-suite into entry bundle)
          if (id.includes('components/StudioAvatar') || id.includes('utils/avatarResolutionEngine')) {
            return 'shared-avatar-suite';
          }
          // Shared gamification, stickers and student audio tresor domain (eliminates cyclic TDZ dependency between teacher & meisterwerk)
          if (id.includes('domain/stickersAndTresor')) {
            return 'shared-stickers-tresor';
          }
          if (id.includes('components/IDBadgeCard')) {
            return 'id-badge-card';
          }
          if (id.includes('CampusEventsBoard')) {
            return 'campus-events-suite';
          }
          if (id.includes('Schedule15StageSolverEngine')) {
            return 'schedule-solver-engine';
          }
          if (id.includes('ScheduleBoardMobile')) {
            return 'schedule-designer-mobile';
          }
          if (id.includes('ScheduleBoardDesktop')) {
            return 'schedule-designer-desktop';
          }
          if (id.includes('ScheduleCalendarViewDesktop')) {
            return 'schedule-calendar-desktop';
          }
          if (id.includes('ScheduleCalendarView')) {
            return 'schedule-calendar-mobile';
          }
          if (id.includes('ScheduleBoard')) {
            return 'schedule-designer-core';
          }
          if (id.includes('BillingDashboard')) {
            return 'billing-dashboard-suite';
          }
          if (id.includes('SchoolDetailDrawer')) {
            return 'master-admin-school-drawer';
          }
          if (id.includes('ReconciliationTab')) {
            return 'master-admin-reconciliation';
          }
          if (id.includes('MasterAdminDashboard') || id.includes('masterAdmin/')) {
            return 'master-admin-core';
          }
          if (id.includes('AdminCampusRoomsView')) {
            return 'admin-campus-rooms';
          }
          if (id.includes('components/admin/')) {
            return 'admin-subviews';
          }
          if (id.includes('AdminDashboard')) {
            return 'admin-core-suite';
          }
          if (id.includes('SecretaryLicensesView')) {
            return 'secretary-licenses-view';
          }
          if (id.includes('SecretaryRoomsView')) {
            return 'secretary-rooms-view';
          }
          if (id.includes('SecretaryAuditView')) {
            return 'secretary-audit-view';
          }
          if (id.includes('SecretaryBriefingView')) {
            return 'secretary-briefing-view';
          }
          if (id.includes('SecretaryBillingModalsHub')) {
            return 'secretary-billing-modals';
          }
          if (id.includes('secretary/Secretary') || id.includes('SecretaryAnnouncementsView') || id.includes('SecretaryDutiesView') || id.includes('SecretaryCrisisView') || id.includes('SecretaryEquipmentView') || id.includes('SecretarySetupView') || id.includes('SecretaryEmployeesView') || id.includes('SecretaryStudentsView')) {
            return 'secretary-subviews';
          }
          if (id.includes('SecretaryDashboard')) {
            return 'secretary-suite';
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
          if (id.includes('MeisterwerkDocumentTab')) {
            return 'meisterwerk-document-tab';
          }
          if (id.includes('MeisterwerkDocumentationModal')) {
            return 'meisterwerk-suite';
          }
          if (id.includes('GrooveLoopstation')) {
            return 'audio-loopstation';
          }
          if (id.includes('CampusAppModalsHub') || id.includes('components/modals/')) {
            return 'campus-app-modals-hub';
          }
          if (id.includes('StudentPracticeRepertoireTabs') || id.includes('StudentBandMatchingSuite') || id.includes('StudentLibraryTab') || id.includes('StudentTeamTab')) {
            return 'student-groovelab-tabs';
          }
          if (id.includes('CampusStaffProfileView') || id.includes('GrooveLabProfileView')) {
            return 'campus-profile-views';
          }
          if (id.includes('MessagesTabContainer') || id.includes('components/messages/')) {
            return 'campus-messages-suite';
          }
        }
      }
    }
  },
  esbuild: {
    drop: ['console', 'debugger'], // Remove console logs and debugger statements in production to prevent info leak
  }
})


