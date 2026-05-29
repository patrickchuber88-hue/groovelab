import json

path = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/recovered_05c40c8d-1940-4b14-96a0-d18ed64ed6d8_18.txt"
with open(path, "r", encoding="utf-8") as f:
    step = json.load(f)
content = step.get("content", "")
print("Total lines:", len(content.split("\n")))
# Print lines with numbers containing "2500" to "2600"
for line in content.split("\n"):
    if any(f"{i}:" in line for i in range(2500, 2580)):
        print(line)
