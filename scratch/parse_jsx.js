const fs = require('fs');

const code = fs.readFileSync('src/App.tsx', 'utf8');

// A simple lexical parser to track curly braces and tags
let i = 0;
const stack = [];
let line = 1;
let col = 1;

while (i < code.length) {
  const char = code[i];
  if (char === '\n') {
    line++;
    col = 1;
    i++;
    continue;
  }

  // Skip string literals
  if (char === '"' || char === "'" || char === '`') {
    const quote = char;
    i++; col++;
    while (i < code.length && code[i] !== quote) {
      if (code[i] === '\n') { line++; col = 1; }
      else { col++; }
      // skip escaped quotes
      if (code[i] === '\\') { i += 2; col += 2; }
      else { i++; col++; }
    }
    i++; col++;
    continue;
  }

  // Skip comments
  if (char === '/' && code[i + 1] === '/') {
    while (i < code.length && code[i] !== '\n') { i++; col++; }
    continue;
  }
  if (char === '/' && code[i + 1] === '*') {
    i += 2; col += 2;
    while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
      if (code[i] === '\n') { line++; col = 1; }
      else { col++; }
      i++;
    }
    i += 2; col += 2;
    continue;
  }

  if (char === '{') {
    stack.push({ type: '{', line, col });
  } else if (char === '}') {
    const top = stack.pop();
    if (!top || top.type !== '{') {
      console.log(`Unmatched '}' at line ${line}, col ${col}`);
    }
  } else if (char === '(') {
    stack.push({ type: '(', line, col });
  } else if (char === ')') {
    const top = stack.pop();
    if (!top || top.type !== '(') {
      console.log(`Unmatched ')' at line ${line}, col ${col}`);
    }
  }

  i++;
  col++;
}

console.log('Brace/parenthesis parsing complete. Remaining stack:', stack.length);
if (stack.length > 0) {
  console.log('Unclosed items:', stack.slice(-5));
}
