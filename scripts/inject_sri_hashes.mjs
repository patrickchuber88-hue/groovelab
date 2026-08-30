import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const candidate1 = path.resolve('dist');
const candidate2 = path.resolve('apps/groovelab/dist');
const DIST_DIR = fs.existsSync(path.join(candidate1, 'index.html')) ? candidate1 : candidate2;
const HTML_FILE = path.join(DIST_DIR, 'index.html');

if (!fs.existsSync(HTML_FILE)) {
  console.error(`❌ HTML File not found in ${candidate1} or ${candidate2}`);
  process.exit(1);
}

let htmlContent = fs.readFileSync(HTML_FILE, 'utf-8');

console.log(`🛡️  Injecting Subresource Integrity (SRI) SHA-384 Hashes into ${HTML_FILE}...`);

// Match script tags with src="/assets/..."
htmlContent = htmlContent.replace(/<script([^>]+)src="\/assets\/([^"]+)"([^>]*)><\/script>/g, (match, before, filename, after) => {
  const filePath = path.join(DIST_DIR, 'assets', filename);
  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha384').update(fileBuffer).digest('base64');
    const integrity = `sha384-${hash}`;
    console.log(`  ✓ Script [${filename}]: ${integrity}`);
    return `<script${before}src="/assets/${filename}" integrity="${integrity}" crossorigin="anonymous"${after}></script>`;
  }
  return match;
});

// Match link stylesheet tags with href="/assets/..."
htmlContent = htmlContent.replace(/<link([^>]+)href="\/assets\/([^"]+)"([^>]*)>/g, (match, before, filename, after) => {
  const filePath = path.join(DIST_DIR, 'assets', filename);
  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha384').update(fileBuffer).digest('base64');
    const integrity = `sha384-${hash}`;
    console.log(`  ✓ Stylesheet [${filename}]: ${integrity}`);
    return `<link${before}href="/assets/${filename}" integrity="${integrity}" crossorigin="anonymous"${after}>`;
  }
  return match;
});

fs.writeFileSync(HTML_FILE, htmlContent, 'utf-8');
console.log('✅ SRI Hashes successfully injected into dist/index.html!');
