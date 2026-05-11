import fs from 'fs';

const content = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/src/components/TeacherDashboard.tsx', 'utf8');

let openBraces = 0;
let closeBraces = 0;
let openParens = 0;
let closeParens = 0;

for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') openBraces++;
    if (content[i] === '}') closeBraces++;
    if (content[i] === '(') openParens++;
    if (content[i] === ')') closeParens++;
}

console.log(`Braces: Open=${openBraces}, Close=${closeBraces}, Balance=${openBraces - closeBraces}`);
console.log(`Parens: Open=${openParens}, Close=${closeParens}, Balance=${openParens - closeParens}`);
