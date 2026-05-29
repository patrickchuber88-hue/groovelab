import re

filename = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
with open(filename, "r") as f:
    content = f.read()

# Replace any setIsPremiumActive(...) with nothing
content = re.sub(r"setIsPremiumActive\(.*?\);?", "", content)

# For remaining `isPremiumActive` checks, let's just replace them if they are in conditions, or replace the whole thing.
# At line 1369 and 1849, maybe it's `isPremiumActive ? ... : ...`
# Let's just find and print them first to see what they are.

lines = content.split('\n')
for i, line in enumerate(lines):
    if "isPremiumActive" in line:
        print(f"Line {i+1}: {line}")

with open(filename, "w") as f:
    f.write(content)

