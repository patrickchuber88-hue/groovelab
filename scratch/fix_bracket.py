import json

filename = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
with open(filename, "r") as f:
    content = f.read()

target = """  const [activeTab, setActiveTab] = useState<any>((() => {
    const savedTab = localStorage.getItem('studentDashboardActiveTab'); if (savedTab && !parentActiveTab) return savedTab as any;
    const savedTab = localStorage.getItem('studentDashboardActiveTab'); if (savedTab && !parentActiveTab) return savedTab as any;
    const initial = parentActiveTab === 'profile' ? 'briefing' : parentActiveTab;
    return (initial as any) || 'briefing';
  });"""
replacement = """  const [activeTab, setActiveTab] = useState<any>(() => {
    const savedTab = localStorage.getItem('studentDashboardActiveTab'); 
    if (savedTab && !parentActiveTab) return savedTab as any;
    const initial = parentActiveTab === 'profile' ? 'briefing' : parentActiveTab;
    return (initial as any) || 'briefing';
  });"""

content = content.replace(target, replacement)

with open(filename, "w") as f:
    f.write(content)

