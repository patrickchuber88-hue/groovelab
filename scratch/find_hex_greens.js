import fs from 'fs';
import path from 'path';

const SRC_DIR = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src';

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
const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
const rgbRegex = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[0-9.]+\s*)?\)/g;

const foundColors = {};

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  while ((match = hexRegex.exec(content)) !== null) {
    const hex = match[0].toLowerCase();
    if (!foundColors[hex]) foundColors[hex] = [];
    if (!foundColors[hex].includes(file)) {
      foundColors[hex].push(file);
    }
  }
  while ((match = rgbRegex.exec(content)) !== null) {
    const rgb = match[0].toLowerCase().replace(/\s+/g, '');
    if (!foundColors[rgb]) foundColors[rgb] = [];
    if (!foundColors[rgb].includes(file)) {
      foundColors[rgb].push(file);
    }
  }
});

// Helper to determine if a color is "greenish"
function isGreenish(color) {
  if (color.startsWith('#')) {
    let r, g, b;
    const hex = color.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else {
      return false;
    }
    // Simple heuristic: Green component is high and higher than red/blue, or matches known green hexes
    return (g > r && g > b && g > 80) || (g > 100 && r < 180 && b < 180);
  } else if (color.startsWith('rgb')) {
    const parts = color.match(/\d+/g);
    if (parts) {
      const r = parseInt(parts[0], 10);
      const g = parseInt(parts[1], 10);
      const b = parseInt(parts[2], 10);
      return (g > r && g > b && g > 80) || (g > 100 && r < 180 && b < 180);
    }
  }
  return false;
}

const greenColors = {};
for (const [color, files] of Object.entries(foundColors)) {
  if (isGreenish(color)) {
    greenColors[color] = files;
  }
}

fs.writeFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/greens_found.json', JSON.stringify(greenColors, null, 2));
console.log("Done");
