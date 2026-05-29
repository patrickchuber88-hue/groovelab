import re

filename = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
with open(filename, "r") as f:
    content = f.read()

# Remove useState for isPremiumActive
content = re.sub(r"const \[isPremiumActive, setIsPremiumActive\] = useState\(true\);\n", "", content)

# 1. Practice Board
# We want to replace: `{!isPremiumActive ? ( ... ) : ( /* 2. PREMIUM MODE ... */ <div ...> ... </div> )}` 
# with just the premium div. This is tricky with regex because of nested parens/braces.

