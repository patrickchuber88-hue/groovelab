import re

filename = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
with open(filename, "r") as f:
    content = f.read()

# Fix types
content = content.replace("tab: 'songs' | 'briefing' | 'hero' | 'practice_board' | 'campus_cup'", "tab: string")
content = content.replace("activeTab: 'briefing' | 'songs' | 'practice_board' | 'campus_cup' | 'hero'", "activeTab: string")
content = content.replace("onTabChange: (tab: string) => void;", "onTabChange: (tab: string) => void;\n  onProfileUpdate?: (updatedFields: any) => void;")

# Add imports
if "import { Check" not in content:
    content = "import { Check, Calendar, Star, Award, Sparkles } from 'lucide-react';\n" + content

with open(filename, "w") as f:
    f.write(content)

app_file = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/App.tsx"
with open(app_file, "r") as f:
    app_content = f.read()
# Let's see if App.tsx needs fixing for updatedFields
app_content = app_content.replace("onProfileUpdate={(updatedFields) => {", "onProfileUpdate={(updatedFields: any) => {")
with open(app_file, "w") as f:
    f.write(app_content)

print("Final TS fixes applied.")
