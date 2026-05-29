const fs = require('fs');
const path = require('path');

const studentFile = path.join(__dirname, '../apps/groovelab/src/components/StudentAvatarDashboard.tsx');
let sContent = fs.readFileSync(studentFile, 'utf8');
sContent = sContent.replace(
  "  onTabChange?: (tab: 'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup' | 'profile' | 'all_appointments' | 'lehrwerke' | 'flashback' | 'events' | 'mediathek') => void;\n}",
  "  onTabChange?: (tab: any) => void;\n  onProfileUpdate?: (fields: any) => void;\n}"
);
// just in case it didn't match perfectly, let's use a simpler regex
sContent = sContent.replace(/interface StudentAvatarDashboardProps \{[\s\S]*?\}/, `interface StudentAvatarDashboardProps {
  studentId: string;
  parentActiveTab?: string;
  onTabChange?: (tab: any) => void;
  onProfileUpdate?: (fields: any) => void;
}`);
fs.writeFileSync(studentFile, sContent);

const schedFile = path.join(__dirname, '../apps/groovelab/src/components/ScheduleCalendarView.tsx');
let cContent = fs.readFileSync(schedFile, 'utf8');
cContent = cContent.replace(
  "  teacher_id: string;",
  "  teacher_id: string;\n  schedule_id?: string;"
);
fs.writeFileSync(schedFile, cContent);

