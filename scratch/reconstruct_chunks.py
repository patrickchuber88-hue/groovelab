import json
import re

transcript_path = "/Users/patrickhuber/.gemini/antigravity/brain/9c9659ae-5078-4246-a021-c1cad5812f8a/.system_generated/logs/transcript.jsonl"

# We will collect all line mappings: {line_number: content}
reconstructed_lines = {}

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            obj = json.loads(line)
            content = obj.get("content", "")
            
            # Check if this content is from view_file tool output
            if "Showing lines" in content and "MeisterwerkDocumentationModal.tsx" in content:
                # Extract line numbers and content
                for l in content.split("\n"):
                    match = re.match(r"^(\d+):(.*)$", l.strip())
                    if match:
                        line_num = int(match.group(1))
                        line_content = match.group(2)
                        # Strip only one leading space if present
                        if line_content.startswith(" "):
                            line_content = line_content[1:]
                        reconstructed_lines[line_num] = line_content
        except Exception as e:
            pass

print(f"Reconstructed {len(reconstructed_lines)} lines.")
if reconstructed_lines:
    max_line = max(reconstructed_lines.keys())
    print(f"Max line number: {max_line}")
    
    # Write to a file
    with open("/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/reconstructed_from_chunks.tsx", "w", encoding="utf-8") as out:
        for i in range(1, max_line + 1):
            out.write(reconstructed_lines.get(i, "") + "\n")
    print("Saved to scratch/reconstructed_from_chunks.tsx")
