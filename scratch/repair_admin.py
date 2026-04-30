import sys

path = 'src/components/AdminDashboard.tsx'
with open(path, 'r') as f:
    lines = f.readlines()

# Fix the stats tab closure around line 805
# We need to find the specific malformed part
# stats block starts at 659
# ends around 805

new_lines = []
for i, line in enumerate(lines):
    if i == 804: # line 805 (0-indexed)
        new_lines.append('          </div>\n')
        new_lines.append('        </div>\n')
        new_lines.append('      </div>\n')
        new_lines.append('      )}\n')
    elif i == 805: # line 806
        continue # skip the old )}
    else:
        new_lines.append(line)

with open(path, 'w') as f:
    f.writelines(new_lines)
