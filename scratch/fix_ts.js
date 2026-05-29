const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../apps/groovelab/src/components/StudentAvatarDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "  const [scheduleOccurrences, setScheduleOccurrences] = useState<any[]>([]);",
  ""
);

content = content.replace(
  "  const [schedules, setSchedules] = useState<any[]>([]);",
  "  const [schedules, setSchedules] = useState<any[]>([]);\n  const [scheduleOccurrences, setScheduleOccurrences] = useState<any[]>([]);"
);

fs.writeFileSync(file, content);
