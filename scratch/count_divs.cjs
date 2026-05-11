const fs = require('fs');
const content = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/src/App.tsx', 'utf8');
const lines = content.split('\n');

const stack = [];
const startLine = 1960;
const endLine = 2100;

console.log('--- Verbose Tag Audit (Lines 1960-2100) ---');

lines.forEach((line, index) => {
  const lineNum = index + 1;
  
  // Find all opening and closing tags in the line
  const matches = line.matchAll(/<(div|section|button|h1|h2|h3|p|span|a)|<\/(div|section|button|h1|h2|h3|p|span|a)>/g);
  
  for (const match of matches) {
    const tag = match[1] || match[2];
    const isClosing = match[0].startsWith('</');
    
    if (lineNum >= startLine && lineNum <= endLine) {
        if (!isClosing) {
          stack.push({ tag, line: lineNum });
          console.log(`L${lineNum}: PUSH <${tag}> | Stack: [${stack.map(s => s.tag).join(', ')}]`);
        } else {
          const last = stack.pop();
          if (!last || last.tag !== tag) {
            console.log(`L${lineNum}: !! MISMATCH !! Found </${tag}> but expected </${last ? last.tag : 'EMPTY'}> (opened at L${last ? last.line : '?'})`);
          } else {
            console.log(`L${lineNum}: POP </${tag}> (from L${last.line}) | Stack: [${stack.map(s => s.tag).join(', ')}]`);
          }
        }
    } else {
        // Just maintain stack without logging for out-of-range lines
        if (!isClosing) {
          stack.push({ tag, line: lineNum });
        } else {
          stack.pop();
        }
    }
  }
});
