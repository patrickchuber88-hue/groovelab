import fs from 'fs';
import path from 'path';

const SRC_DIR = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src';

const RGBA_REPLACEMENTS = [
  // iOS green
  { bad: /rgba?\(\s*48\s*,\s*209\s*,\s*88\s*,\s*([0-9.]+)\s*\)/gi, good: 'rgba(52, 168, 83, $1)' },
  
  // Emerald-200 (167, 243, 208)
  { bad: /rgb\(\s*167\s*,\s*243\s*,\s*208\s*\)/gi, good: 'rgb(230, 244, 234)' },
  { bad: /rgba\(\s*167\s*,\s*243\s*,\s*208\s*,\s*([0-9.]+)\s*\)/gi, good: 'rgba(52, 168, 83, $1)' },
  
  // Teal-700 (15, 118, 110)
  { bad: /rgba\(\s*15\s*,\s*118\s*,\s*110\s*,\s*([0-9.]+)\s*\)/gi, good: 'rgba(19, 115, 51, $1)' },
  
  // Old dark green (15, 89, 40)
  { bad: /rgba\(\s*15\s*,\s*89\s*,\s*40\s*,\s*([0-9.]+)\s*\)/gi, good: 'rgba(19, 115, 51, $1)' },
  
  // Mismatched green (197, 216, 207)
  { bad: /rgba\(\s*197\s*,\s*216\s*,\s*207\s*,\s*([0-9.]+)\s*\)/gi, good: 'rgba(230, 244, 234, $1)' },
  
  // Mismatched sage/green (69, 99, 85)
  { bad: /rgba\(\s*69\s*,\s*99\s*,\s*85\s*,\s*([0-9.]+)\s*\)/gi, good: 'rgba(19, 115, 51, $1)' },
  
  // Emerald-100 (209, 250, 229)
  { bad: /rgba\(\s*209\s*,\s*250\s*,\s*229\s*,\s*([0-9.]+)\s*\)/gi, good: 'rgba(230, 244, 234, $1)' },
  
  // Emerald-500 (16, 185, 129)
  { bad: /rgba\(\s*16\s*,\s*185\s*,\s*129\s*,\s*([0-9.]+)\s*\)/gi, good: 'rgba(52, 168, 83, $1)' },
  
  // Emerald-400 (52, 211, 153)
  { bad: /rgba\(\s*52\s*,\s*211\s*,\s*153\s*,\s*([0-9.]+)\s*\)/gi, good: 'rgba(52, 168, 83, $1)' },
  
  // Green-100 (220, 252, 231) -> Brand light green (230, 244, 234)
  { bad: /rgba\(\s*220\s*,\s*252\s*,\s*231\s*,\s*([0-9.]+)\s*\)/gi, good: 'rgba(230, 244, 234, $1)' },
  
  // Green-200 (187, 247, 208)
  { bad: /rgba\(\s*187\s*,\s*247\s*,\s*208\s*,\s*([0-9.]+)\s*\)/gi, good: 'rgba(230, 244, 234, $1)' }
];

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
let totalReplacements = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  let originalContent = content;

  for (const item of RGBA_REPLACEMENTS) {
    content = content.replace(item.bad, item.good);
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated explicit RGBA in: ${path.relative(SRC_DIR, file)}`);
    totalReplacements++;
  }
});

console.log(`Completed explicit RGBA replacements in ${totalReplacements} files.`);
