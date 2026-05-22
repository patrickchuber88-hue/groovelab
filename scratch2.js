const fs = require('fs');
const content = fs.readFileSync('src/components/MasterAdminDashboard.tsx', 'utf8');
const lines = content.split('\n');
const start = lines.findIndex(l => l.includes('selectedSchool && ('));
console.log('Modal starts at:', start);
