file_path = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. State declarations
target_state = "  const [isPremiumActive, setIsPremiumActive] = useState(false);\n  const [avatar, setAvatar] = useState<Avatar | null>(null);"
# Let us check what is actually in the file
import re
print("State declaration matches:", len(re.findall(r"const\s+\[isPremiumActive.*?\n.*?setAvatar", content)))

# 2. Extract blocks
def extract_block(active_tab_name):
    pattern = f"      {{activeTab === '{active_tab_name}' && ("
    start = content.find(pattern)
    if start == -1:
        print(f"Warning: Tab {active_tab_name} block not found!")
        return ""
    
    # We find the matching closing parenthesized brace
    depth = 0
    idx = start + len(pattern) - 1 # starts at (
    while idx < len(content):
        c = content[idx]
        if c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0: # matching closing parenthesis
                # check if next is }
                if idx + 1 < len(content) and content[idx+1] == '}':
                    return content[start : idx+2]
        idx += 1
    return ""

briefing = extract_block("briefing")
songs = extract_block("songs")
practice = extract_block("practice_board")
campus_cup = extract_block("campus_cup")
hero = extract_block("hero")

print(f"Briefing len: {len(briefing)}")
print(f"Songs len: {len(songs)}")
print(f"Practice len: {len(practice)}")
print(f"Campus Cup len: {len(campus_cup)}")
print(f"Hero len: {len(hero)}")
