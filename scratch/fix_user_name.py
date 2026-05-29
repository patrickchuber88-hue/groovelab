import json

filename = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
with open(filename, "r") as f:
    content = f.read()

content = content.replace("{user?.name || 'Schüler Patrick'}", "Schüler")

with open(filename, "w") as f:
    f.write(content)

print("user name fixed.")
