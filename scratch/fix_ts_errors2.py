import json

filename = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
with open(filename, "r") as f:
    content = f.read()

# Fix Calendar import
content = content.replace("import { Play, Coffee, Music", "import { Calendar, Play, Coffee, Music")
content = content.replace("import { Coffee, Music", "import { Calendar, Coffee, Music")

# Fix scheduleOccurrences state
# Find where I can inject it
target_state = "const [scheduleOccurrences, setScheduleOccurrences] = useState<any[]>([]);"
if target_state not in content:
    # Inject it after const [avatar, setAvatar] = useState
    inject_target = "const [avatar, setAvatar] = useState<Avatar | null>(null);"
    content = content.replace(inject_target, inject_target + "\n  const [scheduleOccurrences, setScheduleOccurrences] = useState<any[]>([]);")

with open(filename, "w") as f:
    f.write(content)

print("Fixed TS errors.")
