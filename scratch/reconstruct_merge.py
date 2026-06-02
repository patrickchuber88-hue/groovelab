import json
import re
import subprocess

transcript_path = "/Users/patrickhuber/.gemini/antigravity/brain/9c9659ae-5078-4246-a021-c1cad5812f8a/.system_generated/logs/transcript.jsonl"
modal_path = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/MeisterwerkDocumentationModal.tsx"

# 1. Revert to base file and read all base lines
subprocess.run(["git", "checkout", "01f4fff", "--", modal_path], check=True)
with open(modal_path, "r", encoding="utf-8") as f:
    base_lines = f.readlines()

print(f"Base file has {len(base_lines)} lines.")

# 2. Extract all line versions logged in transcript.jsonl
reconstructed_lines = {}
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            obj = json.loads(line)
            content = obj.get("content", "")
            
            # Check if this content is from view_file tool output
            if "Showing lines" in content and "MeisterwerkDocumentationModal.tsx" in content:
                for l in content.split("\n"):
                    # Strict matching for: line_number:code
                    match = re.match(r"^(\d+):(.*)$", l.strip())
                    if match:
                        line_num = int(match.group(1))
                        line_content = match.group(2)
                        
                        # Clean up leading space
                        if line_content.startswith(" "):
                            line_content = line_content[1:]
                            
                        # CRITICAL FILTER: Skip if it is a JSON log entry or tool headers
                        if '{"step_index"' in line_content or '{"File"' in line_content:
                            continue
                        if "Showing lines" in line_content or "Total Lines:" in line_content:
                            continue
                            
                        reconstructed_lines[line_num] = line_content
        except Exception as e:
            pass

print(f"Captured {len(reconstructed_lines)} clean line updates from log files.")

# 3. Merge lines: use logged update if present, otherwise fallback to original base line
final_lines = []
max_line_index = max(len(base_lines), max(reconstructed_lines.keys()) if reconstructed_lines else 0)

for idx in range(1, max_line_index + 1):
    if idx in reconstructed_lines:
        final_lines.append(reconstructed_lines[idx] + "\n")
    else:
        # Fallback to base line (0-indexed in array)
        if idx - 1 < len(base_lines):
            final_lines.append(base_lines[idx - 1])
        else:
            final_lines.append("\n")

# 4. Save the merged output back to MeisterwerkDocumentationModal.tsx
with open(modal_path, "w", encoding="utf-8") as f:
    f.writelines(final_lines)

print(f"Reconstructed file saved with {len(final_lines)} lines.")
