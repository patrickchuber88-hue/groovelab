import json

filename = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
with open(filename, "r") as f:
    content = f.read()

# Fix user name
content = content.replace("{avatar.student_name.split(' ')[0]}", "{user?.name?.split(' ')[0] || 'Schüler'}")

# Fix Active Tab Persistence
active_tab_target = "const [activeTab, setActiveTab] = useState<'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup'>(() => {"
active_tab_replacement = """const [activeTab, setActiveTab] = useState<'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup'>(() => {
    const saved = localStorage.getItem('studentDashboardActiveTab');
    if (saved && !parentActiveTab) return saved as any;"""
if active_tab_target in content:
    content = content.replace(active_tab_target, active_tab_replacement)

# Fix Active Tab setter
tab_change_target = """  const handleTabChangeLocal = (tab: 'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup') => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };"""
tab_change_replacement = """  const handleTabChangeLocal = (tab: 'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup') => {
    setActiveTab(tab);
    localStorage.setItem('studentDashboardActiveTab', tab);
    if (onTabChange) onTabChange(tab);
  };"""
if tab_change_target in content:
    content = content.replace(tab_change_target, tab_change_replacement)


with open(filename, "w") as f:
    f.write(content)

print("TS and activeTab fixes applied.")
