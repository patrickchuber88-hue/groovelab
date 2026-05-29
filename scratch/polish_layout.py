import re

with open("/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx", "r") as f:
    content = f.read()

# 1. Practice Board: Constrain timer setup width
content = content.replace(
    "/* Timer setup before starting */\n                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>",
    "/* Timer setup before starting */\n                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px', margin: '0 auto', width: '100%' }}>"
)

# Practice Board: Constrain active session width (the buttons container)
# It looks like: `<div style={{ display: 'flex', gap: '16px', width: '100%', marginTop: '20px' }}>`
# Wait, let's just use regex for the active session buttons container
content = re.sub(
    r"<div style=\{\{\s*display:\s*'flex',\s*gap:\s*'16px',\s*width:\s*'100%',\s*marginTop:\s*'20px'\s*\}\}>",
    r"<div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '400px', margin: '20px auto 0' }}>",
    content
)

# 2. Songs Board: Responsive grid
# Replace `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="grid-cols-1 sm:grid-cols-2">`
content = content.replace(
    "<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className=\"grid-cols-1 sm:grid-cols-2\">",
    "<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>"
)

# 3. Campus Cup Board: Constrain ranking list width
# Around line 1640: `<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>`
# Let's replace the one right after the podium or right before the mapping of schools/students
content = re.sub(
    r"\{/\* Complete Ranking List \*/\}\s*<div style=\{\{\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*gap:\s*'12px'\s*\}\}>",
    r"{/* Complete Ranking List */}\n            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>",
    content
)

with open("/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx", "w") as f:
    f.write(content)

