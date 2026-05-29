import glob
import os

search_dir = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch"
query = "AdminLTE style KPI Cards"

for path in glob.glob(os.path.join(search_dir, "*")):
    if os.path.isdir(path):
        continue
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            if query in content:
                print(f"Found query in {os.path.basename(path)}!")
                # Print lines containing query
                lines = content.split("\n")
                for idx, line in enumerate(lines):
                    if query in line:
                        print(f"  Line {idx+1}: {line[:120]}")
    except Exception as e:
        pass
