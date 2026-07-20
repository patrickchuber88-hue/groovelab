const fs = require('fs');

function checkFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  console.log(`=== CHECKING ${filepath} ===`);
  
  lines.forEach((line, idx) => {
    // Find patterns where student first_name and last_name are concatenated without maskLastName
    if (line.includes('first_name') && line.includes('last_name') && !line.includes('maskLastName') && !line.includes('import') && !line.includes('type')) {
      console.log(`L${idx + 1}: ${line.trim()}`);
    }
  });
}

checkFile('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/ScheduleBoard.tsx');
checkFile('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/ScheduleCalendarView.tsx');
