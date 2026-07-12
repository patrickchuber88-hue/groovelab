import fs from 'fs';
import path from 'path';

const SRC_DIR = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src';

// Targets to identify and replace:
// 1. Hex codes for non-brand greens.
// 2. RGBA/RGB patterns that represent other greens.
// We want to map:
// - #10b981, #059669, #047857, #065f46, #064e3b, #34d399, #6ee7b7, #a7f3d0, #d1fae5, #ecfdf5 (Emerald palette)
// - #22c55e, #16a34a, #15803d, #166534, #14532d, #4ade80, #86efac, #bbf7d0, #dcfce7, #f0fdf4 (Green palette)
// - #14b8a6, #0d9488, #0f766e (Teal / other greens)
// - #2e7d32, #1b8035, #249d3d, etc. (Other forest/mid greens)
// - Any rgba/rgb matching these components.

const BRAND_PRIMARY = '#34a853';
const BRAND_DARK = '#137333';

const MISMATCHED_HEXES = {
  // Emerald
  '#10b981': BRAND_PRIMARY,
  '#059669': BRAND_DARK,
  '#047857': BRAND_DARK,
  '#065f46': BRAND_DARK,
  '#064e3b': BRAND_DARK,
  '#34d399': BRAND_PRIMARY,
  '#6ee7b7': '#d1fae5', // light tint
  '#a7f3d0': '#d1fae5', // light tint
  '#d1fae5': '#e6f4ea', // brand light bg
  '#ecfdf5': '#e6f4ea', // brand light bg
  
  // Tailwind Green
  '#22c55e': BRAND_PRIMARY,
  '#16a34a': BRAND_PRIMARY,
  '#15803d': BRAND_DARK,
  '#166534': BRAND_DARK,
  '#14532d': BRAND_DARK,
  '#4ade80': BRAND_PRIMARY,
  '#86efac': '#d1fae5',
  '#bbf7d0': '#e6f4ea',
  '#dcfce7': '#e6f4ea',
  '#f0fdf4': '#e6f4ea',
  
  // Teal
  '#14b8a6': BRAND_PRIMARY,
  '#0d9488': BRAND_DARK,
  '#0f766e': BRAND_DARK,
  
  // Other greens
  '#2e7d32': BRAND_DARK,
  '#1b8035': BRAND_DARK,
  '#249d3d': BRAND_PRIMARY,
  '#178a44': BRAND_DARK,
  '#118a44': BRAND_DARK
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== 'scratch') {
        results = results.concat(walk(fullPath));
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk(SRC_DIR);
const report = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    // Check hex
    for (const [badHex, replacement] of Object.entries(MISMATCHED_HEXES)) {
      if (line.toLowerCase().includes(badHex)) {
        report.push({
          file,
          lineNum: index + 1,
          type: 'hex',
          found: badHex,
          replacement,
          content: line.trim()
        });
      }
    }

    // Check rgba / rgb of bad greens
    // Let's find rgba with R, G, B values.
    // e.g. rgba(16, 185, 129, ...) -> emerald 500
    // e.g. rgba(34, 197, 94, ...) -> green 500
    // e.g. rgba(22, 163, 74, ...) -> green 600
    // e.g. rgba(21, 128, 61, ...) / rgba(15, 128, 61, ...) -> green 700 / 15803d
    // e.g. rgba(4, 120, 87, ...) -> emerald 700
    // e.g. rgba(17, 138, 68, ...) -> 118a44 / active accent
    const rgbaMatches = line.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[0-9.]+\s*)?\)/gi);
    if (rgbaMatches) {
      rgbaMatches.forEach(match => {
        const parts = match.match(/\d+/g);
        if (parts) {
          const r = parseInt(parts[0], 10);
          const g = parseInt(parts[1], 10);
          const b = parseInt(parts[2], 10);
          const alpha = parts[3] ? parseFloat(parts[3] + (parts[4] ? '.' + parts[4] : '')) : 1.0;
          
          // Check if it's one of the bad greens (e.g. green/emerald) but not the brand ones.
          // Brand primary (52, 168, 83)
          // Brand dark (19, 115, 51)
          const isBrandPrimary = (r === 52 && g === 168 && b === 83);
          const isBrandDark = (r === 19 && g === 115 && b === 51);
          
          if (!isBrandPrimary && !isBrandDark) {
            // Is it a green/emerald?
            if ((g > r && g > b && g > 80) || (g > 100 && r < 180 && b < 180)) {
              // Recommend replacement
              // If it's a lighter tint, use brand primary with alpha or brand light
              let rep = `rgba(52, 168, 83, ${alpha})`;
              if (g > 140 && r < 100) {
                rep = `rgba(52, 168, 83, ${alpha})`;
              } else if (g <= 140 && g > 80) {
                rep = `rgba(19, 115, 51, ${alpha})`;
              }
              report.push({
                file,
                lineNum: index + 1,
                type: 'rgba',
                found: match,
                replacement: rep,
                content: line.trim()
              });
            }
          }
        }
      });
    }
  });
});

fs.writeFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/mismatched_greens_report.json', JSON.stringify(report, null, 2));
console.log(`Found ${report.length} mismatches.`);
