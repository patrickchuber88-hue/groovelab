import re

with open('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx', 'r') as f:
    lines = f.readlines()

# Let's inspect specific lines around the errors
error_lines = [5850, 8541, 9106, 9108, 11091, 12412, 13554]

for el in error_lines:
    print(f"=== LINE {el} ===")
    start = max(0, el - 10)
    end = min(len(lines), el + 10)
    for idx in range(start, end):
        print(f"{idx+1}: {lines[idx]}", end="")
