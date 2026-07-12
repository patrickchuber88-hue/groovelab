with open('apps/groovelab/src/components/StudentAvatarDashboard.tsx', 'r') as f:
    lines = f.readlines()

profile_lines = lines[11391:12131]
content = "".join(profile_lines)

# Count <div and </div (ignoring comments)
import re
content_clean = re.sub(r'//.*', '', content)
content_clean = re.sub(r'/\*.*?\*/', '', content_clean, flags=re.DOTALL)

# Let's count opening and closing div tags
open_divs = len(re.findall(r'<div\b', content_clean))
close_divs = len(re.findall(r'</div>', content_clean))

print("Profile Tab Open Divs:", open_divs)
print("Profile Tab Close Divs:", close_divs)
