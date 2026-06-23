import fs from 'fs';
import path from 'path';

const filePath = path.resolve('apps/groovelab/src/components/CampusEventsBoard.tsx');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const lines = content.split('\n');
console.log("Stepper container lines around 8981-9060:");
for (let i = 8981; i <= 9060; i++) {
  if (lines[i]) {
    console.log(`${i + 1}: [${lines[i].length}] -> "${lines[i]}"`);
  }
}
