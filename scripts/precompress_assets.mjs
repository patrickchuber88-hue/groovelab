import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../apps/groovelab/dist');

console.log('⚡ [Pre-Compressor] Starting high-efficiency Brotli (q=11) and Gzip (lvl=9) pre-compression...');

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      const ext = path.extname(fullPath).toLowerCase();
      if (['.js', '.css', '.html', '.svg', '.json'].includes(ext)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const targetFiles = getAllFiles(distDir);
let compressedCount = 0;

targetFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath);
  
  // 1. Gzip Level 9
  const gzContent = zlib.gzipSync(content, { level: 9 });
  fs.writeFileSync(`${filePath}.gz`, gzContent);

  // 2. Brotli Quality 11
  try {
    const brContent = zlib.brotliCompressSync(content, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      }
    });
    fs.writeFileSync(`${filePath}.br`, brContent);
  } catch (err) {
    // ignore
  }

  compressedCount++;
});

console.log(`✅ [Pre-Compressor] Successfully pre-compressed ${compressedCount} assets with .br and .gz static files!`);
