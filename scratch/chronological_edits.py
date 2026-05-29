import glob
import os
import json

files = glob.glob("/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/recovered_05c40c8d-1940-4b14-96a0-d18ed64ed6d8_*.txt")

res = {}

for path in files:
    try:
        with open(path, "r", encoding="utf-8") as f:
            step = json.load(f)
        content = step.get("content", "")
        if "Showing lines" in content:
            lines = content.split("\n")
            for line in lines:
                parts = line.split(":", 1)
                if len(parts) == 2:
                    try:
                        line_num = int(parts[0].strip())
                        line_content = parts[1]
                        res[line_num] = line_content
                    except ValueError:
                        pass
    except Exception as e:
        pass

# Print sorted lines from 2500 to 2645
print("Extracted recovered lines:")
for num in sorted(res.keys()):
    if 2490 <= num <= 2650:
        print(f"{num}: {res[num]}")
