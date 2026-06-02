import json

transcript_path = "/Users/patrickhuber/.gemini/antigravity/brain/9c9659ae-5078-4246-a021-c1cad5812f8a/.system_generated/logs/transcript.jsonl"

records = []
with open(transcript_path, 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f):
        if "MeisterwerkDocumentationModal.tsx" in line:
            records.append((idx + 1, len(line)))

records.sort(key=lambda x: x[1], reverse=True)
print("Longest log lines containing MeisterwerkDocumentationModal.tsx:")
for line_num, length in records[:15]:
    print(f"Line {line_num}: {length} characters")
