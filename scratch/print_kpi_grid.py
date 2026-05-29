import json

with open("scratch/all_ui_replacements.json", "r") as f:
    replacements = json.load(f)

for r in replacements:
    if "gridTemplateColumns: 'repeat(4, 1fr)'" in r["replacement"]:
        print("TARGET:")
        print(r["target"])
        print("----------")
        print("REPLACEMENT:")
        print(r["replacement"])
        
