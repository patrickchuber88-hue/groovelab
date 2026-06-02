import json
import re

transcript_path = "/Users/patrickhuber/.gemini/antigravity/brain/9c9659ae-5078-4246-a021-c1cad5812f8a/.system_generated/logs/transcript.jsonl"

reconstructed_lines = {}
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            obj = json.loads(line)
            content = obj.get("content", "")
            if "Showing lines" in content and "MeisterwerkDocumentationModal.tsx" in content:
                for l in content.split("\n"):
                    match = re.match(r"^(\d+):\s(.*)$", l.strip())
                    if match:
                        line_num = int(match.group(1))
                        reconstructed_lines[line_num] = match.group(2)
        except Exception as e:
            pass

max_line = max(reconstructed_lines.keys()) if reconstructed_lines else 0
print(f"Total lines: {max_line}")

missing_ranges = []
start_missing = None

for i in range(1, max_line + 1):
    if i not in reconstructed_lines:
        if start_missing is None:
            start_missing = i
    else:
        if start_missing is not None:
            missing_ranges.append((start_missing, i - 1))
            start_missing = None

if start_missing is not None:
    missing_ranges.append((start_missing, max_line))

print("Missing line ranges in reconstruction:")
for r in missing_ranges:
    print(f"Lines {r[0]} to {r[1]} ({r[1] - r[0] + 1} lines)")
