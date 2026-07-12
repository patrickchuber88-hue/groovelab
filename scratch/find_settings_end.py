with open('apps/groovelab/src/components/StudentAvatarDashboard.tsx', 'r') as f:
    lines = f.readlines()

# We start at line 12133 (0-indexed: 12132)
# We count open/close divs
count = 0
for idx in range(12132, len(lines)):
    line = lines[idx]
    # Simple count of <div and </div
    # Let's count occurrences
    opens = line.count('<div')
    closes = line.count('</div')
    count += opens - closes
    if count <= 0:
        print(f"Ends at line {idx+1}: {line.strip()}")
        break
