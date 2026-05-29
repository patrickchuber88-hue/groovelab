import json

with open("scratch/all_ui_replacements_all_files.json", "r") as f:
    replacements = json.load(f)

for path, reps in replacements.items():
    if "App.tsx" in path:
        print(f"Replacements for App.tsx:")
        for r in reps:
            print("TARGET:")
            print(r["target"])
            print("REPLACEMENT:")
            print(r["replacement"])
            print("----")
