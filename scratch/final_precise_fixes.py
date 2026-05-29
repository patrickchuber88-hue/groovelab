import re

filename = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
with open(filename, "r") as f:
    content = f.read()

# Remove line 1 if it starts with import { Check
lines = content.split('\n')
if lines[0].startswith("import { Check"):
    lines = lines[1:]

content = '\n'.join(lines)

# Fix App.tsx error by adding onProfileUpdate to the interface
content = re.sub(r'interface StudentAvatarDashboardProps \{.*?\n.*?onTabChange: \(tab: .*?\) => void;', lambda m: m.group(0) + '\n  onProfileUpdate?: (updatedFields: any) => void;', content, flags=re.DOTALL)

# Fix 'termine' parameter error. Find any union types of tabs and replace with string
content = re.sub(r"tab:\s*(?:'[^']+'(?:\s*\|\s*)?)+", "tab: string", content)
content = re.sub(r"activeTab:\s*(?:'[^']+'(?:\s*\|\s*)?)+", "activeTab: string", content)

with open(filename, "w") as f:
    f.write(content)

print("Precise TS fixes applied.")
