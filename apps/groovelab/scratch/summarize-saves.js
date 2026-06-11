import fs from 'fs';

const data = JSON.parse(fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/scratch/save-ops-results.json', 'utf-8'));

const summary = {};

data.forEach(item => {
  if (!summary[item.file]) {
    summary[item.file] = {};
  }
  const fileSummary = summary[item.file];
  const key = `${item.operation.toUpperCase()} -> ${item.table}`;
  if (!fileSummary[key]) {
    fileSummary[key] = 0;
  }
  fileSummary[key]++;
});

console.log("Summary of Save Operations by File:");
console.log(JSON.stringify(summary, null, 2));

console.log("\nTotal operations found:", data.length);
