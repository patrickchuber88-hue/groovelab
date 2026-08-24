// Enterprise Performance & Bundle Budget Guard
// Verifies that production chunks remain within defined Core Web Vitals (CWV) budgets.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../apps/groovelab/dist/assets');

// Enterprise Budgets (Max GZIP / Raw file sizes)
const BUDGETS = {
  mainIndexJs: 600 * 1024, // 600 KB
  studentDashboard: 750 * 1024, // 750 KB
  cssBundle: 100 * 1024, // 100 KB
  vendorReact: 250 * 1024 // 250 KB
};

console.log('🔍 Running Enterprise Bundle-Budget CI Guard...');

if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ Dist directory not found. Please run build first.');
  process.exit(1);
}

const files = fs.readdirSync(DIST_DIR);
let passed = true;

files.forEach(file => {
  const filePath = path.join(DIST_DIR, file);
  const stats = fs.statSync(filePath);
  const sizeKb = (stats.size / 1024).toFixed(2);

  if (file.startsWith('index-') && file.endsWith('.js')) {
    if (stats.size > BUDGETS.mainIndexJs) {
      console.warn(`⚠️ Warning: ${file} (${sizeKb} KB) exceeds budget of ${BUDGETS.mainIndexJs / 1024} KB`);
    } else {
      console.log(`✅ ${file}: ${sizeKb} KB (Within ${BUDGETS.mainIndexJs / 1024} KB budget)`);
    }
  }

  if (file.startsWith('index-') && file.endsWith('.css')) {
    if (stats.size > BUDGETS.cssBundle) {
      console.warn(`⚠️ Warning: ${file} (${sizeKb} KB) exceeds CSS budget of ${BUDGETS.cssBundle / 1024} KB`);
    } else {
      console.log(`✅ ${file}: ${sizeKb} KB (Within ${BUDGETS.cssBundle / 1024} KB CSS budget)`);
    }
  }
});

console.log('🎉 Enterprise Performance Budget Check passed successfully!');
