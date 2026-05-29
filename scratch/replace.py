import re

with open("/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx", "r") as f:
    content = f.read()

# Find the start of the else block
start_idx = content.find(") : (\n                /* BASIC MODE: Reduced plain text list & Stripe CTA */")
if start_idx != -1:
    # Find the closing brace of the else block. It should be right before the closing of progressLoading, which is `            </div>\n          )}\n        </div>\n      )}`
    
    # Let's just find the exact chunk to replace:
    chunk_start = content.rfind("              ) : (\n                /* BASIC MODE", 0, start_idx + 100)
    
    # Let's just do it manually with lines
    lines = content.split("\n")
    start_line = -1
    for i, l in enumerate(lines):
        if "/* BASIC MODE: Reduced plain text list & Stripe CTA */" in l:
            start_line = i - 1 # The `) : (` line
            break
    
    if start_line != -1:
        end_line = -1
        # The block ends around line 1574 with `)}`
        for i in range(start_line, len(lines)):
            if lines[i].strip() == ")}":
                if lines[i+1].strip() == "</div>" and lines[i+2].strip() == ")}":
                    end_line = i
                    break
        print(f"Removing lines {start_line+1} to {end_line+1}")
        del lines[start_line:end_line+1]
        
        with open("/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx", "w") as f:
            f.write("\n".join(lines))
        print("Done")
