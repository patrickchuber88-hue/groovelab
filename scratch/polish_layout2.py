with open("/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx", "r") as f:
    content = f.read()

# Replace campus cup list wrapper
content = content.replace(
    "{/* Leaderboard Table List */}\n              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>",
    "{/* Leaderboard Table List */}\n              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>"
)

with open("/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx", "w") as f:
    f.write(content)

