const fs = require('fs');
const content = fs.readFileSync("/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx", "utf-8");
const lines = content.split('\n');

let stack = [];
for (let i = 1348; i < 1574; i++) {
    const line = lines[i];
    
    // Quick and dirty tag matching
    let tagRegex = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
    let match;
    while ((match = tagRegex.exec(line)) !== null) {
        let fullMatch = match[0];
        let tagName = match[1];
        
        if (fullMatch.endsWith('/>')) {
            continue; // self closing
        }
        
        if (fullMatch.startsWith('</')) {
            if (stack.length > 0 && stack[stack.length - 1].name === tagName) {
                stack.pop();
            } else {
                console.log(`Mismatch on line ${i+1}: expected ${stack.length > 0 ? stack[stack.length-1].name : 'nothing'} but got ${tagName}`);
            }
        } else if (fullMatch.startsWith('<')) {
            // Check if it's a known component that doesn't need closing if we misparse
            if (tagName === 'Music' || tagName === 'Star' || tagName === 'Flame' || tagName === 'Lock' || tagName === 'CheckCircle' || tagName === 'PlayCircle' || tagName === 'Video' || tagName === 'FileText') {
                continue;
            }
            stack.push({name: tagName, line: i+1});
        }
    }
}
console.log("Unclosed tags:");
stack.forEach(s => console.log(s));
