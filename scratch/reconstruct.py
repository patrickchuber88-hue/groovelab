import json
import subprocess

transcript_path = "/Users/patrickhuber/.gemini/antigravity/brain/9c9659ae-5078-4246-a021-c1cad5812f8a/.system_generated/logs/transcript.jsonl"
modal_path = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/MeisterwerkDocumentationModal.tsx"

# 1. Revert the file to clean git base state
subprocess.run(["git", "checkout", "01f4fff", "--", modal_path], check=True)
print("Reverted MeisterwerkDocumentationModal.tsx to clean base commit 01f4fff.")

with open(modal_path, "r", encoding="utf-8") as f:
    current_content = f.read()

# 2. Gather replacements specifically in the step range [700, 1110]
replacements = []
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            obj = json.loads(line)
            step = obj.get("step_index", 0)
            if 700 <= step <= 1110:
                tool_calls = obj.get("tool_calls", [])
                for tc in tool_calls:
                    name = tc.get("name")
                    args = tc.get("args", {})
                    if name in ["replace_file_content", "multi_replace_file_content"] and "MeisterwerkDocumentationModal" in str(args.get("TargetFile", "")):
                        replacements.append((step, name, args))
        except Exception as e:
            pass

print(f"Gathered {len(replacements)} replacements in step range [700, 1110].")

# 3. Apply replacements sequentially
success_count = 0
for step, name, args in replacements:
    print(f"\nApplying Step {step} ({name}):")
    chunks = []
    
    # Safely get chunks
    raw_chunks = []
    if name == "replace_file_content":
        raw_chunks = [args]
    elif name == "multi_replace_file_content":
        rc = args.get("ReplacementChunks", [])
        if isinstance(rc, str):
            try:
                raw_chunks = json.loads(rc)
            except:
                raw_chunks = []
        else:
            raw_chunks = rc
            
    for chunk in raw_chunks:
        if isinstance(chunk, str):
            try:
                chunk = json.loads(chunk)
            except:
                continue
                
        target = chunk.get("TargetContent", "")
        replacement = chunk.get("ReplacementContent", "")
        
        # Strip outer quotes if they got double encoded
        if isinstance(target, str) and target.startswith('"') and target.endswith('"'):
            try:
                target = json.loads(target)
            except:
                pass
        if isinstance(replacement, str) and replacement.startswith('"') and replacement.endswith('"'):
            try:
                replacement = json.loads(replacement)
            except:
                pass
            
        if target in current_content:
            current_content = current_content.replace(target, replacement)
            print(f" -> Success: Applied chunk of size {len(target)} -> {len(replacement)}")
            success_count += 1
        else:
            # Try removing leading/trailing newlines in target to see if it helps
            if target.strip() in current_content:
                current_content = current_content.replace(target.strip(), replacement.strip())
                print(f" -> Success (stripped): Applied chunk of size {len(target.strip())} -> {len(replacement.strip())}")
                success_count += 1
            else:
                print(f" -> ERROR: Target not found! Target starts with:\n{str(target)[:150]}...")

# 4. Save reconstructed file
with open(modal_path, "w", encoding="utf-8") as f:
    f.write(current_content)

print(f"\nFinished. Applied {success_count} chunks successfully. Reconstructed file saved to {modal_path}.")
