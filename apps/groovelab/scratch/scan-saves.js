import fs from 'fs';
import path from 'path';

const srcDir = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src';

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const allFiles = walkDir(srcDir);
const saveOperations = [];

// Regex to capture supabase.from('table').operation(...)
// Since statements can span multiple lines, we'll read line by line but also check context
allFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (line.includes('supabase.from') && (line.includes('.insert') || line.includes('.update') || line.includes('.upsert') || line.includes('.delete'))) {
      const matchTable = line.match(/\.from\(['"]([^'"]+)['"]\)/);
      const matchOp = line.match(/\.(insert|update|upsert|delete)\(/);
      
      saveOperations.push({
        file: path.relative(srcDir, filePath),
        line: index + 1,
        table: matchTable ? matchTable[1] : 'unknown',
        operation: matchOp ? matchOp[1] : 'unknown',
        snippet: line.trim()
      });
    } else if (line.includes('supabase.from')) {
      // Check next few lines for the operation in case of multiline chaining
      const tableMatch = line.match(/\.from\(['"]([^'"]+)['"]\)/);
      if (tableMatch) {
        const table = tableMatch[1];
        let foundOp = null;
        let snippetText = line.trim();
        for (let i = 1; i <= 3; i++) {
          if (lines[index + i]) {
            const nextLine = lines[index + i];
            snippetText += ' ' + nextLine.trim();
            const opMatch = nextLine.match(/\.(insert|update|upsert|delete)\(/);
            if (opMatch) {
              foundOp = opMatch[1];
              break;
            }
          }
        }
        if (foundOp) {
          saveOperations.push({
            file: path.relative(srcDir, filePath),
            line: index + 1,
            table,
            operation: foundOp,
            snippet: snippetText
          });
        }
      }
    }
  });
});

console.log(JSON.stringify(saveOperations, null, 2));
