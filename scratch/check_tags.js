const fs = require('fs');

const content = fs.readFileSync("/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx", "utf-8");
const lines = content.split('\n');
const songsLines = lines.slice(1348, 1574); // lines 1349 to 1574

let tags = [];
songsLines.forEach((line, i) => {
    let matches = line.match(/<(\w+)|<\/(\w+)/g);
    if(matches) {
        matches.forEach(m => {
            if(m.startsWith('</')) {
                let tag = m.substring(2);
                let last = tags.pop();
                if(last !== tag) {
                    console.log(`Mismatch at line ${1349 + i}: expected ${last} but got ${tag}`);
                }
            } else if (m.startsWith('<')) {
                // Ignore self-closing tags or components like <Music />
                if(!line.includes(m + ' />') && !line.match(new RegExp(m + '.*?/>'))) {
                    tags.push(m.substring(1));
                }
            }
        });
    }
});
console.log("Remaining open tags:", tags);

