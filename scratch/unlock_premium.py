import json

filename = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
with open(filename, "r") as f:
    content = f.read()

# 1. State initialization
content = content.replace("const [isPremiumActive, setIsPremiumActive] = useState(false);", "const [isPremiumActive, setIsPremiumActive] = useState(true);")
content = content.replace("setIsPremiumActive(data.isPremiumActive ?? false);", "setIsPremiumActive(true);")
content = content.replace("setIsPremiumActive(premium);", "setIsPremiumActive(true);")

with open(filename, "w") as f:
    f.write(content)

print("Premium unlocked.")
