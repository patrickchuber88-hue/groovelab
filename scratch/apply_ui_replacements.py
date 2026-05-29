import json

with open("scratch/all_ui_replacements.json", "r") as f:
    replacements = json.load(f)

filename = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
with open(filename, "r") as f:
    content = f.read()

success_count = 0
for i, rep in enumerate(replacements):
    target = rep["target"]
    replacement = rep["replacement"]
    # Sometimes there are leading/trailing quotes from JSON formatting
    if target.startswith('"') and target.endswith('"'):
        target = target[1:-1]
    if replacement.startswith('"') and replacement.endswith('"'):
        replacement = replacement[1:-1]
        
    # Unescape newlines
    target = target.replace("\\n", "\n")
    replacement = replacement.replace("\\n", "\n")
    
    if target in content:
        content = content.replace(target, replacement)
        success_count += 1
        print(f"Applied replacement {i+1}")
    else:
        print(f"Failed replacement {i+1}")

with open(filename, "w") as f:
    f.write(content)

print(f"Successfully applied {success_count} replacements.")
