import re

filename = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
with open(filename, "r") as f:
    content = f.read()

# Remove the state
content = re.sub(r"  const \[isPremiumActive, setIsPremiumActive\] = useState\(true\);\n", "", content)

# Remove the practice_board basic mode overlay
practice_pattern = re.compile(r"\{!isPremiumActive \? \(\s*/\* 1\. BASIC MODE BLOCKED OVERLAY \*/\s*<div.*?Jetzt upgraden\s*</button>\s*</div>\s*\) : \(\s*/\* 2\. PREMIUM MODE: ÜBE-BOARD Timer & Gyro Detox \*/\s*(<div.*?\{/\* Header \*/\})", re.DOTALL)
content = re.sub(practice_pattern, r"\1", content)

# Because we removed the ternary, there is a stray closing `)}` at the very end of the practice_board section.
# We need to find the end of practice_board. It ends around line 1395: 
#                 </div>
#               )}
#             </div>
#           )}
#         </div>
#       )}

# Remove Songs basic mode overlay
songs_pattern = re.compile(r"\{isPremiumActive \? \(\s*(<div style=\{\{ display: 'flex', flexDirection: 'column', gap: '24px' \}\}>\s*\{/\* Filter \*/\})", re.DOTALL)
content = re.sub(songs_pattern, r"\1", content)

# Remove the else block for songs basic mode. It's around line 1680. 
songs_else_pattern = re.compile(r"\)\s*:\s*\(\s*/\* BASIC MODE SONGS OVERLAY \*/\s*<div.*?Premium freischalten\s*</button>\s*</div>\s*\)", re.DOTALL)
content = re.sub(songs_else_pattern, "", content)

# Remove Campus Cup basic mode warning
campus_pattern = re.compile(r"\{!isPremiumActive \? \(\s*<div style=\{\{ background: '#fef2f2'.*?</div\>\s*\) : null\}", re.DOTALL)
content = re.sub(campus_pattern, "", content)

with open(filename, "w") as f:
    f.write(content)

