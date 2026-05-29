const fs = require('fs');
const content = fs.readFileSync('scratch/TestSongs.tsx', 'utf-8');

let tags = [];
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  let m;
  let re = /<\/?([a-zA-Z0-9_]+)[^>]*>/g;
  while ((m = re.exec(line)) !== null) {
    let match = m[0];
    let tag = m[1];
    
    // Ignore self closing
    if (match.endsWith('/>')) continue;
    // Ignore <></>
    if (match === '<>' || match === '</>') continue;
    
    // Components might not be matched but standard tags are lowercase
    if (tag[0] !== tag[0].toLowerCase()) continue;

    if (match.startsWith('</')) {
      if (tags.length === 0) {
        console.log(`Line ${i+1}: unmatched closing tag ${tag}`);
      } else {
        let last = tags.pop();
        if (last.tag !== tag) {
           console.log(`Line ${i+1}: expected </${last.tag}> (opened at ${last.line}) but got </${tag}>`);
        }
      }
    } else {
      tags.push({tag, line: i+1});
    }
  }
}
if (tags.length > 0) {
  console.log("Unclosed tags:", tags);
}
