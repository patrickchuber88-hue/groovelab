import json
import re

filename = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
with open(filename, "r") as f:
    content = f.read()

# 1. Add `onProfileUpdate` to props
if "onProfileUpdate?: (updatedFields: any) => void;" not in content:
    content = content.replace(
        "onTabChange: (tab: string) => void;",
        "onTabChange: (tab: string) => void;\n  onProfileUpdate?: (updatedFields: any) => void;"
    )

# 2. Add 'termine' to valid tabs
content = content.replace("'songs' | 'briefing' | 'hero' | 'practice_board' | 'campus_cup'", "'songs' | 'briefing' | 'hero' | 'practice_board' | 'campus_cup' | 'termine'")
content = content.replace("'briefing' | 'songs' | 'practice_board' | 'campus_cup' | 'hero'", "'briefing' | 'songs' | 'practice_board' | 'campus_cup' | 'hero' | 'termine'")

# 3. Add Calendar and Check imports
import_match = re.search(r"import \{(.*?)\} from 'lucide-react';", content)
if import_match:
    current_imports = import_match.group(1)
    new_imports = current_imports
    if "Check" not in new_imports:
        new_imports = "Check, " + new_imports
    if "Calendar" not in new_imports:
        new_imports = "Calendar, " + new_imports
    content = content.replace(import_match.group(0), f"import {{ {new_imports} }} from 'lucide-react';")

# 4. Fix user/avatar name
content = content.replace("{avatar?.student_name?.split(' ')[0] || 'Schüler'}", "Schüler")

# 5. Inject scheduleOccurrences state and fetch
if "const [scheduleOccurrences" not in content:
    state_injection = """  const [scheduleOccurrences, setScheduleOccurrences] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoadingSchedule(true);
      try {
        const { data, error } = await supabase
          .from('schedule_occurrences')
          .select('*, schedule:schedule_id(*)')
          .eq('student_id', studentId)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true })
          .order('start_time', { referencedTable: 'schedule', ascending: true });
        
        if (!error && data) {
          setScheduleOccurrences(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSchedule(false);
      }
    };
    if (studentId) fetchSchedule();
  }, [studentId]);
  
  """
    # inject after activeTab state
    content = content.replace("const [activeTab, setActiveTab]", state_injection + "const [activeTab, setActiveTab]")

with open(filename, "w") as f:
    f.write(content)

print("Patched.")
