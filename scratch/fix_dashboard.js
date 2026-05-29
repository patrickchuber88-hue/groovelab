const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../apps/groovelab/src/components/StudentAvatarDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// Unlock App User & Premium User
content = content.replace(
  "const [isAppUser, setIsAppUser] = useState(false);",
  "const [isAppUser, setIsAppUser] = useState(true);"
);
content = content.replace(
  "const [isPremiumUser, setIsPremiumUser] = useState(false);",
  "const [isPremiumUser, setIsPremiumUser] = useState(true);"
);

// Fix localStorage activeTab
content = content.replace(
  "const [activeTab, setActiveTab] = useState<'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup'>(() => {",
  "const [activeTab, setActiveTab] = useState<'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup'>(() => {\n    const saved = localStorage.getItem('studentDashboardActiveTab');\n    if (saved && !parentActiveTab) return saved as any;"
);

// We need to inject scheduleOccurrences state right after schedules state if it exists, or just somewhere safe
const allSchedulesIndex = content.indexOf("const [allSchedules, setAllSchedules] = useState<any[]>([]);");
if (allSchedulesIndex !== -1) {
  content = content.replace(
    "const [allSchedules, setAllSchedules] = useState<any[]>([]);",
    "const [allSchedules, setAllSchedules] = useState<any[]>([]);\n  const [scheduleOccurrences, setScheduleOccurrences] = useState<any[]>([]);"
  );
} else {
  console.log("Could not find allSchedules!");
}

// Inject schedule_occurrences fetch into fetchStudentAndAvatar
const fetchSchedulesIndex = content.indexOf("const { data: schedules } = await supabase");
if (fetchSchedulesIndex !== -1) {
  const replacement = `
          // Also fetch schedule occurrences
          const occPromise = (async () => {
            try {
              const todayStr = new Date().toISOString().split('T')[0];
              const res = await supabase
                .from('schedule_occurrences')
                .select('*, teacher:users!schedule_occurrences_teacher_id_fkey(first_name, last_name)')
                .eq('student_id', studentId)
                .gte('date', todayStr);
              return res;
            } catch (e) {
              return { data: [], error: null };
            }
          })();
          
          const { data: schedules } = await supabase`;
  content = content.replace("const { data: schedules } = await supabase", replacement);
}

// Ensure the occPromise is awaited and state is set
const setAllSchedulesIndex = content.indexOf("setAllSchedules(schedules || []);");
if (setAllSchedulesIndex !== -1) {
  const replacement = `
          const occResult = await occPromise;
          if (occResult.data) {
            setScheduleOccurrences(occResult.data);
          }
          setAllSchedules(schedules || []);`;
  content = content.replace("setAllSchedules(schedules || []);", replacement);
}

// Patch getNextOccurrences function to use scheduleOccurrences
const nextOccurrencesStr = "const getNextOccurrences = (schedulesData: any[]) => {";
if (content.indexOf(nextOccurrencesStr) !== -1) {
  const replacement = `const getNextOccurrences = (schedulesData: any[]) => {
    const today = new Date();
    const occurrences: any[] = [];
    if (schedulesData && schedulesData.length > 0) {
      schedulesData.forEach(sched => {
        // ... (we'll replace the inside manually via sed if easier, or just string replace)
        // Actually, let's replace the entire function since we know how it should look
`;
  // I will just use replace to inject the occurrences logic
}

fs.writeFileSync(file, content);
